import {
  ALL_CATALOG_ITEMS,
  type AdvanceQuestDialogueRequest,
  type DialogueEntry,
  type MissionStatus,
  type QuestDialoguePending,
  type QuestDialogueView,
} from "@webgame/types";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import {
  characters,
  type QuestProgress,
  questDeliveries,
  questProgresses,
  raidSessions,
  stashItems,
  storyDisclosures,
  storyFlags,
  type TransactionClient,
  users,
  weaponMasters,
} from "../db";
import {
  defaultChoice,
  type DialogueLine,
  type DialogueNode,
  type DialogueState,
  type Effect,
  type FlagValue,
  getNode,
  isMissionUnlocked,
  presentChoices,
  runToStop,
  type StoredDialogueEntry,
  type StoredSpeaker,
} from "../logic/questDialogue";
import {
  getMissionDefinitionById,
  getStoryContactById,
  getStoryRecordById,
  MISSION_CHAIN,
  type MissionDefinition,
} from "../logic/story";
import { InventoryError, mergeIntoStash, removeFromStash } from "./inventory";

type Tx = TransactionClient;
type DialogueContextKind = "BASE" | "RAID";

const CATALOG_BY_ID = new Map(ALL_CATALOG_ITEMS.map((item) => [item.id, item]));

export interface PlayContext {
  kind: DialogueContextKind;
  raidId: string | null;
}

/** 작업 중인 진행 행. 변경을 모았다가 `persist`로 한 번에 저장한다. */
interface Working {
  def: MissionDefinition;
  row: QuestProgress;
  dirty: boolean;
}

export async function ensureMissionItems(tx: Tx, itemIds: readonly string[]) {
  const items = [...new Set(itemIds)]
    .map((id) => CATALOG_BY_ID.get(id))
    .filter((item): item is NonNullable<typeof item> => !!item);
  if (items.length === 0) return;
  await tx
    .insert(weaponMasters)
    .values(
      items.map((item) => ({
        id: item.id,
        name: item.name,
        damage: item.damage,
        staminaCost: item.staminaCost,
        cooldownTicks: item.cooldownTicks,
        castTicks: item.castTicks,
        weight: item.weight,
        value: item.value,
        description: item.description,
        attackType: item.attackType,
        iconKey: item.iconKey,
        effect: item.effect,
      })),
    )
    .onConflictDoNothing();
}

// ---------------------------------------------------------------------------
// 상태 읽기

export async function currentPlayContext(tx: Tx, userId: string): Promise<PlayContext> {
  const raiding = await tx.query.characters.findFirst({
    where: and(eq(characters.userId, userId), eq(characters.isRaiding, true)),
    columns: { activeRaidId: true },
  });
  return raiding?.activeRaidId
    ? { kind: "RAID", raidId: raiding.activeRaidId }
    : { kind: "BASE", raidId: null };
}

async function assertNoPendingBattle(tx: Tx, context: PlayContext) {
  if (!context.raidId) return;
  const raid = await tx.query.raidSessions.findFirst({
    where: eq(raidSessions.id, context.raidId),
    columns: { pendingRetreat: true },
  });
  if (raid?.pendingRetreat && !raid.pendingRetreat.resolution)
    throw new InventoryError("전투 결과를 먼저 확정해야 합니다.", 409);
}

export function objectiveOf(def: MissionDefinition, row: Pick<QuestProgress, "objectiveId"> | undefined) {
  return def.objectives[row?.objectiveId ?? def.defaultObjectiveId] ?? def.objectives[def.defaultObjectiveId]!;
}

