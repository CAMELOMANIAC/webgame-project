import { useQuery } from "@tanstack/react-query";
import type { Monster } from "@webgame/types";

const API_BASE_URL = "http://localhost:3001";

export interface MonsterWeaponResponse {
  id: string;
  slotIndex: number;
  weaponMaster: {
    id: string;
    name: string;
    weight: number;
    value: number;
    damage: number;
    staminaCost: number;
    cooldownTicks: number;
    castTicks: number;
    description: string;
  };
}

export interface MonsterMasterResponse {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  staminaRegen: number;
  level: number;
  weapons: MonsterWeaponResponse[];
}

/**
 * 특정 레벨에 맞는 몬스터 데이터를 서버에서 가져오는 커스텀 훅
 */
export const useGetMonster = (level: number) => {
  return useQuery<Monster>({
    queryKey: ["monster", level],
    queryFn: async (): Promise<Monster> => {
      const response = await fetch(`${API_BASE_URL}/monster/match?level=${level}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("No monster found for this level");
        }
        throw new Error("Failed to fetch monster data");
      }

      const data: MonsterMasterResponse = await response.json();

      // 서버의 WeaponMaster 데이터를 게임 엔진에서 사용하는 Weapon 규격으로 변환
      const weapons: Monster["weapons"] = [null, null, null, null, null, null];

      data.weapons.forEach((w) => {
        if (w.slotIndex >= 0 && w.slotIndex < 6) {
          weapons[w.slotIndex] = {
            id: w.weaponMaster.id,
            name: w.weaponMaster.name,
            weight: w.weaponMaster.weight,
            value: w.weaponMaster.value,
            damage: w.weaponMaster.damage,
            staminaCost: w.weaponMaster.staminaCost,
            cooldownTicks: w.weaponMaster.cooldownTicks,
            castTicks: w.weaponMaster.castTicks,
            currentCooldown: 0,
            use: () => [], // 클라이언트 사이드에서는 빈 함수 처리
          };
        }
      });

      return {
        id: data.id,
        name: data.name,
        hp: data.hp,
        maxHp: data.maxHp,
        stamina: data.stamina,
        maxStamina: data.maxStamina,
        staminaRegen: data.staminaRegen,
        weapons: weapons,
      };
    },
    enabled: level > 0,
  });
};
