import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { BattleLog, RaidNavigationResult } from "@webgame/types";
import { getDefaultStore, useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect } from "react";

import { selectedUserIdAtom } from "@/atoms/authAtom";
import {
  pendingNavigationAtom,
  pendingNavigationKey,
} from "@/atoms/pendingNavigationAtom";
import {
  currentNodeIdAtom,
  enemyNoiseSignalsAtom,
  isCombatAtom,
  isInventoryDirtyAtom,
  isNavigatingAtom,
  playerCoordsAtom,
  raidNoiseState,
  targetNodeIdAtom,
} from "@/atoms/raidAtom";
import { API_BASE_URL, apiFetch } from "@/utils/api";
import { getBuildingCenter } from "@/utils/getBuildingCenter";
import type { CharacterData } from "@/utils/hooks/useGetCharacter";
import type { useNavigateRaid } from "@/utils/hooks/useNavigateRaid";
import { ApiError, requestJsonWithTimeout } from "@/utils/request";

import mapData from "../../../../../packages/types/src/assets/map_graph.json";
import * as styles from "./NavigationRecovery.css";

interface Props {
  character: CharacterData | undefined;
  navigation: ReturnType<typeof useNavigateRaid>;
  triggerCombat: (log: BattleLog) => void;
}

export default function NavigationRecovery({
  character,
  navigation,
  triggerCombat,
}: Props) {
  const userId = useAtomValue(selectedUserIdAtom);
  const [pending, setPending] = useAtom(pendingNavigationAtom);
  const isMoving = useAtomValue(isNavigatingAtom);
  const isCombat = useAtomValue(isCombatAtom);
  const setNode = useSetAtom(currentNodeIdAtom);
  const setNoiseSignals = useSetAtom(enemyNoiseSignalsAtom);
  const setCoords = useSetAtom(playerCoordsAtom);
  const setTarget = useSetAtom(targetNodeIdAtom);
  const setDirty = useSetAtom(isInventoryDirtyAtom);
  const queryClient = useQueryClient();
  const characterId = character?.raw.id;
  const key = pendingNavigationKey(userId, characterId);
  const params = pending[key]?.params;
  const { raidId, expectedVersion, requestId } = params ?? {};
  const canRecover =
    !!params && character?.raw.userId === userId && !isMoving && !isCombat;
  const lookup = useQuery({
    queryKey: ["navigation-result", userId, characterId, raidId, requestId, expectedVersion],
    enabled: canRecover && !navigation.isPending,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: () => {
      const query = new URLSearchParams({
        raidId: raidId ?? "",
        expectedVersion: String(expectedVersion),
        requestId: requestId ?? "",
      });
      return requestJsonWithTimeout<{ result: RaidNavigationResult | null }>(
        (signal) =>
          apiFetch(
            `${API_BASE_URL}/character/${characterId}/raid/navigate/result?${query}`,
            { signal },
          ),
      );
    },
  });

  const clearRequest = useCallback(() => {
    setPending((records) => {
      if (records[key]?.params.requestId !== requestId) return records;
      const remaining = { ...records };
      delete remaining[key];
      return remaining;
    });
  }, [key, requestId, setPending]);

  const applyResult = useCallback((result: RaidNavigationResult) => {
    const store = getDefaultStore();
    const currentRequest = store.get(pendingNavigationAtom)[key];
    if (
      store.get(selectedUserIdAtom) !== userId ||
      (currentRequest && currentRequest.params.requestId !== requestId)
    ) return;
    const nodeId = result.stopNodeId ?? result.raid.currentNodeId;
    const destinationBuildingId = result.raid.currentBuildingId;
    const building = destinationBuildingId == null
      ? undefined
      : mapData.buildings.find(
          (entry) => entry.id === destinationBuildingId && entry.roadNodeId === nodeId,
        );
    setNode(nodeId);
    const node = mapData.nodes[nodeId];
    setCoords(building ? getBuildingCenter(building) :
      node ? { x: node.x, y: node.y } : null);
    setTarget(null);
    setDirty(false);
    void queryClient.invalidateQueries({ queryKey: ["journal", userId] });
    if (result.battleLog) {
      triggerCombat(result.battleLog);
    } else {
      setNoiseSignals(raidNoiseState(result.raid.id, result));
      clearRequest();
      void queryClient.invalidateQueries({ queryKey: ["character", userId] });
    }
  }, [clearRequest, key, queryClient, requestId, setCoords, setDirty, setNode, setNoiseSignals, setTarget, triggerCombat, userId]);

  const result = lookup.data?.result;
  useEffect(() => {
    if (canRecover && result && !lookup.isFetching && !lookup.isError && !navigation.isPending) {
      applyResult(result);
    }
  }, [applyResult, canRecover, lookup.isError, lookup.isFetching, navigation.isPending, result]);

  if (!canRecover || !params || lookup.isFetching || navigation.isPending) return null;

  const mutationError = navigation.variables?.requestId === requestId
    ? navigation.error
    : null;
  const isRejected = (error: Error | null) =>
    error instanceof ApiError && [400, 403, 404, 409].includes(error.status);
  const error = lookup.error ?? (result === null && isRejected(mutationError) ? mutationError : null);
  const rejected = isRejected(error);
  const retryMove = !error && lookup.isSuccess && result === null;
  if (!error && !retryMove) return null;

  return (
    <aside className={styles.recovery} role="alert">
      <strong className={styles.title}>
        {retryMove ? "처리된 이동 결과가 없습니다" : error?.message}
      </strong>
      <button
        type="button"
        className={styles.button}
        onClick={() => {
          if (rejected) {
            void queryClient.invalidateQueries({ queryKey: ["character", userId] });
            setDirty(false);
            setCoords(null);
            setTarget(null);
            clearRequest();
            navigation.reset();
          } else if (retryMove) {
            navigation.mutate(params, {
              onSuccess: applyResult,
              onError: () => void lookup.refetch(),
            });
          } else {
            void lookup.refetch();
          }
        }}
      >
        {rejected
          ? "현재 서버 상태로 돌아가기"
          : retryMove
            ? "이동 다시 시도"
            : "이동 결과 다시 확인"}
      </button>
    </aside>
  );
}