export async function loadDialogueState(
  tx: Tx,
  userId: string,
  context: PlayContext,
  excludeQuestId?: string,
): Promise<DialogueState> {
  const [flagRows, questRows, stashRows, user] = await Promise.all([
    tx.query.storyFlags.findMany({ where: eq(storyFlags.userId, userId) }),
    tx.query.questProgresses.findMany({ where: eq(questProgresses.userId, userId) }),
    tx.query.stashItems.findMany({ where: eq(stashItems.userId, userId) }),
    tx.query.users.findFirst({ where: eq(users.id, userId), columns: { credits: true } }),
  ]);
  const stash = new Map<string, number>();
  for (const row of stashRows)
    stash.set(row.weaponMasterId, (stash.get(row.weaponMasterId) ?? 0) + row.quantity);
  const occupied = new Set<number>();
  for (const row of questRows) {
    if (row.questId === excludeQuestId) continue;
    if (row.status !== "ACTIVE" && row.status !== "RECOVERED") continue;
    const def = getMissionDefinitionById(row.questId);
    if (def) occupied.add(objectiveOf(def, row).targetNodeId);
  }
  return {
    inRaid: context.kind === "RAID",
    flags: new Map(flagRows.map((row) => [row.key, row.value])),
    quests: new Map(
      questRows.map((row) => [
        row.questId,
        {
          status: row.status,
          outcome: row.outcome ?? (row.status === "COMPLETE" ? "COMPLETE" : null),
          choices: new Set(row.choiceHistory.map((choice) => choice.choiceId)),
        },
      ]),
    ),
    stash,
    credits: user?.credits ?? 0,
    occupiedTargetNodeIds: occupied,
  };
}

// ---------------------------------------------------------------------------
// 대사 기록

function storedSpeaker(def: MissionDefinition, line: DialogueLine): StoredSpeaker {
  if (line.speaker === "issuer") return { kind: "NPC", contactId: def.issuerContactId };
  if (line.speaker === "player") return { kind: "PLAYER" };
  if (line.speaker === "system") return { kind: "SYSTEM" };
  return { kind: "NPC", contactId: line.speaker.contactId };
}

function pushLine(w: Working, line: DialogueLine, context: DialogueContextKind) {
  w.row.transcript = [
    ...w.row.transcript,
    {
      seq: w.row.dialogueSeq,
      speaker: storedSpeaker(w.def, line),
      text: line.text,
      pace: line.pace ?? "NORMAL",
      pauseBeforeMs: line.pauseBeforeMs ?? 0,
      context,
    },
  ];
  w.dirty = true;
}

function pushSystem(w: Working, text: string, context: DialogueContextKind) {
  pushLine(w, { speaker: "system", text, pace: "INSTANT" }, context);
}

function itemLabel(itemId: string) {
  return CATALOG_BY_ID.get(itemId)?.name ?? itemId;
}

export function toDialogueEntry(entry: StoredDialogueEntry): DialogueEntry {
  const speaker =
    entry.speaker.kind === "NPC"
      ? (() => {
          const contact = getStoryContactById(entry.speaker.contactId);
          return {
            kind: "NPC" as const,
            contactId: entry.speaker.contactId,
            name: contact?.name ?? "담당자",
            role: contact?.role ?? "",
          };
        })()
      : entry.speaker;
  return {
    seq: entry.seq,
    speaker,
    text: entry.text,
    pace: entry.pace,
    pauseBeforeMs: entry.pauseBeforeMs,
    context: entry.context,
  };
}

// ---------------------------------------------------------------------------
// 효과

interface EffectCheck {
  ok: boolean;
  message?: string;
}

/** 실행 전 검사. 실패하면 아무것도 바꾸지 않고 선택지를 다시 확정한다. */
function checkEffects(
  def: MissionDefinition,
  effects: readonly Effect[],
  state: DialogueState,
): EffectCheck {
  const stash = new Map(state.stash);
  let credits = state.credits;
  for (const effect of effects) {
    if (effect.type === "ACCEPT_OBJECTIVE") {
      const objective = def.objectives[effect.objectiveId];
      if (!objective) return { ok: false, message: "알 수 없는 임무 목표입니다." };
      if (state.occupiedTargetNodeIds.has(objective.targetNodeId))
        return { ok: false, message: "같은 시설을 목표로 하는 임무가 이미 진행 중입니다." };
    }
    if (effect.type === "CONSUME_ITEMS") {
      if (state.inRaid) return { ok: false, message: "탐사 중에는 물자를 전달할 수 없습니다." };
      for (const item of effect.items) {
        const left = (stash.get(item.weaponId) ?? 0) - item.quantity;
        if (left < 0) return { ok: false, message: "전달할 물자가 부족합니다." };
        stash.set(item.weaponId, left);
      }
    }
    if (effect.type === "SPEND_CREDITS") {
      if (state.inRaid) return { ok: false, message: "탐사 중에는 크레딧을 전달할 수 없습니다." };
      credits -= effect.amount;
      if (credits < 0) return { ok: false, message: "크레딧이 부족합니다." };
    }
  }
  return { ok: true };
}

