import {
  type BattleCombatant,
  type BattleEvent,
  type BattleLog,
  type BattleLogEntry,
  FATIGUE_RULES,
  getWeaponTags,
  type PlayerState,
  type SynergyTargetRule,
  type WeaponData,
  type WeaponTag,
} from "@webgame/types";

interface SimulationOptions {
  retreat?: {
    playerId: string;
    multiplier: number;
    onReady: (damageEventId: string, state: PlayerState[]) => void;
  };

  random?: () => number;
  maxTicks?: number;
}

interface SimWeapon extends WeaponData {
  currentCooldown: number;
  isTriggered: boolean;
  activationCount: number;
  pendingDamageBonus: number;
  pendingCritBonus: number;
  pendingShieldBonus: number;
}

interface SimCombatant extends Omit<BattleCombatant, "weapons"> {
  shield: number;
  weapons: Array<SimWeapon | null>;
  castingWeaponIndex: number | null;
  castingTicksRemaining: number;
}

function capturePlayers(players: SimCombatant[]): PlayerState[] {
  return players.map((player) => ({
    id: player.id,
    teamId: player.teamId,
    name: player.displayName ?? player.id,
    hp: player.hp,
    maxHp: player.maxHp,
    shield: player.shield,
    stamina: player.stamina,
    maxStamina: player.maxStamina,
    ...(player.fatigue !== undefined ? { fatigue: player.fatigue } : {}),
    ...(player.maxFatigue !== undefined
      ? { maxFatigue: player.maxFatigue }
      : {}),
    weight: player.weight,
    maxWeight: player.maxWeight,
    time: player.time,
    weapons: player.weapons.map((weapon) =>
      weapon
        ? {
            id: weapon.id,
            name: weapon.name,
            damage: weapon.damage,
            staminaCost: weapon.staminaCost,
            cooldownTicks: weapon.cooldownTicks,
            castTicks: weapon.castTicks,
            weight: weapon.weight,
            attackType: weapon.attackType,
            tags: getWeaponTags(weapon),
          }
        : null,
    ),
  }));
}

function aliveTeams(players: SimCombatant[]) {
  return new Set(
    players.filter((player) => player.hp > 0).map((player) => player.teamId),
  );
}

function canUseEffect(actor: SimCombatant, weapon: SimWeapon) {
  const effect = weapon.effect;
  const hasAction =
    weapon.damage > 0 ||
    Boolean(effect?.amount) ||
    Boolean(effect?.shieldGain) ||
    Boolean(effect?.target) ||
    Boolean(effect?.staminaRestore) ||
    Boolean(effect?.perTag);
  if (!hasAction) return false;
  if (effect?.oncePerBattle && weapon.isTriggered) return false;
  const isPureHeal =
    effect?.type === "HEAL" &&
    weapon.damage <= 0 &&
    !effect.shieldGain &&
    !effect.target &&
    !effect.staminaRestore &&
    !effect.perTag;
  if (isPureHeal) {
    const threshold = effect.hpThreshold ?? 1;
    return actor.hp < actor.maxHp * threshold;
  }
  return true;
}

function resolveSynergyTargets(
  weapons: Array<SimWeapon | null>,
  sourceSlotIndex: number,
  rule: SynergyTargetRule,
  targetTag?: WeaponTag,
): number[] {
  const len = weapons.length;
  if (len === 0) return [];

  const isTargetable = (idx: number) =>
    idx !== sourceSlotIndex && Boolean(weapons[idx]);

  let candidates: number[];
  switch (rule) {
    case "NEXT":
      candidates = [(sourceSlotIndex + 1) % len];
      break;
    case "PREV":
      candidates = [(sourceSlotIndex - 1 + len) % len];
      break;
    case "ADJACENT":
      candidates = [
        (sourceSlotIndex - 1 + len) % len,
        (sourceSlotIndex + 1) % len,
      ];
      break;
    case "EDGES":
      candidates = [0, len - 1];
      break;
    case "ALL_MELEE":
      candidates = weapons
        .map((w, idx) => (w?.attackType === "MELEE" ? idx : -1))
        .filter((idx) => idx >= 0);
      break;
    case "ALL_RANGED":
      candidates = weapons
        .map((w, idx) => (w?.attackType === "RANGED" ? idx : -1))
        .filter((idx) => idx >= 0);
      break;
    case "ALL_OTHER":
      candidates = weapons.map((_, idx) => idx);
      break;
    case "TAG":
      candidates = targetTag
        ? weapons
            .map((w, idx) =>
              w && getWeaponTags(w).includes(targetTag) ? idx : -1,
            )
            .filter((idx) => idx >= 0)
        : [];
      break;
  }

  return Array.from(new Set(candidates.filter(isTargetable)));
}

