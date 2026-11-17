import assert from "node:assert/strict";
import { test } from "node:test";
import type { BattleCombatant, WeaponData } from "@webgame/types";
import { simulateBattle } from "./simulateBattle";

function weapon(overrides: Partial<WeaponData> = {}): WeaponData {
  return {
    id: "test-weapon",
    name: "테스트 무기",
    damage: 100,
    staminaCost: 10,
    cooldownTicks: 2,
    castTicks: 0,
    weight: 1,
    value: 1,
    ...overrides,
  };
}

function player(
  id: string,
  teamId: string,
  overrides: Partial<BattleCombatant> = {},
): BattleCombatant {
  return {
    id,
    teamId,
    hp: 100,
    maxHp: 100,
    stamina: 100,
    maxStamina: 100,
    staminaRegen: 0,
    weight: 0,
    maxWeight: 60,
    time: 0,
    currentWeaponIndex: 0,
    weapons: [null, null, null, null, null, null],
    ...overrides,
  };
}

const options = { random: () => 0.5, maxTicks: 20 };

test("시전 무기의 공격 기록은 실제 슬롯 번호를 사용한다", () => {
  const log = simulateBattle(
    [
      player("p", "A", {
        weapons: [null, weapon({ castTicks: 1 }), null, null, null, null],
      }),
      player("e", "B"),
    ],
    options,
  );
  const events = log.timeline.flatMap((entry) => entry.events);
  const start = events.find((event) => event.type === "CAST_START");
  const attack = events.find((event) => event.type === "ATTACK");
  assert.equal(start?.type === "CAST_START" && start.weaponIndex, 1);
  assert.equal(attack?.type === "ATTACK" && attack.weaponIndex, 1);
  assert.equal(log.result.winnerTeamId, "A");
});

test("즉시 공격도 실제 슬롯과 쿨다운을 기록한다", () => {
  const log = simulateBattle(
    [
      player("p", "A", { weapons: [null, null, null, null, weapon(), null] }),
      player("e", "B"),
    ],
    options,
  );
  const events = log.timeline.flatMap((entry) => entry.events);
  assert.ok(
    events.some((event) => event.type === "ATTACK" && event.weaponIndex === 4),
  );
  assert.ok(
    events.some(
      (event) => event.type === "COOLDOWN" && event.weaponIndex === 4,
    ),
  );
  assert.equal(log.finalState.players[0]?.stamina, 90);
});

test("회복은 실제 회복량을 기록하고 전투당 한 번만 발동한다", () => {
  const healing = weapon({
    damage: 0,
    staminaCost: 20,
    effect: { type: "HEAL", amount: 80, hpThreshold: 0.5, oncePerBattle: true },
  });
  const log = simulateBattle(
    [
      player("p", "A", {
        hp: 30,
        weapons: [healing, null, null, null, null, null],
      }),
      player("e", "B"),
    ],
    options,
  );
  const heals = log.timeline
    .flatMap((entry) => entry.events)
    .filter((event) => event.type === "HEAL");
  assert.equal(heals.length, 1);
  assert.equal(heals[0]?.amount, 70);
  assert.equal(log.finalState.players[0]?.hp, 100);
  assert.equal(log.finalState.players[0]?.stamina, 80);
});

test("회복 조건을 만족하지 않으면 자원을 쓰지 않고 다음 무기를 사용한다", () => {
  const healing = weapon({
    damage: 0,
    effect: { type: "HEAL", amount: 50, hpThreshold: 0.5, oncePerBattle: true },
  });
  const log = simulateBattle(
    [
      player("p", "A", {
        weapons: [healing, weapon(), null, null, null, null],
      }),
      player("e", "B"),
    ],
    options,
  );
  assert.equal(log.finalState.players[0]?.stamina, 90);
  assert.ok(
    !log.timeline
      .flatMap((entry) => entry.events)
      .some((event) => event.type === "HEAL"),
  );
});

test("생존 팀이 하나면 승리와 종료 이벤트를 한 번만 기록한다", () => {
  const log = simulateBattle(
    [
      player("p", "A", { weapons: [weapon(), null, null, null, null, null] }),
      player("e", "B"),
    ],
    options,
  );
  const ends = log.timeline
    .flatMap((entry) => entry.events)
    .filter((event) => event.type === "BATTLE_END");
  assert.equal(ends.length, 1);
  assert.equal(ends[0]?.winnerTeamId, "A");
  assert.equal(log.result.reason, "VICTORY");
  assert.equal(log.finalState.players[1]?.hp, 0);
});

