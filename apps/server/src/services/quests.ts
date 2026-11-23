import type {
  AdvanceQuestDialogueRequest,
  JournalActiveObjective,
  JournalMissionItem,
  JournalUnreadMessage,
  JournalView,
  MissionDialogueState,
} from "@webgame/types";
import { eq } from "drizzle-orm";

import {
  type Database,
  type DbOrTx,
  type QuestProgress,
  questProgresses,
  type RaidStatus,
  storyDisclosures,
  storyFlags,
  type TransactionClient,
  users,
} from "../db";
import { choiceReachesAccept, getNode, isMissionUnlocked } from "../logic/questDialogue";
import {
  disclosedStory,
  firstMission,
  getMissionDefinitionById,
  getStoryContactById,
  getStoryRecordById,
  MISSION_CHAIN,
  type MissionDefinition,
} from "../logic/story";
import { requireUserAtBase } from "./characters";
import { InventoryError, withInventoryTransaction } from "./inventory";
import {
  advanceDialogueInTx,
  currentPlayContext,
  finishMissionRaid as finishQuestRaid,
  getDialogueInTx,
  loadWorking,
  markDialogueReadInTx,
  objectiveOf,
  performDefaultChoice,
  toDialogueEntry,
} from "./questDialogue";

export {
  ensureMissionItems,
  getActiveObjectives,
  recoverMissionRecord,
} from "./questDialogue";

function dialogueStateOf(def: MissionDefinition, row: QuestProgress | undefined): MissionDialogueState {
  if (!row) return "NEEDS_INPUT";
  if (!row.dialogueNodeId) {
    if (row.status === "COMPLETE") return "DONE";
    return row.status === "READY" ? "BASE_ONLY" : "AWAITING_OBJECTIVE";
  }
  const node = def.dialogue.nodes[row.dialogueNodeId];
  if (!node) return "DONE";
  switch (node.kind) {
    case "CHOICE":
      return node.availability === "BASE_ONLY" ? "BASE_ONLY" : "NEEDS_INPUT";
    case "AWAIT_OBJECTIVE":
      return row.status === "READY" ? "BASE_ONLY" : "AWAITING_OBJECTIVE";
    case "END":
      return "DONE";
    default:
      return "NEEDS_INPUT";
  }
}

function offerBriefing(def: MissionDefinition) {
  const entry = getNode(def.dialogue, def.dialogue.entry);
  return "lines" in entry ? entry.lines.map((line) => line.text).join(" ") : "";
}

function toJournalMissionItem(def: MissionDefinition, row?: QuestProgress): JournalMissionItem {
  const objective = objectiveOf(def, row);
  const unreadEntries = row ? row.transcript.filter((entry) => entry.seq > row.readSeq) : [];
  return {
    id: def.id,
    tier: def.tier,
    issuerName: def.issuerName,
    issuerRole: def.issuerRole,
    title: def.title,
    briefing: offerBriefing(def),
    targetNodeId: objective.targetNodeId,
    targetLabel: objective.targetLabel,
    supplyDescription: def.supplyDescription,
    rewardDescription: def.rewardDescription,
    status: row?.status ?? "OFFERED",
    completedAt: row?.completedAt?.toISOString() ?? null,
    dialogueState: dialogueStateOf(def, row),
    unread: unreadEntries.length,
  };
}

