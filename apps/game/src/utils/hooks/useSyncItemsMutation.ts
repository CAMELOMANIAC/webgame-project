import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { CharacterData } from "./useGetCharacter";

const API_BASE_URL = "http://localhost:3001";

interface SyncItemsParams {
  characterId: string;
  data: CharacterData;
}

/**
 * 캐릭터의 모든 슬롯(장착, 인벤토리) 상태를 서버와 동기화하는 훅
 */
export const useSyncItemsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ characterId, data }: SyncItemsParams) => {
      // 1. 서버 전송용 데이터 가공 (빈 아이템 제외)
      const equipment = data.raw.equipment
        .filter((w) => w.weaponMaster !== null)
        .map((w) => ({
          weaponMasterId: w.weaponMaster!.id,
          slotIndex: w.slotIndex,
        }));

      const inventory = data.raw.inventory
        .filter((i) => i.weaponMaster !== null)
        .map((i) => ({
          weaponMasterId: i.weaponMaster!.id,
          slotIndex: i.slotIndex,
          quantity: i.quantity,
        }));

      const response = await fetch(`${API_BASE_URL}/character/${characterId}/slots/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ equipment, inventory }),
      });

      if (!response.ok) {
        throw new Error("Failed to sync items with server");
      }

      return response.json();
    },
    onSuccess: () => {
      // 동기화 성공 후 캐릭터 데이터 무효화하여 최신 상태 유지
      queryClient.invalidateQueries({ queryKey: ["character"] });
    },
  });
};