test("플레이어 패배도 최종 체력과 승리 팀으로 판정한다", () => {
  const log = simulateBattle(
    [
      player("p", "A"),
      player("e", "B", { weapons: [weapon(), null, null, null, null, null] }),
    ],
    options,
  );
  assert.equal(log.result.winnerTeamId, "B");
  assert.equal(log.finalState.players[0]?.hp, 0);
});

test("공격 불가능한 전투는 정확히 최대 틱에서 종료한다", () => {
  const log = simulateBattle([player("p", "A"), player("e", "B")], options);
  assert.deepEqual(log.result, {
    winnerTeamId: null,
    reason: "MAX_TICKS",
    durationTicks: 20,
  });
  assert.equal(log.timeline.at(-1)?.timestamp, 20);
});

test("참가자 없는 전투는 무승부로 즉시 종료한다", () => {
  const log = simulateBattle([], options);
  assert.deepEqual(log.result, {
    winnerTeamId: null,
    reason: "DRAW",
    durationTicks: 0,
  });
  assert.equal(log.timeline[0]?.events[0]?.type, "BATTLE_END");
});

test("사망한 대상의 시전은 즉시 취소한다", () => {
  const log = simulateBattle(
    [
      player("p", "A", {
        weapons: [weapon({ castTicks: 10 }), null, null, null, null, null],
      }),
      player("e", "B", { weapons: [weapon(), null, null, null, null, null] }),
    ],
    options,
  );
  const events = log.timeline.flatMap((entry) => entry.events);
  assert.ok(
    events.some(
      (event) => event.type === "CAST_CANCEL" && event.actorId === "p",
    ),
  );
  assert.ok(
    !events.some(
      (event) => event.type === "CAST_COMPLETE" && event.actorId === "p",
    ),
  );
});

test("전투는 입력을 변경하지 않고 주입한 난수로 재현된다", () => {
  const players = [
    player("p", "A", { weapons: [weapon(), null, null, null, null, null] }),
    player("e", "B"),
  ];
  const before = structuredClone(players);
  const first = simulateBattle(players, options);
  assert.deepEqual(players, before);
  assert.deepEqual(simulateBattle(players, options), first);
  const ids = first.timeline.flatMap((entry) =>
    entry.events.map((event) => event.id),
  );
  assert.equal(new Set(ids).size, ids.length);
});

test("중복 참가자 ID와 잘못된 최대 틱을 거부한다", () => {
  assert.throws(
    () => simulateBattle([player("p", "A"), player("p", "B")]),
    /Duplicate/,
  );
  assert.throws(() => simulateBattle([], { maxTicks: -1 }), /Invalid/);
});

test("퇴각 게이지는 실제 피해로 차며 생존한 첫 충족 시점만 보관한다", () => {
  for (const multiplier of [1, 2]) {
    const checkpoints: number[] = [];
    const log = simulateBattle([
      player("p", "A"),
      player("e", "B", { weapons: [weapon({ damage: 20, cooldownTicks: 1 }), null, null, null, null, null] }),
    ], {
      ...options,
      retreat: {
        playerId: "p",
        multiplier,
        onReady: (_eventId, state) => checkpoints.push(state[0]!.hp),
      },
    });
    assert.deepEqual(checkpoints, [100 - 40 / multiplier]);
    assert.equal(log.finalState.players[0]?.hp, 0);
  }
  const lethal = simulateBattle([
    player("p", "A", { hp: 10 }),
    player("e", "B", { weapons: [weapon({ damage: 100 }), null, null, null, null, null] }),
  ], {
    ...options,
    retreat: {
      playerId: "p",
      multiplier: 2,
      onReady: () => assert.fail("A dead player cannot retreat"),
    },
  });
    assert.equal(lethal.finalState.players[0]?.hp, 0);
});

