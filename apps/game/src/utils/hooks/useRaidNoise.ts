import { useQuery } from "@tanstack/react-query";
import type { RaidNoiseResult } from "@webgame/types";
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";

import { selectedUserIdAtom } from "@/atoms/authAtom";
import { enemyNoiseSignalsAtom, isNavigatingAtom, raidNoiseState } from "@/atoms/raidAtom";

import { API_BASE_URL, apiFetch } from "../api";
import { readApiResponse } from "../request";
import { useGetCharacter } from "./useGetCharacter";

export function useRaidNoise() {
  const userId = useAtomValue(selectedUserIdAtom);
  const { data: characterData } = useGetCharacter();
  const characterId = characterData?.raw.id;
  const activeRaidId = characterData?.raw.activeRaid?.id;
  const activeRaidVersion = characterData?.raw.activeRaid?.version;
  const isRaiding = characterData?.raw.isRaiding;
  const isNavigating = useAtomValue(isNavigatingAtom);

  const setNoiseSignals = useSetAtom(enemyNoiseSignalsAtom);

  const query = useQuery({
    queryKey: ["raid-noise", userId, characterId, activeRaidId],
    queryFn: async () => {
      if (!characterId) return null;
      const response = await readApiResponse<RaidNoiseResult>(
        await apiFetch(`${API_BASE_URL}/character/${characterId}/raid/noise`),
      );
      return { ...response, requestedVersion: activeRaidVersion };
    },
    enabled: Boolean(userId && characterId && activeRaidId && isRaiding),
    staleTime: 5000,
  });

  useEffect(() => {
    const data = query.data;
    if (
      !activeRaidId ||
      data?.raidId !== activeRaidId ||
      data.requestedVersion !== activeRaidVersion ||
      isNavigating
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
  }, [activeRaidId, activeRaidVersion, isNavigating, query.data, setNoiseSignals]);

  return query;
}
