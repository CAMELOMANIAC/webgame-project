import type {
  DialogueChoiceView,
  DialoguePace,
  MissionStatus,
  QuestOutcome,
} from "@webgame/types";

// 임무 대화 정의(서버 전용)와 순수 평가 함수. DB 접근 없이 단위 테스트할 수 있게 유지한다.

export type SpeakerRef = "issuer" | "player" | "system" | { contactId: string };

export interface DialogueLine {
  speaker: SpeakerRef;
  text: string;
  pace?: DialoguePace;
  pauseBeforeMs?: number;
}

export type Availability = "BASE_ONLY" | "ANYWHERE";

export type FlagValue = string | number | boolean;

export interface ItemGrant {
  weaponId: string;
  quantity: number;
}

export type Condition =
  | { type: "HAS_ITEM"; itemId: string; quantity?: number }
  | { type: "CREDITS_GTE"; amount: number }
  | { type: "FLAG"; key: string; equals?: FlagValue }
  | { type: "CHOSE"; questId: string; choiceId: string }
  | { type: "QUEST_STATUS"; questId: string; status: MissionStatus }
  | { type: "QUEST_OUTCOME"; questId: string; outcome: QuestOutcome }
  | { type: "ALL"; of: readonly Condition[] }
  | { type: "ANY"; of: readonly Condition[] }
  | { type: "NOT"; of: Condition };

export type Effect =
  | { type: "ACCEPT_OBJECTIVE"; objectiveId: string }
  | { type: "GRANT_ITEMS"; items: readonly ItemGrant[] }
  | { type: "CONSUME_ITEMS"; items: readonly ItemGrant[] }
  | { type: "GRANT_CREDITS"; amount: number }
  | { type: "SPEND_CREDITS"; amount: number }
  | { type: "SET_FLAG"; key: string; value: FlagValue }
  | { type: "DISCLOSE"; recordIds?: readonly string[]; contactIds?: readonly string[] }
  | { type: "RAISE_STORY_TIER"; tier: number }
  | { type: "UNLOCK_QUEST"; questId: string }
  | { type: "LOCK_QUEST"; questId: string };

export interface DialogueChoice {
  id: string;
  label: string;
  condition?: Condition;
  conditionLabel?: string;
  effects?: readonly Effect[];
  next: string;
}

export type DialogueNode =
  | {
      id: string;
      kind: "LINES";
      lines: readonly DialogueLine[];
      effects?: readonly Effect[];
      next: string;
    }
  | {
      id: string;
      kind: "CHOICE";
      lines: readonly DialogueLine[];
      choices: readonly DialogueChoice[];
      availability?: Availability;
    }
  | {
      id: string;
      kind: "BRANCH";
      cases: readonly { when: Condition; next: string }[];
      otherwise: string;
    }
  | {
      id: string;
      kind: "AWAIT_OBJECTIVE";
      lines: readonly DialogueLine[];
      /** 탐사 중 목표 기록을 확보한 직후 이어 붙일 대사(효과 없음). */
      recoveredLines?: readonly DialogueLine[];
      /** 탈출로 보고 가능 상태가 되면 이어질 노드. */
      next: string;
    }
  | {
      id: string;
      kind: "END";
      lines: readonly DialogueLine[];
      outcome: QuestOutcome;
    };

export interface DialogueGraph {
  entry: string;
  nodes: Readonly<Record<string, DialogueNode>>;
}

export interface MissionObjective {
  id: string;
  targetNodeId: number;
  targetLabel: string;
  enemyArchetypeId: string;
}

/** 대화 평가에 필요한 계정 상태 스냅샷. */
export interface DialogueState {
  inRaid: boolean;
  flags: ReadonlyMap<string, FlagValue>;
  quests: ReadonlyMap<
    string,
    {
      status: MissionStatus;
      outcome: QuestOutcome | null;
      choices: ReadonlySet<string>;
    }
  >;
  stash: ReadonlyMap<string, number>;
  credits: number;
  /** 다른 진행 중 임무가 이미 목표로 삼은 노드. */
  occupiedTargetNodeIds: ReadonlySet<number>;
}

