import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { StashMoveResponse, UnequipOthersResponse } from "@webgame/types";
import { useAtomValue } from "jotai";

import { selectedUserIdAtom } from "@/atoms/authAtom";
import { unequipAllDraft } from "@/utils/loadoutDraft";

import { API_BASE_URL, apiFetch } from "../api";
import {
  applyInventoryAndStashSnapshot,
  applyUnequipOthersSnapshot,
  cancelInventoryQueries,
  inventoryMutationKey,
  prepareOptimisticInventoryStash,
} from "../inventoryCache";
import { readApiResponse } from "../request";

export function useUnequipAllEquipment() {
  const queryClient = useQueryClient();
  const userId = useAtomValue(selectedUserIdAtom);

  return useMutation({
    mutationKey: inventoryMutationKey(userId),
    mutationFn: async (characterId: string) =>
      readApiResponse<StashMoveResponse>(
        await apiFetch(
          `${API_BASE_URL}/character/${characterId}/equipment/unequip-all`,
          { method: "POST" },
        ),
      ),
    onMutate: async (characterId) =>
      prepareOptimisticInventoryStash(
        queryClient,
        userId,
        characterId,
        unequipAllDraft,
      ),
    onError: (_error, characterId, context) => {
      if (userId && context) {
        applyInventoryAndStashSnapshot(
          queryClient,
          userId,
          characterId,
          context.previousCharacter.raw,
          context.previousStash,
        );
      }
    },
    onSuccess: ({ stash, ...snapshot }, characterId) => {
      if (!userId) return;
      applyInventoryAndStashSnapshot(
        queryClient,
        userId,
        characterId,
        snapshot,
        stash,
      );
    },
  });
}

export function useUnequipOtherEquipment() {
  const queryClient = useQueryClient();
  const userId = useAtomValue(selectedUserIdAtom);

  return useMutation({
    mutationKey: inventoryMutationKey(userId),
    mutationFn: async (characterId: string) =>
      readApiResponse<UnequipOthersResponse>(
        await apiFetch(
          `${API_BASE_URL}/character/${characterId}/equipment/unequip-others`,
          { method: "POST" },
        ),
      ),
    onMutate: async () => {
      if (userId) await cancelInventoryQueries(queryClient, userId);
    },
    onSuccess: (data) => {
      if (userId) applyUnequipOthersSnapshot(queryClient, userId, data);
    },
  });
}
