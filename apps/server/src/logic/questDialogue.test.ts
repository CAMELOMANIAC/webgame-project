import assert from "node:assert/strict";
import { test } from "node:test";

import { ALL_CATALOG_ITEMS } from "@webgame/types";

import {
  type ChainMission,
  type DialogueGraph,
  type DialogueState,
  evaluateCondition,
  presentChoices,
  runToStop,
  SAME_TARGET_LABEL,
  validateChain,
  validateMissionDialogue,
} from "./questDialogue";
import { MISSION_CHAIN } from "./story";

function state(overrides: Partial<DialogueState> = {}): DialogueState {
  return {
    inRaid: false,
    flags: new Map(),
    quests: new Map(),
    stash: new Map(),
    credits: 0,
    occupiedTargetNodeIds: new Set(),
    ...overrides,
  };
}

const objectives = {
  a: { id: "a", targetNodeId: 26, targetLabel: "A", enemyArchetypeId: "npc-hanlim-control" },
  b: { id: "b", targetNodeId: 30, targetLabel: "B", enemyArchetypeId: "npc-hanlim-control" },
};

const branchingGraph: DialogueGraph = {
  entry: "intro",
  nodes: {
    intro: {
      id: "intro",
      kind: "LINES",
      lines: [{ speaker: "issuer", text: "첫 줄." }],
      effects: [{ type: "SET_FLAG", key: "met", value: true }],
      next: "fork",
    },
    fork: {
      id: "fork",
      kind: "BRANCH",
      cases: [{ when: { type: "FLAG", key: "met" }, next: "offer" }],
      otherwise: "never",
    },
    never: { id: "never", kind: "END", lines: [], outcome: "FAILED" },
    offer: {
      id: "offer",
      kind: "CHOICE",
      lines: [{ speaker: "issuer", text: "어느 쪽으로 가시겠습니까?", pace: "SLOW" }],
      choices: [
        { id: "go-a", label: "A", effects: [{ type: "ACCEPT_OBJECTIVE", objectiveId: "a" }], next: "await" },
        { id: "go-b", label: "B", effects: [{ type: "ACCEPT_OBJECTIVE", objectiveId: "b" }], next: "await" },
        { id: "decline", label: "거절", next: "declined" },
      ],
    },
    declined: { id: "declined", kind: "END", lines: [], outcome: "DECLINED" },
    await: { id: "await", kind: "AWAIT_OBJECTIVE", lines: [], next: "report" },
    report: {
      id: "report",
      kind: "CHOICE",
      availability: "BASE_ONLY",
      lines: [],
      choices: [
        { id: "plain", label: "보고", next: "end" },
        {
          id: "bribe",
          label: "붕대를 건넨다",
          condition: { type: "HAS_ITEM", itemId: "med-bandage" },
          conditionLabel: "압박 붕대 1개",
          effects: [{ type: "CONSUME_ITEMS", items: [{ weaponId: "med-bandage", quantity: 1 }] }],
          next: "end",
        },
      ],
    },
    end: { id: "end", kind: "END", lines: [], outcome: "COMPLETE" },
  },
};

const branchingMission: ChainMission = {
  id: "test-branching",
  act: 2,
  objectives,
  dialogue: branchingGraph,
  unlock: { type: "ALL", of: [] },
  final: true,
};

test("대화는 LINES와 BRANCH를 따라 첫 선택 노드에서 멈추고, 앞에서 세운 플래그로 분기한다", () => {
  const result = runToStop(branchingGraph, "intro", state());
  assert.equal(result.stopNodeId, "offer");
  assert.deepEqual(
    result.steps.map((step) => (step.kind === "LINE" ? step.line.text : step.effect.type)),
    ["첫 줄.", "SET_FLAG", "어느 쪽으로 가시겠습니까?"],
  );
});

test("조건은 아이템·크레딧·플래그·이전 선택·임무 결과를 평가한다", () => {
  const s = state({
    stash: new Map([["med-bandage", 2]]),
    credits: 100,
    flags: new Map([["route", "jo"]]),
    quests: new Map([["q1", { status: "COMPLETE", outcome: "COMPLETE", choices: new Set(["yun"]) }]]),
  });
  assert.ok(evaluateCondition({ type: "HAS_ITEM", itemId: "med-bandage", quantity: 2 }, s));
  assert.ok(!evaluateCondition({ type: "HAS_ITEM", itemId: "med-bandage", quantity: 3 }, s));
  assert.ok(evaluateCondition({ type: "CREDITS_GTE", amount: 100 }, s));
  assert.ok(evaluateCondition({ type: "FLAG", key: "route", equals: "jo" }, s));
  assert.ok(!evaluateCondition({ type: "FLAG", key: "route", equals: "choi" }, s));
  assert.ok(evaluateCondition({ type: "CHOSE", questId: "q1", choiceId: "yun" }, s));
  assert.ok(evaluateCondition({ type: "QUEST_OUTCOME", questId: "q1", outcome: "COMPLETE" }, s));
  assert.ok(evaluateCondition({ type: "QUEST_STATUS", questId: "q2", status: "OFFERED" }, s));
  assert.ok(
    evaluateCondition(
      { type: "ALL", of: [{ type: "NOT", of: { type: "FLAG", key: "missing" } }, { type: "ANY", of: [{ type: "FLAG", key: "route" }] }] },
      s,
    ),
  );
});

