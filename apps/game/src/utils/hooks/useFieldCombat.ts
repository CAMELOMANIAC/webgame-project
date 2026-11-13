import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { BattleEvent, BattleLog, RetreatDecisionResult, RetreatResolution } from "@webgame/types";
import { getDefaultStore, useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useRef, useState } from "react";

import { selectedUserIdAtom } from "@/atoms/authAtom";
import {
  battleLogAtom,
  currentTimeAtom,
  displayEventsAtom,
  flattenedTimelineAtom,
  processedEventsAtom,
} from "@/atoms/globalAtom";
import {
  pendingNavigationAtom,
  pendingNavigationKey,
} from "@/atoms/pendingNavigationAtom";
import {
  currentNodeIdAtom,
  enemyNoiseSignalsAtom,
  isCombatAtom,
  isNavigatingAtom,
  pendingBuildingCombatAtom,
  playerCoordsAtom,
  shortestPathAtom,
  targetNodeIdAtom,
  unacknowledgedRaidResultsAtom,
} from "@/atoms/raidAtom";
import { API_BASE_URL, apiFetch } from "@/utils/api";
import { getBuildingCenter } from "@/utils/getBuildingCenter";
import { useBattleData } from "@/utils/hooks/useBattleData";
import type { CharacterData } from "@/utils/hooks/useGetCharacter";
import { useNavigateRaid } from "@/utils/hooks/useNavigateRaid";
import { raidNoiseKey } from "@/utils/hooks/useRaidNoise";
import { requestJsonWithTimeout } from "@/utils/request";
import { openBattleTimeline } from "@/utils/retreatBattle";

import mapData from "../../../../../packages/types/src/assets/map_graph.json";
import { characterKey } from "./useCharacterCollection";

