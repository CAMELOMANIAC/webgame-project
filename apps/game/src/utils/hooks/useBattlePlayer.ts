import type { BattleEvent, BattleLog, PlayerState } from "@webgame/types";
import { useEffect, useRef, useState } from "react";

export type PlayerLiveState = PlayerState & {
  currentHp: number;
  currentStamina: number;
  weaponCooldownRemaining: number[];
  currentWeaponIndex: number;
  isDead: boolean;
  castingWeaponIndex: number | null;
  castingTicksRemaining: number;
};

const TICK_DURATION = 100; // 1틱당 100ms로 재생

export function useBattlePlayer(battleLog: BattleLog | null) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [players, setPlayers] = useState<PlayerLiveState[]>([]);
  const [activeEvents, setActiveEvents] = useState<BattleEvent[]>([]);
  const [eventHistory, setEventHistory] = useState<BattleEvent[]>([]);

  const requestRef = useRef<number>(null);
  const startTimeRef = useRef<number>(null);
  const lastTimeRef = useRef<number>(0);
  const lastProcessedIndexRef = useRef<number>(-1);

  // 초기화
  useEffect(() => {
    if (battleLog) {
      const initialPlayers = battleLog.initialState.players.map((p) => ({
        ...p,
        currentHp: p.hp,
        currentStamina: p.stamina,
        weaponCooldownRemaining: p.weapons.map(() => 0),
        currentWeaponIndex: 0,
        isDead: false,
        castingWeaponIndex: null,
        castingTicksRemaining: 0,
      }));
      setPlayers(initialPlayers);
      setCurrentTime(0);
      lastProcessedIndexRef.current = -1;
      setActiveEvents([]);
      setEventHistory([]);
    }
  }, [battleLog]);

  const animate = (time: number) => {
    if (startTimeRef.current === null) {
      startTimeRef.current = time;
      lastTimeRef.current = time;
    }
    const deltaTimeMs = time - lastTimeRef.current;
    lastTimeRef.current = time;

    const elapsedMs = time - startTimeRef.current;
    const currentTick = Math.floor(elapsedMs / TICK_DURATION);

    setCurrentTime(currentTick);

    if (!battleLog) return;

    // 타임라인 순회하며 현재 틱보다 이전/같은 이벤트들 처리
    const eventsToProcess: BattleEvent[] = [];
    let nextIndex = lastProcessedIndexRef.current + 1;

    while (nextIndex < battleLog.timeline.length) {
      const entry = battleLog.timeline[nextIndex];
      if (currentTick >= entry.timestamp) {
        eventsToProcess.push(...entry.events);
        lastProcessedIndexRef.current = nextIndex;
        nextIndex++;
      } else {
        break;
      }
    }

    // 실제 플레이어 상태값 업데이트
    setPlayers((prev) => {
      const next = prev.map((p) => ({
        ...p,
        weaponCooldownRemaining: p.weaponCooldownRemaining.map((cd) => Math.max(0, cd - deltaTimeMs / TICK_DURATION)),
        castingTicksRemaining: Math.max(0, p.castingTicksRemaining - deltaTimeMs / TICK_DURATION),
      }));

      if (eventsToProcess.length > 0) {
        setActiveEvents((prevEvents) => [...prevEvents, ...eventsToProcess]);
        setEventHistory((prevHistory) => [...prevHistory, ...eventsToProcess]);

        setTimeout(() => {
          setActiveEvents((prevEvents) => prevEvents.filter((e) => !eventsToProcess.includes(e)));
        }, 1000);

        eventsToProcess.forEach((event) => {
          if (event.type === "CAST_START") {
            const actor = next.find((p) => p.id === event.actorId);
            if (actor) {
              actor.castingWeaponIndex = event.weaponIndex;
              actor.castingTicksRemaining = event.duration;
            }
          }
          if (event.type === "CAST_COMPLETE" || event.type === "CAST_CANCEL") {
            const actor = next.find((p) => p.id === event.actorId);
            if (actor) {
              actor.castingWeaponIndex = null;
              actor.castingTicksRemaining = 0;
            }
          }
          if (event.type === "ATTACK") {
            const actor = next.find((p) => p.id === event.actorId);
            if (actor) {
              actor.currentWeaponIndex = (event.weaponIndex + 1) % 6;
            }
          }
          if (event.type === "DAMAGE") {
            const target = next.find((p) => p.id === event.targetId);
            if (target) target.currentHp = event.remainingHp;
          }
          if (event.type === "HEAL") {
            const target = next.find((p) => p.id === event.targetId);
            if (target) target.currentHp = event.remainingHp;
          }
          if (event.type === "STAMINA_CHANGE") {
            const target = next.find((p) => p.id === event.playerId);
            if (target) target.currentStamina = event.currentStamina;
          }
          if (event.type === "COOLDOWN") {
            const actor = next.find((p) => p.id === event.actorId);
            if (actor) {
              actor.weaponCooldownRemaining[event.weaponIndex] = event.duration;
            }
          }
          if (event.type === "DEATH") {
            const target = next.find((p) => p.id === event.playerId);
            if (target) {
              target.isDead = true;
              target.currentHp = 0;
            }
          }
        });
      }
      return next;
    });

    // 전투 종료 체크
    const lastEntry = battleLog.timeline[battleLog.timeline.length - 1];
    if (currentTick >= (lastEntry?.timestamp || 0) + 10) {
      setIsPlaying(false);
      return;
    }

    requestRef.current = requestAnimationFrame(animate);
  };

  const start = () => {
    if (!battleLog) return;
    setIsPlaying(true);
    startTimeRef.current = null;
    lastProcessedIndexRef.current = -1;
    setEventHistory([]);
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
    eventHistory,
    start,
    stop,
  };
}
