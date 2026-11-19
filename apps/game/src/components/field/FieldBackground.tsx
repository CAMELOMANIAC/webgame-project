import type { UseMutationResult } from "@tanstack/react-query";
import type { BattleLog } from "@webgame/types";
import { useCallback, useEffect, useRef } from "react";

import { BattleCanvas } from "@/components/combat/BattleCanvas";
import MapGraphCanvas from "@/components/field/MapGraphCanvas";
import type { WorldTransform } from "@/utils/battleCamera";
import type { EnemyPlacement } from "@/utils/battleLayout";
import type { NavigateRaidResponse } from "@/utils/hooks/useNavigateRaid";

import * as styles from "./FieldBackground.css";

interface FieldBackgroundProps {
  isCombat: boolean;
  battleLog: BattleLog | null | undefined;
  enemyPositions: Map<string, EnemyPlacement>;
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
  const mapLayerRef = useRef<HTMLDivElement | null>(null);

  // 전투 카메라 변환을 지도 배경에도 적용해 유닛만 움직이는 것처럼 보이지 않게 한다
  const handleCameraChange = useCallback(({ scale, x, y }: WorldTransform) => {
    const layer = mapLayerRef.current;
    if (!layer) return;
    layer.style.transform =
      scale === 1 && x === 0 && y === 0
        ? ""
        : `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let frameId: number | null = null;

    const handleShake = (e: Event) => {
      const customEvent = e as CustomEvent<{ intensity?: number; duration?: number }>;
      const intensity = customEvent.detail?.intensity ?? 8;
      const duration = customEvent.detail?.duration ?? 280;
      const start = performance.now();

      if (frameId !== null) cancelAnimationFrame(frameId);

      const tick = (now: number) => {
        const t = Math.min((now - start) / duration, 1);
        if (t >= 1) {
          container.style.transform = "";
          frameId = null;
          return;
        }
        // 감쇠 진동: 매 프레임 무작위 방향, 시간에 따라 제곱 감쇠
        const amplitude = intensity * (1 - t) * (1 - t);
        const angle = Math.random() * Math.PI * 2;
        container.style.transform = `translate3d(${Math.cos(angle) * amplitude}px, ${Math.sin(angle) * amplitude}px, 0)`;
        frameId = requestAnimationFrame(tick);
      };
      frameId = requestAnimationFrame(tick);
    };

    window.addEventListener("combat-shake", handleShake);
    return () => {
      window.removeEventListener("combat-shake", handleShake);
      if (frameId !== null) cancelAnimationFrame(frameId);
      container.style.transform = "";
    };
  }, []);

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.mapLayer} ref={mapLayerRef}>
        <MapGraphCanvas
          isCombat={isCombat}
          navigateRaid={navigateRaid}
          triggerCombat={triggerCombat}
        />
      </div>

      {isCombat && (
        <BattleCanvas
          isCombat={isCombat}
          battleLog={battleLog}
          enemyPositions={enemyPositions}
          characterId={characterId}
          onCameraChange={handleCameraChange}
        />
      )}
    </div>
  );
}
