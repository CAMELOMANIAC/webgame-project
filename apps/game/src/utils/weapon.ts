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
      duration: thisWeapon.cooldown,
    },
  ];
};

export const defaultWeapon: Weapon = {
  name: "primary",
  damage: 10,
  cooldown: 1000,
  currentCooldown: 0,
  staminaCost: 10, // 추가
  use: defaultUseWeapon,
};

export const defaultWeapon2: Weapon = {
  name: "secondary",
  damage: 5,
  cooldown: 800,
  currentCooldown: 0,
  staminaCost: 5, // 추가
  use: defaultUseWeapon,
};

export const healingWeapon: Weapon = {
  name: "Life-saver",
  damage: 0,
  cooldown: 0,
  currentCooldown: 0,
  staminaCost: 20, // 추가
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
  name: "Sniper Rifle",
  damage: 25,
  cooldown: 2000,
  currentCooldown: 0,
  staminaCost: 30, // 추가
  strategy: "WEAKEST", // 체력이 낮은 적 우선 타겟팅
  use: defaultUseWeapon,
};

export const giantSlayer: Weapon = {
  name: "Giant Slayer",
  damage: 15,
  cooldown: 1200,
  currentCooldown: 0,
  staminaCost: 15, // 추가
  strategy: "STRONGEST", // 체력이 높은 적 우선 타겟팅
  use: defaultUseWeapon,
};
