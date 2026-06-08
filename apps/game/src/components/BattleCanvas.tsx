import type { BattleEvent, BattleLog } from "@webgame/types";
import { useAtomValue } from "jotai";
import Konva from "konva";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Group, Image, Layer, Stage, Text } from "react-konva";
import styled from "styled-components";
import useImage from "use-image";

import { displayEventsAtom, processedEventsAtom } from "@/atoms/globalAtom";
import CanvasEnemyUnit from "@/components/CanvasEnemyUnit";
import RadarAttackLine from "@/components/RadarAttackLine";

import compass from "../assets/compass.svg";
import { playerRotationAtom } from "../atoms/raidAtom";

interface BattleCanvasProps {
  isCombat: boolean;
  battleLog: BattleLog | null | undefined;
  enemyPositions: Map<string, { x: number; y: number }>;
  characterNickname: string | undefined;
}

interface DamagePopup {
  id: string;
  x: number;
  y: number;
  amount: number;
  isCritical: boolean;
  createdAt: number;
}

export function BattleCanvas({
  isCombat,
  battleLog,
  enemyPositions,
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
  const displayEvents = useAtomValue(displayEventsAtom);
  const activeAttacks = useMemo(() => {
    return displayEvents.filter((e) => e.type === "ATTACK");
  }, [displayEvents]);
  const [compassImg] = useImage(compass);
  const playerRotation = useAtomValue(playerRotationAtom);

  // --- Visual Enhancement States ---
  const [showRedFlash, setShowRedFlash] = useState(false);
  const [popups, setPopups] = useState<DamagePopup[]>([]);
  const redFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (redFlashTimerRef.current) {
        clearTimeout(redFlashTimerRef.current);
      }
    };
  }, []);

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

    const playerAttack = activeAttacks.find((a) => a.type === "ATTACK" && a.actorId === characterNickname);

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

  // --- Trigger Camera Shake ---
  const triggerShake = useCallback((intensity: number) => {
    const event = new CustomEvent("combat-shake", { detail: { intensity } });
    window.dispatchEvent(event);
  }, []);

  // --- Monitor DAMAGE and ATTACK events to trigger visuals ---
  useEffect(() => {
    // 1. Monitor Attack Events for immediate starting shake
    const attackEvents = displayEvents.filter((e): e is BattleEvent & { type: "ATTACK" } => e.type === "ATTACK");
    if (attackEvents.length > 0) {
      const isPlayerActor = attackEvents.some((e) => e.actorId === characterNickname);
      if (isPlayerActor) {
        triggerShake(4); // Mild shake on player firing
      } else {
        triggerShake(2); // Subtle shake on enemy firing
      }
    }

    // 2. Monitor Damage Events for impact shake & flash
    const damageEvents = displayEvents.filter((e): e is BattleEvent & { type: "DAMAGE" } => e.type === "DAMAGE");
    if (damageEvents.length > 0) {
      // Camera Shake & Screen Flash (ONLY when PLAYER takes damage)
      const hasPlayerDamage = damageEvents.some((e) => e.targetId === characterNickname);
      if (hasPlayerDamage) {
        triggerShake(12); // Strong shake for player damage
        setShowRedFlash(true);

        if (redFlashTimerRef.current) {
          clearTimeout(redFlashTimerRef.current);
        }

        redFlashTimerRef.current = setTimeout(() => {
          setShowRedFlash(false);
          redFlashTimerRef.current = null;
        }, 180); // Shorter vignette duration (180ms)
      }
      // Note: 적 피격 시에는 맵/배틀 스크린 카메라 쉐이크를 작동하지 않음 (적 자체만 흔들림)

      // Damage Popups Registration
      const newPopups: DamagePopup[] = [];
      damageEvents.forEach((e) => {
        let posX = width / 2;
        let posY = height / 2;

        if (e.targetId !== characterNickname) {
          const pos = enemyPositions.get(e.targetId);
          if (pos) {
            const safePos = getSafeCoords(pos);
            posX = safePos.x;
            posY = safePos.y;
          }
        }

        // Add minor random spread offset
        const offsetRandX = (Math.random() - 0.5) * 20;
        const offsetRandY = (Math.random() - 0.5) * 10;

        newPopups.push({
          id: `${e.id}-${Date.now()}-${Math.random()}`,
          x: posX + offsetRandX,
          y: posY - 25 + offsetRandY, // spawn slightly above unit center
          amount: e.amount,
          isCritical: e.isCritical,
          createdAt: Date.now(),
        });
      });

      if (newPopups.length > 0) {
        setPopups((prev) => [...prev, ...newPopups]);
      }
    }
  }, [displayEvents, characterNickname, enemyPositions, getSafeCoords, width, height, triggerShake]);


  return (
    <Container ref={containerRef}>
      <RedFlashOverlay $visible={showRedFlash} />
      {width > 0 && height > 0 && (
        <Stage width={width} height={height}>
          {/* Layer 1: Player Marker (MapGraphCanvas와 동일한 디자인으로 중앙에 고정 렌더링) */}
          <Layer listening={false}>
            <Group x={width / 2} y={height / 2}>
              {compassImg && (
                <Image image={compassImg} width={50} height={50} offsetX={25} offsetY={25} rotation={activeRotation} />
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
                  const isEnemyDamaged = displayEvents.some((e) => e.type === "DAMAGE" && e.targetId === enemy.id);

                  // 안전지대 매핑 좌표 적용
                  const safePos = getSafeCoords(pos);
                  const pixelX = safePos.x;
                  const pixelY = safePos.y;

                  // 캔버스 밖 스폰 좌표 계산 (플레이어 중심에서 적을 향하는 방향 연장)
                  const centerX = width / 2;
                  const centerY = height / 2;
                  const dx = pixelX - centerX;
                  const dy = pixelY - centerY;
                  const dist = Math.sqrt(dx * dx + dy * dy);

                  let spawnX = pixelX;
                  let spawnY = -100; // fallback: 화면 위쪽 밖

                  if (dist > 0) {
                    const maxDim = Math.max(width, height);
                    // 플레이어 중심에서 적의 방향 벡터를 연장하여 화면 밖 스폰 좌표 설정
                    spawnX = centerX + (dx / dist) * maxDim;
                    spawnY = centerY + (dy / dist) * maxDim;
                  }

                  return (
                    <CanvasEnemyUnit
                      key={`enemy-${enemy.id}`}
                      name={enemy.name}
                      x={pixelX}
                      y={pixelY}
                      spawnX={spawnX}
                      spawnY={spawnY}
                      isAttacking={isAttacking}
                      isDamaged={isEnemyDamaged}
                    />
                  );
                })}

            {/* Attack Lines (Radar Pulse Style) */}
            {activeAttacks.map((attack) => {
              if (attack.type !== "ATTACK") return null;

              const actorPos = enemyPositions.get(attack.actorId);
              const targetPos = enemyPositions.get(attack.targetId);

              const x1 =
                attack.actorId === characterNickname ? width / 2 : actorPos ? getSafeCoords(actorPos).x : width / 2;
              const y1 =
                attack.actorId === characterNickname ? height / 2 : actorPos ? getSafeCoords(actorPos).y : height / 2;
              const x2 =
                attack.targetId === characterNickname ? width / 2 : targetPos ? getSafeCoords(targetPos).x : width / 2;
              const y2 =
                attack.targetId === characterNickname
                  ? height / 2
                  : targetPos
                    ? getSafeCoords(targetPos).y
                    : height / 2;

              return <RadarAttackLine key={attack.id} points={[x1, y1, x2, y2]} />;
            })}
          </Layer>

          {/* Layer 3: Floating Damage Popups */}
          <Layer>
            {popups.map((p) => (
              <CanvasDamagePopup
                key={p.id}
                id={p.id}
                x={p.x}
                y={p.y}
                amount={p.amount}
                isCritical={p.isCritical}
                onComplete={(id) => {
                  setPopups((prev) => prev.filter((item) => item.id !== id));
                }}
              />
            ))}
          </Layer>
        </Stage>
      )}
    </Container>
  );
}

