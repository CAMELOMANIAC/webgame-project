import type { BattleEvent, User, Weapon } from ".";

export const defaultUseWeapon = (
  actor: User,
  target: User,
  thisWeapon: Weapon,
  timestamp: number,
): BattleEvent[] => {
  const weaponIndex = actor.weapons.indexOf(thisWeapon);
  const damage = thisWeapon.damage;
  target.hp = Math.max(0, target.hp - damage);

  return [
    {
      id: "",
      timestamp,
      type: "ATTACK",
      actorId: actor.id,
      targetId: target.id,
      weaponIndex: weaponIndex,
    },
    {
      id: "",
      timestamp,
      type: "DAMAGE",
      targetId: target.id,
      amount: damage,
      remainingHp: target.hp,
      isCritical: false,
    },
    {
      id: "",
      timestamp,
      type: "COOLDOWN",
      actorId: actor.id,
      weaponIndex: weaponIndex,
      duration: thisWeapon.cooldownTicks,
    },
  ];
};

export const defaultWeapon: Weapon = {
  id: "wpn_primary",
  name: "primary",
  damage: 10,
  cooldownTicks: 10,
  currentCooldown: 0,
  staminaCost: 28,
  castTicks: 0,
  weight: 5,
  value: 100,
  use: defaultUseWeapon,
  attackType: "MELEE",
};

export const defaultWeapon2: Weapon = {
  id: "wpn_secondary",
  name: "secondary",
  damage: 5,
  cooldownTicks: 8,
  currentCooldown: 0,
  staminaCost: 16,
  castTicks: 0,
  weight: 3,
  value: 50,
  use: defaultUseWeapon,
  attackType: "MELEE",
};

export const healingWeapon: Weapon = {
  id: "wpn_lifesaver",
  name: "응급 생체 팩",
  damage: 0,
  cooldownTicks: 0,
  currentCooldown: 0,
  staminaCost: 40,
  castTicks: 0,
  weight: 2,
  value: 150,
  isTriggered: false,
  effect: { type: "HEAL", amount: 50, hpThreshold: 0.5, oncePerBattle: true },
  attackType: "MELEE",
  use: (actor, _target, thisWeapon, timestamp) => {
    if (actor.hp < actor.maxHp * 0.5 && !thisWeapon.isTriggered) {
      thisWeapon.isTriggered = true;
      const healAmount = 50;
      actor.hp = Math.min(actor.maxHp, actor.hp + healAmount);
      return [
        {
          id: "",
          timestamp,
          type: "HEAL",
          targetId: actor.id,
          amount: healAmount,
          remainingHp: actor.hp,
        },
      ];
    }
    return [];
  },
};

export const sniperRifle: Weapon = {
  id: "wpn_sniper",
  name: "편도 티켓 발권기",
  damage: 34,
  cooldownTicks: 8,
  currentCooldown: 0,
  staminaCost: 36,
  castTicks: 4,
  weight: 15,
  value: 180,
  strategy: "WEAKEST",
  effect: { shieldPierce: 1, critChanceBonus: 0.35 },
  use: defaultUseWeapon,
  attackType: "RANGED",
};

export const giantSlayer: Weapon = {
  id: "wpn_giant_slayer",
  name: "뚝배기 분쇄기",
  damage: 24,
  cooldownTicks: 6,
  currentCooldown: 0,
  staminaCost: 26,
  castTicks: 2,
  weight: 10,
  value: 150,
  strategy: "STRONGEST",
  effect: { shieldPierce: 0.5, critChanceBonus: 0.2 },
  use: defaultUseWeapon,
  attackType: "MELEE",
};

export const dagger: Weapon = {
  id: "wpn_dagger",
  name: "Dagger",
  damage: 7,
  cooldownTicks: 5,
  currentCooldown: 0,
  staminaCost: 5,
  castTicks: 0,
  weight: 2,
  value: 40,
  use: defaultUseWeapon,
  attackType: "MELEE",
};

export const greatsword: Weapon = {
  id: "wpn_greatsword",
  name: "Greatsword",
  damage: 30,
  cooldownTicks: 25,
  currentCooldown: 0,
  staminaCost: 35,
  castTicks: 10,
  weight: 20,
  value: 350,
  use: defaultUseWeapon,
  attackType: "MELEE",
};

export const staff: Weapon = {
  id: "wpn_staff",
  name: "Staff",
  damage: 18,
  cooldownTicks: 15,
  currentCooldown: 0,
  staminaCost: 20,
  castTicks: 10,
  weight: 8,
  value: 250,
  use: defaultUseWeapon,
  attackType: "RANGED",
};