test("서버가 확정하는 선택지: 조건 미충족은 딤드, 같은 노드 목표와 탐사 중 거점 전용 노드는 비활성", () => {
  const offer = branchingGraph.nodes.offer;
  const report = branchingGraph.nodes.report;
  assert.ok(offer?.kind === "CHOICE" && report?.kind === "CHOICE");

  const occupied = presentChoices(offer, state({ occupiedTargetNodeIds: new Set([26]) }), objectives);
  assert.deepEqual(
    occupied.map((choice) => [choice.id, choice.enabled, choice.conditionLabel]),
    [
      ["go-a", false, SAME_TARGET_LABEL],
      ["go-b", true, undefined],
      ["decline", true, undefined],
    ],
  );

  const noBandage = presentChoices(report, state(), objectives);
  assert.deepEqual(noBandage.map((choice) => choice.enabled), [true, false]);
  assert.equal(noBandage[1]?.conditionLabel, "압박 붕대 1개");

  const inRaid = presentChoices(report, state({ inRaid: true, stash: new Map([["med-bandage", 1]]) }), objectives);
  assert.ok(inRaid.every((choice) => !choice.enabled));
});

test("정의 검증은 구조 규칙 위반을 찾아낸다", () => {
  assert.deepEqual(validateMissionDialogue(branchingMission), []);

  const broken: ChainMission = {
    ...branchingMission,
    act: 1,
    dialogue: {
      entry: "offer",
      nodes: {
        offer: {
          id: "offer",
          kind: "CHOICE",
          lines: [],
          choices: [
            {
              id: "only",
              label: "조건부",
              condition: { type: "FLAG", key: "x" },
              effects: [{ type: "UNLOCK_QUEST", questId: "other" }, { type: "CONSUME_ITEMS", items: [{ weaponId: "med-bandage", quantity: 1 }] }],
              next: "await",
            },
          ],
        },
        await: { id: "await", kind: "AWAIT_OBJECTIVE", lines: [], next: "late" },
        late: {
          id: "late",
          kind: "CHOICE",
          lines: [],
          choices: [{ id: "no", label: "거절", next: "declined" }],
        },
        declined: { id: "declined", kind: "END", lines: [], outcome: "DECLINED" },
        orphan: { id: "orphan", kind: "LINES", lines: [], next: "missing" },
      },
    },
  };
  const errors = validateMissionDialogue(broken).join("\n");
  assert.match(errors, /조건 없는 선택지/);
  assert.match(errors, /1막 임무는 임무 체인을 바꿀 수 없습니다/);
  assert.match(errors, /전달 효과/);
  assert.match(errors, /목표 대기 전에 수락이 정확히 한 번/);
  assert.match(errors, /거절은 수락 선택지가 있는 마지막 선택 노드에만/);
  assert.match(errors, /없는 노드 missing/);
  assert.match(errors, /도달할 수 없습니다/);
});

test("기존 6개 임무는 선형 대화로 옮겨져 규칙을 지키고, 체인이 끝까지 이어진다", () => {
  const itemIds = new Set(ALL_CATALOG_ITEMS.map((item) => item.id));
  for (const mission of MISSION_CHAIN) {
    assert.deepEqual(validateMissionDialogue(mission, itemIds), [], mission.id);
    const offer = mission.dialogue.nodes[mission.dialogue.entry];
    assert.equal(offer?.kind, "CHOICE");
    if (offer?.kind === "CHOICE") {
      assert.ok(offer.lines.length > 0);
      assert.ok(offer.lines.every((line) => !line.text.startsWith(mission.issuerName)));
    }
  }
  assert.deepEqual(validateChain(MISSION_CHAIN), []);
});

test("체인 검증은 분기로 다음 임무가 모두 닫히는 경우를 찾아낸다", () => {
  const dead: ChainMission[] = [
    {
      ...branchingMission,
      id: "first",
      final: false,
      dialogue: {
        entry: "offer",
        nodes: {
          offer: {
            id: "offer",
            kind: "CHOICE",
            lines: [],
            choices: [
              { id: "ok", label: "수락", effects: [{ type: "ACCEPT_OBJECTIVE", objectiveId: "a" }], next: "await" },
              { id: "no", label: "거절", effects: [{ type: "LOCK_QUEST", questId: "second" }], next: "declined" },
            ],
          },
          await: { id: "await", kind: "AWAIT_OBJECTIVE", lines: [], next: "end" },
          end: { id: "end", kind: "END", lines: [], outcome: "COMPLETE" },
          declined: { id: "declined", kind: "END", lines: [], outcome: "DECLINED" },
        },
      },
    },
    { ...branchingMission, id: "second", unlock: { type: "ALL", of: [] }, final: true },
  ];
  const errors = validateChain(dead);
  assert.ok(errors.some((error) => error.endsWith("first(no)")), errors.join("\n"));
  assert.ok(!errors.some((error) => /second\(go-[ab]\)/.test(error)), errors.join("\n"));
});
