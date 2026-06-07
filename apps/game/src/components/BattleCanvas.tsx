import type { BattleEvent, BattleLog } from "@webgame/types";
import { useAtomValue } from "jotai";
import { useEffect, useMemo, useRef, useState } from "react";
import { Group, Image, Layer, Stage } from "react-konva";
import styled from "styled-components";
import useImage from "use-image";

import { processedEventsAtom } from "@/atoms/globalAtom";
import CanvasEnemyUnit from "@/components/CanvasEnemyUnit";
import RadarAttackLine from "@/components/RadarAttackLine";

import compass from "../assets/compass.svg";
import { playerRotationAtom } from "../atoms/raidAtom";

interface BattleCanvasProps {
  isCombat: boolean;
  battleLog: BattleLog | null | undefined;
  enemyPositions: Map<string, { x: number; y: number }>;
  activeAttacks: BattleEvent[];
  currentTime: number;
  characterNickname: string | undefined;
}

export function BattleCanvas({
  isCombat,
  battleLog,
  enemyPositions,
  activeAttacks,
  characterNickname,
}: BattleCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.unobserve(container);
      resizeObserver.disconnect();
    };
  }, []);

  const { width, height } = dimensions;
  const processedEvents = useAtomValue(processedEventsAtom);
  const [compassImg] = useImage(compass);
  const playerRotation = useAtomValue(playerRotationAtom);

  // UI 영역(헤더/푸터)과 겹치지 않게 안전 픽셀 영역(Safe Zone)으로 좌표 변환하는 헬퍼 함수
  const getSafeCoords = useMemo(() => {
    return (pos: { x: number; y: number }) => {
      const safeLeft = 50;
      const safeRight = width - 50;
      const safeTop = 150;
      const safeBottom = height - 250;

      // 뷰포트가 비정상적으로 작아 경계선이 교차할 경우 대비한 비율 기반 폴백
      if (safeBottom <= safeTop || safeRight <= safeLeft) {
        return {
          x: (pos.x / 100) * width,
          y: (pos.y / 100) * height,
        };
      }

      return {
        x: safeLeft + (pos.x / 100) * (safeRight - safeLeft),
        y: safeTop + (pos.y / 100) * (safeBottom - safeTop),
      };
    };
  }, [width, height]);

  // 플레이어가 적극적으로 공격 중일 때 적을 향하도록 회전각 재계산
  const activeRotation = useMemo(() => {
    if (!characterNickname) return playerRotation;

    const playerAttack = activeAttacks.find(
      (a) => a.type === "ATTACK" && a.actorId === characterNickname
    );

    if (playerAttack && playerAttack.type === "ATTACK") {
      const enemyPos = enemyPositions.get(playerAttack.targetId);
      if (enemyPos) {
        const safePos = getSafeCoords(enemyPos);
        const dx = safePos.x - width / 2;
        const dy = safePos.y - height / 2;
        const angleRad = Math.atan2(dy, dx);
        return (angleRad * 180) / Math.PI + 90;
      }
    }

    return playerRotation;
  }, [activeAttacks, enemyPositions, characterNickname, width, height, playerRotation, getSafeCoords]);

  const deadEnemyIds = useMemo(() => {
    const ids = new Set<string>();
    processedEvents.forEach((event) => {
      if (event.type === "DEATH") {
        ids.add(event.playerId);
      }
    });
    return ids;
  }, [processedEvents]);

  return (
    <Container ref={containerRef}>
      {width > 0 && height > 0 && (
        <Stage width={width} height={height}>
          {/* Layer 1: Player Marker (MapGraphCanvas와 동일한 디자인으로 중앙에 고정 렌더링) */}
          <Layer listening={false}>
            <Group x={width / 2} y={height / 2}>
              {compassImg && (
                <Image
                  image={compassImg}
                  width={50}
                  height={50}
                  offsetX={25}
                  offsetY={25}
                  rotation={activeRotation}
                />
              )}
            </Group>
          </Layer>


          {/* Layer 2: Dynamic Units and Effects */}
          <Layer>
            {isCombat &&
              battleLog?.initialState.players
                .filter(
                  (p) =>
                    p.teamId !==
                      battleLog.initialState.players.find((player) => player.id === characterNickname)?.teamId &&
                    !deadEnemyIds.has(p.id),
                )
                .map((enemy) => {
                  const pos = enemyPositions.get(enemy.id);
                  if (!pos) return null;
                  const isAttacking = activeAttacks.some((a) => a.type === "ATTACK" && a.actorId === enemy.id);

                  // 안전지대 매핑 좌표 적용
                  const safePos = getSafeCoords(pos);
                  const pixelX = safePos.x;
                  const pixelY = safePos.y;

                  return (
                    <CanvasEnemyUnit
                      key={`enemy-${enemy.id}`}
                      name={enemy.name}
                      x={pixelX}
                      y={pixelY}
                      isAttacking={isAttacking}
                    />
                  );
                })}

            {/* Attack Lines (Radar Pulse Style) */}
            {activeAttacks.map((attack) => {
              if (attack.type !== "ATTACK") return null;

              const actorPos = enemyPositions.get(attack.actorId);
              const targetPos = enemyPositions.get(attack.targetId);

              const x1 = attack.actorId === characterNickname ? width / 2 : (actorPos ? getSafeCoords(actorPos).x : width / 2);
              const y1 = attack.actorId === characterNickname ? height / 2 : (actorPos ? getSafeCoords(actorPos).y : height / 2);
              const x2 = attack.targetId === characterNickname ? width / 2 : (targetPos ? getSafeCoords(targetPos).x : width / 2);
              const y2 = attack.targetId === characterNickname ? height / 2 : (targetPos ? getSafeCoords(targetPos).y : height / 2);

              return <RadarAttackLine key={attack.id} points={[x1, y1, x2, y2]} />;
            })}
          </Layer>
        </Stage>
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
  z-index: 5;
  overflow: hidden;
  background: transparent; /* 뒷배경 지도가 완전하고 뚜렷하게 보이도록 투명 설정 */
  pointer-events: none;
`;



