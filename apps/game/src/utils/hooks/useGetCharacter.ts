import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAtomValue } from "jotai";

import { selectedUserIdAtom } from "@/atoms/authAtom";

import {
  type CharacterData,
  createCharacterQueryOptions,
} from "../characterData";
import { useCharacterRoster } from "./useCharacterCollection";

export type { CharacterData, CharacterResponse } from "../characterData";
export { createCharacterQueryOptions } from "../characterData";

export const useGetCharacter = (
  requestedUserId?: string,
  selectedCharacterIdOverride?: string | null,
  options?: { enabled?: boolean },
) => {
  const queryClient = useQueryClient();
  const selectedUserId = useAtomValue(selectedUserIdAtom);
  const userId = requestedUserId ?? selectedUserId;
  const roster = useCharacterRoster(userId ?? undefined);
  const characterId =
    selectedCharacterIdOverride !== undefined
      ? selectedCharacterIdOverride
      : roster.data?.selectedCharacterId;
  const enabled = Boolean(userId && characterId && (options?.enabled ?? true));
  const characterQuery = useQuery<CharacterData>({
    ...createCharacterQueryOptions(queryClient, userId, characterId),
    enabled,
  });
  return {
    ...characterQuery,
    isLoading: roster.isPending || characterQuery.isLoading,
    error: roster.error ?? characterQuery.error,
    refetch: async () => {
      await roster.refetch();
      return characterQuery.refetch();
    },
  };
};