export function evaluateCondition(
  condition: Condition,
  state: DialogueState,
): boolean {
  switch (condition.type) {
    case "HAS_ITEM":
      return (state.stash.get(condition.itemId) ?? 0) >= (condition.quantity ?? 1);
    case "CREDITS_GTE":
      return state.credits >= condition.amount;
    case "FLAG": {
      const value = state.flags.get(condition.key);
      if (condition.equals === undefined) return value !== undefined && value !== false;
      return value === condition.equals;
    }
    case "CHOSE":
      return state.quests.get(condition.questId)?.choices.has(condition.choiceId) ?? false;
    case "QUEST_STATUS":
      return (state.quests.get(condition.questId)?.status ?? "OFFERED") === condition.status;
    case "QUEST_OUTCOME":
      return state.quests.get(condition.questId)?.outcome === condition.outcome;
    case "ALL":
      return condition.of.every((item) => evaluateCondition(item, state));
    case "ANY":
      return condition.of.some((item) => evaluateCondition(item, state));
    case "NOT":
      return !evaluateCondition(condition.of, state);
  }
}

export type DialogueStep =
  | { kind: "LINE"; line: DialogueLine }
  | { kind: "EFFECT"; effect: Effect };

export interface RunResult {
  steps: DialogueStep[];
  stopNodeId: string;
}

const MAX_AUTO_STEPS = 200;

export function getNode(graph: DialogueGraph, nodeId: string): DialogueNode {
  const node = graph.nodes[nodeId];
  if (!node) throw new Error(`Unknown dialogue node ${nodeId}`);
  return node;
}

/**
 * `startNodeId`부터 LINES·BRANCH를 따라가며 CHOICE·AWAIT_OBJECTIVE·END에서 멈춘다.
 * 정지 노드 자신의 대사도 포함한다. 효과는 순서대로 돌려주며 실행은 호출자가 한다.
 * FLAG 효과는 이후 BRANCH 판정에 반영한다.
 */
export function runToStop(
  graph: DialogueGraph,
  startNodeId: string,
  state: DialogueState,
): RunResult {
  const steps: DialogueStep[] = [];
  const flags = new Map(state.flags);
  const local: DialogueState = { ...state, flags };
  let nodeId = startNodeId;
  for (let guard = 0; guard < MAX_AUTO_STEPS; guard++) {
    const node = getNode(graph, nodeId);
    switch (node.kind) {
      case "LINES":
        for (const line of node.lines) steps.push({ kind: "LINE", line });
        for (const effect of node.effects ?? []) {
          steps.push({ kind: "EFFECT", effect });
          if (effect.type === "SET_FLAG") flags.set(effect.key, effect.value);
        }
        nodeId = node.next;
        continue;
      case "BRANCH":
        nodeId =
          node.cases.find((item) => evaluateCondition(item.when, local))?.next ??
          node.otherwise;
        continue;
      case "CHOICE":
      case "AWAIT_OBJECTIVE":
      case "END":
        for (const line of node.lines) steps.push({ kind: "LINE", line });
        return { steps, stopNodeId: node.id };
    }
  }
  throw new Error(`Dialogue loop without a stop near ${nodeId}`);
}

export const SAME_TARGET_LABEL = "같은 시설 임무 진행 중";
export const BASE_ONLY_LABEL = "거점에서 진행";

/** 서버가 현재 상태로 확정하는 선택지 목록. 클라이언트는 이 값을 그대로 그린다. */
export function presentChoices(
  node: Extract<DialogueNode, { kind: "CHOICE" }>,
  state: DialogueState,
  objectives: Readonly<Record<string, MissionObjective>>,
): DialogueChoiceView[] {
  const blockedByRaid = state.inRaid && node.availability === "BASE_ONLY";
  return node.choices.map((choice) => {
    const conditionMet = !choice.condition || evaluateCondition(choice.condition, state);
    const accept = choice.effects?.find(
      (effect): effect is Extract<Effect, { type: "ACCEPT_OBJECTIVE" }> =>
        effect.type === "ACCEPT_OBJECTIVE",
    );
    const target = accept ? objectives[accept.objectiveId] : undefined;
    const sameTarget = target ? state.occupiedTargetNodeIds.has(target.targetNodeId) : false;
    const enabled = conditionMet && !sameTarget && !blockedByRaid;
    const conditionLabel = sameTarget
      ? SAME_TARGET_LABEL
      : blockedByRaid
        ? BASE_ONLY_LABEL
        : choice.condition
          ? choice.conditionLabel
          : undefined;
    return {
      id: choice.id,
      label: choice.label,
      enabled,
      ...(conditionLabel ? { conditionLabel } : {}),
    };
  });
}

