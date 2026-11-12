import type { QueryClient } from "@tanstack/react-query";
import type { InventorySnapshot, UnequipOthersResponse } from "@webgame/types";

import {
  type CharacterData,
  characterKey,
  normalizeCharacterData,
} from "./characterData";
import type { CharacterRoster } from "./hooks/useCharacterCollection";
import type { StashItemResponse } from "./hooks/useGetStash";
import type { DraftMoveResult } from "./loadoutDraft";

export const inventoryMutationKey = (userId: string | null | undefined) =>
  ["save-inventory", userId] as const;

export function setCachedInventory(
  queryClient: QueryClient,
  userId: string,
  characterId: string,
  snapshot: InventorySnapshot,
) {
  const updated = queryClient.setQueryData<CharacterData>(
    characterKey(userId, characterId),
    (current) =>
      current &&
      normalizeCharacterData({
        ...current.raw,
        equipment: snapshot.equipment,
        inventory: snapshot.inventory,
        weight: snapshot.weight,
      }),
  );
  if (updated) {
    queryClient.setQueryData<CharacterRoster>(
      ["characters", userId],
      (roster) =>
        roster && {
          ...roster,
          characters: roster.characters.map((character) =>
            character.id === characterId
              ? { ...character, weight: snapshot.weight }
              : character,
          ),
        },
    );
  }
}

export async function cancelInventoryQueries(
  queryClient: QueryClient,
  userId: string,
  characterId?: string,
) {
  await Promise.all([
    characterId
      ? queryClient.cancelQueries({
          queryKey: characterKey(userId, characterId),
          exact: true,
        })
      : queryClient.cancelQueries({ queryKey: ["character", userId] }),
    queryClient.cancelQueries({ queryKey: ["stash", userId], exact: true }),
    queryClient.cancelQueries({
      queryKey: ["characters", userId],
      exact: true,
    }),
  ]);
}

export function applyInventoryAndStashSnapshot(
  queryClient: QueryClient,
  userId: string,
  characterId: string,
  snapshot: InventorySnapshot,
  stash: StashItemResponse[],
) {
  setCachedInventory(queryClient, userId, characterId, snapshot);
  queryClient.setQueryData<StashItemResponse[]>(["stash", userId], stash);
}

export interface InventoryStashRollbackContext {
  previousCharacter: CharacterData;
  previousStash: StashItemResponse[];
}

export async function prepareOptimisticInventoryStash(
  queryClient: QueryClient,
  userId: string | null | undefined,
  characterId: string,
  predict: (
    characterData: CharacterData,
    stash: StashItemResponse[],
  ) => DraftMoveResult,
): Promise<InventoryStashRollbackContext | undefined> {
  if (!userId) return undefined;
  await cancelInventoryQueries(queryClient, userId, characterId);
  const previousCharacter = queryClient.getQueryData<CharacterData>(
    characterKey(userId, characterId),
  );
  const previousStash = queryClient.getQueryData<StashItemResponse[]>([
    "stash",
    userId,
  ]);
  if (!previousCharacter || !previousStash) return undefined;

  const predicted = predict(previousCharacter, previousStash);
  if (!predicted.ok) return undefined;

  applyInventoryAndStashSnapshot(
    queryClient,
    userId,
    characterId,
    predicted.characterData.raw,
    predicted.stash,
  );
  return { previousCharacter, previousStash };
}

export function applyUnequipOthersSnapshot(
  queryClient: QueryClient,
  userId: string,
  data: UnequipOthersResponse,
) {
  queryClient.setQueryData<StashItemResponse[]>(["stash", userId], data.stash);
  const weightById = new Map(
    data.unequippedCharacters.map((entry) => [entry.characterId, entry.weight]),
  );
  if (weightById.size === 0) return;

  queryClient.setQueryData<CharacterRoster>(
    ["characters", userId],
    (roster) =>
      roster && {
        ...roster,
        characters: roster.characters.map((character) => {
          const nextWeight = weightById.get(character.id);
          return nextWeight === undefined
            ? character
            : { ...character, weight: nextWeight };
        }),
      },
  );

  for (const { characterId, weight } of data.unequippedCharacters) {
    queryClient.setQueryData<CharacterData>(
      characterKey(userId, characterId),
      (current) =>
        current &&
        normalizeCharacterData({
          ...current.raw,
          equipment: [],
          weight,
        }),
    );
    queryClient.removeQueries({
      queryKey: ["staging-loadout", userId, characterId],
      exact: true,
    });
  }
}
