import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InventoryUpdateResponse } from "@webgame/types";
import { useAtomValue } from "jotai";

import { selectedUserIdAtom } from "@/atoms/authAtom";

import { API_BASE_URL, apiFetch } from "../api";
import { type CharacterData, characterKey } from "../characterData";
import { inventoryMutationKey, setCachedInventory } from "../inventoryCache";
import { readApiResponse } from "../request";

interface SyncItemsParams {
  characterId: string;
  data: CharacterData;
}

/**
 * 캐릭터의 모든 슬롯(장착, 인벤토리) 상태를 서버와 동기화하는 훅
 */
export const useSyncItemsMutation = () => {
  const queryClient = useQueryClient();
  const userId = useAtomValue(selectedUserIdAtom);

  return useMutation({
    mutationKey: inventoryMutationKey(userId),
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

      return readApiResponse<InventoryUpdateResponse>(response);
    },
    onMutate: async ({ characterId, data }) => {
      if (!userId) return;
      const queryKey = characterKey(userId, characterId);
      await Promise.all([
        queryClient.cancelQueries({ queryKey, exact: true }),
        queryClient.cancelQueries({
          queryKey: ["characters", userId],
          exact: true,
        }),
      ]);
      const previous = queryClient.getQueryData<CharacterData>(queryKey);
      setCachedInventory(queryClient, userId, characterId, data.raw);
      return previous;
    },
    onError: (_error, { characterId }, previous) => {
      if (userId && previous) {
        setCachedInventory(queryClient, userId, characterId, previous.raw);
      }
    },
    onSuccess: (snapshot, { characterId }) => {
      if (userId)
        setCachedInventory(queryClient, userId, characterId, snapshot);
    },
  });
};
