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
  use: defaultUseWeapon,
};

export const defaultWeapon2: Weapon = {
  name: "secondary",
  damage: 5,
  cooldown: 800,
  currentCooldown: 0,
  use: defaultUseWeapon,
};