// ---------------------------------------------------------------------------
// 정의 검증

const BASE_ONLY_EFFECTS = new Set<Effect["type"]>(["CONSUME_ITEMS", "SPEND_CREDITS"]);
const CHAIN_EFFECTS = new Set<Effect["type"]>(["UNLOCK_QUEST", "LOCK_QUEST"]);

function conditionNeedsBase(condition: Condition): boolean {
  switch (condition.type) {
    case "HAS_ITEM":
    case "CREDITS_GTE":
      return true;
    case "ALL":
    case "ANY":
      return condition.of.some(conditionNeedsBase);
    case "NOT":
      return conditionNeedsBase(condition.of);
    default:
      return false;
  }
}

function nextIds(node: DialogueNode): string[] {
  switch (node.kind) {
    case "LINES":
    case "AWAIT_OBJECTIVE":
      return [node.next];
    case "CHOICE":
      return node.choices.map((choice) => choice.next);
    case "BRANCH":
      return [...node.cases.map((item) => item.next), node.otherwise];
    case "END":
      return [];
  }
}

export interface ValidatableMission {
  id: string;
  act: number;
  objectives: Readonly<Record<string, MissionObjective>>;
  dialogue: DialogueGraph;
}

/** 한 임무 대화 정의의 구조 규칙 위반을 문장 목록으로 돌려준다. 비어 있으면 통과. */
export function validateMissionDialogue(
  mission: ValidatableMission,
  knownItemIds?: ReadonlySet<string>,
): string[] {
  const errors: string[] = [];
  const { nodes, entry } = mission.dialogue;
  const at = (nodeId: string) => `${mission.id}/${nodeId}`;
  for (const [key, node] of Object.entries(nodes)) {
    if (node.id !== key) errors.push(`${at(key)}: 노드 ID가 키와 다릅니다.`);
    for (const next of nextIds(node))
      if (!nodes[next]) errors.push(`${at(key)}: 없는 노드 ${next}로 이어집니다.`);
    if (node.kind === "CHOICE") {
      if (node.choices.length === 0) errors.push(`${at(key)}: 선택지가 없습니다.`);
      if (!node.choices.some((choice) => !choice.condition))
        errors.push(`${at(key)}: 조건 없는 선택지가 최소 1개 필요합니다.`);
      const ids = new Set<string>();
      for (const choice of node.choices) {
        if (ids.has(choice.id)) errors.push(`${at(key)}: 선택지 ID ${choice.id}가 중복됩니다.`);
        ids.add(choice.id);
        if (choice.condition && conditionNeedsBase(choice.condition) && node.availability !== "BASE_ONLY")
          errors.push(`${at(key)}: 보유 조건은 BASE_ONLY 노드에서만 쓸 수 있습니다.`);
      }
    }
    const effects =
      node.kind === "LINES"
        ? (node.effects ?? [])
        : node.kind === "CHOICE"
          ? node.choices.flatMap((choice) => choice.effects ?? [])
          : [];
    for (const effect of effects) {
      if (BASE_ONLY_EFFECTS.has(effect.type) && !(node.kind === "CHOICE" && node.availability === "BASE_ONLY"))
        errors.push(`${at(key)}: 전달 효과(${effect.type})는 BASE_ONLY 선택 노드에서만 쓸 수 있습니다.`);
      if (mission.act <= 1 && CHAIN_EFFECTS.has(effect.type))
        errors.push(`${at(key)}: 1막 임무는 임무 체인을 바꿀 수 없습니다(${effect.type}).`);
      if (effect.type === "ACCEPT_OBJECTIVE" && !mission.objectives[effect.objectiveId])
        errors.push(`${at(key)}: 없는 목표 ${effect.objectiveId}입니다.`);
      if ((effect.type === "GRANT_ITEMS" || effect.type === "CONSUME_ITEMS") && knownItemIds)
        for (const item of effect.items)
          if (!knownItemIds.has(item.weaponId)) errors.push(`${at(key)}: 없는 아이템 ${item.weaponId}입니다.`);
    }
  }
  if (!nodes[entry]) {
    errors.push(`${mission.id}: 시작 노드 ${entry}가 없습니다.`);
    return errors;
  }

  // 도달 가능성
  const reachable = new Set<string>();
  const stack = [entry];
  while (stack.length) {
    const id = stack.pop()!;
    if (reachable.has(id) || !nodes[id]) continue;
    reachable.add(id);
    stack.push(...nextIds(nodes[id]!));
  }
  for (const id of Object.keys(nodes))
    if (!reachable.has(id)) errors.push(`${at(id)}: 시작 노드에서 도달할 수 없습니다.`);

  // 경로 규칙: 수락은 AWAIT 전에 정확히 한 번, 이후 재수락 금지, 거절은 수락 선택지와 같은 노드에서만,
  // 모든 경로는 END에 도달.
  const acceptNodeIds = new Set(
    Object.values(nodes)
      .filter((node) => node.kind === "CHOICE" && node.choices.some((choice) => choice.effects?.some((effect) => effect.type === "ACCEPT_OBJECTIVE")))
      .map((node) => node.id),
  );
  const walk = (nodeId: string, accepted: number, depth: number, onPath: Set<string>) => {
    if (depth > 200) {
      errors.push(`${at(nodeId)}: 경로가 너무 깁니다.`);
      return;
    }
    const node = nodes[nodeId];
    if (!node) return;
    if (onPath.has(nodeId)) {
      if (node.kind !== "CHOICE" && ![...onPath].some((id) => nodes[id]?.kind === "CHOICE"))
        errors.push(`${at(nodeId)}: 선택 없이 순환합니다.`);
      return;
    }
    const path = new Set(onPath).add(nodeId);
    if (node.kind === "AWAIT_OBJECTIVE" && accepted !== 1)
      errors.push(`${at(nodeId)}: 목표 대기 전에 수락이 정확히 한 번 있어야 합니다(현재 ${accepted}).`);
    if (node.kind === "END") {
      if (node.outcome === "DECLINED" && accepted > 0)
        errors.push(`${at(nodeId)}: 수락 뒤에는 거절로 끝날 수 없습니다.`);
      return;
    }
    if (node.kind === "CHOICE") {
      for (const choice of node.choices) {
        const accepts = choice.effects?.filter((effect) => effect.type === "ACCEPT_OBJECTIVE").length ?? 0;
        const target = nodes[choice.next];
        if (target?.kind === "END" && target.outcome === "DECLINED" && !acceptNodeIds.has(node.id))
          errors.push(`${at(node.id)}: 거절은 수락 선택지가 있는 마지막 선택 노드에만 둘 수 있습니다.`);
        walk(choice.next, accepted + accepts, depth + 1, path);
      }
      return;
    }
    const accepts =
      node.kind === "LINES"
        ? (node.effects?.filter((effect) => effect.type === "ACCEPT_OBJECTIVE").length ?? 0)
        : 0;
    for (const next of nextIds(node)) walk(next, accepted + accepts, depth + 1, path);
  };
  walk(entry, 0, 0, new Set());
  return [...new Set(errors)];
}

