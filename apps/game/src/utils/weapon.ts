import type { BattleEvent, User, Weapon } from "./simulateBattle.types";

export const defaultUseWeapon = (actor: User, target: User, thisWeapon: Weapon): BattleEvent[] => {
  const weaponIndex = actor.weapons.indexOf(thisWeapon);
  const damage = thisWeapon.damage;
  target.hp = Math.max(0, target.hp - damage);

  return [
    {
      id: "",
      type: "ATTACK",
      actorId: actor.id,
      targetId: target.id,
      weaponIndex: weaponIndex,
    },
    {
      id: "",
      type: "DAMAGE",
      targetId: target.id,
      amount: damage,
      remainingHp: target.hp,
      isCritical: false,
    },
    {
      id: "",
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
  staminaCost: 10,
  castTicks: 0,
  weight: 5,
  value: 100,
  use: defaultUseWeapon,
};

export const defaultWeapon2: Weapon = {
  id: "wpn_secondary",
  name: "secondary",
  damage: 5,
  cooldownTicks: 8,
  currentCooldown: 0,
  staminaCost: 5,
  castTicks: 0,
  weight: 3,
  value: 50,
  use: defaultUseWeapon,
};

export const healingWeapon: Weapon = {
  id: "wpn_lifesaver",
  name: "Life-saver",
  damage: 0,
  cooldownTicks: 0,
  currentCooldown: 0,
  staminaCost: 20,
  castTicks: 0,
  weight: 2,
  value: 150,
  isTriggered: false,
  use: (actor, _target, thisWeapon) => {
    if (actor.hp < actor.maxHp * 0.5 && !thisWeapon.isTriggered) {
      thisWeapon.isTriggered = true;
      const healAmount = 50;
      actor.hp = Math.min(actor.maxHp, actor.hp + healAmount);
      return [
        {
          id: "",
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
  name: "Sniper Rifle",
  damage: 25,
  cooldownTicks: 20,
  currentCooldown: 0,
  staminaCost: 30,
  castTicks: 15,
  weight: 15,
  value: 300,
  strategy: "WEAKEST",
  use: defaultUseWeapon,
};

export const giantSlayer: Weapon = {
  id: "wpn_giant_slayer",
  name: "Giant Slayer",
  damage: 15,
  cooldownTicks: 12,
  currentCooldown: 0,
  staminaCost: 15,
  castTicks: 5,
  weight: 10,
  value: 200,
  strategy: "STRONGEST",
  use: defaultUseWeapon,
};
