import { BattleEvent, BattleLog, BattleLogEntry, User, Weapon } from "@webgame/types";

/**
 * 서버 사이드 전투 시뮬레이터
 */
export function simulateBattle(players: User[]): BattleLog {
  let eventCounter = 0;
  const generateId = () => `event-${eventCounter++}`;

  // 시뮬레이션을 위한 상태 복사 및 타입 확장
  const simPlayers = players.map((p) => {
    const weapons = p.weapons.map((w) => (w ? { ...w, currentCooldown: 0 } : null));

    return {
      ...p,
      weapons: weapons as [Weapon | null, Weapon | null, Weapon | null, Weapon | null, Weapon | null, Weapon | null],
      currentWeaponIndex: p.currentWeaponIndex ?? 0,
      castingWeaponIndex: p.castingWeaponIndex ?? null,
      castingTicksRemaining: p.castingTicksRemaining ?? 0,
    };
  }) as unknown as User[];

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
      weight: u.weight,
      maxWeight: u.maxWeight,
      day: u.day,
      weapons: u.weapons.map((w) =>
        w
          ? {
              id: w.id,
              name: w.name,
              damage: w.damage,
              cooldownTicks: w.cooldownTicks,
              castTicks: w.castTicks,
              staminaCost: w.staminaCost,
              weight: w.weight,
            }
          : null,
      ) as [Weapon | null, Weapon | null, Weapon | null, Weapon | null, Weapon | null, Weapon | null],
    })),
  };

  const timeline: BattleLogEntry[] = [];
  const tickUnit = 1;
  let currentTick = 0;

  // 2. 시뮬레이션 루프
  while (!isBattleOver(simPlayers)) {
    currentTick += tickUnit;
    const tickEvents: BattleEvent[] = [];

    for (const actor of simPlayers) {
      if (actor.hp <= 0) {
        if (actor.castingWeaponIndex !== null && actor.castingWeaponIndex !== undefined) {
          tickEvents.push({
            id: generateId(),
            type: "CAST_CANCEL",
            actorId: actor.id,
            weaponIndex: actor.castingWeaponIndex,
            reason: "DEATH",
          });
          actor.castingWeaponIndex = null;
          actor.castingTicksRemaining = 0;
        }
        continue;
      }

      // 쿨다운 감소
      for (const w of actor.weapons) {
        if (w && w.currentCooldown > 0) {
          w.currentCooldown -= tickUnit;
        }
      }

      // 스태미너 회복
      const prevStamina = actor.stamina;
      actor.stamina = Math.min(actor.maxStamina, actor.stamina + actor.staminaRegen);

      if (Math.floor(actor.stamina) !== Math.floor(prevStamina)) {
        tickEvents.push({
          id: generateId(),
          type: "STAMINA_CHANGE",
          playerId: actor.id,
          currentStamina: actor.stamina,
        });
      }

      if (actor.castingWeaponIndex !== null && actor.castingWeaponIndex !== undefined) {
        const remaining = actor.castingTicksRemaining ?? 0;
        const newRemaining = remaining - tickUnit;
        actor.castingTicksRemaining = newRemaining;

        if (newRemaining <= 0) {
          const weaponIndex = actor.castingWeaponIndex;
          const weapon = actor.weapons[weaponIndex];

          if (weapon) {
            tickEvents.push({
              id: generateId(),
              type: "CAST_COMPLETE",
              actorId: actor.id,
              weaponIndex: weaponIndex,
            });

            const target = findTarget(actor, weapon, simPlayers);
            if (target) {
              const weaponEvents = processWeaponUse(actor, target, weapon, generateId);
              weaponEvents.forEach((e) => {
                tickEvents.push(e);
                if (e.type === "ATTACK" && e.weaponIndex === undefined) {
                  e.weaponIndex = weaponIndex;
                }
              });

              if (target.hp <= 0 && !deadPlayers.has(target.id)) {
                deadPlayers.add(target.id);
                tickEvents.push({ id: generateId(), type: "DEATH", playerId: target.id });
              }
            }

            weapon.currentCooldown = weapon.cooldownTicks;
            actor.currentWeaponIndex = (weaponIndex + 1) % 6;
          }

          actor.castingWeaponIndex = null;
          actor.castingTicksRemaining = 0;
        }
      } else {
        const actions = processWeaponSequence(actor, simPlayers, generateId, deadPlayers);
        tickEvents.push(...actions);
      }
    }

    if (tickEvents.length > 0) {
      timeline.push({
        timestamp: currentTick,
        events: tickEvents,
      });
    }

    if (currentTick > 5000) break;
  }

  const remainingTeams = new Set(simPlayers.filter((p) => p.hp > 0).map((p) => p.teamId));
  const teamArray = Array.from(remainingTeams);
  const winnerTeamId = remainingTeams.size === 1 && teamArray[0] !== undefined ? teamArray[0] : null;

  timeline.push({
    timestamp: currentTick,
    events: [{ id: generateId(), type: "BATTLE_END", winnerTeamId }],
  });

  return {
    initialState,
    timeline,
  };
}

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

  const sorted = scoredEnemies.sort((a, b) => b.score - a.score);
  const best = sorted[0];
  return best ? best.enemy : null;
}

