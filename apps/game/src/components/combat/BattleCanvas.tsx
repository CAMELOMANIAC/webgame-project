import type { BattleEvent, BattleLog } from "@webgame/types";
import { useAtomValue } from "jotai";
import { Application, Container, Sprite, Text, TextStyle } from "pixi.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import compass from "@/assets/compass.svg";
import { displayEventsAtom, processedEventsAtom } from "@/atoms/globalAtom";
import { playerRotationAtom } from "@/atoms/raidAtom";
import CanvasEnemyUnit from "@/components/combat/CanvasEnemyUnit";
import MeleeSlashEffect from "@/components/combat/MeleeSlashEffect";
import RadarAttackLine from "@/components/combat/RadarAttackLine";
import { PixiParentContext, usePixiParent } from "@/utils/pixiContext";
import { loadCompassTexture } from "@/utils/pixiTextures";
import { Easings, runTween, type TweenHandle } from "@/utils/pixiTween";

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
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const playerRootGroupRef = useRef<Container | null>(null);
  const playerDashGroupRef = useRef<Container | null>(null);
  const playerCompassSpriteRef = useRef<Sprite | null>(null);

  const [pixiLayers, setPixiLayers] = useState<{
    units: Container;
    popups: Container;
  } | null>(null);

  const lastAttackIdRef = useRef<string | null>(null);
  const playerAnimFrameIdRef = useRef<number | null>(null);
  const playerPauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const playerRotation = useAtomValue(playerRotationAtom);

  // --- Pixi Application 초기화 및 레이어 구성 ---
  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return;

    let disposed = false;
    let initialized = false;
    const app = new Application();

    void (async () => {
      try {
        await app.init({
          width: Math.max(1, containerRef.current?.clientWidth || 1),
          height: Math.max(1, containerRef.current?.clientHeight || 1),
          backgroundAlpha: 0,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        });
        initialized = true;

        if (disposed) {
          app.destroy(true, { children: true, texture: false });
          return;
        }

        host.appendChild(app.canvas);
        appRef.current = app;

        // Layer 1: Player Marker
        const playerRootGroup = new Container();
        const playerDashGroup = new Container();
        playerRootGroup.addChild(playerDashGroup);
        app.stage.addChild(playerRootGroup);

        playerRootGroupRef.current = playerRootGroup;
        playerDashGroupRef.current = playerDashGroup;

        // Layer 2: Dynamic Units & Effects
        const unitsLayer = new Container();
        app.stage.addChild(unitsLayer);

        // Layer 3: Floating Damage Popups
        const popupsLayer = new Container();
        app.stage.addChild(popupsLayer);

        // Load Compass Texture
        const compassTex = await loadCompassTexture(compass);
        if (disposed || playerDashGroup.destroyed) return;

        const compassSprite = new Sprite(compassTex);
        compassSprite.anchor.set(0.5);
        compassSprite.width = 50;
        compassSprite.height = 50;
        playerDashGroup.addChild(compassSprite);
        playerCompassSpriteRef.current = compassSprite;

        setPixiLayers({ units: unitsLayer, popups: popupsLayer });
      } catch (err) {
        console.error("[BattleCanvas] Failed to initialize Pixi Application:", err);
      }
    })();

    return () => {
      disposed = true;
      setPixiLayers(null);
      appRef.current = null;
      playerRootGroupRef.current = null;
      playerDashGroupRef.current = null;
      playerCompassSpriteRef.current = null;
      if (initialized) {
        app.destroy(true, { children: true, texture: false });
      }
    };
  }, []);

  // --- 뷰포트 크기 및 플레이어 중앙 좌표 갱신 ---
  useEffect(() => {
    if (width <= 0 || height <= 0) return;
    if (appRef.current?.renderer) {
      appRef.current.renderer.resize(width, height);
    }
    if (playerRootGroupRef.current && !playerRootGroupRef.current.destroyed) {
      playerRootGroupRef.current.position.set(width / 2, height / 2);
    }
  }, [width, height, pixiLayers]);

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
    const MIN_PIXEL_DIST = 100;

    return (pos: { x: number; y: number }) => {
      const safeLeft = 50;
      const safeRight = width - 50;
      const safeTop = 150;
      const safeBottom = height - 250;

      if (safeBottom <= safeTop || safeRight <= safeLeft) {
        return {
          x: (pos.x / 100) * width,
          y: (pos.y / 100) * height,
        };
      }

      let x = safeLeft + (pos.x / 100) * (safeRight - safeLeft);
      let y = safeTop + (pos.y / 100) * (safeBottom - safeTop);

      const cx = width / 2;
      const cy = height / 2;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0 && dist < MIN_PIXEL_DIST) {
        const scale = MIN_PIXEL_DIST / dist;
        x = cx + dx * scale;
        y = cy + dy * scale;

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

  // 플레이어 나침반 회전 동기화
  useEffect(() => {
    if (playerCompassSpriteRef.current && !playerCompassSpriteRef.current.destroyed) {
      playerCompassSpriteRef.current.angle = activeRotation;
    }
  }, [activeRotation, pixiLayers]);

  // --- Trigger Camera Shake ---
  const triggerShake = useCallback((intensity: number) => {
    const event = new CustomEvent("combat-shake", { detail: { intensity } });
    window.dispatchEvent(event);
  }, []);

  // --- Monitor DAMAGE and ATTACK events to trigger visuals ---
  useEffect(() => {
    const attackEvents = displayEvents.filter(
      (e): e is BattleEvent & { type: "ATTACK" } => e.type === "ATTACK",
    );
    if (attackEvents.length > 0) {
      const isPlayerActor = attackEvents.some((e) => e.actorId === characterId);
      if (isPlayerActor) {
        triggerShake(4);
      } else {
        triggerShake(2);
      }
    }

    const damageEvents = displayEvents.filter(
      (e): e is BattleEvent & { type: "DAMAGE" } => e.type === "DAMAGE",
    );
    if (damageEvents.length > 0) {
      const hasPlayerDamage = damageEvents.some((e) => e.targetId === characterId);
      if (hasPlayerDamage) {
        triggerShake(12);
        setShowRedFlash(true);

        if (redFlashTimerRef.current) {
          clearTimeout(redFlashTimerRef.current);
        }

        redFlashTimerRef.current = setTimeout(() => {
          setShowRedFlash(false);
          redFlashTimerRef.current = null;
        }, 180);
      }

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

        const offsetRandX = (Math.random() - 0.5) * 20;
        const offsetRandY = (Math.random() - 0.5) * 10;

        newPopups.push({
          id: `${e.id}-${Date.now()}-${Math.random()}`,
          x: posX + offsetRandX,
          y: posY - 25 + offsetRandY,
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

  // 플레이어 근접 공격 시 가속 돌진 및 슬라이딩 복귀 애니메이션 (Pixi Container 직접 제어)
  useEffect(() => {
    if (!isCombat || !characterId || width === 0 || height === 0) return;

    const activePlayerMeleeAttack = activeAttacks.find((attack) => {
      if (attack.actorId !== characterId) return false;
      const attacker = battleLog?.initialState.players.find((p) => p.id === characterId);
      const weapon = attacker?.weapons[attack.weaponIndex];
      return weapon?.attackType !== "RANGED";
    });

    if (activePlayerMeleeAttack && activePlayerMeleeAttack.id !== lastAttackIdRef.current) {
      lastAttackIdRef.current = activePlayerMeleeAttack.id;

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

          const dashX = dx - ux * 45;
          const dashY = dy - uy * 45;

          const dashDuration = 250;
          const pauseDuration = 300;
          const returnDuration = 350;

          const setDashOffset = (ox: number, oy: number) => {
            if (playerDashGroupRef.current && !playerDashGroupRef.current.destroyed) {
              playerDashGroupRef.current.position.set(ox, oy);
            }
          };

          const startReturn = () => {
            const returnStart = performance.now();
            const tickReturn = (now: number) => {
              const t = Math.min((now - returnStart) / returnDuration, 1);
              const ease = 1 - Math.pow(1 - t, 3);
              setDashOffset(dashX * (1 - ease), dashY * (1 - ease));
              if (t < 1) {
                playerAnimFrameIdRef.current = requestAnimationFrame(tickReturn);
              } else {
                setDashOffset(0, 0);
                playerAnimFrameIdRef.current = null;
              }
            };
            playerAnimFrameIdRef.current = requestAnimationFrame(tickReturn);
          };

          const startPause = () => {
            setDashOffset(dashX, dashY);
            playerPauseTimerRef.current = setTimeout(() => {
              playerPauseTimerRef.current = null;
              startReturn();
            }, pauseDuration);
          };

          const dashStart = performance.now();
          const tickDash = (now: number) => {
            const t = Math.min((now - dashStart) / dashDuration, 1);
            const ease = Math.pow(t, 5);
            setDashOffset(dashX * ease, dashY * ease);
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
      <div ref={canvasHostRef} style={{ width: "100%", height: "100%" }} />

      {pixiLayers && width > 0 && height > 0 && (
        <>
          <PixiParentContext.Provider value={pixiLayers.units}>
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
                  const activeAttack = activeAttacks.find(
                    (a) => a.type === "ATTACK" && a.actorId === enemy.id,
                  );
                  const isAttacking = !!activeAttack;
                  const activeAttackId = activeAttack?.id;
                  const isEnemyDamaged = displayEvents.some(
                    (e) => e.type === "DAMAGE" && e.targetId === enemy.id,
                  );

                  const safePos = getSafeCoords(pos);
                  const pixelX = safePos.x;
                  const pixelY = safePos.y;

                  const centerX = width / 2;
                  const centerY = height / 2;
                  const dx = pixelX - centerX;
                  const dy = pixelY - centerY;
                  const dist = Math.sqrt(dx * dx + dy * dy);

                  let spawnX = pixelX;
                  let spawnY = -100;

                  if (dist > 0) {
                    const maxDim = Math.max(width, height);
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

            {activeAttacks.map((attack) => {
              if (attack.type !== "ATTACK") return null;

              const actorPos = enemyPositions.get(attack.actorId);
              const targetPos = enemyPositions.get(attack.targetId);

              const x1 =
                attack.actorId === characterId
                  ? width / 2
                  : actorPos
                    ? getSafeCoords(actorPos).x
                    : width / 2;
              const y1 =
                attack.actorId === characterId
                  ? height / 2
                  : actorPos
                    ? getSafeCoords(actorPos).y
                    : height / 2;
              const x2 =
                attack.targetId === characterId
                  ? width / 2
                  : targetPos
                    ? getSafeCoords(targetPos).x
                    : width / 2;
              const y2 =
                attack.targetId === characterId
                  ? height / 2
                  : targetPos
                    ? getSafeCoords(targetPos).y
                    : height / 2;

              const attacker = battleLog?.initialState.players.find(
                (p) => p.id === attack.actorId,
              );
              const weapon = attacker?.weapons[attack.weaponIndex];
              const isRanged = weapon?.attackType === "RANGED";

              if (isRanged) {
                return <RadarAttackLine key={attack.id} points={[x1, y1, x2, y2]} />;
              } else {
                return <MeleeSlashEffect key={attack.id} x={x2} y={y2} />;
              }
            })}
          </PixiParentContext.Provider>

          <PixiParentContext.Provider value={pixiLayers.popups}>
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
          </PixiParentContext.Provider>
        </>
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

function CanvasDamagePopup({
  id,
  x,
  y,
  amount,
  isCritical,
  onComplete,
}: CanvasDamagePopupProps) {
  const parent = usePixiParent();
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!parent || parent.destroyed) return;

    const group = new Container();
    group.position.set(x, y);
    parent.addChild(group);

    const style = new TextStyle({
      fontFamily: "Inter, sans-serif",
      fontSize: isCritical ? 14 : 11,
      fontWeight: isCritical ? "800" : "600",
      fill: "#ffffff",
      stroke: isCritical ? { color: "#ff7162", width: 1 } : undefined,
      dropShadow: {
        color: "#000000",
        blur: 3,
        alpha: 0.8,
        distance: 1.4,
        angle: Math.PI / 4,
      },
      align: "center",
    });

    const textNode = new Text({
      text: isCritical ? `CRIT! -${amount}` : `-${amount}`,
      style,
      resolution: 2,
    });

    textNode.anchor.set(0.5);
    textNode.scale.set(0.1);
    textNode.alpha = 1;
    textNode.y = 0;
    group.addChild(textNode);

    const peakScale = isCritical ? 1.6 : 1.2;
    let tweenDown: TweenHandle | null = null;

    const tweenUp = runTween({
      duration: 0.2,
      easing: Easings.EaseOut,
      onUpdate: (p) => {
        if (textNode.destroyed) return;
        textNode.y = -40 * p;
        const s = 0.1 + (peakScale - 0.1) * p;
        textNode.scale.set(s);
      },
      onFinish: () => {
        if (textNode.destroyed) return;
        tweenDown = runTween({
          duration: 0.6,
          easing: Easings.EaseIn,
          onUpdate: (p) => {
            if (textNode.destroyed) return;
            textNode.y = -40 + 20 * p;
            const s = peakScale + (0.2 - peakScale) * p;
            textNode.scale.set(s);
            textNode.alpha = 1 - p;
          },
          onFinish: () => {
            onCompleteRef.current(id);
          },
        });
      },
    });

    return () => {
      tweenUp.destroy();
      if (tweenDown) {
        tweenDown.destroy();
      }
      if (!group.destroyed) {
        group.destroy({ children: true, texture: true });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parent, id]);

  return null;
}