export async function journalView(db: DbOrTx, userId: string): Promise<JournalView> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { storyTier: true },
  });
  if (!user) throw new InventoryError("User not found", 404);
  const [rows, flagRows, disclosureRows] = await Promise.all([
    db.query.questProgresses.findMany({ where: eq(questProgresses.userId, userId) }),
    db.query.storyFlags.findMany({ where: eq(storyFlags.userId, userId) }),
    db.query.storyDisclosures.findMany({ where: eq(storyDisclosures.userId, userId) }),
  ]);
  const byQuestId = new Map(rows.map((row) => [row.questId, row]));
  const unlockState = {
    inRaid: false,
    flags: new Map(flagRows.map((row) => [row.key, row.value])),
    quests: new Map(
      rows.map((row) => [
        row.questId,
        {
          status: row.status,
          outcome: row.outcome ?? (row.status === "COMPLETE" ? "COMPLETE" : null),
          choices: new Set(row.choiceHistory.map((choice) => choice.choiceId)),
        },
      ]),
    ),
    stash: new Map<string, number>(),
    credits: 0,
    occupiedTargetNodeIds: new Set<number>(),
  };
  const visible = MISSION_CHAIN.filter(
    (def) => byQuestId.has(def.id) || isMissionUnlocked(def, unlockState),
  );
  const missions = visible.map((def) => toJournalMissionItem(def, byQuestId.get(def.id)));
  const currentMission =
    missions.find((item) => item.status !== "COMPLETE" && item.status !== "LOCKED") ??
    missions.at(-1) ??
    toJournalMissionItem(MISSION_CHAIN[0]!);

  const activeObjectives: JournalActiveObjective[] = visible.flatMap((def) => {
    const row = byQuestId.get(def.id);
    if (!row || (row.status !== "ACTIVE" && row.status !== "RECOVERED")) return [];
    const objective = objectiveOf(def, row);
    return [
      {
        questId: def.id,
        title: def.title,
        targetNodeId: objective.targetNodeId,
        targetLabel: objective.targetLabel,
        status: row.status,
      },
    ];
  });

  const unreadMessages: JournalUnreadMessage[] = rows.flatMap((row) => {
    const latest = [...row.transcript]
      .reverse()
      .find((entry) => entry.seq > row.readSeq && entry.speaker.kind === "NPC");
    if (!latest) return [];
    const view = toDialogueEntry(latest);
    return [
      {
        questId: row.questId,
        seq: latest.seq,
        speakerName: view.speaker.kind === "NPC" ? view.speaker.name : "",
        preview: latest.text,
      },
    ];
  });

  const story = disclosedStory(user.storyTier);
  const knownRecordIds = new Set(story.records.map((record) => record.id));
  const extraRecords = disclosureRows
    .filter((row) => row.kind === "RECORD" && !knownRecordIds.has(row.refId))
    .map((row) => getStoryRecordById(row.refId))
    .filter((record): record is NonNullable<typeof record> => !!record)
    .map(({ id, title, content, minimumTier }) => ({ id, title, content, tier: minimumTier }));
  const knownContactIds = new Set(story.contacts.map((contact) => contact.id));
  const extraContacts = disclosureRows
    .filter((row) => row.kind === "CONTACT" && !knownContactIds.has(row.refId))
    .map((row) => getStoryContactById(row.refId))
    .filter((contact): contact is NonNullable<typeof contact> => !!contact)
    .map(({ id, name, role, affiliation }) => ({ id, name, role, affiliation }));

  return {
    storyTier: user.storyTier,
    mission: currentMission,
    missions,
    activeObjectives,
    unreadMessages,
    records: [...story.records, ...extraRecords],
    contacts: [...story.contacts, ...extraContacts],
  };
}

// ---------------------------------------------------------------------------
// 대화 API

export async function getQuestDialogue(db: Database, userId: string, questId: string) {
  return withInventoryTransaction(db, (tx) => getDialogueInTx(tx, userId, questId));
}

export async function advanceQuestDialogue(
  db: Database,
  userId: string,
  questId: string,
  input: AdvanceQuestDialogueRequest,
) {
  return withInventoryTransaction(db, async (tx) => {
    const result = await advanceDialogueInTx(tx, userId, questId, input);
    return { ...result, journal: await journalView(tx, userId) };
  });
}

export async function markQuestDialogueRead(
  db: Database,
  userId: string,
  questId: string,
  seq: number,
) {
  return withInventoryTransaction(db, async (tx) => {
    await markDialogueReadInTx(tx, userId, questId, seq);
    return journalView(tx, userId);
  });
}

