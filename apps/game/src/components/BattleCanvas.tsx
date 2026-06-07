import type { BattleEvent, BattleLog } from "@webgame/types";
import { useAtomValue } from "jotai";
import { useMemo } from "react";
import { Image, Layer, Stage } from "react-konva";
import styled from "styled-components";
import useImage from "use-image";

import compass from "@/assets/compass.svg";
import { processedEventsAtom } from "@/atoms/globalAtom";
import CanvasEnemyUnit from "@/components/CanvasEnemyUnit";
import RadarAttackLine from "@/components/RadarAttackLine";
import { useWindowSize } from "@/utils/hooks/useWindowSize";

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
  const { width, height } = useWindowSize();
  const [compassImg] = useImage(compass);
  const processedEvents = useAtomValue(processedEventsAtom);

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
    <Container>
      {width > 0 && height > 0 && (
        <Stage width={width} height={height}>
          {/* Layer 1: Static Background Elements (Radar Compass) */}
          <Layer listening={false}>
            {compassImg && (
              <Image
                image={compassImg}
                x={width / 2}
                y={height / 2}
                width={48}
                height={48}
                offsetX={24}
                offsetY={24}
              />
            )}
          </Layer>

          {/* Layer 2: Dynamic Units and Effects */}
          <Layer>
            {isCombat &&
              battleLog?.initialState.players
                .filter(
                  (p) =>
                    p.teamId !== battleLog.initialState.players.find((player) => player.id === characterNickname)?.teamId &&
                    !deadEnemyIds.has(p.id),
                )
                .map((enemy) => {
                  const pos = enemyPositions.get(enemy.id);
                  if (!pos) return null;
                  const isAttacking = activeAttacks.some((a) => a.type === "ATTACK" && a.actorId === enemy.id);
                  
                  // 퍼센트 기반 좌표를 픽셀로 변환
                  const pixelX = (pos.x / 100) * width;
                  const pixelY = (pos.y / 100) * height;

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
              const actorPos = attack.actorId === characterNickname ? { x: 50, y: 50 } : enemyPositions.get(attack.actorId);
              const targetPos =
                attack.targetId === characterNickname ? { x: 50, y: 50 } : enemyPositions.get(attack.targetId);

              if (!actorPos || !targetPos) return null;

              const x1 = (actorPos.x / 100) * width;
              const y1 = (actorPos.y / 100) * height;
              const x2 = (targetPos.x / 100) * width;
              const y2 = (targetPos.y / 100) * height;

              return (
                <RadarAttackLine
                  key={attack.id}
                  points={[x1, y1, x2, y2]}
                />
              );
            })}
          </Layer>
        </Stage>
      )}
    </Container>
  );
}

const Container = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 5;
  overflow: hidden;
  background-color: rgba(13, 13, 13, 0.55); /* 지도가 비쳐 보이도록 어두운 반투명 색상 설정 */
  backdrop-filter: blur(2px); /* 약간의 블러로 전투 연출과 배경 지도를 입체적으로 분리 */
  pointer-events: none;
`;