test("슬롯 시너지는 NEXT/EDGES/ALL_MELEE 가속·강화·스태미나 회복과 N회 주기 발동을 적용한다", () => {
  const hasteLog = simulateBattle(
    [
      player("p", "A", {
        weapons: [
          weapon({
            id: "synergy-next",
            damage: 5,
            cooldownTicks: 3,
            effect: {
              type: "SYNERGY",
              target: "NEXT",
              hasteTicks: 2,
              damageBonus: 7,
              staminaRestore: 4,
            },
          }),
          weapon({
            id: "target-next",
            damage: 10,
            cooldownTicks: 5,
          }),
          null,
          null,
          null,
          weapon({
            id: "edge-weapon",
            damage: 8,
            cooldownTicks: 4,
            attackType: "MELEE",
            effect: {
              type: "SYNERGY",
              target: "EDGES",
              damageBonus: 4,
              triggerEveryNHits: 2,
            },
          }),
        ],
      }),
      player("e", "B", { hp: 200, maxHp: 200 }),
    ],
    { random: () => 0.9, maxTicks: 15 },
  );

  const synergyEvents = hasteLog.timeline
    .flatMap((entry) => entry.events)
    .filter((event) => event.type === "SYNERGY");
  assert.ok(synergyEvents.length >= 1);
  const firstSynergy = synergyEvents[0]!;
  assert.equal(firstSynergy.sourceSlotIndex, 0);
  assert.deepEqual(firstSynergy.targetSlotIndices, [1]);
  assert.equal(firstSynergy.staminaRestore, 4);

  const damageEvents = hasteLog.timeline
    .flatMap((entry) => entry.events)
    .filter((event) => event.type === "DAMAGE");
  // 슬롯 1 기본 공격력 10 + damageBonus 7 = 17
  assert.ok(damageEvents.some((event) => event.amount === 17));

  const meleeLog = simulateBattle(
    [
      player("p", "A", {
        weapons: [
          weapon({
            id: "melee-1",
            damage: 6,
            attackType: "MELEE",
            cooldownTicks: 1,
          }),
          weapon({
            id: "buffer",
            damage: 0,
            attackType: "RANGED",
            cooldownTicks: 1,
            effect: {
              type: "SYNERGY",
              target: "ALL_MELEE",
              damageBonus: 5,
              triggerEveryNHits: 2,
            },
          }),
          weapon({
            id: "ranged-2",
            damage: 6,
            attackType: "RANGED",
            cooldownTicks: 1,
          }),
          null,
          null,
          null,
        ],
      }),
      player("e", "B", { hp: 200, maxHp: 200 }),
    ],
    { random: () => 0.9, maxTicks: 10 },
  );

  const meleeSynergies = meleeLog.timeline
    .flatMap((entry) => entry.events)
    .filter(
      (
        event,
      ): event is Extract<
        import("@webgame/types").BattleEvent,
        { type: "SYNERGY" }
      > => event.type === "SYNERGY" && event.sourceSlotIndex === 1,
    );
  // 2회 발동마다 1번만 발동 (10틱 내 buffer가 2번 이상 발동해야 함)
  assert.equal(meleeSynergies.length, 1);
  assert.deepEqual(meleeSynergies[0]?.targetSlotIndices, [0]);
});

test("장착한 MATERIAL 아이템도 전투 중 소모되지 않고 쿨다운마다 발동한다", () => {
  const log = simulateBattle(
    [
      player("p", "A", {
        weapons: [
          weapon({
            id: "mat-tape",
            damage: 0,
            staminaCost: 2,
            cooldownTicks: 3,
            tags: ["ARMOR"],
            effect: {
              type: "SHIELD",
              itemKind: "MATERIAL",
              tags: ["ARMOR"],
              shieldGain: 8,
            },
          }),
          weapon({
            id: "mat-lighter",
            damage: 5,
            staminaCost: 2,
            cooldownTicks: 3,
            tags: ["CHEM"],
            effect: {
              type: "SYNERGY",
              itemKind: "MATERIAL",
              tags: ["CHEM"],
              target: "NEXT",
              damageBonus: 3,
            },
          }),
          weapon({
            id: "wpn_primary",
            damage: 10,
            staminaCost: 5,
            cooldownTicks: 3,
            tags: ["BLADE"],
          }),
          null,
          null,
          null,
        ],
      }),
      player("e", "B", { hp: 200, maxHp: 200 }),
    ],
    { random: () => 0.9, maxTicks: 10 },
  );

  const events = log.timeline.flatMap((entry) => entry.events);
  const shieldEvents = events.filter((event) => event.type === "SHIELD");
  const damageEvents = events.filter((event) => event.type === "DAMAGE");
  assert.ok(shieldEvents.length >= 2);
  assert.ok(shieldEvents.some((event) => event.amount === 8));
  assert.ok(damageEvents.some((event) => event.amount === 5));
  assert.ok(damageEvents.some((event) => event.amount === 13));
  assert.equal(log.finalState.players[0]?.shield, shieldEvents.length * 8);
});