async function setFlag(tx: Tx, userId: string, key: string, value: FlagValue, questId: string) {
  await tx
    .insert(storyFlags)
    .values({ userId, key, value, sourceQuestId: questId })
    .onConflictDoUpdate({
      target: [storyFlags.userId, storyFlags.key],
      set: { value, sourceQuestId: questId, setAt: new Date() },
    });
}

async function applyEffect(
  tx: Tx,
  userId: string,
  w: Working,
  effect: Effect,
  context: PlayContext,
) {
  const { def } = w;
  switch (effect.type) {
    case "ACCEPT_OBJECTIVE": {
      const objective = def.objectives[effect.objectiveId]!;
      w.row.status = "ACTIVE";
      w.row.objectiveId = objective.id;
      w.row.acceptedAt = new Date();
      w.row.recoveredRaidId = null;
      w.dirty = true;
      pushSystem(w, `[목표] ${objective.targetLabel} [NODE #${objective.targetNodeId}]`, context.kind);
      return;
    }
    case "GRANT_ITEMS":
    case "GRANT_CREDITS": {
      const items = effect.type === "GRANT_ITEMS" ? effect.items.filter((item) => item.quantity > 0) : [];
      const credits = effect.type === "GRANT_CREDITS" ? effect.amount : 0;
      if (items.length === 0 && credits <= 0) return;
      if (context.kind === "RAID" && context.raidId) {
        await tx.insert(questDeliveries).values({
          userId,
          questId: def.id,
          raidId: context.raidId,
          items: [...items],
          credits,
        });
        for (const item of items)
          pushSystem(w, `[지급 예정] ${itemLabel(item.weaponId)} ×${item.quantity}`, context.kind);
        if (credits > 0) pushSystem(w, `[지급 예정] ${credits} CR`, context.kind);
        return;
      }
      await grantNow(tx, userId, items, credits);
      for (const item of items)
        pushSystem(w, `[지급] ${itemLabel(item.weaponId)} ×${item.quantity}`, context.kind);
      if (credits > 0) pushSystem(w, `[지급] ${credits} CR`, context.kind);
      return;
    }
    case "CONSUME_ITEMS":
      for (const item of effect.items) {
        const removed = await removeFromStash(tx, userId, item.weaponId, item.quantity);
        if (!removed) throw new InventoryError("전달할 물자가 부족합니다.", 409);
        pushSystem(w, `[전달] ${itemLabel(item.weaponId)} ×${item.quantity}`, context.kind);
      }
      return;
    case "SPEND_CREDITS": {
      const [updated] = await tx
        .update(users)
        .set({ credits: sql`${users.credits} - ${effect.amount}`, updatedAt: new Date() })
        .where(and(eq(users.id, userId), sql`${users.credits} >= ${effect.amount}`))
        .returning({ id: users.id });
      if (!updated) throw new InventoryError("크레딧이 부족합니다.", 409);
      pushSystem(w, `[전달] ${effect.amount} CR`, context.kind);
      return;
    }
    case "SET_FLAG":
      await setFlag(tx, userId, effect.key, effect.value, def.id);
      return;
    case "UNLOCK_QUEST":
      await setFlag(tx, userId, `unlock:${effect.questId}`, true, def.id);
      return;
    case "LOCK_QUEST":
      await setFlag(tx, userId, `lock:${effect.questId}`, true, def.id);
      await tx
        .update(questProgresses)
        .set({ status: "LOCKED", updatedAt: new Date() })
        .where(
          and(
            eq(questProgresses.userId, userId),
            eq(questProgresses.questId, effect.questId),
            eq(questProgresses.status, "OFFERED"),
          ),
        );
      return;
    case "DISCLOSE": {
      const rows = [
        ...(effect.recordIds ?? []).map((refId) => ({ kind: "RECORD" as const, refId })),
        ...(effect.contactIds ?? []).map((refId) => ({ kind: "CONTACT" as const, refId })),
      ];
      if (rows.length === 0) return;
      await tx
        .insert(storyDisclosures)
        .values(rows.map((row) => ({ ...row, userId, sourceQuestId: def.id })))
        .onConflictDoNothing();
      for (const recordId of effect.recordIds ?? []) {
        const record = getStoryRecordById(recordId);
        if (record) pushSystem(w, `[공개] ${record.title}`, context.kind);
      }
      return;
    }
    case "RAISE_STORY_TIER":
      await tx
        .update(users)
        .set({ storyTier: sql`GREATEST(${users.storyTier}, ${effect.tier})`, updatedAt: new Date() })
        .where(eq(users.id, userId));
      return;
  }
}

