import { type BattleEvent, type BattleLog, type BattleLogEntry, type User, type Weapon } from "./simulateBattle.types";

function simulateBattle(players: User[]): BattleLog {
  let eventCounter = 0;
  const generateId = () => `event-${eventCounter++}`;

  // 시뮬레이션을 위한 상태 복사
  const simPlayers = players.map((p) => ({
    ...p,
    currentWeaponIndex: p.currentWeaponIndex ?? 0,
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
      weight: u.weight,
      maxWeight: u.maxWeight,
      day: u.day,
      weapons: u.weapons.map((w) =>
        w ? { 
          id: w.id, 
          name: w.name, 
          damage: w.damage, 
          cooldownTicks: w.cooldownTicks, 
          castTicks: w.castTicks,
          staminaCost: w.staminaCost,
          weight: w.weight
        } : null,
      ),
    })),
  };

  const timeline: BattleLogEntry[] = [];
  const tickUnit = 1; // 1틱 단위 시뮬레이션
  let currentTick = 0;

  // 2. 시뮬레이션 루프
  while (!isBattleOver(simPlayers)) {
    currentTick += tickUnit;
    const tickEvents: BattleEvent[] = [];

    // 모든 플레이어에 대해 행동 처리
    for (const actor of simPlayers) {
      if (actor.hp <= 0) {
        // 죽은 경우 캐스팅 취소 체크
        if (actor.castingWeaponIndex !== undefined && actor.castingWeaponIndex !== null) {
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

      // 스태미너 회복 (틱당 회복량 적용)
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

      // 캐스팅 처리 또는 새로운 무기 탐색
      if (actor.castingWeaponIndex !== undefined && actor.castingWeaponIndex !== null) {
        // 캐스팅 진행 중
        if (actor.castingTicksRemaining !== undefined) {
          actor.castingTicksRemaining -= tickUnit;
          
          if (actor.castingTicksRemaining <= 0) {
            // 캐스팅 완료 및 발동
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
                const weaponEvents = weapon.use(actor, target, weapon);
                weaponEvents.forEach(e => {
                  tickEvents.push({ ...e, id: generateId() });
                  if (e.type === "ATTACK" && e.weaponIndex === undefined) {
                    e.weaponIndex = weaponIndex;
                  }
                });

                if (target.hp <= 0) {
                  tickEvents.push({ id: generateId(), type: "DEATH", playerId: target.id });
                }
              }
              
              // 쿨다운 및 다음 인덱스 설정
              weapon.currentCooldown = weapon.cooldownTicks;
              actor.currentWeaponIndex = (weaponIndex + 1) % 6;
            }
            
            actor.castingWeaponIndex = null;
            actor.castingTicksRemaining = 0;
          }
        }
      } else {
        // 새로운 무기 발동 시도
        const actions = processWeaponSequence(actor, simPlayers, generateId);
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
    }

    if (tickEvents.length > 0) {
      timeline.push({
        timestamp: currentTick,
        events: tickEvents,
      });
    }

    if (currentTick > 2000) break; // 무한 루프 방지 (틱 단위이므로 2000틱 정도면 충분)
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

function processWeaponSequence(actor: User, allPlayers: User[], generateId: () => string): BattleEvent[] {
  // 현재 가리키는 슬롯부터 시작하여 빈 슬롯은 건너뛰며 무기 탐색
  const startIndex = actor.currentWeaponIndex;
  
  for (let i = 0; i < 6; i++) {
    const checkIndex = (startIndex + i) % 6;
    const weapon = actor.weapons[checkIndex];
    
    if (!weapon) {
      continue;
    }

    // 무기가 있다면 사용 가능 여부 체크
    if (weapon.currentCooldown <= 0 && actor.stamina >= weapon.staminaCost) {
      const target = findTarget(actor, weapon, allPlayers);
      if (!target) return []; 

      if (weapon.castTicks > 0) {
        // 캐스팅 시작
        actor.castingWeaponIndex = checkIndex;
        actor.castingTicksRemaining = weapon.castTicks;
        actor.stamina -= weapon.staminaCost; // 스태미너는 시작 시 소모

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
        // 즉시 발동
        const weaponEvents = weapon.use(actor, target, weapon);
        if (weaponEvents.length > 0) {
          actor.stamina -= weapon.staminaCost;
          weapon.currentCooldown = weapon.cooldownTicks;
          actor.currentWeaponIndex = (checkIndex + 1) % 6;

          const events: BattleEvent[] = [
            ...weaponEvents.map((e) => ({ ...e, id: generateId() })),
            {
              id: generateId(),
              type: "STAMINA_CHANGE",
              playerId: actor.id,
              currentStamina: actor.stamina,
            },
          ];

          events.forEach((e) => {
            if (e.type === "ATTACK" && e.weaponIndex === undefined) {
              e.weaponIndex = checkIndex;
            }
          });

          if (target.hp <= 0) {
            events.push({ id: generateId(), type: "DEATH", playerId: target.id });
          }

          return events;
        }
      }
    } else {
      // 무기가 있지만 쿨다운 중이거나 스테미너가 부족하면 고정
      actor.currentWeaponIndex = checkIndex;
      return [];
    }
  }
  
  return [];
}
