import type { DialoguePace, QuestOutcome } from "@webgame/types";

import type {
  Condition,
  DialogueChoice,
  DialogueGraph,
  DialogueLine,
  DialogueNode,
  Effect,
  FlagValue,
  ItemGrant,
  MissionObjective,
  SpeakerRef,
} from "./questDialogue";

// docs/quest-story-dialogue.md 원고(§11.7 양식)를 대화 정의로 옮기는 파서.
// 원고 형식이 어긋나면 줄 번호와 함께 오류를 던진다.

export interface ManuscriptMission {
  id: string;
  act: number;
  issuerContactId: string;
  unlock: Condition;
  objectives: Record<string, MissionObjective>;
  dialogue: DialogueGraph;
}

export const SPEAKER_CONTACT_IDS: Record<string, string> = {
  "조 시설과장": "relief-contact",
  "최 사장": "market-contact",
  "윤 책임연구원": "lab-contact",
};

const PACES: Record<string, DialoguePace> = {
  즉시: "INSTANT",
  빠르게: "FAST",
  보통: "NORMAL",
  느리게: "SLOW",
};

class ManuscriptError extends Error {}

function fail(line: number, message: string): never {
  throw new ManuscriptError(`원고 ${line}행: ${message}`);
}

/** 괄호·대괄호 깊이를 지키며 최상위 쉼표로 나눈다. */
function splitTopLevel(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote = false;
  let current = "";
  for (const char of text) {
    if (char === '"') quote = !quote;
    if (!quote && (char === "(" || char === "[")) depth += 1;
    if (!quote && (char === ")" || char === "]")) depth -= 1;
    if (!quote && depth === 0 && char === ",") {
      parts.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

/** `NAME(args)` 형태를 읽고, 닫는 괄호 뒤 설명은 버린다. */
function callOf(text: string, line: number): { name: string; args: string } {
  const match = /^([A-Z_]+)\(/.exec(text.trim());
  if (!match) fail(line, `호출 형식이 아닙니다: ${text}`);
  const source = text.trim();
  let depth = 0;
  for (let index = match[0].length - 1; index < source.length; index++) {
    const char = source[index];
    if (char === "(") depth += 1;
    if (char === ")") {
      depth -= 1;
      if (depth === 0) return { name: match[1]!, args: source.slice(match[0].length, index) };
    }
  }
  fail(line, `괄호가 닫히지 않았습니다: ${text}`);
}

function parseItems(args: string, line: number): ItemGrant[] {
  return splitTopLevel(args).map((part) => {
    const match = /^([\w-]+)\s*×\s*(\d+)$/.exec(part.trim());
    if (!match) fail(line, `아이템 형식(id ×수량)이 아닙니다: ${part}`);
    return { weaponId: match[1]!, quantity: Number(match[2]) };
  });
}

function parseValue(raw: string): FlagValue {
  const value = raw.trim().replace(/^"(.*)"$/, "$1");
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+$/.test(value)) return Number(value);
  return value;
}

export function parseCondition(text: string, line: number): Condition {
  const { name, args } = callOf(text, line);
  switch (name) {
    case "ALL":
    case "ANY":
      return { type: name, of: splitTopLevel(args).map((part) => parseCondition(part, line)) };
    case "NOT":
      return { type: "NOT", of: parseCondition(args, line) };
    case "QUEST_OUTCOME": {
      const [questId, outcome] = splitTopLevel(args);
      if (!questId || !outcome || !["COMPLETE", "DECLINED", "FAILED"].includes(outcome))
        fail(line, `QUEST_OUTCOME 형식 오류: ${text}`);
      return { type: "QUEST_OUTCOME", questId, outcome: outcome as QuestOutcome };
    }
    case "FLAG": {
      const match = /^([\w-]+)\s*(?:==\s*(.+))?$/.exec(args.trim());
      if (!match) fail(line, `FLAG 형식 오류: ${text}`);
      return match[2] === undefined
        ? { type: "FLAG", key: match[1]! }
        : { type: "FLAG", key: match[1]!, equals: parseValue(match[2]) };
    }
    case "HAS_ITEM": {
      const [item] = parseItems(args, line);
      return { type: "HAS_ITEM", itemId: item!.weaponId, quantity: item!.quantity };
    }
    case "CREDITS_GTE":
      return { type: "CREDITS_GTE", amount: Number(args) };
    case "CHOSE": {
      const [questId, choiceId] = splitTopLevel(args);
      if (!questId || !choiceId) fail(line, `CHOSE 형식 오류: ${text}`);
      return { type: "CHOSE", questId, choiceId };
    }
    default:
      fail(line, `알 수 없는 조건 ${name}`);
  }
}

function parseIdList(text: string | undefined): string[] {
  if (!text) return [];
  return text
    .replace(/^\[|\]$/g, "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseEffects(text: string, line: number): Effect[] {
  return splitTopLevel(text).map((part): Effect => {
    const { name, args } = callOf(part, line);
    switch (name) {
      case "ACCEPT_OBJECTIVE":
        return { type: "ACCEPT_OBJECTIVE", objectiveId: args.trim() };
      case "GRANT_ITEMS":
      case "CONSUME_ITEMS":
        return { type: name, items: parseItems(args, line) };
      case "GRANT_CREDITS":
      case "SPEND_CREDITS":
        return { type: name, amount: Number(args) };
      case "SET_FLAG": {
        const match = /^([\w-]+)\s*=\s*(.+)$/.exec(args.trim());
        if (!match) fail(line, `SET_FLAG 형식 오류: ${part}`);
        return { type: "SET_FLAG", key: match[1]!, value: parseValue(match[2]!) };
      }
      case "DISCLOSE": {
        const records = /records:\s*(\[[^\]]*\])/.exec(args)?.[1];
        const contacts = /contacts:\s*(\[[^\]]*\])/.exec(args)?.[1];
        return {
          type: "DISCLOSE",
          recordIds: parseIdList(records),
          contactIds: parseIdList(contacts),
        };
      }
      case "UNLOCK_QUEST":
      case "LOCK_QUEST":
        return { type: name, questId: args.trim() };
      case "RAISE_STORY_TIER":
        return { type: "RAISE_STORY_TIER", tier: Number(args) };
      default:
        fail(line, `알 수 없는 효과 ${name}`);
    }
  });
}

function parseSpeakerLine(text: string, line: number): DialogueLine | null {
  const match = /^(.+?)\s*\[([^\]]+)\]:\s*(.+)$/.exec(text);
  if (!match) return null;
  const [, speakerName, meta, body] = match;
  let speaker: SpeakerRef;
  if (speakerName === "플레이어") speaker = "player";
  else if (speakerName === "시스템") speaker = "system";
  else {
    const contactId = SPEAKER_CONTACT_IDS[speakerName!];
    if (!contactId) fail(line, `알 수 없는 화자 ${speakerName}`);
    speaker = { contactId };
  }
  let pace: DialoguePace | undefined;
  let pauseBeforeMs = 0;
  for (const token of meta!.split(",").map((item) => item.trim())) {
    if (PACES[token]) pace = PACES[token];
    else if (/^[\d.]+초 쉼$/.test(token)) pauseBeforeMs = Math.round(Number.parseFloat(token) * 1000);
    else fail(line, `알 수 없는 연출 표기 [${token}]`);
  }
  return {
    speaker,
    text: body!.trim(),
    ...(pace ? { pace } : {}),
    ...(pauseBeforeMs ? { pauseBeforeMs } : {}),
  };
}

const ARROW_TARGET = /^→\s*([\w-]+)/;

interface RawNode {
  id: string;
  header: string;
  line: number;
  body: { text: string; line: number }[];
}

function buildNode(raw: RawNode, graphLines: Map<string, number>): DialogueNode {
  const header = raw.header;
  const lines: DialogueLine[] = [];
  const at: (line: number, message: string) => never = (line, message) =>
    fail(line, `${raw.id}: ${message}`);
  graphLines.set(raw.id, raw.line);

  if (header.startsWith("BRANCH")) {
    const cases: { when: Condition; next: string }[] = [];
    let otherwise: string | undefined;
    for (const { text, line } of raw.body) {
      const when = /^- when:\s*(.+?)\s*→\s*([\w-]+)$/.exec(text);
      const other = /^- otherwise\s*→\s*([\w-]+)$/.exec(text);
      if (when) cases.push({ when: parseCondition(when[1]!, line), next: when[2]! });
      else if (other) otherwise = other[1]!;
      else at(line, `BRANCH 줄 형식 오류: ${text}`);
    }
    if (!otherwise) at(raw.line, "BRANCH에 otherwise가 없습니다.");
    return { id: raw.id, kind: "BRANCH", cases, otherwise };
  }

  if (header.startsWith("END")) {
    const outcome = /END:\s*(COMPLETE|DECLINED|FAILED)/.exec(header)?.[1] as QuestOutcome | undefined;
    if (!outcome) at(raw.line, "END 결과(COMPLETE/DECLINED/FAILED)가 없습니다.");
    for (const { text, line } of raw.body) {
      const spoken = parseSpeakerLine(text, line);
      if (spoken) lines.push(spoken);
      else at(line, `END 노드에는 대사만 올 수 있습니다: ${text}`);
    }
    return { id: raw.id, kind: "END", lines, outcome };
  }

  if (header.startsWith("AWAIT_OBJECTIVE")) {
    let recovered: string | undefined;
    let ready: string | undefined;
    for (const { text, line } of raw.body) {
      const spoken = parseSpeakerLine(text, line);
      if (spoken) lines.push(spoken);
      else if (/^onRecovered\s*→/.test(text)) recovered = /→\s*([\w-]+)/.exec(text)?.[1];
      else if (/^onReady\s*→/.test(text)) ready = /→\s*([\w-]+)/.exec(text)?.[1];
      else at(line, `AWAIT 줄 형식 오류: ${text}`);
    }
    if (!ready) at(raw.line, "onReady가 없습니다.");
    return {
      id: raw.id,
      kind: "AWAIT_OBJECTIVE",
      lines,
      next: ready,
      ...(recovered ? { recoveredFrom: recovered } : {}),
    } as DialogueNode;
  }

  if (header.startsWith("CHOICE")) {
    const availability = /availability:\s*(BASE_ONLY|ANYWHERE)/.exec(header)?.[1] as
      | "BASE_ONLY"
      | "ANYWHERE"
      | undefined;
    const choices: DialogueChoice[] = [];
    let current: (Omit<DialogueChoice, "next"> & { next?: string }) | null = null;
    const flush = (line: number) => {
      if (!current) return;
      if (!current.next) at(line, `선택지 "${current.label}"의 다음 노드가 없습니다.`);
      choices.push(current as DialogueChoice);
      current = null;
    };
    for (const { text, line } of raw.body) {
      const choice = /^- 선택지\s*"(.+)"\s*(?:→\s*([\w-]+))?$/.exec(text);
      if (choice) {
        flush(line);
        current = {
          id: `c${choices.length + 1}`,
          label: choice[1]!,
          ...(choice[2] ? { next: choice[2] } : {}),
        };
        continue;
      }
      if (!current) {
        const spoken = parseSpeakerLine(text, line);
        if (spoken) lines.push(spoken);
        else at(line, `선택 노드 줄 형식 오류: ${text}`);
        continue;
      }
      const condition = /^\[조건:\s*(.+?)\s*\/\s*조건 문구:\s*"(.+)"\]$/.exec(text);
      const effects = /^→ 효과:\s*(.+)$/.exec(text);
      const target = ARROW_TARGET.exec(text);
      if (condition) {
        current.condition = parseCondition(condition[1]!, line);
        current.conditionLabel = condition[2]!.replace(/^조건:\s*/, "");
      } else if (effects) current.effects = parseEffects(effects[1]!, line);
      else if (target) current.next = target[1]!;
      else at(line, `선택지 줄 형식 오류: ${text}`);
    }
    flush(raw.line);
    return {
      id: raw.id,
      kind: "CHOICE",
      lines,
      choices,
      ...(availability === "BASE_ONLY" ? { availability } : {}),
    };
  }

  if (header.startsWith("LINES")) {
    let effects: Effect[] | undefined;
    let next: string | undefined;
    for (const { text, line } of raw.body) {
      const spoken = parseSpeakerLine(text, line);
      const effect = /^→ 효과:\s*(.+)$/.exec(text);
      const target = ARROW_TARGET.exec(text);
      if (spoken) lines.push(spoken);
      else if (effect) effects = parseEffects(effect[1]!, line);
      else if (target) next = target[1]!;
      else at(line, `대사 노드 줄 형식 오류: ${text}`);
    }
    if (!next) at(raw.line, "다음 노드(→)가 없습니다.");
    return { id: raw.id, kind: "LINES", lines, next, ...(effects ? { effects } : {}) };
  }

  at(raw.line, `알 수 없는 노드 종류: ${header}`);
}

function parseHeader(block: { text: string; line: number }[]) {
  const first = block[0];
  if (!first) fail(0, "빈 임무 블록입니다.");
  const id = /\(([\w-]+)\)\s*$/.exec(first.text)?.[1];
  if (!id) fail(first.line, "임무 ID를 찾을 수 없습니다.");
  let act = 0;
  let issuerContactId = "";
  let unlock: Condition | undefined;
  const objectives: Record<string, MissionObjective> = {};
  for (const { text: rawText, line } of block) {
    const text = rawText.trim();
    const issuer = /^발령자:\s*.+?\(([\w-]+)\s*\//.exec(text);
    if (issuer) issuerContactId = issuer[1]!;
    const actMatch = /^막:\s*(\d+)/.exec(text);
    if (actMatch) act = Number(actMatch[1]);
    const unlockMatch = /^해금 조건:\s*(.+)$/.exec(text);
    if (unlockMatch) {
      unlock = /^[A-Z_]+\(/.test(unlockMatch[1]!)
        ? parseCondition(unlockMatch[1]!, line)
        : { type: "ALL", of: [] };
    }
    const objective = /^- ([\w-]+):\s*(.+?)\s*\/\s*노드\s*#(\d+)\s*\/\s*임무 적\s*([\w-]+)/.exec(text);
    if (objective)
      objectives[objective[1]!] = {
        id: objective[1]!,
        targetLabel: objective[2]!.trim(),
        targetNodeId: Number(objective[3]),
        enemyArchetypeId: objective[4]!,
      };
  }
  if (!act) fail(first.line, `${id}: 막이 없습니다.`);
  if (!issuerContactId) fail(first.line, `${id}: 발령자 ID가 없습니다.`);
  if (!unlock) fail(first.line, `${id}: 해금 조건이 없습니다.`);
  if (Object.keys(objectives).length === 0) fail(first.line, `${id}: 목표가 없습니다.`);
  return { id, act, issuerContactId, unlock, objectives };
}

/** 원고 전체를 읽어 임무별 정의를 돌려준다. */
export function parseStoryManuscript(source: string): ManuscriptMission[] {
  const allLines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: { text: string; line: number }[][] = [];
  let inFence = false;
  let current: { text: string; line: number }[] = [];
  allLines.forEach((text, index) => {
    if (text.startsWith("```")) {
      if (inFence && current.some((item) => item.text.startsWith("[임무]"))) blocks.push(current);
      inFence = !inFence;
      current = [];
      return;
    }
    if (inFence) current.push({ text, line: index + 1 });
  });

  return blocks.map((block) => {
    const nodeStart = block.findIndex((item) => item.text.startsWith("[노드]"));
    const header = parseHeader(nodeStart >= 0 ? block.slice(0, nodeStart) : block);
    const rawNodes: RawNode[] = [];
    for (const item of block.slice(nodeStart)) {
      const start = /^\[노드\]\s*([\w-]+)\s*\((.+)\)\s*$/.exec(item.text);
      if (start) {
        rawNodes.push({ id: start[1]!, header: start[2]!, line: item.line, body: [] });
        continue;
      }
      const text = item.text.trim();
      if (!text) continue;
      const node = rawNodes.at(-1);
      if (!node) fail(item.line, "노드 밖의 줄입니다.");
      node.body.push({ text, line: item.line });
    }
    const graphLines = new Map<string, number>();
    const nodes: Record<string, DialogueNode> = {};
    for (const raw of rawNodes) {
      if (nodes[raw.id]) fail(raw.line, `${header.id}: 노드 ID ${raw.id}가 중복됩니다.`);
      nodes[raw.id] = buildNode(raw, graphLines);
    }
    // onRecovered가 가리키는 대사 노드는 목표 대기 노드의 회수 직후 대사로 합친다.
    for (const node of Object.values(nodes)) {
      const recoveredFrom = (node as { recoveredFrom?: string }).recoveredFrom;
      if (node.kind !== "AWAIT_OBJECTIVE" || !recoveredFrom) continue;
      const source = nodes[recoveredFrom];
      if (!source || source.kind !== "LINES" || source.next !== node.id)
        fail(graphLines.get(node.id) ?? 0, `${header.id}/${node.id}: onRecovered는 이 노드로 돌아오는 대사 노드여야 합니다.`);
      if (source.effects?.length)
        fail(graphLines.get(recoveredFrom) ?? 0, `${header.id}/${recoveredFrom}: 회수 직후 대사에는 효과를 둘 수 없습니다.`);
      const { recoveredFrom: _drop, ...rest } = node as typeof node & { recoveredFrom?: string };
      void _drop;
      nodes[node.id] = { ...rest, recoveredLines: source.lines };
      delete nodes[recoveredFrom];
    }
    const entry = rawNodes[0]?.id;
    if (!entry) fail(block[0]?.line ?? 0, `${header.id}: 노드가 없습니다.`);
    return { ...header, dialogue: { entry, nodes } };
  });
}
