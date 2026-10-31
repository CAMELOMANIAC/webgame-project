import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { BattleEvent, BattleLog } from "@webgame/types";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useRef, useState } from "react";

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
  isCombatAtom,
  isNavigatingAtom,
  playerCoordsAtom,
  raidNoticeAtom,
  shortestPathAtom,
  targetNodeIdAtom,
} from "@/atoms/raidAtom";
import { useBattleData } from "@/utils/hooks/useBattleData";
import type { CharacterData } from "@/utils/hooks/useGetCharacter";
import { useNavigateRaid } from "@/utils/hooks/useNavigateRaid";

import { characterKey } from "./useCharacterCollection";

export function useFieldCombat(characterData: CharacterData | undefined) {
  const navigate = useNavigate();
  const [isCombat, setIsCombat] = useAtom(isCombatAtom);
  const { setBattleLog } = useBattleData();

  const [time, setTime] = useAtom(currentTimeAtom);
  const [battleLog] = useAtom(battleLogAtom);
  const timeline = useAtomValue(flattenedTimelineAtom);
  const setDisplayEvents = useSetAtom(displayEventsAtom);
  const setProcessedEvents = useSetAtom(processedEventsAtom);

  const setCurrentNodeId = useSetAtom(currentNodeIdAtom);
  const setIsNavigating = useSetAtom(isNavigatingAtom);
  const setTargetNodeId = useSetAtom(targetNodeIdAtom);
  const setShortestPath = useSetAtom(shortestPathAtom);
  const setPlayerCoords = useSetAtom(playerCoordsAtom);
  const setNotice = useSetAtom(raidNoticeAtom);
  const setPendingNavigation = useSetAtom(pendingNavigationAtom);

  const [isProcessing, setIsProcessing] = useState(false);
  const pendingEventsRef = useRef<BattleEvent[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const queryClient = useQueryClient();
  const userId = characterData?.raw.userId;

  // 전투 타이머 로직: 1초마다 다음 틱으로 넘어가려 시도
  useEffect(() => {
    if (!isCombat || !battleLog || isProcessing) return;

    const maxTimestamp =
      timeline.length > 0
        ? Math.max(...timeline.map((e: BattleEvent) => e.timestamp))
        : 0;
    if (time > maxTimestamp) {
      // 전투 종료 처리!
      setIsCombat(false);
      if (characterData)
        setPendingNavigation((pending) => {
          const remaining = { ...pending };
          delete remaining[pendingNavigationKey(userId, characterData.raw.id)];
          return remaining;
        });

      const initialPlayer = battleLog.initialState.players[0];
      const finalPlayer = battleLog.finalState.players.find(
        (player) => player.id === initialPlayer?.id,
      );
      const playerDied = finalPlayer !== undefined && finalPlayer.hp <= 0;

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
      queryClient.invalidateQueries({ queryKey: ["character", userId] });
      queryClient.invalidateQueries({ queryKey: ["characters", userId] });
      queryClient.invalidateQueries({ queryKey: ["stash", userId] });

      if (playerDied) {
        setNotice(
          "탐사 중 쓰러졌습니다. 장비와 가방이 소실되어 거점으로 복귀했습니다.",
        );
        // 캐시 업데이트로 로비 진입 시 'RETURN TO ACTIVE RAID' 대신 'LAUNCH EXPEDITION'이 뜨도록 강제
        queryClient.setQueryData(
          characterKey(userId, characterData?.raw.id),
          (old: CharacterData | undefined) => {
            if (!old) return old;
            return {
              ...old,
              raw: {
                ...old.raw,
                isRaiding: false,
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

        navigate({ to: "/field/user" }); // 로비로 이동
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
    characterData,
    userId,
    setPendingNavigation,
    setNotice,
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
      setBattleLog(log);
      setTime(0);
      setDisplayEvents([]);
      setProcessedEvents([]);
      setIsProcessing(false);
      setIsCombat(true);
    },
    [setBattleLog, setTime, setDisplayEvents, setProcessedEvents, setIsCombat],
  );

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
  };
}