// ---------------------------------------------------------------------------
// 호환 래퍼(기존 수락·보고 API)

function chainOrderedRows(rows: QuestProgress[]) {
  return new Map(rows.map((row) => [row.questId, row]));
}

async function resolveMissionToAccept(tx: TransactionClient, userId: string, questId?: string) {
  if (questId) {
    const def = getMissionDefinitionById(questId);
    if (!def) throw new InventoryError("Unknown mission", 404);
    return def;
  }
  const byQuestId = chainOrderedRows(
    await tx.query.questProgresses.findMany({ where: eq(questProgresses.userId, userId) }),
  );
  return (
    MISSION_CHAIN.find((def) => {
      const status = byQuestId.get(def.id)?.status;
      return status !== "COMPLETE" && status !== "LOCKED";
    }) ?? MISSION_CHAIN[0]!
  );
}

export async function acceptMission(db: Database, userId: string, questId?: string) {
  return withInventoryTransaction(db, async (tx) => {
    await requireUserAtBase(tx, userId);
    const def = await resolveMissionToAccept(tx, userId, questId);
    const context = await currentPlayContext(tx, userId);
    const w = await loadWorking(tx, userId, def, context, { create: true });
    if (!w) throw new InventoryError("Previous mission must be completed first", 409);
    // 제안 대화의 질문 선택지를 거쳐 수락 선택지까지 진행한다(목표가 여럿이면 첫 목표).
    for (let step = 0; step < 20 && w.row.status === "OFFERED"; step++) {
      const accepted = await performDefaultChoice(tx, userId, w, context, (choice) =>
        (choice.effects ?? []).some((effect) => effect.type === "ACCEPT_OBJECTIVE"),
      );
      if (accepted) break;
      const moved = await performDefaultChoice(tx, userId, w, context, (choice) =>
        choiceReachesAccept(def.dialogue, choice),
      );
      if (!moved) break;
    }
    return journalView(tx, userId);
  });
}

export async function acceptFirstMission(db: Database, userId: string) {
  return acceptMission(db, userId, firstMission.id);
}

async function resolveMissionToReport(tx: TransactionClient, userId: string, questId?: string) {
  if (questId) {
    const def = getMissionDefinitionById(questId);
    if (!def) throw new InventoryError("Unknown mission", 404);
    return def;
  }
  const byQuestId = chainOrderedRows(
    await tx.query.questProgresses.findMany({ where: eq(questProgresses.userId, userId) }),
  );
  return (
    MISSION_CHAIN.find((def) => byQuestId.get(def.id)?.status === "READY") ??
    MISSION_CHAIN.find((def) => {
      const status = byQuestId.get(def.id)?.status;
      return status !== undefined && status !== "COMPLETE" && status !== "LOCKED";
    }) ??
    MISSION_CHAIN[0]!
  );
}

export async function reportMission(db: Database, userId: string, questId?: string) {
  return withInventoryTransaction(db, async (tx) => {
    await requireUserAtBase(tx, userId);
    const def = await resolveMissionToReport(tx, userId, questId);
    const context = await currentPlayContext(tx, userId);
    const w = await loadWorking(tx, userId, def, context, { create: false });
    if (w?.row.status === "COMPLETE") return journalView(tx, userId);
    const reported =
      w?.row.status === "READY" &&
      (await performDefaultChoice(tx, userId, w, context, () => true));
    if (!reported)
      throw new InventoryError("Recover the record and extract before reporting", 409);
    return journalView(tx, userId);
  });
}

export async function reportFirstMission(db: Database, userId: string) {
  return reportMission(db, userId, firstMission.id);
}

export async function finishMissionRaid(
  tx: TransactionClient,
  userId: string,
  raidId: string,
  status: RaidStatus,
) {
  if (status === "ACTIVE") return;
  await finishQuestRaid(tx, userId, raidId, status);
}
