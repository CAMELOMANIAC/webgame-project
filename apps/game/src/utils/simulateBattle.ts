import { type BattleEvent, type BattleLog, type BattleLogEntry, type User } from "./simulateBattle.types";

function simulateBattle(players: User[]): BattleLog {
  let eventCounter = 0;
  const generateId = () => `event-${eventCounter++}`;

  // 시뮬레이션을 위한 상태 복사 (원본 보존)
  // User 객체가 깊은 복사가 되어야 함. (weapons 내부의 currentCooldown 등)
  const simPlayers = players.map(p => ({
    ...p,
    weapons: p.weapons.map(w => w ? { ...w } : null) as User["weapons"]
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

function findTarget(actor: User, allPlayers: User[]): User | null {
  const enemies = allPlayers.filter((p) => p.teamId !== actor.teamId && p.hp > 0);
  if (enemies.length === 0) return null;
  return enemies[Math.floor(Math.random() * enemies.length)];
}

function usingWeapon(actor: User, allPlayers: User[], tickUnit: number): BattleEvent[] {
  const events: BattleEvent[] = [];
  for (const weapon of actor.weapons) {
    if (!weapon) continue;
    weapon.currentCooldown -= tickUnit;
    if (weapon.currentCooldown <= 0) {
      const target = findTarget(actor, allPlayers);
      if (!target) continue;

      weapon.currentCooldown = weapon.cooldown;
      const weaponEvents = weapon.use(actor, target, weapon);
      events.push(...weaponEvents);

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
  return [];
}
