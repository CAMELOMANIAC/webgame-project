import type { QueryClient } from "@tanstack/react-query";
import type { InventorySnapshot } from "@webgame/types";

import {
  type CharacterData,
  characterKey,
  normalizeCharacterData,
} from "./characterData";
import type { CharacterRoster } from "./hooks/useCharacterCollection";

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
