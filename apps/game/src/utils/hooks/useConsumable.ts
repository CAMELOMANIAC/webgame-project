import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  BattleLog,
  EnemyNoiseSignal,
  FoodBuffEffect,
} from "@webgame/types";
import { useAtomValue, useSetAtom } from "jotai";

import { selectedUserIdAtom } from "@/atoms/authAtom";
import { enemyNoiseSignalsAtom } from "@/atoms/raidAtom";

import { API_BASE_URL, apiFetch } from "../api";
import { requestJsonWithTimeout } from "../request";
import { characterKey } from "./useCharacterCollection";
import type { CharacterData } from "./useGetCharacter";
import { raidActionInput } from "./useRaidSession";

export type UseBaseConsumableInput =
  | { characterId: string; source: "backpack"; slotIndex: number }
  | { characterId: string; source: "stash"; weaponMasterId: string };

export interface UseBaseConsumableResult {
  status: "success";
  hp: number;
  fatigue: number;
  weight: number;
  activeFoodBuff: FoodBuffEffect | null;
}

export interface UseRaidConsumableInput {
  characterId: string;
  slotIndex: number;
}

export interface UseRaidConsumableResult {
  status: "success";
  encounterTriggered: boolean;
  hp: number;
  fatigue: number;
  weight: number;
  time: number;
  activeFoodBuff: FoodBuffEffect | null;
  battleLog?: BattleLog;
  noiseSignals?: EnemyNoiseSignal[];
}

export function useBaseConsumable() {
  const queryClient = useQueryClient();
  const userId = useAtomValue(selectedUserIdAtom);

  return useMutation<UseBaseConsumableResult, Error, UseBaseConsumableInput>({
    mutationFn: async ({ characterId, ...body }) => {
      if (!userId) throw new Error("개발용 계정을 선택하세요.");
      return requestJsonWithTimeout<UseBaseConsumableResult>((signal) =>
        apiFetch(`${API_BASE_URL}/character/${characterId}/consumables/use`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal,
        }),
      );
    },
    onSuccess: (_result, vars) => {
      void queryClient.invalidateQueries({
        queryKey: characterKey(userId, vars.characterId),
      });
      void queryClient.invalidateQueries({ queryKey: ["characters", userId] });
      if (vars.source === "stash") {
        void queryClient.invalidateQueries({ queryKey: ["stash", userId] });
      }
    },
  });
}

export function useRaidConsumable(options?: {
  onEncounter?: (battleLog: BattleLog) => void;
}) {
  const queryClient = useQueryClient();
  const userId = useAtomValue(selectedUserIdAtom);
  const setEnemyNoiseSignals = useSetAtom(enemyNoiseSignalsAtom);

  return useMutation<UseRaidConsumableResult, Error, UseRaidConsumableInput>({
    mutationFn: async ({ characterId, slotIndex }) => {
      if (!userId) throw new Error("개발용 계정을 선택하세요.");
      const characterData = queryClient.getQueryData<CharacterData>(
        characterKey(userId, characterId),
      );
      const input = raidActionInput(characterData);
      return requestJsonWithTimeout<UseRaidConsumableResult>((signal) =>
        apiFetch(`${API_BASE_URL}/character/${characterId}/raid/use-item`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...input, slotIndex }),
          signal,
        }),
      );
    },
    onSuccess: (result, vars) => {
      const raidId = queryClient.getQueryData<CharacterData>(
        characterKey(userId, vars.characterId),
      )?.raw.activeRaid?.id;
      if (result.noiseSignals && raidId) {
        setEnemyNoiseSignals({ raidId, areas: result.noiseSignals });
      }
      if (result.encounterTriggered && result.battleLog) {
        options?.onEncounter?.(result.battleLog);
      }
      void queryClient.invalidateQueries({
        queryKey: characterKey(userId, vars.characterId),
      });
    },
  });
}
