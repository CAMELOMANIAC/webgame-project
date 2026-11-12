import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { StashMoveResponse } from "@webgame/types";
import { useAtomValue } from "jotai";

import { selectedUserIdAtom } from "@/atoms/authAtom";
import { applyImmediateStashMove } from "@/utils/loadoutDraft";

import { API_BASE_URL, apiFetch } from "../api";
import { type CharacterData, characterKey } from "../characterData";
import { inventoryMutationKey, setCachedInventory } from "../inventoryCache";
import { readApiResponse } from "../request";
import type { StashItemResponse } from "./useGetStash";

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
    onMutate: async ({ characterId, ...move }) => {
      if (!userId) return;
      const charKey = characterKey(userId, characterId);
      const stashKey = ["stash", userId] as const;
      await Promise.all([
        queryClient.cancelQueries({ queryKey: charKey, exact: true }),
        queryClient.cancelQueries({ queryKey: stashKey, exact: true }),
        queryClient.cancelQueries({
          queryKey: ["characters", userId],
          exact: true,
        }),
      ]);

      const previousCharacter =
        queryClient.getQueryData<CharacterData>(charKey);
      const previousStash =
        queryClient.getQueryData<StashItemResponse[]>(stashKey);
      if (previousCharacter && previousStash) {
        const predicted = applyImmediateStashMove(
          previousCharacter,
          previousStash,
          move,
        );
        if (predicted.ok) {
          setCachedInventory(
            queryClient,
            userId,
            characterId,
            predicted.characterData.raw,
          );
          queryClient.setQueryData(stashKey, predicted.stash);
          return { previousCharacter, previousStash };
        }
      }
    },
    onError: (_error, { characterId }, context) => {
      if (userId && context) {
        setCachedInventory(
          queryClient,
          userId,
          characterId,
          context.previousCharacter.raw,
        );
        queryClient.setQueryData(["stash", userId], context.previousStash);
      }
    },
    onSuccess: ({ stash, ...snapshot }, { characterId }) => {
      if (!userId) return;
      setCachedInventory(queryClient, userId, characterId, snapshot);
      queryClient.setQueryData(["stash", userId], stash);
    },
  });
};