function findTarget(
  actor: SimCombatant,
  weapon: SimWeapon,
  players: SimCombatant[],
  random: () => number,
) {
  const enemies = players.filter(
    (player) => player.teamId !== actor.teamId && player.hp > 0,
  );
  if (weapon.strategy === "RANDOM") {
    return enemies[Math.floor(random() * enemies.length)];
  }
  return enemies
    .map((enemy) => {
      let score =
        100 + (enemy.hp < 20 ? 50 : 0) + (1 - enemy.hp / enemy.maxHp) * 30;
      if (weapon.strategy === "WEAKEST")
        score += (1 - enemy.hp / enemy.maxHp) * 50;
      if (weapon.strategy === "STRONGEST")
        score += (enemy.hp / enemy.maxHp) * 50;
      return { enemy, score: score + random() * 15 };
    })
    .sort((a, b) => b.score - a.score)[0]?.enemy;
}

/** 서버가 실행하는 전투 규칙. 입력과 난수 원본을 변경하지 않는다. */
export function simulateBattle(
  players: BattleCombatant[],
  { random = Math.random, maxTicks = 5000, retreat }: SimulationOptions = {},
): BattleLog {
  if (!Number.isInteger(maxTicks) || maxTicks < 1)
    throw new Error("Invalid tick limit");
  if (new Set(players.map((player) => player.id)).size !== players.length) {
    throw new Error("Duplicate combatant id");
  }

  const simPlayers: SimCombatant[] = players.map((player) => ({
    ...player,
    shield: 0,
    weapons: player.weapons.map((weapon) =>
      weapon
        ? {
            ...weapon,
            tags: getWeaponTags(weapon),
            effect: weapon.effect ? { ...weapon.effect } : undefined,
            currentCooldown: 0,
            isTriggered: false,
            activationCount: 0,
            pendingDamageBonus: 0,
            pendingCritBonus: 0,
            pendingShieldBonus: 0,
          }
        : null,
    ),
    currentWeaponIndex: player.currentWeaponIndex ?? 0,
    castingWeaponIndex: null,
    castingTicksRemaining: 0,
  }));
  const initialState = { players: capturePlayers(simPlayers) };
  const timeline: BattleLogEntry[] = [];
  let eventCounter = 0;
  let currentTick = 0;
  let retreatGauge = 0;
  let retreatDamage = 0;
  const generateId = () => `event-${eventCounter++}`;

  while (aliveTeams(simPlayers).size > 1 && currentTick < maxTicks) {
    currentTick++;
    const events: BattleEvent[] = [];
    const emit = (event: BattleEvent) => events.push(event);
    const changeStamina = (actor: SimCombatant, stamina: number) => {
      if (actor.stamina === stamina) return;
      actor.stamina = stamina;
      emit({
        id: generateId(),
        type: "STAMINA_CHANGE",
        playerId: actor.id,
        currentStamina: stamina,
        timestamp: currentTick,
      });
    };

    const useWeapon = (
      actor: SimCombatant,
      weaponIndex: number,
      weapon: SimWeapon,
    ) => {
      weapon.activationCount += 1;
      const eff = weapon.effect;
      if (eff) {
        weapon.isTriggered = true;
      }

      const triggerEvery = eff?.triggerEveryNHits ?? 1;
      const effectTriggered = weapon.activationCount % triggerEvery === 0;
      const perTagRule = eff?.perTag;
      const perTagCount = perTagRule
        ? actor.weapons.reduce(
            (count, w) =>
              w && getWeaponTags(w).includes(perTagRule.tag)
                ? count + 1
                : count,
            0,
          )
        : 0;
      const perTagDamage = (perTagRule?.damageBonus ?? 0) * perTagCount;
      const perTagShield = (perTagRule?.shieldGain ?? 0) * perTagCount;
      const perTagHeal = (perTagRule?.healAmount ?? 0) * perTagCount;
      const perTagStamina = (perTagRule?.staminaRestore ?? 0) * perTagCount;

      const selfShieldGain = effectTriggered
        ? (eff?.shieldGain ?? 0) + perTagShield
        : 0;
      const totalShieldGain = selfShieldGain + weapon.pendingShieldBonus;
      weapon.pendingShieldBonus = 0;
      if (totalShieldGain > 0) {
        actor.shield += totalShieldGain;
        emit({
          id: generateId(),
          type: "SHIELD",
          targetId: actor.id,
          amount: totalShieldGain,
          currentShield: actor.shield,
          weaponIndex,
          timestamp: currentTick,
        });
      }

      const canHeal =
        eff?.type === "HEAL" &&
        eff.amount !== undefined &&
        eff.amount > 0 &&
        actor.hp < actor.maxHp * (eff.hpThreshold ?? 1);
      const healPower = (canHeal ? (eff.amount ?? 0) : 0) + perTagHeal;
      if (healPower > 0 && actor.hp < actor.maxHp) {
        const beforeHp = actor.hp;
        actor.hp = Math.min(actor.maxHp, actor.hp + healPower);
        emit({
          id: generateId(),
          type: "HEAL",
          targetId: actor.id,
          amount: actor.hp - beforeHp,
          remainingHp: actor.hp,
          timestamp: currentTick,
        });
      }

      const baseDamage = weapon.damage + perTagDamage;
      if (baseDamage > 0) {
        const target = findTarget(actor, weapon, simPlayers, random);
        if (target) {
          const totalDamage = baseDamage + weapon.pendingDamageBonus;
          const critChance = Math.min(1, 0.1 + weapon.pendingCritBonus);
          weapon.pendingDamageBonus = 0;
          weapon.pendingCritBonus = 0;

          const isCritical = random() < critChance;
          const amount = isCritical
            ? Math.floor(totalDamage * 1.5)
            : totalDamage;
          const absorbedShield = Math.min(target.shield, amount);
          target.shield -= absorbedShield;
          const hpDamage = amount - absorbedShield;
          const previousHp = target.hp;
          target.hp = Math.max(0, target.hp - hpDamage);
          const tracksRetreat = retreat?.playerId === target.id;
          const wasReady = retreatGauge >= 100;
          if (tracksRetreat) {
            retreatDamage += previousHp - target.hp;
            retreatGauge = Math.min(
              100,
              (retreatDamage * retreat.multiplier * 100) / (target.maxHp * 0.4),
            );
          }
          emit({
            id: generateId(),
            type: "ATTACK",
            actorId: actor.id,
            targetId: target.id,
            weaponIndex,
            timestamp: currentTick,
          });
          const damageEventId = generateId();
          emit({
            id: damageEventId,
            type: "DAMAGE",
            targetId: target.id,
            amount,
            remainingHp: target.hp,
            isCritical,
            ...(absorbedShield > 0 ? { absorbedShield } : {}),
            ...(target.shield > 0 || absorbedShield > 0
              ? { remainingShield: target.shield }
              : {}),
            ...(tracksRetreat && { retreatGauge }),
            timestamp: currentTick,
          });
          if (
            tracksRetreat &&
            !wasReady &&
            retreatGauge >= 100 &&
            target.hp > 0
          ) {
            retreat.onReady(damageEventId, capturePlayers(simPlayers));
          }
          if (target.hp <= 0) {
            emit({
              id: generateId(),
              type: "DEATH",
              playerId: target.id,
              timestamp: currentTick,
            });
            if (target.castingWeaponIndex !== null) {
              emit({
                id: generateId(),
                type: "CAST_CANCEL",
                actorId: target.id,
                weaponIndex: target.castingWeaponIndex,
                reason: "DEATH",
                timestamp: currentTick,
              });
              target.castingWeaponIndex = null;
              target.castingTicksRemaining = 0;
            }
          }
        }
      }

      if (eff && effectTriggered) {
        const staminaRestore = (eff.staminaRestore ?? 0) + perTagStamina;
        if (staminaRestore > 0) {
          changeStamina(
            actor,
            Math.min(actor.maxStamina, actor.stamina + staminaRestore),
          );
        }
        const targetSlotIndices = eff.target
          ? resolveSynergyTargets(
              actor.weapons,
              weaponIndex,
              eff.target,
              eff.targetTag,
            )
          : [];
        if (targetSlotIndices.length > 0) {
          for (const targetIdx of targetSlotIndices) {
            const targetWeapon = actor.weapons[targetIdx];
            if (!targetWeapon) continue;
            if (eff.hasteTicks && eff.hasteTicks > 0) {
              targetWeapon.currentCooldown = Math.max(
                0,
                targetWeapon.currentCooldown - eff.hasteTicks,
              );
              if (
                actor.castingWeaponIndex === targetIdx &&
                actor.castingTicksRemaining > 0
              ) {
                actor.castingTicksRemaining = Math.max(
                  1,
                  actor.castingTicksRemaining - eff.hasteTicks,
                );
              }
            }
            if (eff.damageBonus && eff.damageBonus > 0) {
              targetWeapon.pendingDamageBonus += eff.damageBonus;
            }
            if (eff.critChanceBonus && eff.critChanceBonus > 0) {
              targetWeapon.pendingCritBonus += eff.critChanceBonus;
            }
            if (eff.shieldBonus && eff.shieldBonus > 0) {
              targetWeapon.pendingShieldBonus += eff.shieldBonus;
            }
          }
        }
        if (staminaRestore > 0 || targetSlotIndices.length > 0) {
          emit({
            id: generateId(),
            type: "SYNERGY",
            actorId: actor.id,
            sourceSlotIndex: weaponIndex,
            targetSlotIndices,
            ...(eff.hasteTicks ? { hasteTicks: eff.hasteTicks } : {}),
            ...(eff.damageBonus ? { damageBonus: eff.damageBonus } : {}),
            ...(eff.critChanceBonus
              ? { critChanceBonus: eff.critChanceBonus }
              : {}),
            ...(eff.shieldBonus ? { shieldBonus: eff.shieldBonus } : {}),
            ...(staminaRestore > 0 ? { staminaRestore } : {}),
            timestamp: currentTick,
          });
        }
      }

      const effectiveCooldown =
        actor.fatigue !== undefined && actor.fatigue <= 0
          ? weapon.cooldownTicks + FATIGUE_RULES.exhaustedCooldownBonusTicks
          : weapon.cooldownTicks;
      weapon.currentCooldown = effectiveCooldown;
      actor.currentWeaponIndex = (weaponIndex + 1) % actor.weapons.length;
      emit({
        id: generateId(),
        type: "COOLDOWN",
        actorId: actor.id,
        weaponIndex,
        duration: effectiveCooldown,
        timestamp: currentTick,
      });
    };

    for (const actor of simPlayers) {
      if (actor.hp <= 0 || aliveTeams(simPlayers).size <= 1) continue;
      for (const weapon of actor.weapons) {
        if (weapon)
          weapon.currentCooldown = Math.max(0, weapon.currentCooldown - 1);
      }
      changeStamina(
        actor,
        Math.min(actor.maxStamina, actor.stamina + actor.staminaRegen),
      );

      if (actor.castingWeaponIndex !== null) {
        actor.castingTicksRemaining--;
        if (actor.castingTicksRemaining <= 0) {
          const weaponIndex = actor.castingWeaponIndex;
          const weapon = actor.weapons[weaponIndex];
          emit({
            id: generateId(),
            type: "CAST_COMPLETE",
            actorId: actor.id,
            weaponIndex,
            timestamp: currentTick,
          });
          actor.castingWeaponIndex = null;
          actor.castingTicksRemaining = 0;
          if (weapon) useWeapon(actor, weaponIndex, weapon);
        }
        continue;
      }

      const startIndex = actor.currentWeaponIndex;
      for (let offset = 0; offset < actor.weapons.length; offset++) {
        const weaponIndex = (startIndex + offset) % actor.weapons.length;
        const weapon = actor.weapons[weaponIndex];
        if (
          !weapon ||
          weapon.currentCooldown > 0 ||
          !canUseEffect(actor, weapon)
        )
          continue;
        if (actor.stamina < weapon.staminaCost) {
          actor.currentWeaponIndex = weaponIndex;
          break;
        }
        changeStamina(actor, actor.stamina - weapon.staminaCost);
        if (weapon.castTicks > 0) {
          actor.castingWeaponIndex = weaponIndex;
          actor.castingTicksRemaining = weapon.castTicks;
          emit({
            id: generateId(),
            type: "CAST_START",
            actorId: actor.id,
            weaponIndex,
            duration: weapon.castTicks,
            timestamp: currentTick,
          });
        } else {
          useWeapon(actor, weaponIndex, weapon);
        }
        break;
      }
    }
    if (events.length > 0) timeline.push({ timestamp: currentTick, events });
  }

  const teams = aliveTeams(simPlayers);
  const result: BattleLog["result"] = {
    winnerTeamId: teams.size === 1 ? ([...teams][0] ?? null) : null,
    reason:
      teams.size === 1 ? "VICTORY" : teams.size === 0 ? "DRAW" : "MAX_TICKS",
    durationTicks: currentTick,
  };
  const endEvent: BattleEvent = {
    id: generateId(),
    type: "BATTLE_END",
    timestamp: currentTick,
    winnerTeamId: result.winnerTeamId,
    reason: result.reason,
  };
  const lastEntry = timeline[timeline.length - 1];
  if (lastEntry?.timestamp === currentTick) lastEntry.events.push(endEvent);
  else timeline.push({ timestamp: currentTick, events: [endEvent] });

  return {
    initialState,
    timeline,
    finalState: { players: capturePlayers(simPlayers) },
    result,
  };
}
