import { useMutation, useQueryClient } from "@tanstack/react-query";

import { API_BASE_URL,apiFetch } from "../api";
import { readApiResponse } from "../request";

export function useGearActions() {
  const queryClient = useQueryClient();
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["character"] });
    void queryClient.invalidateQueries({ queryKey: ["characters"] });
    void queryClient.invalidateQueries({ queryKey: ["stash"] });
  };
  const equip = useMutation({
    mutationFn: async ({
      characterId,
      weaponMasterId,
      slotIndex,
    }: {
      characterId: string;
      weaponMasterId: string | null;
      slotIndex: number;
    }) =>
      readApiResponse(
        await apiFetch(`${API_BASE_URL}/character/${characterId}/equipment`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ weaponMasterId, slotIndex }),
        }),
      ),
    onSuccess: refresh,
  });
  const supplies = useMutation({
    mutationFn: async (characterId: string) =>
      readApiResponse(
        await apiFetch(`${API_BASE_URL}/character/${characterId}/supplies`, {
          method: "POST",
        }),
      ),
    onSuccess: refresh,
  });
  return { equip, supplies };
}
