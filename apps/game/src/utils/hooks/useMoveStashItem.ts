import { useMutation, useQueryClient } from "@tanstack/react-query";

import { API_BASE_URL,apiFetch } from "../api";

interface MoveItemVariables {
  characterId: string;
  direction: "to_backpack" | "to_stash";
  weaponMasterId: string;
  slotIndex: number;
}

export const useMoveStashItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      characterId,
      direction,
      weaponMasterId,
      slotIndex,
    }: MoveItemVariables) => {
      const response = await apiFetch(
        `${API_BASE_URL}/character/${characterId}/inventory/move`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            direction,
            weaponMasterId,
            slotIndex,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to move item");
      }

      return response.json();
    },
    onSuccess: () => {
      // 캐릭터 정보(인벤토리) 및 창고 정보 쿼리 캐시 무효화하여 리로딩 유도
      queryClient.invalidateQueries({ queryKey: ["character"] });
      queryClient.invalidateQueries({ queryKey: ["characters"] });
      queryClient.invalidateQueries({ queryKey: ["stash"] });
    },
  });
};
