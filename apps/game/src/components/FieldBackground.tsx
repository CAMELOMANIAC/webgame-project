import type { UseMutationResult } from "@tanstack/react-query";
import type { BattleLog } from "@webgame/types";
import { useEffect, useRef } from "react";
import styled from "styled-components";

import { BattleCanvas } from "@/components/BattleCanvas";
import MapGraphCanvas from "@/components/MapGraphCanvas";
import type { NavigateRaidResponse } from "@/utils/hooks/useNavigateRaid";

interface FieldBackgroundProps {
  isCombat: boolean;
  battleLog: BattleLog | null | undefined;
  enemyPositions: Map<string, { x: number; y: number }>;
  characterNickname: string | undefined;
  navigateRaid: UseMutationResult<
    NavigateRaidResponse,
    Error,
    { characterId: string; path: number[] }
  >;
  triggerCombat: (log: BattleLog) => void;
}

export function FieldBackground({
  isCombat,
  battleLog,
  enemyPositions,
  characterNickname,
  navigateRaid,
  triggerCombat,
}: FieldBackgroundProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let activeInterval: ReturnType<typeof setInterval> | null = null;

    const handleShake = (e: Event) => {
      const customEvent = e as CustomEvent;
      const intensity = customEvent.detail?.intensity ?? 8;
      const duration = customEvent.detail?.duration ?? 500;

      const start = performance.now();
      const maxCount = Math.floor(duration / 50);
      let count = 0;

      if (activeInterval) {
        clearInterval(activeInterval);
      }

      activeInterval = setInterval(() => {
        if (performance.now() - start > duration) {
          container.style.transform = "";
          clearInterval(activeInterval!);
          activeInterval = null;
          return;
        }
        const angle = Math.random() * Math.PI * 2;
        const currentIntensity = intensity * (1 - count / maxCount);
        const dx = Math.cos(angle) * currentIntensity;
        const dy = Math.sin(angle) * currentIntensity;
        container.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
        count++;
      }, 50);
    };

    window.addEventListener("combat-shake", handleShake);
    return () => {
      window.removeEventListener("combat-shake", handleShake);
      if (activeInterval) {
        clearInterval(activeInterval);
      }
    };
  }, []);

  return (
    <Container ref={containerRef}>
      {/* 맵 그래프 캔버스 (전투 시 캐시 동결 처리로 최적화됨) */}
      <MapGraphCanvas
        isCombat={isCombat}
        navigateRaid={navigateRaid}
        triggerCombat={triggerCombat}
      />

      {/* 전투 시뮬레이터 캔버스 (전투 중일 때만 맵 위에 렌더링) */}
      {isCombat && (
        <BattleCanvas
          isCombat={isCombat}
          battleLog={battleLog}
          enemyPositions={enemyPositions}
          characterNickname={characterNickname}
        />
      )}
    </Container>
  );
}

const Container = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  will-change: transform;
`;
