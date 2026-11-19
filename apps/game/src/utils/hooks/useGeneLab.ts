import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CharacterGeneProfile, CharacterVariantStats } from "@webgame/types";
import { useAtomValue } from "jotai";

import { selectedUserIdAtom } from "@/atoms/authAtom";

import { API_BASE_URL, apiFetch } from "../api";
import { characterKey } from "../characterData";
import { readApiResponse } from "../request";

export function useGeneLab(characterId: string | null | undefined) {
  const userId = useAtomValue(selectedUserIdAtom);
  const queryClient = useQueryClient();

  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: characterKey(userId, characterId),
      }),
      queryClient.invalidateQueries({ queryKey: ["characters", userId] }),
      queryClient.invalidateQueries({ queryKey: ["stash", userId] }),
      queryClient.invalidateQueries({ queryKey: ["market"] }),
    ]);
  };

  const initGenes = useMutation({
    mutationFn: async (targetCharacterId: string) =>
      readApiResponse<{ geneProfile: CharacterGeneProfile }>(
        await apiFetch(`${API_BASE_URL}/character/${targetCharacterId}/genes/init`, {
          method: "POST",
        }),
      ),
    onSuccess: invalidateAll,
  });

  const rerollGene = useMutation({
    mutationFn: async (input: {
      characterId: string;
      slotIndex: number;
      ampouleItemId?: string | null;
    }) =>
      readApiResponse<{ geneProfile: CharacterGeneProfile; credits: number }>(
        await apiFetch(
          `${API_BASE_URL}/character/${input.characterId}/genes/reroll`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              slotIndex: input.slotIndex,
              ampouleItemId: input.ampouleItemId ?? null,
            }),
          },
        ),
      ),
    onSuccess: invalidateAll,
  });

  const commitGene = useMutation({
    mutationFn: async (input: {
      characterId: string;
      chosenGeneId: string | null;
    }) =>
      readApiResponse<{
        geneProfile: CharacterGeneProfile;
        stats: CharacterVariantStats;
      }>(
        await apiFetch(
          `${API_BASE_URL}/character/${input.characterId}/genes/commit`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chosenGeneId: input.chosenGeneId }),
          },
        ),
      ),
    onSuccess: invalidateAll,
  });

  return { initGenes, rerollGene, commitGene };
}