/** 정의 그래프에서 첫 번째 선택지만 따라간 기본 경로(이관·호환 래퍼용). */
export function defaultChoice(
  node: Extract<DialogueNode, { kind: "CHOICE" }>,
): DialogueChoice {
  return node.choices.find((choice) => !choice.condition) ?? node.choices[0]!;
}

// ---------------------------------------------------------------------------
// 체인 전수 탐색: 어떤 선택 조합으로도 "열린 임무가 없는데 결말도 아닌" 상태가 생기지 않는지 확인한다.

export interface ChainMission extends ValidatableMission {
  unlock: Condition;
  /** 이 임무를 끝내면 체인이 끝난 것으로 본다. */
  final?: boolean;
}

export function isMissionUnlocked(
  mission: Pick<ChainMission, "id" | "unlock">,
  state: DialogueState,
): boolean {
  if (state.flags.get(`lock:${mission.id}`) === true) return false;
  return state.flags.get(`unlock:${mission.id}`) === true || evaluateCondition(mission.unlock, state);
}

interface PathResult {
  flags: Map<string, FlagValue>;
  choices: Set<string>;
  outcome: QuestOutcome;
}

function enumeratePaths(mission: ChainMission, state: DialogueState): PathResult[] {
  const results: PathResult[] = [];
  const visit = (nodeId: string, flags: Map<string, FlagValue>, choices: Set<string>, depth: number) => {
    if (depth > 100 || results.length > 256) return;
    const applyEffects = (effects: readonly Effect[] | undefined, target: Map<string, FlagValue>) => {
      for (const effect of effects ?? []) {
        if (effect.type === "SET_FLAG") target.set(effect.key, effect.value);
        if (effect.type === "UNLOCK_QUEST") target.set(`unlock:${effect.questId}`, true);
        if (effect.type === "LOCK_QUEST") target.set(`lock:${effect.questId}`, true);
      }
    };
    const node = getNode(mission.dialogue, nodeId);
    switch (node.kind) {
      case "LINES": {
        const next = new Map(flags);
        applyEffects(node.effects, next);
        visit(node.next, next, choices, depth + 1);
        return;
      }
      case "BRANCH": {
        const local = { ...state, flags };
        visit(node.cases.find((item) => evaluateCondition(item.when, local))?.next ?? node.otherwise, flags, choices, depth + 1);
        return;
      }
      case "AWAIT_OBJECTIVE":
        visit(node.next, flags, choices, depth + 1);
        return;
      case "CHOICE":
        for (const choice of node.choices) {
          const next = new Map(flags);
          applyEffects(choice.effects, next);
          visit(choice.next, next, new Set(choices).add(choice.id), depth + 1);
        }
        return;
      case "END":
        results.push({ flags, choices, outcome: node.outcome });
    }
  };
  visit(mission.dialogue.entry, new Map(state.flags), new Set(), 0);
  return results;
}

