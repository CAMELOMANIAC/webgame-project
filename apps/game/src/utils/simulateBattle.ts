import { type BattleEvent, type BattleLog, type BattleLogEntry, type User, type Weapon } from "./simulateBattle.types";

function simulateBattle(players: User[]): BattleLog {
  let eventCounter = 0;
  const generateId = () => `event-${eventCounter++}`;

  // 시뮬레이션을 위한 상태 복사
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
      stamina: u.stamina,
      maxStamina: u.maxStamina,
      weapons: u.weapons.map((w) => (w ? { name: w.name, damage: w.damage, cooldown: w.cooldown, staminaCost: w.staminaCost } : null)),
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

      // 스태미너 회복 (틱당 회복량 적용)
      const prevStamina = actor.stamina;
      actor.stamina = Math.min(actor.maxStamina, actor.stamina + actor.staminaRegen);
      
      // 스태미너가 회복되었을 경우 이벤트 추가 (매 틱마다 발생하므로 효율을 위해 값이 변했을 때만 추가 가능)
      if (actor.stamina !== prevStamina) {
        tickEvents.push({
          id: generateId(),
          type: "STAMINA_CHANGE",
          playerId: actor.id,
          currentStamina: actor.stamina
        });
      }

      const actions = usingWeapon(actor, simPlayers, tickUnit, generateId);

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

  const scoredEnemies = enemies.map((enemy) => {
    let score = 100;
    if (enemy.hp < 20) score += 50;
    score += (1 - enemy.hp / enemy.maxHp) * 30;

    if (weapon.strategy === "WEAKEST") {
      score += (1 - enemy.hp / enemy.maxHp) * 50;
    } else if (weapon.strategy === "STRONGEST") {
      score += (enemy.hp / enemy.maxHp) * 50;
    }

    score += Math.random() * 15;
    return { enemy, score };
  });

  return scoredEnemies.sort((a, b) => b.score - a.score)[0].enemy;
}

function usingWeapon(actor: User, allPlayers: User[], tickUnit: number, generateId: () => string): BattleEvent[] {
  for (let i = 0; i < actor.weapons.length; i++) {
    const weapon = actor.weapons[i];
    if (!weapon) continue;

    if (weapon.currentCooldown > 0) {
      weapon.currentCooldown -= tickUnit;
    }

    if (weapon.currentCooldown <= 0 && actor.stamina >= weapon.staminaCost) {
      const target = findTarget(actor, weapon, allPlayers);
      if (!target) continue;

      const weaponEvents = weapon.use(actor, target, weapon);
      if (weaponEvents.length > 0) {
        // 스태미너 소모
        actor.stamina -= weapon.staminaCost;
        
        const events: BattleEvent[] = [
          ...weaponEvents.map(e => ({ ...e, id: generateId() })),
          {
            id: generateId(),
            type: "STAMINA_CHANGE",
            playerId: actor.id,
            currentStamina: actor.stamina
          }
        ];

        weapon.currentCooldown = weapon.cooldown;

        events.forEach((e) => {
          if (e.type === "ATTACK" && (e as any).weaponIndex === undefined) {
            (e as any).weaponIndex = i;
          }
        });

        if (target.hp <= 0) {
          events.push({ id: generateId(), type: "DEATH", playerId: target.id });
        }
        
        return events;
      }
    }
  }
  return [];
}
