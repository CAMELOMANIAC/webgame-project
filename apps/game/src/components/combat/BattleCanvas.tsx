import type { BattleEvent, BattleLog } from "@webgame/types";
import { useAtomValue } from "jotai";
import Konva from "konva";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Group, Image, Layer, Stage, Text } from "react-konva";
import useImage from "use-image";

import compass from "@/assets/compass.svg";
import { displayEventsAtom, processedEventsAtom } from "@/atoms/globalAtom";
import { playerRotationAtom } from "@/atoms/raidAtom";
import CanvasEnemyUnit from "@/components/combat/CanvasEnemyUnit";
import MeleeSlashEffect from "@/components/combat/MeleeSlashEffect";
import RadarAttackLine from "@/components/combat/RadarAttackLine";

import * as styles from "./BattleCanvas.css";

interface BattleCanvasProps {
  isCombat: boolean;
  battleLog: BattleLog | null | undefined;
  enemyPositions: Map<string, { x: number; y: number }>;
  characterId: string | undefined;
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
  characterId,
}: BattleCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastAttackIdRef = useRef<string | null>(null);
  const playerAnimFrameIdRef = useRef<number | null>(null);
  const playerPauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [playerDashOffset, setPlayerDashOffset] = useState({ x: 0, y: 0 });
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
  // 변환 후 플레이어 마커 중심(width/2, height/2)으로부터 최소 100px 거리를 픽셀 레벨에서 보장
  const getSafeCoords = useMemo(() => {
    const MIN_PIXEL_DIST = 100;

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

      // Step 1: Safe Zone 픽셀 좌표로 변환
      let x = safeLeft + (pos.x / 100) * (safeRight - safeLeft);
      let y = safeTop + (pos.y / 100) * (safeBottom - safeTop);

      // Step 2: 플레이어 마커 중심(픽셀)으로부터 최소 100px 보장
      const cx = width / 2;
      const cy = height / 2;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0 && dist < MIN_PIXEL_DIST) {
        const scale = MIN_PIXEL_DIST / dist;
        x = cx + dx * scale;
        y = cy + dy * scale;

        // Step 3: 밀어낸 결과가 Safe Zone 밖으로 나가면 Safe Zone 경계로 재클램핑
        x = Math.max(safeLeft, Math.min(safeRight, x));
        y = Math.max(safeTop, Math.min(safeBottom, y));
      }

      return { x, y };
    };
  }, [width, height]);

  const deadEnemyIds = useMemo(() => {
    const ids = new Set<string>();
    processedEvents.forEach((event) => {
      if (event.type === "DEATH") {
        ids.add(event.playerId);
      }
    });
    return ids;
  }, [processedEvents]);

  // 전투 중에는 플레이어가 항시 살아있는 적을 바라보도록 회전각 계산
  const activeRotation = useMemo(() => {
    if (!characterId || !battleLog) return playerRotation;

    const firstAliveEnemy = battleLog.initialState.players.find(
      (p) =>
        p.teamId !==
          battleLog.initialState.players.find((player) => player.id === characterId)?.teamId &&
        !deadEnemyIds.has(p.id),
    );

    if (firstAliveEnemy) {
      const enemyPos = enemyPositions.get(firstAliveEnemy.id);
      if (enemyPos) {
        const safePos = getSafeCoords(enemyPos);
        const dx = safePos.x - width / 2;
        const dy = safePos.y - height / 2;
        const angleRad = Math.atan2(dy, dx);
        return (angleRad * 180) / Math.PI + 90;
      }
    }

    return playerRotation;
  }, [battleLog, deadEnemyIds, enemyPositions, characterId, width, height, playerRotation, getSafeCoords]);

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
      const isPlayerActor = attackEvents.some((e) => e.actorId === characterId);
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
      const hasPlayerDamage = damageEvents.some((e) => e.targetId === characterId);
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

        if (e.targetId !== characterId) {
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
  }, [displayEvents, characterId, enemyPositions, getSafeCoords, width, height, triggerShake]);

  // 컴포넌트 언마운트 시에만 애니메이션 프레임 및 타이머 취소
  useEffect(() => {
    return () => {
      if (playerAnimFrameIdRef.current) {
        cancelAnimationFrame(playerAnimFrameIdRef.current);
      }
      if (playerPauseTimerRef.current) {
        clearTimeout(playerPauseTimerRef.current);
      }
    };
  }, []);

  // 플레이어 근접 공격 시 가속 돌진 및 슬라이딩 복귀 애니메이션 (requestAnimationFrame 기반)
  useEffect(() => {
    if (!isCombat || !characterId || width === 0 || height === 0) return;

    // 플레이어의 현재 프레임 근접 공격 이벤트 조회
    const activePlayerMeleeAttack = activeAttacks.find((attack) => {
      if (attack.actorId !== characterId) return false;
      const attacker = battleLog?.initialState.players.find((p) => p.id === characterId);
      const weapon = attacker?.weapons[attack.weaponIndex];
      return weapon?.attackType !== "RANGED";
    });

    if (activePlayerMeleeAttack && activePlayerMeleeAttack.id !== lastAttackIdRef.current) {
      lastAttackIdRef.current = activePlayerMeleeAttack.id;

      // 이전 진행 중인 루프/타이머가 있다면 먼저 취소
      if (playerAnimFrameIdRef.current) {
        cancelAnimationFrame(playerAnimFrameIdRef.current);
      }
      if (playerPauseTimerRef.current) {
        clearTimeout(playerPauseTimerRef.current);
      }

      const targetPos = enemyPositions.get(activePlayerMeleeAttack.targetId);
      if (targetPos) {
        const safePos = getSafeCoords(targetPos);
        const targetX = safePos.x;
        const targetY = safePos.y;

        const centerX = width / 2;
        const centerY = height / 2;
        const dx = targetX - centerX;
        const dy = targetY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
          const ux = dx / distance;
          const uy = dy / distance;

          // 로컬 좌표계 기준으로 돌진 타겟 위치 계산 (45px 앞)
          const dashX = dx - ux * 45;
          const dashY = dy - uy * 45;

          const dashDuration = 250;  // 돌격 시간 (0.25초)
          const pauseDuration = 300; // 타격 지점 대기 시간 (0.3초)
          const returnDuration = 350; // 제자리 복귀 시간 (0.35초)

          // Phase 3: 슬라이딩 복귀 (Cubic Ease-Out) — RAF 루프
          const startReturn = () => {
            const returnStart = performance.now();
            const tickReturn = (now: number) => {
              const t = Math.min((now - returnStart) / returnDuration, 1);
              const ease = 1 - Math.pow(1 - t, 3);
              setPlayerDashOffset({
                x: dashX * (1 - ease),
                y: dashY * (1 - ease),
              });
              if (t < 1) {
                playerAnimFrameIdRef.current = requestAnimationFrame(tickReturn);
              } else {
                setPlayerDashOffset({ x: 0, y: 0 });
                playerAnimFrameIdRef.current = null;
              }
            };
            playerAnimFrameIdRef.current = requestAnimationFrame(tickReturn);
          };

          // Phase 2: 타격 지점 대기 — setTimeout으로 RAF 루프 없이 처리
          const startPause = () => {
            setPlayerDashOffset({ x: dashX, y: dashY });
            playerPauseTimerRef.current = setTimeout(() => {
              playerPauseTimerRef.current = null;
              startReturn();
            }, pauseDuration);
          };

          // Phase 1: 돌격 (Quintic Ease-In: 느리게 시작 → 급가속) — RAF 루프
          const dashStart = performance.now();
          const tickDash = (now: number) => {
            const t = Math.min((now - dashStart) / dashDuration, 1);
            const ease = Math.pow(t, 5);
            setPlayerDashOffset({
              x: dashX * ease,
              y: dashY * ease,
            });
            if (t < 1) {
              playerAnimFrameIdRef.current = requestAnimationFrame(tickDash);
            } else {
              playerAnimFrameIdRef.current = null;
              startPause();
            }
          };

          playerAnimFrameIdRef.current = requestAnimationFrame(tickDash);
        }
      }
    }
  }, [activeAttacks, characterId, enemyPositions, getSafeCoords, width, height, isCombat, battleLog]);

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.redFlashOverlay({ visible: showRedFlash })} />
      {width > 0 && height > 0 && (
        <Stage width={width} height={height}>
          {/* Layer 1: Player Marker (MapGraphCanvas와 동일한 디자인으로 중앙에 고정 렌더링) */}
          <Layer listening={false}>
            <Group x={width / 2} y={height / 2}>
              <Group 
                x={playerDashOffset.x}
                y={playerDashOffset.y}
              >
                {compassImg && (
                  <Image image={compassImg} width={50} height={50} offsetX={25} offsetY={25} rotation={activeRotation} />
                )}
              </Group>
            </Group>
          </Layer>

          {/* Layer 2: Dynamic Units and Effects */}
          <Layer>
            {isCombat &&
              battleLog?.initialState.players
                .filter(
                  (p) =>
                    p.teamId !==
                      battleLog.initialState.players.find((player) => player.id === characterId)?.teamId &&
                    !deadEnemyIds.has(p.id),
                )
                .map((enemy) => {
                  const pos = enemyPositions.get(enemy.id);
                  if (!pos) return null;
                  const activeAttack = activeAttacks.find((a) => a.type === "ATTACK" && a.actorId === enemy.id);
                  const isAttacking = !!activeAttack;
                  const activeAttackId = activeAttack?.id;
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
                      targetX={width / 2}
                      targetY={height / 2}
                      activeAttackId={activeAttackId}
                    />
                  );
                })}

            {/* Attack Lines (Radar Pulse Style for Ranged, Slice Effect for Melee) */}
            {activeAttacks.map((attack) => {
              if (attack.type !== "ATTACK") return null;

              const actorPos = enemyPositions.get(attack.actorId);
              const targetPos = enemyPositions.get(attack.targetId);

              const x1 =
                attack.actorId === characterId ? width / 2 : actorPos ? getSafeCoords(actorPos).x : width / 2;
              const y1 =
                attack.actorId === characterId ? height / 2 : actorPos ? getSafeCoords(actorPos).y : height / 2;
              const x2 =
                attack.targetId === characterId ? width / 2 : targetPos ? getSafeCoords(targetPos).x : width / 2;
              const y2 =
                attack.targetId === characterId
                  ? height / 2
                  : targetPos
                    ? getSafeCoords(targetPos).y
                    : height / 2;

              // 무기 정보 조회 및 근접/원거리 타입 분류
              const attacker = battleLog?.initialState.players.find((p) => p.id === attack.actorId);
              const weapon = attacker?.weapons[attack.weaponIndex];
              const isRanged = weapon?.attackType === "RANGED";

              if (isRanged) {
                return <RadarAttackLine key={attack.id} points={[x1, y1, x2, y2]} />;
              } else {
                return <MeleeSlashEffect key={attack.id} x={x2} y={y2} />;
              }
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
    </div>
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
  const onCompleteRef = useRef(onComplete);

  // onComplete 참조 변화에 안전하도록 ref 업데이트
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!textRef.current) return;
    const node = textRef.current;

    // 텍스트 정중앙을 기준으로 scale과 트랙 애니메이션이 늘어나도록 offset 설정
    node.offsetX(node.width() / 2);
    node.offsetY(node.height() / 2);

    // 초기 상태 설정 (작은 상태에서 시작)
    node.scale({ x: 0.1, y: 0.1 });
    node.opacity(1);
    node.y(0); // 상대 Y좌표 초기화

    let tweenDown: Konva.Tween | null = null;

    // 1단계 트윈: 경쾌하게 위로 높이 솟구치며 확대
    const tweenUp = new Konva.Tween({
      node: node,
      duration: 0.2,         // 상승 속도를 더 스냅 있게 단축
      y: -40,                // 조금 더 높게 솟구침 (-40)
      scaleX: isCritical ? 1.6 : 1.2,
      scaleY: isCritical ? 1.6 : 1.2,
      easing: Konva.Easings.EaseOut,
      onFinish: () => {
        // [중요 최적화]: tweenDown을 1단계가 완료된 시점에 동적으로 생성하여 플레이합니다.
        // Konva.Tween은 생성되는 시점의 노드 상태를 '시작값'으로 고정 캐싱하므로,
        // 이 시점에 생성해야 확대된 크기(1.2~1.6)와 Y좌표(-40)가 정상적으로 2단계의 시작점으로 인식됩니다.
        if (!node) return;
        tweenDown = new Konva.Tween({
          node: node,
          duration: 0.6,
          y: -20,                // 고점(-40)에서 아래로 살짝 낙하 (-20)
          scaleX: 0.2,           // 확대된 상태에서 0.2로 자연스럽게 축소
          scaleY: 0.2,
          opacity: 0,
          easing: Konva.Easings.EaseIn,
          onFinish: () => {
            onCompleteRef.current(id);
          },
        });
        tweenDown.play();
      },
    });

    tweenUp.play();

    return () => {
      tweenUp.destroy();
      if (tweenDown) {
        tweenDown.destroy();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