async function grantNow(
  tx: Tx,
  userId: string,
  items: readonly { weaponId: string; quantity: number }[],
  credits: number,
) {
  if (items.length > 0) {
    await ensureMissionItems(tx, items.map((item) => item.weaponId));
    for (const item of items) await mergeIntoStash(tx, userId, item.weaponId, item.quantity);
  }
  if (credits > 0)
    await tx
      .update(users)
      .set({ credits: sql`${users.credits} + ${credits}`, updatedAt: new Date() })
      .where(eq(users.id, userId));
}

// ---------------------------------------------------------------------------
// 진행

async function pinChoices(tx: Tx, userId: string, w: Working, context: PlayContext) {
  const node = getNode(w.def.dialogue, w.row.dialogueNodeId!);
  if (node.kind !== "CHOICE") {
    if (w.row.presentedChoices) {
      w.row.presentedChoices = null;
      w.dirty = true;
    }
    return false;
  }
  const state = await loadDialogueState(tx, userId, context, w.def.id);
  const choices = presentChoices(node, state, w.def.objectives);
  const before = w.row.presentedChoices;
  const changed =
    !before ||
    before.nodeId !== node.id ||
    before.context !== context.kind ||
    JSON.stringify(before.choices) !== JSON.stringify(choices);
  if (changed) {
    w.row.presentedChoices = { nodeId: node.id, context: context.kind, choices };
    w.dirty = true;
  }
  return changed;
}

/** `startNodeId`부터 정지점까지 대사를 남기고 효과를 실행한다. */
async function enterFrom(
  tx: Tx,
  userId: string,
  w: Working,
  startNodeId: string,
  context: PlayContext,
) {
  const state = await loadDialogueState(tx, userId, context, w.def.id);
  const run = runToStop(w.def.dialogue, startNodeId, state);
  for (const step of run.steps) {
    if (step.kind === "LINE") pushLine(w, step.line, context.kind);
    else await applyEffect(tx, userId, w, step.effect, context);
  }
  w.row.dialogueNodeId = run.stopNodeId;
  w.dirty = true;
  const stop = getNode(w.def.dialogue, run.stopNodeId);
  if (stop.kind === "END") {
    w.row.outcome = stop.outcome;
    w.row.status = stop.outcome === "COMPLETE" ? "COMPLETE" : "LOCKED";
    if (stop.outcome === "COMPLETE") w.row.completedAt = new Date();
  }
  await pinChoices(tx, userId, w, context);
}

async function persist(tx: Tx, userId: string, w: Working) {
  if (!w.dirty) return;
  const { row } = w;
  await tx
    .update(questProgresses)
    .set({
      status: row.status,
      objectiveId: row.objectiveId,
      acceptedAt: row.acceptedAt,
      recoveredRaidId: row.recoveredRaidId,
      completedAt: row.completedAt,
      dialogueNodeId: row.dialogueNodeId,
      dialogueSeq: row.dialogueSeq,
      readSeq: row.readSeq,
      transcript: row.transcript,
      choiceHistory: row.choiceHistory,
      presentedChoices: row.presentedChoices,
      outcome: row.outcome,
      lastRequestId: row.lastRequestId,
      lastRequestFingerprint: row.lastRequestFingerprint,
      updatedAt: new Date(),
    })
    .where(and(eq(questProgresses.userId, userId), eq(questProgresses.questId, row.questId)));
  w.dirty = false;
}

