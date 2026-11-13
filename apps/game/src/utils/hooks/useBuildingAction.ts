import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  BuildingActionInput,
  BuildingActionResult,
  RaidActionInput,
} from "@webgame/types";
import { useAtomValue } from "jotai";

import { selectedUserIdAtom } from "@/atoms/authAtom";

import { API_BASE_URL, apiFetch } from "../api";
import { requestJsonWithTimeout } from "../request";
import { characterKey } from "./useCharacterCollection";
import type { CharacterData } from "./useGetCharacter";
import { raidActionInput } from "./useRaidSession";

export interface BuildingActionParams
  extends Omit<BuildingActionInput, keyof RaidActionInput>,
    Partial<RaidActionInput> {
  characterId: string;
}

export const useBuildingAction = () => {
  const queryClient = useQueryClient();
  const userId = useAtomValue(selectedUserIdAtom);

  return useMutation<BuildingActionResult, Error, BuildingActionParams>({
    mutationFn: async (params) => {
      if (!userId) throw new Error("개발용 계정을 선택하세요.");
      const nextParams = { ...params };
      if (
        !nextParams.raidId ||
        nextParams.expectedVersion === undefined ||
        !nextParams.requestId
      ) {
        const input = raidActionInput(
          queryClient.getQueryData<CharacterData>(
            characterKey(userId, nextParams.characterId),
          ),
        );
        nextParams.raidId ??= input.raidId;
        nextParams.expectedVersion ??= input.expectedVersion;
        nextParams.requestId ??= input.requestId;
      }
      const { characterId, ...body } = nextParams;
      return requestJsonWithTimeout<BuildingActionResult>((signal) =>
        apiFetch(
          `${API_BASE_URL}/character/${characterId}/raid/building/action`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal,
          },
        ),
      );
    },
    onSuccess: (result, params) => {
      queryClient.setQueryData(
        characterKey(userId, params.characterId),
        (old: CharacterData | undefined) => {
          if (!old) return old;
          return {
            ...old,
            raw: {
              ...old.raw,
              time:
                result.raid.status === "ACTIVE" ? result.raid.time : 0,
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
          };
        },
      );
      void queryClient.invalidateQueries({
        queryKey: characterKey(userId, params.characterId),
      });
    },
  });
};
