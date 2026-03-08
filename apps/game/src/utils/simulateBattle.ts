import { type BattleEvent, type BattleLog, type BattleLogEntry, type PlayerState, type User } from "./simulateBattle.types";
import { defaultWeapon, defaultWeapon2 } from "./weapon";

function simulateBattle(user1: User, user2: User): BattleLog {
  let eventCounter = 0;
  const generateId = () => `event-${eventCounter++}`;

  // 1. 초기 상태 캡처
  const initialState: BattleLog["initialState"] = {
    players: [user1, user2].map((u) => ({
      id: u.id,
      hp: u.hp,
      maxHp: u.maxHp,
      weapons: u.weapons.map((w) => (w ? { name: w.name, damage: w.damage, cooldown: w.cooldown } : null)),
    })),
  };

  const timeline: BattleLogEntry[] = [];
  const tickUnit = 100; // 더 세밀한 시뮬레이션을 위해 100ms 단위로 조정
  let currentTick = 0;

  // 2. 시뮬레이션 루프
  while (!isBattleOver(user1, user2)) {
    currentTick += tickUnit;
    const actions1 = usingWeapon(user1, user2, tickUnit).map((e) => ({ ...e, id: generateId() }));
    const actions2 = usingWeapon(user2, user1, tickUnit).map((e) => ({ ...e, id: generateId() }));

    const tickEvents: BattleEvent[] = [...actions1, ...actions2];

    // 누군가 죽었는지 확인
    if (user1.hp <= 0) tickEvents.push({ id: generateId(), type: "DEATH", playerId: user1.id });
    if (user2.hp <= 0) tickEvents.push({ id: generateId(), type: "DEATH", playerId: user2.id });

    if (tickEvents.length > 0) {
      timeline.push({
        timestamp: currentTick,
        events: tickEvents,
      });
    }

    // 무한 루프 방지 (예: 1분 이상 지속 시 강제 종료)
    if (currentTick > 60000) break;
  }

  // 3. 종료 결과 추가
  const winnerId = user1.hp > 0 && user2.hp <= 0 ? user1.id : user2.hp > 0 && user1.hp <= 0 ? user2.id : null;

  timeline.push({
    timestamp: currentTick,
    events: [{ id: generateId(), type: "BATTLE_END", winnerId }],
  });

  return {
    initialState,
    timeline,
  };
}

export default simulateBattle;

function isBattleOver(user1: User, user2: User): boolean {
  return user1.hp <= 0 || user2.hp <= 0;
}

function usingWeapon(actor: User, target: User, tickUnit: number): BattleEvent[] {
  const events: BattleEvent[] = [];
  for (const weapon of actor.weapons) {
    if (!weapon) continue;
    weapon.currentCooldown -= tickUnit;
    if (weapon.currentCooldown <= 0) {
      weapon.currentCooldown = weapon.cooldown;
      events.push(...weapon.use(actor, target, weapon));
      // 한 틱에 하나의 무기만 사용하도록 설계 (필요 시 수정 가능)
      return events;
    }
  }
  return [];
}

// 테스트용 (필요 시 제거 가능)
const u1: User = {
  id: "user1",
  hp: 100,
  maxHp: 100,
  weapons: [defaultWeapon, null, null, null, null],
};
const u2: User = {
  id: "user2",
  hp: 110,
  maxHp: 110,
  weapons: [defaultWeapon2, null, null, null, null],
};

const log = simulateBattle(u1, u2);
console.dir(log, { depth: null, colors: true });