function firstNodeOfKind(
  def: MissionDefinition,
  kind: "AWAIT_OBJECTIVE" | "END",
): { nodeId: string; entries: Omit<StoredDialogueEntry, "seq">[]; choices: string[] } {
  // 기본 경로(첫 조건 없는 선택지)를 따라가며 대사를 모은다. 효과는 실행하지 않는다.
  const entries: Omit<StoredDialogueEntry, "seq">[] = [];
  const choices: string[] = [];
  const speak = (line: DialogueLine) =>
    entries.push({
      speaker: storedSpeaker(def, line),
      text: line.text,
      pace: "INSTANT",
      pauseBeforeMs: 0,
      context: "BASE",
    });
  let nodeId = def.dialogue.entry;
  for (let guard = 0; guard < 200; guard++) {
    const node: DialogueNode = getNode(def.dialogue, nodeId);
    if (node.kind === "BRANCH") {
      nodeId = node.otherwise;
      continue;
    }
    for (const line of node.lines) speak(line);
    if (node.kind === kind) return { nodeId, entries, choices };
    if (node.kind === "END") return { nodeId, entries, choices };
    if (node.kind === "CHOICE") {
      const choice = defaultChoice(node);
      choices.push(choice.id);
      speak({ speaker: "player", text: choice.label });
      nodeId = choice.next;
    } else {
      nodeId = node.next;
    }
  }
  throw new Error(`Default path loop in ${def.id}`);
}

/** 대화 위치가 없는 기존 진행 행을 상태값 기준으로 대화 위치에 옮긴다(효과 미실행). */
function normalizeLegacy(w: Working) {
  if (w.row.dialogueNodeId) return;
  const target = w.row.status === "COMPLETE" ? "END" : "AWAIT_OBJECTIVE";
  const path = firstNodeOfKind(w.def, target);
  w.row.dialogueNodeId = path.nodeId;
  w.row.dialogueSeq = 1;
  w.row.readSeq = 1;
  w.row.transcript = path.entries.map((entry) => ({ ...entry, seq: 1 }));
  w.row.choiceHistory = path.choices.map((choiceId) => ({
    seq: 1,
    nodeId: "",
    choiceId,
    at: (w.row.acceptedAt ?? new Date()).toISOString(),
    raidId: null,
  }));
  w.row.objectiveId = w.row.objectiveId ?? w.def.defaultObjectiveId;
  if (w.row.status === "COMPLETE") w.row.outcome = "COMPLETE";
  w.dirty = true;
}

/** 목표 대기 노드에서 보고 가능(READY)이 되었으면 다음 대화로 넘긴다. */
async function continueIfReady(tx: Tx, userId: string, w: Working, context: PlayContext) {
  const node = getNode(w.def.dialogue, w.row.dialogueNodeId!);
  if (node.kind !== "AWAIT_OBJECTIVE" || w.row.status !== "READY") return false;
  w.row.dialogueSeq += 1;
  await enterFrom(tx, userId, w, node.next, context);
  return true;
}

/**
 * 진행 행을 읽어 작업 형태로 만든다. 해금된 임무에 행이 없으면 제안 대화를 시작한다.
 * 숨겨진(해금 안 된) 임무는 null.
 */
export async function loadWorking(
  tx: Tx,
  userId: string,
  def: MissionDefinition,
  context: PlayContext,
  options: { create: boolean },
): Promise<Working | null> {
  let row = await tx.query.questProgresses.findFirst({
    where: and(eq(questProgresses.userId, userId), eq(questProgresses.questId, def.id)),
  });
  if (!row) {
    if (!options.create) return null;
    const state = await loadDialogueState(tx, userId, context);
    if (!isMissionUnlocked(def, state)) return null;
    await tx
      .insert(questProgresses)
      .values({
        userId,
        questId: def.id,
        definitionVersion: def.version,
        status: "OFFERED",
        dialogueNodeId: def.dialogue.entry,
        dialogueSeq: 1,
      })
      .onConflictDoNothing();
    row = await tx.query.questProgresses.findFirst({
      where: and(eq(questProgresses.userId, userId), eq(questProgresses.questId, def.id)),
    });
    if (!row) throw new InventoryError("Mission progress unavailable", 409);
    if (row.transcript.length === 0 && row.dialogueSeq === 1) {
      const w: Working = { def, row, dirty: true };
      await enterFrom(tx, userId, w, def.dialogue.entry, context);
      await persist(tx, userId, w);
      return w;
    }
  }
  const w: Working = { def, row, dirty: false };
  normalizeLegacy(w);
  await continueIfReady(tx, userId, w, context);
  await pinChoices(tx, userId, w, context);
  await persist(tx, userId, w);
  return w;
}

