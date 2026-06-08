import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { BattleEvent, BattleLog } from "@webgame/types";
import { useAtom, useAtomValue,useSetAtom } from "jotai";
import { useCallback, useEffect, useRef, useState } from "react";

import { battleLogAtom, currentTimeAtom, displayEventsAtom,flattenedTimelineAtom, processedEventsAtom } from "@/atoms/globalAtom";
import { isCombatAtom } from "@/atoms/raidAtom";
import { useArriveRaidNode } from "@/utils/hooks/useArriveRaidNode";
import { useBattleData } from "@/utils/hooks/useBattleData";
import type { CharacterData } from "@/utils/hooks/useGetCharacter";

export function useFieldCombat(characterData: CharacterData | undefined) {
  const navigate = useNavigate();
  const [isCombat, setIsCombat] = useAtom(isCombatAtom);
  const { setBattleLog } = useBattleData();
  const arriveRaidNode = useArriveRaidNode();
  const [time, setTime] = useAtom(currentTimeAtom);
  const [battleLog] = useAtom(battleLogAtom);
  const timeline = useAtomValue(flattenedTimelineAtom);
  const setDisplayEvents = useSetAtom(displayEventsAtom);
  const setProcessedEvents = useSetAtom(processedEventsAtom);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const pendingEventsRef = useRef<BattleEvent[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const queryClient = useQueryClient();
  const TEMP_USER_ID = "da30ac6b-e93c-44d9-b344-ab67f99d2f80";

  // 전투 타이머 로직: 1초마다 다음 틱으로 넘어가려 시도
  useEffect(() => {
    if (!isCombat || !battleLog || isProcessing) return;

    const maxTimestamp = timeline.length > 0 ? Math.max(...timeline.map((e: BattleEvent) => e.timestamp)) : 0;
    if (time > maxTimestamp) {
      // 전투 종료 처리!
      setIsCombat(false);
      
      const playerDied = (battleLog as BattleLog & { playerDied?: boolean }).playerDied === true;
      const rewardItemName = (battleLog as BattleLog & { rewardItemName?: string }).rewardItemName;

      // 전투 관련 전역 상태 초기화
      setBattleLog(null);
      setTime(0);
      setDisplayEvents([]);
      setProcessedEvents([]);

      // 캐릭터 정보 및 창고 정보 갱신
      queryClient.invalidateQueries({ queryKey: ["character", TEMP_USER_ID] });
      queryClient.invalidateQueries({ queryKey: ["stash", TEMP_USER_ID] });

      if (playerDied) {
        alert("🚨 DEFEAT! You died in battle and lost all your equipped gear and backpack items!");
        navigate({ to: "/field/user" }); // 로비로 이동
      } else {
        if (rewardItemName) {
          alert(`🏆 VICTORY! You defeated the enemy and looted: ${rewardItemName}`);
        } else {
          alert("🏆 VICTORY! Enemy defeated.");
        }
        navigate({ to: "/field" }); // 맵으로 복구
      }
      return;
    }

    const timer = setInterval(() => {
      // 현재 시간에 해당하는 이벤트들 가져오기
      const currentTickEvents = timeline.filter((e: BattleEvent) => e.timestamp === time);
      
      if (currentTickEvents.length > 0) {
        pendingEventsRef.current = [...currentTickEvents];
        setIsProcessing(true);
      } else {
        setTime((prev) => prev + 1);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isCombat, battleLog, setTime, time, timeline, isProcessing, characterData, navigate, setIsCombat, queryClient, setBattleLog, setDisplayEvents, setProcessedEvents]);

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
          const isImmediate = nextEvent.type === "DEATH" || nextPeek?.type === "DEATH";
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

  const handleArriveNode = useCallback((nodeId: number) => {
    if (isCombat || !characterData?.raw.id) return;
    arriveRaidNode.mutate(
      { characterId: characterData.raw.id, nodeId },
      {
        onSuccess: (res) => {
          if (res.combatTriggered && res.battleLog) {
            setBattleLog(res.battleLog);
            setTime(0);
            setDisplayEvents([]);
            setProcessedEvents([]);
            setIsProcessing(false);
            setIsCombat(true);
          }
        },
        onError: (err) => {
          console.error("Failed to arrive at node:", err);
        }
      },
    );
  }, [isCombat, characterData, arriveRaidNode, setBattleLog, setTime, setDisplayEvents, setProcessedEvents, setIsCombat]);

  useEffect(() => {
    if (isCombat) {
      navigate({ to: "/field" });
    }
  }, [isCombat, navigate]);

  return { isCombat, setIsCombat, handleArriveNode, battleLog, isArrivePending: arriveRaidNode.isPending };
}
