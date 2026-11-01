import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getDefaultStore, useAtomValue, useSetAtom } from "jotai";

import { selectedUserIdAtom } from "@/atoms/authAtom";
import {
  battleLogAtom,
  currentTimeAtom,
  displayEventsAtom,
  processedEventsAtom,
} from "@/atoms/globalAtom";
import {
  currentNodeIdAtom,
  isCombatAtom,
  isInventoryDirtyAtom,
  isNavigatingAtom,
  playerCoordsAtom,
  raidNoticeAtom,
  requestedNodeIdAtom,
  shortestPathAtom,
  targetNodeIdAtom,
} from "@/atoms/raidAtom";

import { API_BASE_URL, apiFetch } from "../api";
import { readApiResponse } from "../request";

export interface CharacterVariant {
  id: string;
  worldlineCode: string;
  definition?: { id: string; name: string };
}
export interface OwnedCharacter {
  id: string;
  displayName: string | null;
  variant?: CharacterVariant | null;
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  weight: number;
  isRaiding: boolean;
}
export interface CharacterRoster {
  selectedCharacterId: string | null;
  characters: OwnedCharacter[];
}
export const characterKey = (
  userId: string | null | undefined,
  characterId: string | null | undefined,
) => ["character", userId, characterId] as const;

export function useCharacterRoster(requestedUserId?: string) {
  const selectedUserId = useAtomValue(selectedUserIdAtom);
  const userId = requestedUserId ?? selectedUserId;
  return useQuery<CharacterRoster>({
    queryKey: ["characters", userId],
    enabled: !!userId,
    queryFn: async () =>
      readApiResponse(
        await apiFetch(`${API_BASE_URL}/user/${userId}/characters`),
      ),
  });
}

export function useCharacterCollectionActions() {
  const userId = useAtomValue(selectedUserIdAtom);
  const queryClient = useQueryClient();
  const setBattle = useSetAtom(battleLogAtom);
  const setTime = useSetAtom(currentTimeAtom);
  const setDisplay = useSetAtom(displayEventsAtom);
  const setProcessed = useSetAtom(processedEventsAtom);
  const setCombat = useSetAtom(isCombatAtom);
  const setMoving = useSetAtom(isNavigatingAtom);
  const setDirty = useSetAtom(isInventoryDirtyAtom);
  const setNode = useSetAtom(currentNodeIdAtom);
  const setTarget = useSetAtom(targetNodeIdAtom);
  const setRequested = useSetAtom(requestedNodeIdAtom);
  const setPath = useSetAtom(shortestPathAtom);
  const setCoords = useSetAtom(playerCoordsAtom);
  const setNotice = useSetAtom(raidNoticeAtom);
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["characters", userId] });
  };
  const select = useMutation({
    mutationFn: async (id: string) =>
      readApiResponse(
        await apiFetch(
          `${API_BASE_URL}/user/${userId}/characters/${id}/select`,
          { method: "POST" },
        ),
      ),
    onSuccess: async () => {
      if (getDefaultStore().get(selectedUserIdAtom) !== userId) return;
      setBattle(null);
      setTime(0);
      setDisplay([]);
      setProcessed([]);
      setCombat(false);
      setMoving(false);
      setDirty(false);
      setNode(0);
      setTarget(null);
      setRequested(null);
      setPath([]);
      setCoords(null);
      setNotice(null);
      await queryClient.invalidateQueries({ queryKey: ["character", userId] });
      await refresh();
    },
  });
  const recruit = useMutation({
    mutationFn: async (variantId: string) =>
      readApiResponse(
        await apiFetch(`${API_BASE_URL}/dev/user/${userId}/characters`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ variantId }),
        }),
      ),
    onSuccess: refresh,
  });
  return { select, recruit };
}