export function dialogueView(w: Working, context: PlayContext): QuestDialogueView {
  const node = getNode(w.def.dialogue, w.row.dialogueNodeId!);
  const choices = w.row.presentedChoices?.choices ?? [];
  const pending: QuestDialoguePending =
    node.kind === "CHOICE"
      ? node.availability === "BASE_ONLY" && context.kind === "RAID"
        ? { kind: "BASE_ONLY", choices }
        : { kind: "CHOICE", choices }
      : node.kind === "END"
        ? { kind: "END", outcome: w.row.outcome ?? node.outcome }
        : { kind: "AWAIT_OBJECTIVE" };
  const accepted = w.row.status !== "OFFERED" && w.row.status !== "LOCKED";
  const objective = accepted ? objectiveOf(w.def, w.row) : null;
  return {
    questId: w.def.id,
    title: w.def.title,
    status: w.row.status,
    seq: w.row.dialogueSeq,
    readSeq: w.row.readSeq,
    objective: objective
      ? { targetNodeId: objective.targetNodeId, targetLabel: objective.targetLabel }
      : null,
    transcript: w.row.transcript.map(toDialogueEntry),
    pending,
  };
}

export type AdvanceResult =
  | { ok: true; dialogue: QuestDialogueView }
  | { ok: false; message: string; dialogue: QuestDialogueView };

function requireDef(questId: string) {
  const def = getMissionDefinitionById(questId);
  if (!def) throw new InventoryError("Unknown mission", 404);
  return def;
}

export async function getDialogueInTx(tx: Tx, userId: string, questId: string) {
  const def = requireDef(questId);
  const context = await currentPlayContext(tx, userId);
  const w = await loadWorking(tx, userId, def, context, { create: true });
  if (!w) throw new InventoryError("Mission is not available yet", 409);
  return dialogueView(w, context);
}

/** 선택지 하나를 실행한다. 확정 목록·조건을 서버에서 다시 검사한다. */
async function performChoice(
  tx: Tx,
  userId: string,
  w: Working,
  choiceId: string,
  context: PlayContext,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const node = getNode(w.def.dialogue, w.row.dialogueNodeId!);
  if (node.kind !== "CHOICE") return { ok: false, message: "지금은 선택할 수 있는 단계가 아닙니다." };
  const presented = w.row.presentedChoices?.choices.find((choice) => choice.id === choiceId);
  const choice = node.choices.find((item) => item.id === choiceId);
  if (!presented || !choice) return { ok: false, message: "유효하지 않은 임무 선택지입니다." };
  if (node.availability === "BASE_ONLY" && context.kind === "RAID")
    return { ok: false, message: "거점에서 이어서 진행할 수 있습니다." };
  if (!presented.enabled) return { ok: false, message: "조건을 충족하지 않은 선택지입니다." };
  const state = await loadDialogueState(tx, userId, context, w.def.id);
  const check = checkEffects(w.def, choice.effects ?? [], state);
  if (!check.ok) {
    // 확정 후 상태가 바뀌었다. 다시 확정해 최신 선택지를 돌려준다.
    w.row.dialogueSeq += 1;
    w.dirty = true;
    await pinChoices(tx, userId, w, context);
    return { ok: false, message: check.message ?? "선택지가 갱신되었습니다." };
  }
  w.row.dialogueSeq += 1;
  w.row.choiceHistory = [
    ...w.row.choiceHistory,
    {
      seq: w.row.dialogueSeq,
      nodeId: node.id,
      choiceId,
      at: new Date().toISOString(),
      raidId: context.raidId,
    },
  ];
  pushLine(w, { speaker: "player", text: choice.label, pace: "INSTANT" }, context.kind);
  for (const effect of choice.effects ?? []) await applyEffect(tx, userId, w, effect, context);
  await enterFrom(tx, userId, w, choice.next, context);
  return { ok: true };
}

