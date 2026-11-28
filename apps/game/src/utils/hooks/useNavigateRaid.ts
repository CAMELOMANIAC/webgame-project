import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { RaidActionInput, RaidNavigationInput, RaidNavigationResult } from "@webgame/types";
import { getDefaultStore, useAtomValue } from "jotai";

import { selectedUserIdAtom } from "@/atoms/authAtom";
import {
  pendingNavigationAtom,
  pendingNavigationKey,
} from "@/atoms/pendingNavigationAtom";

import { API_BASE_URL, apiFetch } from "../api";
import { requestJsonWithTimeout } from "../request";
import { characterKey } from "./useCharacterCollection";
import type { CharacterData } from "./useGetCharacter";
import { raidActionInput } from "./useRaidSession";

export interface NavigateRaidParams
  extends Omit<RaidNavigationInput, keyof RaidActionInput>, Partial<RaidActionInput> {
  characterId: string;
}
export type NavigateRaidResponse = RaidNavigationResult;

export const useNavigateRaid = () => {
  const queryClient = useQueryClient();
  const userId = useAtomValue(selectedUserIdAtom);
  return useMutation<NavigateRaidResponse, Error, NavigateRaidParams>({
    mutationFn: async (params) => {
      if (
        !params.raidId ||
        params.expectedVersion === undefined ||
        !params.requestId
      ) {
        const input = raidActionInput(
          queryClient.getQueryData<CharacterData>(
            characterKey(userId, params.characterId),
          ),
        );
        params.raidId ??= input.raidId;
        params.expectedVersion ??= input.expectedVersion;
        params.requestId ??= input.requestId;
      }
      const { characterId, ...body } = params;
      if (!userId) throw new Error("개발용 계정을 선택하세요.");
      getDefaultStore().set(pendingNavigationAtom, (pending) => ({
        ...pending,
        [pendingNavigationKey(userId, characterId)]: {
          actorUserId: userId,
          params: structuredClone(params),
        },
      }));
      return requestJsonWithTimeout<NavigateRaidResponse>((signal) =>
        apiFetch(`${API_BASE_URL}/character/${characterId}/raid/navigate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal,
        }),
      );
    },
    onSuccess: (result, params) => {
      if (!result.encounterTriggered) {
        void queryClient.invalidateQueries({ queryKey: ["journal", userId] });
        const key = pendingNavigationKey(userId, params.characterId);
        getDefaultStore().set(pendingNavigationAtom, (pending) => {
          if (pending[key]?.params.requestId !== params.requestId)
            return pending;
          const remaining = { ...pending };
          delete remaining[key];
          return remaining;
        });
      }
      queryClient.setQueryData(
        characterKey(userId, params.characterId),
        (old: CharacterData | undefined) => {
          if (old && !old.raw.isRaiding && result.raid.status === "ACTIVE")
            return old;
          if (
            old?.raw.activeRaid &&
            (old.raw.activeRaid.id !== result.raid.id ||
              old.raw.activeRaid.version > result.raid.version)
          )
            return old;
          const preserveCombatField =
            Boolean(result.encounterTriggered && result.battleLog) &&
            result.raid.status !== "ACTIVE";
          return old
            ? {
                ...old,
                raw: {
                  ...old.raw,
                  activeRaid:
                    result.raid.status === "ACTIVE"
                      ? result.raid
                      : preserveCombatField
                        ? old.raw.activeRaid
                        : null,
                  activeRaidId:
                    result.raid.status === "ACTIVE"
                      ? result.raid.id
                      : preserveCombatField
                        ? old.raw.activeRaidId
                        : null,
                  isRaiding:
                    result.raid.status === "ACTIVE"
                      ? true
                      : preserveCombatField
                        ? old.raw.isRaiding
                        : false,
                  currentNodeId:
                    result.raid.status === "ACTIVE"
                      ? result.raid.currentNodeId
                      : preserveCombatField
                        ? result.raid.currentNodeId
                        : 0,
                },
              }
            : old;
        },
      );
    },
  });
};
