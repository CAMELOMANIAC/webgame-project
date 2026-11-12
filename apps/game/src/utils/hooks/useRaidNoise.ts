import { useQuery } from "@tanstack/react-query";
import type { RaidNoiseResult } from "@webgame/types";
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";

import { selectedUserIdAtom } from "@/atoms/authAtom";
import { enemyNoiseSignalsAtom, isCombatAtom, isNavigatingAtom, raidNoiseState } from "@/atoms/raidAtom";

import { API_BASE_URL, apiFetch } from "../api";
import { readApiResponse } from "../request";
import { useGetCharacter } from "./useGetCharacter";

export function raidNoiseKey(
  userId: string | null | undefined,
  characterId: string | undefined,
  raidId: string | undefined,
) {
  return ["raid-noise", userId, characterId, raidId] as const;
}

export function useRaidNoise() {
  const userId = useAtomValue(selectedUserIdAtom);
  const { data: characterData } = useGetCharacter();
  const characterId = characterData?.raw.id;
  const activeRaidId = characterData?.raw.activeRaid?.id;
  const activeRaidVersion = characterData?.raw.activeRaid?.version;
  const isRaiding = characterData?.raw.isRaiding;
  const isNavigating = useAtomValue(isNavigatingAtom);
  const isCombat = useAtomValue(isCombatAtom);

  const setNoiseSignals = useSetAtom(enemyNoiseSignalsAtom);

  const query = useQuery({
    queryKey: raidNoiseKey(userId, characterId, activeRaidId),
    queryFn: async ({ signal }) => {
      if (!characterId) return null;
      const response = await readApiResponse<RaidNoiseResult>(
        await apiFetch(`${API_BASE_URL}/character/${characterId}/raid/noise`, { signal }),
      );
      return { ...response, requestedVersion: activeRaidVersion };
    },
    enabled: Boolean(userId && characterId && activeRaidId && isRaiding && !isCombat),
    staleTime: 5000,
  });

  useEffect(() => {
    const data = query.data;
    if (
      !activeRaidId ||
      data?.raidId !== activeRaidId ||
      data.requestedVersion !== activeRaidVersion ||
      isNavigating || isCombat
    )
      return;

    const next = raidNoiseState(activeRaidId, data);
    setNoiseSignals((current) =>
      next && current?.raidId === activeRaidId &&
      current.areas.length === next.areas.length &&
      current.areas.every((area, index) => {
        const other = next.areas[index];
        return area.x === other.x && area.y === other.y && area.radius === other.radius;
      })
        ? current
        : next,
    );
  }, [activeRaidId, activeRaidVersion, isCombat, isNavigating, query.data, setNoiseSignals]);

  return query;
}
