import { useMutation, useQueryClient } from "@tanstack/react-query";

import { API_BASE_URL,apiFetch } from "../api";
import type { CharacterData } from "./useGetCharacter";

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

      const response = await apiFetch(
        `${API_BASE_URL}/character/${characterId}/slots/sync`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ equipment, inventory }),
        },
      );

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(errorData.error || "Failed to sync items with server");
      }

      return response.json();
    },
    onSettled: () => {
      // 동기화 완료/실패 시 최신 서버 상태로 정렬
      void queryClient.invalidateQueries({ queryKey: ["character"] });
      void queryClient.invalidateQueries({ queryKey: ["characters"] });
    },
  });
};