test("보호막은 HP보다 먼저 피해를 흡수하고 흡수된 피해는 후퇴 게이지를 채우지 않는다", () => {
  let retreatTriggered = false;
  const log = simulateBattle(
    [
      player("p", "A", {
        weapons: [
          weapon({
            id: "mat-shield",
            damage: 0,
            staminaCost: 0,
            cooldownTicks: 10,
            tags: ["ARMOR"],
            effect: { type: "SHIELD", tags: ["ARMOR"], shieldGain: 20 },
          }),
          null,
          null,
          null,
          null,
          null,
        ],
      }),
      player("e", "B", {
        weapons: [
          weapon({ damage: 50, staminaCost: 0, cooldownTicks: 10 }),
          null,
          null,
          null,
          null,
          null,
        ],
      }),
    ],
    {
      random: () => 0.9,
      maxTicks: 3,
      retreat: {
        playerId: "p",
        multiplier: 1,
        onReady: () => {
          retreatTriggered = true;
        },
      },
    },
  );

  const damageToPlayer = log.timeline
    .flatMap((entry) => entry.events)
    .find(
      (
        event,
      ): event is Extract<
        import("@webgame/types").BattleEvent,
        { type: "DAMAGE" }
      > => event.type === "DAMAGE" && event.targetId === "p",
    );
  assert.ok(damageToPlayer);
  assert.equal(damageToPlayer.amount, 50);
  assert.equal(damageToPlayer.absorbedShield, 20);
  assert.equal(damageToPlayer.remainingShield, 0);
  assert.equal(damageToPlayer.remainingHp, 70);
  assert.equal(damageToPlayer.retreatGauge, 75);
  assert.equal(retreatTriggered, false);
});

test("TAG 시너지는 같은 태그의 모든 슬롯을 강화하고 perTag는 장착 태그 수만큼 증폭한다", () => {
  const log = simulateBattle(
    [
      player("p", "A", {
        weapons: [
          weapon({
            id: "eq-log-t2b",
            damage: 15,
            staminaCost: 2,
            cooldownTicks: 1,
            tags: ["BLADE"],
            effect: {
              type: "SYNERGY",
              tags: ["BLADE"],
              target: "TAG",
              targetTag: "BLADE",
              damageBonus: 6,
              perTag: { tag: "BLADE", damageBonus: 2 },
            },
          }),
          weapon({
            id: "mat-nanosuture",
            damage: 4,
            staminaCost: 2,
            cooldownTicks: 1,
            tags: ["BIO", "ARMOR", "BLADE"],
            effect: {
              type: "HEAL",
              itemKind: "MATERIAL",
              tags: ["BIO", "ARMOR", "BLADE"],
              amount: 6,
              hpThreshold: 0.95,
              oncePerBattle: false,
            },
          }),
          weapon({
            id: "wpn_sniper",
            damage: 10,
            staminaCost: 2,
            cooldownTicks: 1,
            tags: ["FIREARM"],
            effect: { tags: ["FIREARM"] },
          }),
          null,
          null,
          null,
        ],
      }),
      player("e", "B", { hp: 200, maxHp: 200 }),
    ],
    { random: () => 0.9, maxTicks: 4 },
  );

  const events = log.timeline.flatMap((entry) => entry.events);
  const tagSynergy = events.find(
    (
      event,
    ): event is Extract<
      import("@webgame/types").BattleEvent,
      { type: "SYNERGY" }
    > => event.type === "SYNERGY" && event.sourceSlotIndex === 0,
  );
  assert.ok(tagSynergy);
  assert.deepEqual(tagSynergy.targetSlotIndices, [1]);

  const damages = events
    .filter((event) => event.type === "DAMAGE")
    .map((event) => event.amount);
  // 슬롯 0: 기본 15 + perTag(BLADE 2개 * 2) = 19, 슬롯 1: 기본 4 + 6 = 10
  assert.equal(damages[0], 19);
  assert.equal(damages[1], 10);
});

test("피로도가 0인 전투원은 무기 사용 후 쿨다운이 2틱 증가한다", () => {
  const exhausted = simulateBattle(
    [
      player("p", "A", {
        fatigue: 0,
        maxFatigue: 100,
        weapons: [
          weapon({ damage: 5, staminaCost: 0, cooldownTicks: 2 }),
          null,
          null,
          null,
          null,
          null,
        ],
      }),
      player("e", "B", { hp: 200, maxHp: 200 }),
    ],
    { random: () => 0.9, maxTicks: 2 },
  );
  const cooldownEvent = exhausted.timeline
    .flatMap((entry) => entry.events)
    .find(
      (
        event,
      ): event is Extract<
        import("@webgame/types").BattleEvent,
        { type: "COOLDOWN" }
      > => event.type === "COOLDOWN" && event.actorId === "p",
    );
  assert.ok(cooldownEvent);
  assert.equal(cooldownEvent.duration, 4);
});
