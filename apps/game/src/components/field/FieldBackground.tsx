import type { UseMutationResult } from "@tanstack/react-query";
import type { BattleLog } from "@webgame/types";
import { useEffect, useRef } from "react";

import { BattleCanvas } from "@/components/combat/BattleCanvas";
import MapGraphCanvas from "@/components/field/MapGraphCanvas";
import type { NavigateRaidResponse } from "@/utils/hooks/useNavigateRaid";

import * as styles from "./FieldBackground.css";

interface FieldBackgroundProps {
  isCombat: boolean;
  battleLog: BattleLog | null | undefined;
  enemyPositions: Map<string, { x: number; y: number }>;
  characterId: string | undefined;
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
  characterId,
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
    <div className={styles.container} ref={containerRef}>
      <MapGraphCanvas
        isCombat={isCombat}
        navigateRaid={navigateRaid}
        triggerCombat={triggerCombat}
      />

      {isCombat && (
        <BattleCanvas
          isCombat={isCombat}
          battleLog={battleLog}
          enemyPositions={enemyPositions}
          characterId={characterId}
        />
      )}
    </div>
  );
}