export async function advanceDialogueInTx(
  tx: Tx,
  userId: string,
  questId: string,
  input: AdvanceQuestDialogueRequest,
): Promise<AdvanceResult> {
  const def = requireDef(questId);
  await tx.execute(sql`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`);
  const context = await currentPlayContext(tx, userId);
  await assertNoPendingBattle(tx, context);
  const w = await loadWorking(tx, userId, def, context, { create: true });
  if (!w) throw new InventoryError("Mission is not available yet", 409);
  const fingerprint = JSON.stringify([questId, input.expectedSeq, input.choiceId ?? null]);
  if (w.row.lastRequestId === input.requestId) {
    if (w.row.lastRequestFingerprint !== fingerprint)
      throw new InventoryError("Request id was already used for a different action", 409);
    return { ok: true, dialogue: dialogueView(w, context) };
  }
  if (input.expectedSeq !== w.row.dialogueSeq)
    return { ok: false, message: "대화가 갱신되었습니다.", dialogue: dialogueView(w, context) };
  if (!input.choiceId) {
    return {
      ok: false,
      message: "지금은 이어서 진행할 수 없습니다.",
      dialogue: dialogueView(w, context),
    };
  }
  const result = await performChoice(tx, userId, w, input.choiceId, context);
  if (result.ok) {
    w.row.lastRequestId = input.requestId;
    w.row.lastRequestFingerprint = fingerprint;
    w.row.readSeq = Math.max(w.row.readSeq, w.row.dialogueSeq);
    w.dirty = true;
  }
  await persist(tx, userId, w);
  return result.ok
    ? { ok: true, dialogue: dialogueView(w, context) }
    : { ok: false, message: result.message, dialogue: dialogueView(w, context) };
}

export async function markDialogueReadInTx(tx: Tx, userId: string, questId: string, seq: number) {
  requireDef(questId);
  await tx
    .update(questProgresses)
    .set({ readSeq: sql`GREATEST(${questProgresses.readSeq}, LEAST(${seq}, ${questProgresses.dialogueSeq}))` })
    .where(and(eq(questProgresses.userId, userId), eq(questProgresses.questId, questId)));
}

/** 호환 래퍼: 현재 노드에서 효과 조건을 만족하는 기본 선택지를 실행한다. */
export async function performDefaultChoice(
  tx: Tx,
  userId: string,
  w: Working,
  context: PlayContext,
  predicate: (effects: readonly Effect[]) => boolean,
) {
  const node = getNode(w.def.dialogue, w.row.dialogueNodeId!);
  if (node.kind !== "CHOICE") return false;
  const enabled = new Set(
    (w.row.presentedChoices?.choices ?? []).filter((choice) => choice.enabled).map((choice) => choice.id),
  );
  const choice = node.choices.find((item) => enabled.has(item.id) && predicate(item.effects ?? []));
  if (!choice) return false;
  const result = await performChoice(tx, userId, w, choice.id, context);
  if (!result.ok) throw new InventoryError(result.message, 409);
  await persist(tx, userId, w);
  return true;
}

// ---------------------------------------------------------------------------
// 탐사 연동

export interface ActiveObjective {
  questId: string;
  targetNodeId: number;
  targetLabel: string;
  enemyArchetypeId: string;
}

