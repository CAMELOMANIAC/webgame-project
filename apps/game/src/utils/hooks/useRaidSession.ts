import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { RaidActionInput, RaidView, StartRaidResult } from "@webgame/types";
import { useAtomValue, useSetAtom } from "jotai";

import { selectedUserIdAtom } from "@/atoms/authAtom";
import { enemyNoiseSignalsAtom, raidNoiseState, unacknowledgedRaidResultsAtom } from "@/atoms/raidAtom";

import { API_BASE_URL, apiFetch } from "../api";
import { readApiResponse } from "../request";
import { characterKey } from "./useCharacterCollection";
import type { CharacterData } from "./useGetCharacter";

export function raidActionInput(
  character: CharacterData | undefined,
): RaidActionInput {
  const raid = character?.raw.activeRaid;
  if (!raid || raid.status !== "ACTIVE")
    throw new Error("진행 중인 탐사가 없습니다.");
  return {
    raidId: raid.id,
    expectedVersion: raid.version,
    requestId: crypto.randomUUID(),
  };
}

export interface StartRaidLoadoutInput {
  equipment: Array<{
    weaponMasterId: string;
    slotIndex: number;
  }>;
  inventory: Array<{
    weaponMasterId: string;
    slotIndex: number;
    quantity: number;
  }>;
}

export type StartRaidInput =
  | string
  | {
      characterId: string;
      entryNodeId?: number;
      loadout?: StartRaidLoadoutInput;
    };

export const useRaidSession = () => {
  const queryClient = useQueryClient();
  const userId = useAtomValue(selectedUserIdAtom);
  const setRaidResults = useSetAtom(unacknowledgedRaidResultsAtom);
  const setNoiseSignals = useSetAtom(enemyNoiseSignalsAtom);
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["character", userId] });
    void queryClient.invalidateQueries({ queryKey: ["stash", userId] });
    void queryClient.invalidateQueries({ queryKey: ["characters", userId] });
    void queryClient.invalidateQueries({ queryKey: ["journal", userId] });
  };
  const startRaidMutation = useMutation({
    mutationFn: async (input: StartRaidInput) => {
      const characterId = typeof input === "string" ? input : input.characterId;
      const loadout = typeof input === "string" ? undefined : input.loadout;
      const entryNodeId = typeof input === "string" ? undefined : input.entryNodeId;
      return readApiResponse<StartRaidResult>(
        await apiFetch(`${API_BASE_URL}/character/${characterId}/raid/start`, {
          method: "POST",
          ...(loadout || entryNodeId !== undefined
            ? {
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...loadout, entryNodeId }),
              }
            : {}),
        }),
      );
    },
    onSuccess: (result, input) => {
      const characterId = typeof input === "string" ? input : input.characterId;
      setNoiseSignals(raidNoiseState(result.raid.id, result));
      queryClient.setQueryData(
        characterKey(userId, characterId),
        (old: CharacterData | undefined) =>
          old
            ? {
                ...old,
                raw: {
                  ...old.raw,
                  isRaiding: true,
                  activeRaid: result.raid,
                  activeRaidId: result.raid.id,
                  currentNodeId: result.raid.currentNodeId,
                },
              }
            : old,
      );
      refresh();
    },
  });
  const extractRaidMutation = useMutation({
    mutationFn: async (characterId: string) => {
      const character = queryClient.getQueryData<CharacterData>(
        characterKey(userId, characterId),
      );
      const body = raidActionInput(character);
      return readApiResponse<{ status: string; raid: RaidView }>(
        await apiFetch(
          `${API_BASE_URL}/character/${characterId}/raid/extract`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
        ),
      );
    },
    onSuccess: (_result, characterId) => {
      setNoiseSignals(null);
      if (userId) {
        setRaidResults((results) => ({ ...results, [userId]: "EXTRACTED" }));
      }
      queryClient.setQueryData(
        characterKey(userId, characterId),
        (old: CharacterData | undefined) =>
          old
            ? {
                ...old,
                raw: {
                  ...old.raw,
                  isRaiding: false,
                  activeRaid: null,
                  activeRaidId: null,
                  currentNodeId: 0,
                  time: 0,
                },
              }
            : old,
      );
      refresh();
    },
    onError: refresh,
  });
  return { startRaid: startRaidMutation, extractRaid: extractRaidMutation };
};