export function useFieldCombat(characterData: CharacterData | undefined) {
  const navigate = useNavigate();
  const [isCombat, setIsCombat] = useAtom(isCombatAtom);
  const { setBattleLog } = useBattleData();

  const [time, setTime] = useAtom(currentTimeAtom);
  const [battleLog] = useAtom(battleLogAtom);
  const timeline = useAtomValue(flattenedTimelineAtom);
  const setDisplayEvents = useSetAtom(displayEventsAtom);
  const [processedEvents, setProcessedEvents] = useAtom(processedEventsAtom);

  const setCurrentNodeId = useSetAtom(currentNodeIdAtom);
  const setIsNavigating = useSetAtom(isNavigatingAtom);
  const setTargetNodeId = useSetAtom(targetNodeIdAtom);
  const setShortestPath = useSetAtom(shortestPathAtom);
  const setPlayerCoords = useSetAtom(playerCoordsAtom);
  const setRaidResults = useSetAtom(unacknowledgedRaidResultsAtom);
  const setNoiseSignals = useSetAtom(enemyNoiseSignalsAtom);
  const [pendingNavigation, setPendingNavigation] = useAtom(pendingNavigationAtom);
  const isMoving = useAtomValue(isNavigatingAtom);
  const [retreatExpired, setRetreatExpired] = useState(false);
  const [retreatWindow, setRetreatWindow] = useState<{ endsAt: number; durationMs: number }>();
  const [retreatOutcome, setRetreatOutcome] = useState<{
    battleId: string;
    resolution: RetreatResolution;
    continuation: Awaited<ReturnType<typeof openBattleTimeline>> | null;
  }>();

  const [isProcessing, setIsProcessing] = useState(false);
  const pendingEventsRef = useRef<BattleEvent[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const queryClient = useQueryClient();
  const userId = characterData?.raw.userId;
  const characterId = characterData?.raw.id;
  const retreat = battleLog?.retreat;
  const retreatGauge = processedEvents.reduce((value, event) =>
    event.type === "DAMAGE" ? event.retreatGauge ?? value : value, 0);
  const lastTimestamp = timeline[timeline.length - 1]?.timestamp ?? 0;
  const waitingForRetreat = isCombat && !!retreat && time > lastTimestamp && !isProcessing;
  const atRetreatCheckpoint = isCombat && !!retreat && (retreatGauge >= 100 || waitingForRetreat);
  const battleEndpoint = `${API_BASE_URL}/character/${characterId}/raid/battle`;

  const decision = useMutation({
    mutationFn: (action: "OPEN" | "RETREAT" | "CONTINUE") =>
      requestJsonWithTimeout<RetreatDecisionResult>(
        (signal) => apiFetch(`${battleEndpoint}/decision`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ raidId: retreat?.raidId, battleId: retreat?.battleId, action }),
          signal,
        }),
      ),
    onSuccess: async (decisionResult) => {
      const store = getDefaultStore();
      const isCurrentBattle = () =>
        store.get(selectedUserIdAtom) === userId &&
        store.get(battleLogAtom)?.retreat?.battleId === retreat?.battleId;
      if (!retreat || !isCurrentBattle()) return;
      if (!decisionResult.resolution) {
        setRetreatWindow({
          endsAt: performance.now() + decisionResult.remainingMs,
          durationMs: decisionResult.windowMs,
        });
        return;
      }
      const continuation = decisionResult.resolution.decision === "CONTINUE"
        ? await openBattleTimeline(retreat, decisionResult.resolution.key)
        : null;
      if (isCurrentBattle()) {
        setRetreatOutcome({ battleId: retreat.battleId, resolution: decisionResult.resolution, continuation });
      }
    },
  });

  useEffect(() => {
    // Let the hit that filled the gauge finish animating before applying the decision.
    if (!waitingForRetreat || !battleLog || !retreatOutcome ||
        retreatOutcome.battleId !== retreat?.battleId ||
        getDefaultStore().get(selectedUserIdAtom) !== userId) return;
    const { resolution, continuation } = retreatOutcome;
    const { raid } = resolution;
    queryClient.setQueryData(characterKey(userId, characterId), (old: CharacterData | undefined) =>
      old ? { ...old, raw: {
        ...old.raw,
        // The field stays mounted until the final death animation finishes.
        activeRaid: raid.status === "ACTIVE" ? raid : old.raw.activeRaid,
        currentNodeId: raid.currentNodeId,
      } } : old,
    );
    void queryClient.invalidateQueries({ queryKey: ["journal", userId] });
    if (resolution.decision === "RETREAT") {
      const building = raid.currentBuildingId == null ? undefined :
        mapData.buildings.find(({ id }) => id === raid.currentBuildingId);
      const node = mapData.nodes[raid.currentNodeId];
      setCurrentNodeId(raid.currentNodeId);
      setPlayerCoords(building ? getBuildingCenter(building) : node ? { x: node.x, y: node.y } : null);
      setBattleLog({ ...battleLog, retreat: undefined, timeline: [] });
      return;
    }
    if (!continuation) return;
    setRetreatExpired(true);
    const firstTick = continuation.timeline[0];
    if (firstTick) {
      pendingEventsRef.current = [...firstTick.events];
      setTime(firstTick.timestamp);
      setIsProcessing(true);
    }
    setBattleLog({
      ...battleLog,
      retreat: undefined,
      ...continuation,
    });
  }, [battleLog, characterId, queryClient, retreat?.battleId, retreatOutcome, setBattleLog,
    setCurrentNodeId, setPlayerCoords, setTime, userId, waitingForRetreat]);
  const { mutate: sendDecision, isPending: sendingDecision, isError: decisionFailed } = decision;
  useEffect(() => {
    if (!atRetreatCheckpoint || sendingDecision || retreatOutcome) return;
    const delay = retreatWindow ? Math.max(0, retreatWindow.endsAt - performance.now()) : 0;
    const timer = setTimeout(
      () => sendDecision(retreatWindow ? "CONTINUE" : "OPEN"),
      Math.max(delay, decisionFailed ? 1_000 : 0),
    );
    return () => clearTimeout(timer);
  }, [atRetreatCheckpoint, decisionFailed, retreatOutcome, retreatWindow, sendDecision, sendingDecision]);

  const pendingBattle = useQuery({
    queryKey: ["pending-battle", userId, characterId],
    enabled: !!characterId && !!characterData?.raw.isRaiding && !isCombat && !isMoving &&
      !pendingNavigation[pendingNavigationKey(userId, characterId)],
    refetchOnWindowFocus: false,
    queryFn: () => requestJsonWithTimeout<{ battleLog: BattleLog | null }>(
      (signal) => apiFetch(battleEndpoint, { signal }),
    ),
  });

  // 전투 타이머 로직: 1초마다 다음 틱으로 넘어가려 시도
  useEffect(() => {
    if (!isCombat || !battleLog || isProcessing || waitingForRetreat) return;

    const maxTimestamp =
      timeline.length > 0
        ? Math.max(...timeline.map((e: BattleEvent) => e.timestamp))
        : 0;
    if (time > maxTimestamp) {
      const initialPlayer = battleLog.initialState.players[0];
      const finalPlayer = battleLog.finalState.players.find(
        (player) => player.id === initialPlayer?.id,
      );
      const playerDied = finalPlayer !== undefined && finalPlayer.hp <= 0;

      if (playerDied && userId) {
        setRaidResults((results) => ({ ...results, [userId]: "DEAD" }));
      }

      const raid = characterData?.raw.activeRaid;
      const noiseQuery = { queryKey: raidNoiseKey(userId, characterId, raid?.id), exact: true };
      if (raid) void queryClient.resetQueries(noiseQuery);
      setIsCombat(false);
      if (characterData)
        setPendingNavigation((pending) => {
          const remaining = { ...pending };
          delete remaining[pendingNavigationKey(userId, characterData.raw.id)];
          return remaining;
        });

      // 서버가 확정한 전투 결과를 사용하고, 화면에서 최종 수치를 재계산하지 않는다.
      if (finalPlayer && !playerDied) {
        queryClient.setQueryData(
          characterKey(userId, characterData?.raw.id),
          (old: CharacterData | undefined) => {
            if (!old) return old;
            return {
              ...old,
              raw: {
                ...old.raw,
                hp: finalPlayer.hp,
                stamina: finalPlayer.stamina,
              },
            };
          },
        );
      }

      // 전투 관련 전역 상태 초기화
      setBattleLog(null);
      setTime(0);
      setDisplayEvents([]);
      setProcessedEvents([]);

      // 캐릭터 정보 및 창고 정보 갱신
      void queryClient.invalidateQueries({ queryKey: ["character", userId] }).then(() => {
        // 복구한 전투는 재생이 끝난 뒤에야 클라이언트의 탐사 버전이 갱신될 수 있다.
        const updatedRaid = queryClient.getQueryData<CharacterData>(
          characterKey(userId, characterId),
        )?.raw.activeRaid;
        if (!playerDied && raid && updatedRaid?.id === raid.id && updatedRaid.version !== raid.version) {
          void queryClient.resetQueries(noiseQuery);
        }
      });
      queryClient.invalidateQueries({ queryKey: ["characters", userId] });
      queryClient.invalidateQueries({ queryKey: ["stash", userId] });

      if (playerDied) {
        queryClient.setQueryData(
          characterKey(userId, characterData?.raw.id),
          (old: CharacterData | undefined) => {
            if (!old) return old;
            return {
              ...old,
              raw: {
                ...old.raw,
                isRaiding: false,
                activeRaid: null,
                activeRaidId: null,
                hp: old.raw.maxHp,
                stamina: old.raw.maxStamina,
              },
            };
          },
        );

        // 클라이언트 탐사 상태 강제 초기화
        setCurrentNodeId(0);
        setIsNavigating(false);
        setTargetNodeId(null);
        setShortestPath([]);
        setPlayerCoords(null);
      } else {
        navigate({ to: "/field" }); // 맵으로 복구
      }
      return;
    }

    const timer = setInterval(() => {
      // 현재 시간에 해당하는 이벤트들 가져오기
      const currentTickEvents = timeline.filter(
        (e: BattleEvent) => e.timestamp === time,
      );

      if (currentTickEvents.length > 0) {
        pendingEventsRef.current = [...currentTickEvents];
        setIsProcessing(true);
      } else {
        setTime((prev) => prev + 1);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [
    isCombat,
    battleLog,
    setTime,
    time,
    timeline,
    isProcessing,
    waitingForRetreat,
    characterData,
    characterId,
    userId,
    setPendingNavigation,
    setRaidResults,
    navigate,
    setIsCombat,
    queryClient,
    setBattleLog,
    setDisplayEvents,
    setProcessedEvents,
    setCurrentNodeId,
    setIsNavigating,
    setTargetNodeId,
    setShortestPath,
    setPlayerCoords,
  ]);

  // 이벤트 순차 처리 로직
  useEffect(() => {
    if (!isProcessing) return;

    const processNextEvent = () => {
      if (pendingEventsRef.current.length > 0) {
        const nextEvent = pendingEventsRef.current.shift();
        if (nextEvent) {
          setDisplayEvents([nextEvent]);

          // 시각적으로 처리된 이벤트 리스트에 추가 (체력바 등 동기화용)
          setProcessedEvents((prev) => [...prev, nextEvent]);

          // 사망(DEATH) 이벤트는 연출 딜레이 없이 즉시 다음으로 진행
          const nextPeek = pendingEventsRef.current[0];
          const isImmediate =
            nextEvent.type === "DEATH" || nextPeek?.type === "DEATH";
          const delay = isImmediate ? 0 : 250;

          timeoutRef.current = setTimeout(processNextEvent, delay);
        }
      } else {
        setIsProcessing(false);
        setDisplayEvents([]);
        setTime((prev) => prev + 1);
      }
    };

    processNextEvent();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isProcessing, setTime, setDisplayEvents, time, setProcessedEvents]);

  const triggerCombat = useCallback(
    (log: BattleLog) => {
      setRetreatWindow(undefined);
      setRetreatOutcome(undefined);
      setRetreatExpired(false);
      setBattleLog(log);
      setTime(0);
      setDisplayEvents([]);
      setProcessedEvents([]);
      setIsProcessing(false);
      setNoiseSignals(null);
      setIsCombat(true);
    },
    [setBattleLog, setTime, setDisplayEvents, setProcessedEvents, setNoiseSignals, setIsCombat],
  );

  useEffect(() => {
    const log = pendingBattle.data?.battleLog;
    if (characterData?.raw.isRaiding && !isCombat && !isMoving && !pendingBattle.isFetching && !pendingBattle.isError &&
        log && !pendingNavigation[pendingNavigationKey(userId, characterId)]) {
      queryClient.setQueryData(["pending-battle", userId, characterId], { battleLog: null });
      triggerCombat(log);
    }
  }, [characterData?.raw.isRaiding, characterId, isCombat, isMoving, pendingBattle.data, pendingBattle.isError, pendingBattle.isFetching,
    pendingNavigation, queryClient, triggerCombat, userId]);

  const [pendingBuildingCombat, setPendingBuildingCombat] = useAtom(
    pendingBuildingCombatAtom,
  );

  useEffect(() => {
    if (!pendingBuildingCombat || isCombat) return;
    setPendingBuildingCombat(null);
    triggerCombat(pendingBuildingCombat);
  }, [
    pendingBuildingCombat,
    setPendingBuildingCombat,
    isCombat,
    triggerCombat,
  ]);

  const navigateRaid = useNavigateRaid();

  useEffect(() => {
    if (isCombat) {
      navigate({ to: "/field" });
    }
  }, [isCombat, navigate]);

  return {
    isCombat,
    setIsCombat,
    battleLog,
    navigateRaid,
    triggerCombat,
    retreatGauge,
    retreatExpired,
    retreatWindow: retreat ? retreatWindow : undefined,
    retreatReady: atRetreatCheckpoint && !!retreatWindow &&
      retreatWindow.endsAt > performance.now() && !sendingDecision && !retreatOutcome,
    chooseRetreat: () => sendDecision("RETREAT"),
  };
}
