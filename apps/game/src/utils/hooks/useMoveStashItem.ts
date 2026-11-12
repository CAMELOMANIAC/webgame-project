import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { StashMoveResponse } from "@webgame/types";
import { useAtomValue } from "jotai";

import { selectedUserIdAtom } from "@/atoms/authAtom";
import { applyImmediateStashMove } from "@/utils/loadoutDraft";

import { API_BASE_URL, apiFetch } from "../api";
import {
  applyInventoryAndStashSnapshot,
  inventoryMutationKey,
  prepareOptimisticInventoryStash,
} from "../inventoryCache";
import { readApiResponse } from "../request";

interface MoveItemVariables {
  characterId: string;
  direction: "to_backpack" | "to_stash";
  weaponMasterId: string;
  slotIndex: number;
}

export const useMoveStashItem = () => {
  const queryClient = useQueryClient();
  const userId = useAtomValue(selectedUserIdAtom);

  return useMutation({
    mutationKey: inventoryMutationKey(userId),
    mutationFn: async ({ characterId, ...move }: MoveItemVariables) =>
      readApiResponse<StashMoveResponse>(
        await apiFetch(
          `${API_BASE_URL}/character/${characterId}/inventory/move`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(move),
          },
        ),
      ),
    onMutate: async ({ characterId, ...move }) =>
      prepareOptimisticInventoryStash(
        queryClient,
        userId,
        characterId,
        (characterData, stash) =>
          applyImmediateStashMove(characterData, stash, move),
      ),
    onError: (_error, { characterId }, context) => {
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
    onSuccess: ({ stash, ...snapshot }, { characterId }) => {
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
};
