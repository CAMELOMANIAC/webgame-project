import { useEffect, useRef, useState } from "react";

import type { BattleEvent, BattleLog, PlayerState } from "./simulateBattle.types";

export type PlayerLiveState = PlayerState & {
  currentHp: number;
  weaponCooldownRemaining: number[];
};

export function useBattlePlayer(battleLog: BattleLog | null) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [players, setPlayers] = useState<PlayerLiveState[]>([]);
  const [activeEvents, setActiveEvents] = useState<BattleEvent[]>([]);

  const requestRef = useRef<number>(null);
  const startTimeRef = useRef<number>(null);
  const lastProcessedIndexRef = useRef<number>(-1);

  // 초기화
  useEffect(() => {
    if (battleLog) {
      const initialPlayers = battleLog.initialState.players.map((p) => ({
        ...p,
        currentHp: p.hp,
        weaponCooldownRemaining: p.weapons.map(() => 0),
      }));
      setPlayers(initialPlayers);
      setCurrentTime(0);
      lastProcessedIndexRef.current = -1;
      setActiveEvents([]);
    }
  }, [battleLog]);

  const animate = (time: number) => {
    if (!startTimeRef.current) startTimeRef.current = time;
    const elapsed = time - startTimeRef.current;
    setCurrentTime(elapsed);

    if (!battleLog) return;

    // 타임라인 순회하며 현재 시간보다 이전/같은 이벤트들 처리
    const nextIndex = lastProcessedIndexRef.current + 1;
    if (nextIndex < battleLog.timeline.length) {
      const entry = battleLog.timeline[nextIndex];
      if (elapsed >= entry.timestamp) {
        processEvents(entry.events);
        lastProcessedIndexRef.current = nextIndex;
      }
    }

    // 전투 종료 체크
    const lastEntry = battleLog.timeline[battleLog.timeline.length - 1];
    if (elapsed >= (lastEntry?.timestamp || 0) + 1000) {
      setIsPlaying(false);
      return;
    }

    requestRef.current = requestAnimationFrame(animate);
  };

  const processEvents = (events: BattleEvent[]) => {
    // UI에 보여줄 "현재 활성 이벤트" 업데이트 (예: 데미지 숫자 띄우기용)
    setActiveEvents((prev) => [...prev, ...events]);

    // 특정 시간 후 이벤트 목록에서 제거 (청소 작업)
    setTimeout(() => {
      setActiveEvents((prev) => prev.filter((e) => !events.includes(e)));
    }, 1000);

    // 실제 플레이어 상태값 업데이트
    setPlayers((prev) => {
      const next = [...prev];
      events.forEach((event) => {
        if (event.type === "DAMAGE") {
          const target = next.find((p) => p.id === event.targetId);
          if (target) target.currentHp = event.remainingHp;
        }
        if (event.type === "COOLDOWN") {
          const actor = next.find((p) => p.id === event.actorId);
          if (actor) {
            actor.weaponCooldownRemaining[event.weaponIndex] = event.duration;
          }
        }
      });
      return next;
    });
  };

  const start = () => {
    if (!battleLog) return;
    setIsPlaying(true);
    startTimeRef.current = null;
    lastProcessedIndexRef.current = -1;
    requestRef.current = requestAnimationFrame(animate);
  };

  const stop = () => {
    setIsPlaying(false);
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
  };

  return {
    players,
    currentTime,
    isPlaying,
    activeEvents,
    start,
    stop,
  };
}