export async function getActiveObjectives(tx: Tx, userId: string): Promise<ActiveObjective[]> {
  const rows = await tx.query.questProgresses.findMany({
    where: and(eq(questProgresses.userId, userId), eq(questProgresses.status, "ACTIVE")),
  });
  const order = new Map(MISSION_CHAIN.map((def, index) => [def.id, index]));
  return rows
    .map((row) => {
      const def = getMissionDefinitionById(row.questId);
      if (!def) return null;
      const objective = objectiveOf(def, row);
      return {
        questId: def.id,
        targetNodeId: objective.targetNodeId,
        targetLabel: objective.targetLabel,
        enemyArchetypeId: objective.enemyArchetypeId,
      };
    })
    .filter((item): item is ActiveObjective => item !== null)
    .sort((a, b) => (order.get(a.questId) ?? 0) - (order.get(b.questId) ?? 0));
}

export async function recoverMissionRecord(
  tx: Tx,
  userId: string,
  raidId: string,
  questId: string,
) {
  const [updated] = await tx
    .update(questProgresses)
    .set({ status: "RECOVERED", recoveredRaidId: raidId, updatedAt: new Date() })
    .where(
      and(
        eq(questProgresses.userId, userId),
        eq(questProgresses.questId, questId),
        eq(questProgresses.status, "ACTIVE"),
      ),
    )
    .returning();
  const def = getMissionDefinitionById(questId);
  if (!updated || !def) return;
  const w: Working = { def, row: updated, dirty: false };
  normalizeLegacy(w);
  const node = getNode(def.dialogue, w.row.dialogueNodeId!);
  w.row.dialogueSeq += 1;
  if (node.kind === "AWAIT_OBJECTIVE")
    for (const line of node.recoveredLines ?? []) pushLine(w, line, "RAID");
  pushSystem(w, `[기록 확보] ${objectiveOf(def, w.row).targetLabel}`, "RAID");
  await persist(tx, userId, w);
}

/** 탐사 종료 정산: 회수 상태를 탈출·사망에 맞게 옮기고, 탐사 중 쌓인 임무 지급을 처리한다. */
export async function finishMissionRaid(
  tx: Tx,
  userId: string,
  raidId: string,
  status: "EXTRACTED" | "DEAD",
) {
  const moved = await tx
    .update(questProgresses)
    .set(
      status === "EXTRACTED"
        ? { status: "READY", updatedAt: new Date() }
        : { status: "ACTIVE", recoveredRaidId: null, updatedAt: new Date() },
    )
    .where(
      and(
        eq(questProgresses.userId, userId),
        eq(questProgresses.status, "RECOVERED"),
        eq(questProgresses.recoveredRaidId, raidId),
      ),
    )
    .returning();
  const base: PlayContext = { kind: "BASE", raidId: null };
  if (status === "EXTRACTED") {
    for (const row of moved) {
      const def = getMissionDefinitionById(row.questId);
      if (!def) continue;
      const w: Working = { def, row, dirty: false };
      normalizeLegacy(w);
      await continueIfReady(tx, userId, w, base);
      await persist(tx, userId, w);
    }
  }
  await settleQuestDeliveries(tx, userId, raidId);
}

export async function settleQuestDeliveries(tx: Tx, userId: string, raidId: string) {
  const deliveries = await tx
    .update(questDeliveries)
    .set({ deliveredAt: new Date() })
    .where(
      and(
        eq(questDeliveries.userId, userId),
        eq(questDeliveries.raidId, raidId),
        isNull(questDeliveries.deliveredAt),
      ),
    )
    .returning();
  if (deliveries.length === 0) return;
  const questIds = [...new Set(deliveries.map((delivery) => delivery.questId))];
  const rows = await tx.query.questProgresses.findMany({
    where: and(eq(questProgresses.userId, userId), inArray(questProgresses.questId, questIds)),
  });
  for (const delivery of deliveries) {
    await grantNow(tx, userId, delivery.items, delivery.credits);
    const row = rows.find((item) => item.questId === delivery.questId);
    const def = getMissionDefinitionById(delivery.questId);
    if (!row || !def) continue;
    const w: Working = { def, row, dirty: false };
    w.row.dialogueSeq += 1;
    for (const item of delivery.items)
      pushSystem(w, `[지급] ${itemLabel(item.weaponId)} ×${item.quantity}`, "BASE");
    if (delivery.credits > 0) pushSystem(w, `[지급] ${delivery.credits} CR`, "BASE");
    await persist(tx, userId, w);
  }
}

export type { MissionStatus };
