import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { RaidActionInput, RaidNavigationResult } from "@webgame/types";
import { getDefaultStore, useAtomValue } from "jotai";

import { selectedUserIdAtom } from "@/atoms/authAtom";
import {
  pendingNavigationAtom,
  pendingNavigationKey,
} from "@/atoms/pendingNavigationAtom";
import { raidNoticeAtom } from "@/atoms/raidAtom";

import { API_BASE_URL, apiFetch } from "../api";
import { requestJsonWithTimeout } from "../request";
import { characterKey } from "./useCharacterCollection";
import type { CharacterData } from "./useGetCharacter";
import { raidActionInput } from "./useRaidSession";

export interface NavigateRaidParams extends Partial<RaidActionInput> {
  characterId: string;
  path: number[];
  equipment?: { weaponMasterId: string; slotIndex: number }[];
  inventory?: { weaponMasterId: string; slotIndex: number; quantity: number }[];
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
      void queryClient.invalidateQueries({ queryKey: ["journal", userId] });
      if (getDefaultStore().get(selectedUserIdAtom) === userId) getDefaultStore().set(raidNoticeAtom, result.notice ?? null);
      if (!result.encounterTriggered) {
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
          return old
            ? {
                ...old,
                raw: {
                  ...old.raw,
                  activeRaid:
                    result.raid.status === "ACTIVE" ? result.raid : null,
                  activeRaidId:
                    result.raid.status === "ACTIVE" ? result.raid.id : null,
                  isRaiding: result.raid.status === "ACTIVE",
                  currentNodeId:
                    result.raid.status === "ACTIVE"
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
