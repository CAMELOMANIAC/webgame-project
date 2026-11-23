import type { MissionStatus } from "./index";

// 임무 대화(채팅형) 화면 DTO. 대화 정의는 서버 전용이며, 클라이언트는 이 타입으로 내려온 값만 렌더링한다.

export type DialoguePace = "INSTANT" | "FAST" | "NORMAL" | "SLOW";

export type DialogueContext = "BASE" | "RAID";

export type QuestOutcome = "COMPLETE" | "DECLINED" | "FAILED";

export type DialogueSpeakerView =
  | { kind: "NPC"; contactId: string; name: string; role: string }
  | { kind: "PLAYER" }
  | { kind: "SYSTEM" };

export interface DialogueEntry {
  seq: number;
  speaker: DialogueSpeakerView;
  text: string;
  pace: DialoguePace;
  pauseBeforeMs: number;
  context: DialogueContext;
}

export interface DialogueChoiceView {
  id: string;
  label: string;
  enabled: boolean;
  conditionLabel?: string;
}

export type QuestDialoguePending =
  | { kind: "CHOICE"; choices: DialogueChoiceView[] }
  | { kind: "BASE_ONLY"; choices: DialogueChoiceView[] }
  | { kind: "AWAIT_OBJECTIVE" }
  | { kind: "END"; outcome: QuestOutcome };

export interface QuestObjectiveView {
  targetNodeId: number;
  targetLabel: string;
}

export interface QuestDialogueView {
  questId: string;
  title: string;
  status: MissionStatus;
  seq: number;
  readSeq: number;
  objective: QuestObjectiveView | null;
  transcript: DialogueEntry[];
  pending: QuestDialoguePending;
}

export interface AdvanceQuestDialogueRequest {
  requestId: string;
  expectedSeq: number;
  choiceId?: string;
}

export interface ReadQuestDialogueRequest {
  seq: number;
}