export function validateChain(missions: readonly ChainMission[], maxStates = 20_000): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  const start: DialogueState = {
    inRaid: false,
    flags: new Map(),
    quests: new Map(),
    stash: new Map(),
    credits: 0,
    occupiedTargetNodeIds: new Set(),
  };
  const stack: { state: DialogueState; trail: string[] }[] = [{ state: start, trail: [] }];
  while (stack.length) {
    if (seen.size > maxStates) {
      errors.push(`체인 상태가 ${maxStates}개를 넘어 탐색을 중단했습니다.`);
      break;
    }
    const { state, trail } = stack.pop()!;
    const key = JSON.stringify([
      [...state.flags.entries()].sort(),
      [...state.quests.entries()].map(([id, q]) => [id, q.outcome, [...q.choices].sort()]).sort(),
    ]);
    if (seen.has(key)) continue;
    seen.add(key);
    const finished = (id: string) => {
      const quest = state.quests.get(id);
      return quest?.outcome !== null && quest?.outcome !== undefined;
    };
    if (missions.some((mission) => mission.final && state.quests.get(mission.id)?.outcome === "COMPLETE")) continue;
    const open = missions.filter((mission) => !finished(mission.id) && isMissionUnlocked(mission, state));
    if (open.length === 0) {
      errors.push(`열린 임무 없이 체인이 멈춥니다: ${trail.join(" → ") || "(시작)"}`);
      continue;
    }
    for (const mission of open) {
      for (const path of enumeratePaths(mission, state)) {
        const quests = new Map(state.quests);
        quests.set(mission.id, {
          status: path.outcome === "COMPLETE" ? "COMPLETE" : "LOCKED",
          outcome: path.outcome,
          choices: path.choices,
        });
        stack.push({
          state: { ...state, flags: path.flags, quests },
          trail: [...trail, `${mission.id}(${[...path.choices].join(",")})`],
        });
      }
    }
  }
  return [...new Set(errors)].slice(0, 20);
}

// ---------------------------------------------------------------------------
// DB에 저장하는 대화 기록 형태

export type StoredSpeaker =
  | { kind: "NPC"; contactId: string }
  | { kind: "PLAYER" }
  | { kind: "SYSTEM" };

export interface StoredDialogueEntry {
  seq: number;
  speaker: StoredSpeaker;
  text: string;
  pace: DialoguePace;
  pauseBeforeMs: number;
  context: "BASE" | "RAID";
}

export interface StoredChoiceRecord {
  seq: number;
  nodeId: string;
  choiceId: string;
  at: string;
  raidId: string | null;
}

export interface StoredPresentedChoices {
  nodeId: string;
  context: "BASE" | "RAID";
  choices: DialogueChoiceView[];
}