function processWeaponUse(actor: User, target: User, weapon: Weapon, generateId: () => string): BattleEvent[] {
  const damage = weapon.damage;
  const isCritical = Math.random() < 0.1;
  const finalDamage = isCritical ? Math.floor(damage * 1.5) : damage;

  target.hp = Math.max(0, target.hp - finalDamage);

  return [
    {
      id: generateId(),
      type: "ATTACK",
      actorId: actor.id,
      targetId: target.id,
      weaponIndex: 0,
    },
    {
      id: generateId(),
      type: "DAMAGE",
      targetId: target.id,
      amount: finalDamage,
      remainingHp: target.hp,
      isCritical: isCritical,
    },
  ];
}

function processWeaponSequence(
  actor: User,
  allPlayers: User[],
  generateId: () => string,
  deadPlayers: Set<string>,
): BattleEvent[] {
  const startIndex = actor.currentWeaponIndex || 0;

  for (let i = 0; i < 6; i++) {
    const checkIndex = (startIndex + i) % 6;
    const weapon = actor.weapons[checkIndex];

    if (!weapon) continue;

    if (weapon.currentCooldown <= 0 && actor.stamina >= weapon.staminaCost) {
      const target = findTarget(actor, weapon, allPlayers);
      if (!target) return [];

      if (weapon.castTicks > 0) {
        actor.castingWeaponIndex = checkIndex;
        actor.castingTicksRemaining = weapon.castTicks;
        actor.stamina -= weapon.staminaCost;

        return [
          {
            id: generateId(),
            type: "CAST_START",
            actorId: actor.id,
            weaponIndex: checkIndex,
            duration: weapon.castTicks,
          },
          {
            id: generateId(),
            type: "STAMINA_CHANGE",
            playerId: actor.id,
            currentStamina: actor.stamina,
          },
        ];
      } else {
        const weaponEvents = processWeaponUse(actor, target, weapon, generateId);
        actor.stamina -= weapon.staminaCost;
        weapon.currentCooldown = weapon.cooldownTicks;
        actor.currentWeaponIndex = (checkIndex + 1) % 6;

        const events: BattleEvent[] = [
          ...weaponEvents,
          {
            id: generateId(),
            type: "STAMINA_CHANGE",
            playerId: actor.id,
            currentStamina: actor.stamina,
          },
        ];

        events.forEach((e) => {
          if (e.type === "ATTACK") {
            e.weaponIndex = checkIndex;
          }
        });

        if (target.hp <= 0 && !deadPlayers.has(target.id)) {
          deadPlayers.add(target.id);
          events.push({ id: generateId(), type: "DEATH", playerId: target.id });
        }

        return events;
      }
    } else {
      actor.currentWeaponIndex = checkIndex;
      return [];
    }
  }

  return [];
}
