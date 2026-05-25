import { useNavigate } from "@tanstack/react-router";
import type { BattleEvent } from "@webgame/types";
import { useAtom, useAtomValue,useSetAtom } from "jotai";
import { useEffect, useRef,useState } from "react";

import { battleLogAtom, currentTimeAtom, displayEventsAtom,flattenedTimelineAtom, processedEventsAtom } from "@/atoms/globalAtom";
import { useBattleData } from "@/utils/hooks/useBattleData";
import type { CharacterData } from "@/utils/hooks/useGetCharacter";
import { useStartMonsterBattle } from "@/utils/hooks/useStartMonsterBattle";

export function useFieldCombat(characterData: CharacterData | undefined) {
  const navigate = useNavigate();
  const [isCombat, setIsCombat] = useState<boolean>(false);
  const { setBattleLog } = useBattleData();
  const startMonsterBattle = useStartMonsterBattle();
  const [time, setTime] = useAtom(currentTimeAtom);
  const [battleLog] = useAtom(battleLogAtom);
  const timeline = useAtomValue(flattenedTimelineAtom);
  const setDisplayEvents = useSetAtom(displayEventsAtom);
  const setProcessedEvents = useSetAtom(processedEventsAtom);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const pendingEventsRef = useRef<BattleEvent[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 전투 타이머 로직: 1초마다 다음 틱으로 넘어가려 시도
  useEffect(() => {
    if (!isCombat || !battleLog || isProcessing) return;

    const timer = setInterval(() => {
      // 현재 시간에 해당하는 이벤트들 가져오기
      const currentTickEvents = timeline.filter((e: BattleEvent) => e.timestamp === time);
      
      if (currentTickEvents.length > 0) {
        console.log(`[Battle] Processing ${currentTickEvents.length} events at tick ${time}`);
        pendingEventsRef.current = [...currentTickEvents];
        setIsProcessing(true);
      } else {
        setTime((prev) => prev + 1);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isCombat, battleLog, setTime, time, timeline, isProcessing]);

  // 이벤트 순차 처리 로직
  useEffect(() => {
    if (!isProcessing) return;

    const processNextEvent = () => {
      if (pendingEventsRef.current.length > 0) {
        const nextEvent = pendingEventsRef.current.shift();
        if (nextEvent) {
          console.log(`[Battle] Displaying event: ${nextEvent.type} (${nextEvent.id})`);
          setDisplayEvents([nextEvent]);
          
          // 시각적으로 처리된 이벤트 리스트에 추가 (체력바 등 동기화용)
          setProcessedEvents((prev) => [...prev, nextEvent]);
          
          // 사망(DEATH) 이벤트는 연출 딜레이 없이 즉시 다음으로 진행
          const nextPeek = pendingEventsRef.current[0];
          const isImmediate = nextEvent.type === "DEATH" || nextPeek?.type === "DEATH";
          const delay = isImmediate ? 0 : 500;
          
          timeoutRef.current = setTimeout(processNextEvent, delay);
        }
      } else {
        console.log(`[Battle] All events processed for tick ${time}. Moving to next tick.`);
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

  const handleEnemyClick = () => {
    if (isCombat || !characterData?.raw.id) return;
    startMonsterBattle.mutate(
      { characterId: characterData.raw.id, level: 1 },
      {
        onSuccess: (log) => {
          console.log("[Battle] Started new battle");
          setBattleLog(log);
          setTime(0);
          setDisplayEvents([]);
          setProcessedEvents([]);
          setIsProcessing(false);
          setIsCombat(true);
        },
      },
    );
  };

  useEffect(() => {
    if (isCombat) {
      navigate({ to: "/field" });
    }
  }, [isCombat, navigate]);

  return { isCombat, setIsCombat, handleEnemyClick, battleLog };
}
