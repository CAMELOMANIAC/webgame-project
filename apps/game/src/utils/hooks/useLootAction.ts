import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  RaidActionInput,
  RaidLootActionInput,
  RaidLootActionResult,
} from "@webgame/types";
import { getDefaultStore, useAtomValue, useSetAtom } from "jotai";

import { selectedUserIdAtom } from "@/atoms/authAtom";
import { isInventoryDirtyAtom } from "@/atoms/raidAtom";

import { API_BASE_URL, apiFetch } from "../api";
import { requestJsonWithTimeout } from "../request";
import { characterKey } from "./useCharacterCollection";
import type { CharacterData } from "./useGetCharacter";
import { raidActionInput } from "./useRaidSession";

export interface LootActionParams
  extends Omit<
      RaidLootActionInput,
      keyof RaidActionInput | "equipment" | "inventory"
    >,
    Partial<RaidActionInput> {
  characterId: string;
}

export const useLootAction = () => {
  const queryClient = useQueryClient();
  const userId = useAtomValue(selectedUserIdAtom);
  const setIsInventoryDirty = useSetAtom(isInventoryDirtyAtom);

  return useMutation<
    RaidLootActionResult & { sentDirtyInventory?: boolean },
    Error,
    LootActionParams
  >({
    mutationFn: async (params) => {
      if (!userId) throw new Error("개발용 계정을 선택하세요.");
      const characterData = queryClient.getQueryData<CharacterData>(
        characterKey(userId, params.characterId),
      );
      const nextParams: RaidLootActionInput & { characterId: string } = {
        ...params,
        raidId: params.raidId ?? "",
        expectedVersion: params.expectedVersion ?? 0,
        requestId: params.requestId ?? "",
      };
      if (
        !params.raidId ||
        params.expectedVersion === undefined ||
        !params.requestId
      ) {
        const input = raidActionInput(characterData);
        nextParams.raidId = params.raidId ?? input.raidId;
        nextParams.expectedVersion =
          params.expectedVersion ?? input.expectedVersion;
        nextParams.requestId = params.requestId ?? input.requestId;
      }

      const isInventoryDirty = getDefaultStore().get(isInventoryDirtyAtom);
      if (isInventoryDirty && characterData) {
        nextParams.equipment = characterData.raw.equipment
          .filter((w) => w.weaponMaster !== null)
          .map((w) => ({
            weaponMasterId: w.weaponMaster!.id,
            slotIndex: w.slotIndex,
          }));
        nextParams.inventory = characterData.raw.inventory
          .filter((i) => i.weaponMaster !== null)
          .map((i) => ({
            weaponMasterId: i.weaponMaster!.id,
            slotIndex: i.slotIndex,
            quantity: i.quantity,
          }));
      }

      const { characterId, ...body } = nextParams;
      const res = await requestJsonWithTimeout<RaidLootActionResult>((signal) =>
        apiFetch(
          `${API_BASE_URL}/character/${characterId}/raid/loot/action`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal,
          },
        ),
      );
      return { ...res, sentDirtyInventory: isInventoryDirty };
    },
    onSuccess: (result, params) => {
      if (result.sentDirtyInventory) {
        setIsInventoryDirty(false);
      }
      queryClient.setQueryData(
        characterKey(userId, params.characterId),
        (old: CharacterData | undefined) => {
          if (!old) return old;
          return {
            ...old,
            raw: {
              ...old.raw,
              weight: result.weight,
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
