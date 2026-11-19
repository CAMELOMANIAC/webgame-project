import {
  aggregateGenePassives,
  type BattleCombatant,
  type BattleEvent,
  type BattleLog,
  type BattleLogEntry,
  FATIGUE_RULES,
  getWeaponTags,
  type PlayerState,
  resolveGeneActiveWeapons,
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
  geneCritChanceBonus?: number;
  isSummon?: boolean;
  summonerId?: string;
  summonMasterId?: string;
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
    ...(player.isSummon ? { isSummon: true } : {}),
    ...(player.summonerId ? { summonerId: player.summonerId } : {}),
    weapons: player.weapons.slice(0, 6).map((weapon) =>
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

function getActiveSummons(
  players: SimCombatant[],
  summonerId: string,
  summonMasterId: string,
): SimCombatant[] {
  return players.filter(
    (p) =>
      p.hp > 0 &&
      p.summonerId === summonerId &&
      p.summonMasterId === summonMasterId,
  );
}

function canUseEffect(
  actor: SimCombatant,
  weapon: SimWeapon,
  players: SimCombatant[],
) {
  const effect = weapon.effect;
  const hasAction =
    weapon.damage > 0 ||
    Boolean(effect?.amount) ||
    Boolean(effect?.shieldGain) ||
    Boolean(effect?.target) ||
    Boolean(effect?.staminaRestore) ||
    Boolean(effect?.perTag) ||
    Boolean(effect?.summon);
  if (!hasAction) return false;
  if (effect?.oncePerBattle && weapon.isTriggered) return false;
  if (
    effect?.type === "SUMMON" &&
    effect.summon &&
    weapon.damage <= 0 &&
    !effect.amount &&
    !effect.shieldGain &&
    !effect.target &&
    !effect.staminaRestore &&
    !effect.perTag
  ) {
    const active = getActiveSummons(players, actor.id, effect.summon.id);
    if (effect.summon.respawnOnlyWhenEmpty && active.length > 0) {
      return false;
    }
    if (
      effect.summon.maxActive !== undefined &&
      active.length >= effect.summon.maxActive
    ) {
      if (effect.summon.healOnReactivate) {
        const targetShield = effect.summon.shieldOnSummon ?? 0;
        const needsRefresh = active.some(
          (s) => s.hp < s.maxHp || s.shield < targetShield,
        );
        if (!needsRefresh) return false;
      } else {
        return false;
      }
    }
  }
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

  const simPlayers: SimCombatant[] = players.map((player) => {
    const buff = (player.fatigue ?? 1) > 0 ? player.activeFoodBuff : null;
    const genePassives = aggregateGenePassives(player.geneIds);
    const maxHpBonus = buff?.maxHpBonus ?? 0;
    const maxHp = player.maxHp + maxHpBonus;
    const hp = Math.min(maxHp, player.hp + maxHpBonus);
    const buildSimWeapon = (weapon: WeaponData): SimWeapon => {
      const tags = getWeaponTags(weapon);
      let damage = weapon.damage;
      let cooldownTicks = weapon.cooldownTicks;
      if (buff) {
        if (
          weapon.damage > 0 &&
          weapon.attackType === "MELEE" &&
          buff.meleeDamageBonus
        ) {
          damage += buff.meleeDamageBonus;
        }
        if (
          weapon.attackType === "RANGED" &&
          buff.rangedCooldownReductionTicks
        ) {
          cooldownTicks = Math.max(
            1,
            cooldownTicks - buff.rangedCooldownReductionTicks,
          );
        }
        if (
          weapon.damage > 0 &&
          buff.tagDamageBonus &&
          tags.includes(buff.tagDamageBonus.tag)
        ) {
          damage += buff.tagDamageBonus.amount;
        }
      }
      if (damage > 0) {
        if (weapon.attackType === "MELEE" && genePassives.meleeDamageBonus) {
          damage += genePassives.meleeDamageBonus;
        }
        if (weapon.attackType === "RANGED" && genePassives.rangedDamageBonus) {
          damage += genePassives.rangedDamageBonus;
        }
      }
      let tagPct = 0;
      for (const tag of tags) {
        tagPct += genePassives.tagBonusPct[tag] ?? 0;
      }
      const tagMult = tagPct > 0 ? 1 + tagPct / 100 : 1;
      if (tagMult > 1 && damage > 0) {
        damage = Math.max(1, Math.round(damage * tagMult));
      }
      const effect = weapon.effect ? { ...weapon.effect } : undefined;
      if (effect && tagMult > 1) {
        if (effect.amount && effect.amount > 0) {
          effect.amount = Math.max(1, Math.round(effect.amount * tagMult));
        }
        if (effect.shieldGain && effect.shieldGain > 0) {
          effect.shieldGain = Math.max(
            1,
            Math.round(effect.shieldGain * tagMult),
          );
        }
      }
      return {
        ...weapon,
        damage,
        cooldownTicks,
        tags,
        effect,
        currentCooldown: 0,
        isTriggered: false,
        activationCount: 0,
        pendingDamageBonus: 0,
        pendingCritBonus: 0,
        pendingShieldBonus: 0,
      };
    };
    const equippedWeapons = player.weapons.map((weapon) =>
      weapon ? buildSimWeapon(weapon) : null,
    );
    const geneActiveWeapons = resolveGeneActiveWeapons(player.geneIds).map(
      (geneWeapon) => buildSimWeapon(geneWeapon),
    );
    return {
      ...player,
      hp,
      maxHp,
      shield: genePassives.startingShield,
      geneCritChanceBonus: genePassives.critChanceBonus,
      weapons: [...equippedWeapons, ...geneActiveWeapons],
      currentWeaponIndex: player.currentWeaponIndex ?? 0,
      castingWeaponIndex: null,
      castingTicksRemaining: 0,
    };
  });
  const initialState = { players: capturePlayers(simPlayers) };
  const timeline: BattleLogEntry[] = [];
  let eventCounter = 0;
  let summonCounter = 0;
  let currentTick = 0;
  let retreatGauge = 0;
  let retreatDamage = 0;
  const generateId = () => `event-${eventCounter++}`;

  while (aliveTeams(simPlayers).size > 1 && currentTick < maxTicks) {
    currentTick++;
    const events: BattleEvent[] = [];
    const pendingSummons: SimCombatant[] = [];
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

      const sustainMultiplier =
        currentTick < 30 ? 1 : Math.max(0, 1 - (currentTick - 30) * 0.02);

      const selfShieldGain = effectTriggered
        ? (eff?.shieldGain ?? 0) + perTagShield
        : 0;
      const totalShieldGain = Math.floor(
        (selfShieldGain + weapon.pendingShieldBonus) * sustainMultiplier,
      );
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
      const healPower = Math.floor(
        ((canHeal ? (eff.amount ?? 0) : 0) + perTagHeal) * sustainMultiplier,
      );
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
          const foodCritBonus =
            (actor.fatigue ?? 1) > 0
              ? (actor.activeFoodBuff?.critChanceBonus ?? 0)
              : 0;
          const critChance = Math.min(
            1,
            0.1 +
              foodCritBonus +
              (actor.geneCritChanceBonus ?? 0) +
              weapon.pendingCritBonus,
          );
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
            for (const dependent of [...simPlayers, ...pendingSummons]) {
              if (dependent.summonerId === target.id && dependent.hp > 0) {
                dependent.hp = 0;
                dependent.shield = 0;
                emit({
                  id: generateId(),
                  type: "DEATH",
                  playerId: dependent.id,
                  timestamp: currentTick,
                });
                if (dependent.castingWeaponIndex !== null) {
                  emit({
                    id: generateId(),
                    type: "CAST_CANCEL",
                    actorId: dependent.id,
                    weaponIndex: dependent.castingWeaponIndex,
                    reason: "DEATH",
                    timestamp: currentTick,
                  });
                  dependent.castingWeaponIndex = null;
                  dependent.castingTicksRemaining = 0;
                }
              }
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

      if (eff?.type === "SUMMON" && eff.summon) {
        const summonDef = eff.summon;
        const activeSummons = getActiveSummons(
          [...simPlayers, ...pendingSummons],
          actor.id,
          summonDef.id,
        );
        const currentActive = activeSummons.length;
        const canSpawn = !summonDef.respawnOnlyWhenEmpty || currentActive === 0;
        const desiredCount = summonDef.count ?? 1;
        const availableSlots =
          summonDef.maxActive !== undefined
            ? Math.max(0, summonDef.maxActive - currentActive)
            : desiredCount;
        const spawnCount = canSpawn ? Math.min(desiredCount, availableSlots) : 0;

        for (let i = 0; i < spawnCount; i++) {
          const summonId = `${actor.id}:summon:${summonDef.id}:${summonCounter++}`;
          const summonShield = Math.floor(
            (summonDef.shieldOnSummon ?? 0) * sustainMultiplier,
          );
          const summonUnit: SimCombatant = {
            id: summonId,
            displayName: summonDef.name,
            teamId: actor.teamId,
            hp: summonDef.hp,
            maxHp: summonDef.hp,
            shield: summonShield,
            stamina: 100,
            maxStamina: 100,
            staminaRegen: 10,
            weight: 0,
            maxWeight: 10,
            time: actor.time,
            currentWeaponIndex: 0,
            castingWeaponIndex: null,
            castingTicksRemaining: 0,
            isSummon: true,
            summonerId: actor.id,
            summonMasterId: summonDef.id,
            weapons: [
              {
                id: `${summonDef.id}-attack`,
                name: summonDef.name,
                damage: summonDef.damage,
                staminaCost: 0,
                cooldownTicks: summonDef.cooldownTicks,
                castTicks: 0,
                weight: 0,
                value: 0,
                attackType: summonDef.attackType,
                strategy: summonDef.strategy,
                tags: summonDef.tags,
                currentCooldown: 0,
                isTriggered: false,
                activationCount: 0,
                pendingDamageBonus: 0,
                pendingCritBonus: 0,
                pendingShieldBonus: 0,
              },
            ],
          };
          pendingSummons.push(summonUnit);
          emit({
            id: generateId(),
            type: "SUMMON",
            summonerId: actor.id,
            weaponIndex,
            combatant: capturePlayers([summonUnit])[0]!,
            timestamp: currentTick,
          });
        }

        if (spawnCount === 0 && currentActive > 0 && summonDef.healOnReactivate) {
          const scaledHeal = Math.floor(
            summonDef.healOnReactivate * sustainMultiplier,
          );
          const targetShield = Math.floor(
            (summonDef.shieldOnSummon ?? 0) * sustainMultiplier,
          );
          for (const summon of activeSummons) {
            if (scaledHeal > 0 && summon.hp < summon.maxHp) {
              const beforeHp = summon.hp;
              summon.hp = Math.min(summon.maxHp, summon.hp + scaledHeal);
              emit({
                id: generateId(),
                type: "HEAL",
                targetId: summon.id,
                amount: summon.hp - beforeHp,
                remainingHp: summon.hp,
                timestamp: currentTick,
              });
            }
            if (targetShield > summon.shield) {
              const shieldGain = targetShield - summon.shield;
              summon.shield = targetShield;
              emit({
                id: generateId(),
                type: "SHIELD",
                targetId: summon.id,
                amount: shieldGain,
                currentShield: summon.shield,
                weaponIndex,
                timestamp: currentTick,
              });
            }
          }
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
          !canUseEffect(actor, weapon, [...simPlayers, ...pendingSummons])
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
    if (pendingSummons.length > 0) {
      simPlayers.push(...pendingSummons);
    }
    if (
      currentTick >= 40 &&
      currentTick % 5 === 0 &&
      aliveTeams(simPlayers).size > 1 &&
      simPlayers.some((u) => u.weapons.some((w) => w !== null))
    ) {
      const overloadDamage = Math.floor((currentTick - 35) / 5) * 8;
      for (const unit of simPlayers) {
        if (unit.hp <= 0) continue;
        unit.hp = Math.max(0, unit.hp - overloadDamage);
        emit({
          id: generateId(),
          type: "DAMAGE",
          targetId: unit.id,
          amount: overloadDamage,
          remainingHp: unit.hp,
          isCritical: false,
          timestamp: currentTick,
        });
        if (unit.hp <= 0) {
          emit({
            id: generateId(),
            type: "DEATH",
            playerId: unit.id,
            timestamp: currentTick,
          });
          if (unit.castingWeaponIndex !== null) {
            emit({
              id: generateId(),
              type: "CAST_CANCEL",
              actorId: unit.id,
              weaponIndex: unit.castingWeaponIndex,
              reason: "DEATH",
              timestamp: currentTick,
            });
            unit.castingWeaponIndex = null;
            unit.castingTicksRemaining = 0;
          }
        }
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
