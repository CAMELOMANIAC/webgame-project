import { type BattleEvent, type BattleLog, type BattleLogEntry, type User, type Weapon } from "./simulateBattle.types";

function simulateBattle(players: User[]): BattleLog {
  let eventCounter = 0;
  const generateId = () => `event-${eventCounter++}`;

  // 시뮬레이션을 위한 상태 복사 (원본 보존)
  // User 객체가 깊은 복사가 되어야 함. (weapons 내부의 currentCooldown 등)
  const simPlayers = players.map((p) => ({
    ...p,
    weapons: p.weapons.map((w) => (w ? { ...w } : null)) as User["weapons"],
  }));

  const deadPlayers = new Set<string>();

  // 1. 초기 상태 캡처
  const initialState: BattleLog["initialState"] = {
    players: simPlayers.map((u) => ({
      id: u.id,
      teamId: u.teamId,
      hp: u.hp,
      maxHp: u.maxHp,
      weapons: u.weapons.map((w) => (w ? { name: w.name, damage: w.damage, cooldown: w.cooldown } : null)),
    })),
  };

  const timeline: BattleLogEntry[] = [];
  const tickUnit = 100;
  let currentTick = 0;

  // 2. 시뮬레이션 루프
  while (!isBattleOver(simPlayers)) {
    currentTick += tickUnit;
    const tickEvents: BattleEvent[] = [];

    // 모든 플레이어에 대해 행동 처리
    for (const actor of simPlayers) {
      if (actor.hp <= 0) continue;

      const actions = usingWeapon(actor, simPlayers, tickUnit).map((e) => ({ ...e, id: generateId() }));

      for (const event of actions) {
        if (event.type === "DEATH") {
          if (!deadPlayers.has(event.playerId)) {
            deadPlayers.add(event.playerId);
            tickEvents.push(event);
          }
        } else {
          tickEvents.push(event);
        }
      }
    }

    if (tickEvents.length > 0) {
      timeline.push({
        timestamp: currentTick,
        events: tickEvents,
      });
    }

    if (currentTick > 60000) break;
  }

  // 3. 종료 결과 추가
  const remainingTeams = new Set(simPlayers.filter((p) => p.hp > 0).map((p) => p.teamId));
  const winnerTeamId = remainingTeams.size === 1 ? Array.from(remainingTeams)[0] : null;

  timeline.push({
    timestamp: currentTick,
    events: [{ id: generateId(), type: "BATTLE_END", winnerTeamId }],
  });

  return {
    initialState,
    timeline,
  };
}

export default simulateBattle;

function isBattleOver(players: User[]): boolean {
  const aliveTeams = new Set(players.filter((p) => p.hp > 0).map((p) => p.teamId));
  return aliveTeams.size <= 1;
}

function findTarget(actor: User, weapon: Weapon, allPlayers: User[]): User | null {
  const enemies = allPlayers.filter((p) => p.teamId !== actor.teamId && p.hp > 0);
  if (enemies.length === 0) return null;

  // 각 적군에게 우선순위 점수를 매깁니다.
  const scoredEnemies = enemies.map((enemy) => {
    let score = 100; // 기본 점수

    // 1. 처형 우선순위 (체력이 매우 낮으면 우선순위 급상승)
    if (enemy.hp < 20) score += 50;

    // 2. 점사 효율 (체력 %가 낮을수록 가중치)
    score += (1 - enemy.hp / enemy.maxHp) * 30;

    // 3. 무기별 전략 적용 (무기에 strategy 속성이 정의되어 있다면)
    if (weapon.strategy === "WEAKEST") {
      score += (1 - enemy.hp / enemy.maxHp) * 50;
    } else if (weapon.strategy === "STRONGEST") {
      score += (enemy.hp / enemy.maxHp) * 50;
    }

    // 4. 약간의 무작위성 (항상 똑같은 타겟만 잡히는 것 방지)
    score += Math.random() * 15;

    return { enemy, score };
  });

  // 점수가 가장 높은 적을 정렬하여 반환
  return scoredEnemies.sort((a, b) => b.score - a.score)[0].enemy;
}

function usingWeapon(actor: User, allPlayers: User[], tickUnit: number): BattleEvent[] {
  for (let i = 0; i < actor.weapons.length; i++) {
    const weapon = actor.weapons[i];
    if (!weapon) continue;

    weapon.currentCooldown -= tickUnit;
    if (weapon.currentCooldown <= 0) {
      // 무기 정보를 findTarget에 전달하여 전략적인 타겟팅 수행
      const target = findTarget(actor, weapon, allPlayers);
      if (!target) continue;

      const weaponEvents = weapon.use(actor, target, weapon);
      if (weaponEvents.length > 0) {
        weapon.currentCooldown = weapon.cooldown;
        const events: BattleEvent[] = [...weaponEvents];

        // Ensure weaponIndex is set for ATTACK events if not already
        events.forEach((e) => {
          if (e.type === "ATTACK" && e.weaponIndex === undefined) {
            e.weaponIndex = i;
          }
        });

        if (target.hp <= 0) {
          events.push({
            id: "",
            type: "DEATH",
            playerId: target.id,
          });
        }
        return events;
      }
    }
  }
  return [];
}