interface CanvasDamagePopupProps {
  id: string;
  x: number;
  y: number;
  amount: number;
  isCritical: boolean;
  onComplete: (id: string) => void;
}

function CanvasDamagePopup({ id, x, y, amount, isCritical, onComplete }: CanvasDamagePopupProps) {
  const textRef = useRef<Konva.Text>(null);

  useEffect(() => {
    if (!textRef.current) return;
    const node = textRef.current;

    const tween = new Konva.Tween({
      node: node,
      duration: 1.0,
      y: y - 45,
      opacity: 0,
      easing: Konva.Easings.EaseOut,
      onFinish: () => {
        onComplete(id);
      },
    });

    tween.play();

    return () => {
      tween.destroy();
    };
  }, [id, y, onComplete]);

  return (
    <Group x={x} y={y}>
      <Text
        ref={textRef}
        text={isCritical ? `CRIT! -${amount}` : `-${amount}`}
        fontSize={isCritical ? 14 : 11}
        fontStyle={isCritical ? "800" : "600"}
        fill="#ffffff"
        shadowColor="#000000"
        shadowBlur={3}
        shadowOffset={{ x: 1, y: 1 }}
        shadowOpacity={0.8}
        stroke={isCritical ? "#ff7162" : undefined}
        strokeWidth={isCritical ? 1 : 0}
        align="center"
        verticalAlign="middle"
        fontFamily="Inter"
      />
    </Group>
  );
}

const Container = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  overflow: hidden;
  background: transparent; /* 뒷배경 지도가 완전하고 뚜렷하게 보이도록 투명 설정 */
  pointer-events: none;
`;

const RedFlashOverlay = styled.div<{ $visible: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
  box-shadow: inset 0 0 40px rgba(255, 113, 108, 0.45);
  opacity: ${(props) => (props.$visible ? 1 : 0)};
  transition: opacity 0.12s ease-out;
`;
