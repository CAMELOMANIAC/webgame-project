import type { BattleEvent, BattleLog } from "@webgame/types";
import { useAtomValue, useSetAtom } from "jotai";
import { Application, Container, Sprite, Text, TextStyle } from "pixi.js";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";

import compass from "@/assets/compass.svg";
import { battleCenterAtom, battleOccludersAtom } from "@/atoms/battleLayoutAtom";
import { displayEventsAtom, processedEventsAtom } from "@/atoms/globalAtom";
import { playerRotationAtom } from "@/atoms/raidAtom";
import CanvasEnemyUnit from "@/components/combat/CanvasEnemyUnit";
import ImpactSparks from "@/components/combat/ImpactSparks";
import MeleeSlashEffect from "@/components/combat/MeleeSlashEffect";
import RadarAttackLine from "@/components/combat/RadarAttackLine";
import { type AttackEffectKind, resolveAttackEffect } from "@/utils/attackEffect";
import {
  type BattleRect,
  computeBattleLayout,
  type EnemyPlacement,
  resolveEnemyPixelPositions,
} from "@/utils/battleLayout";
import { MELEE_IMPACT_DELAY_SECONDS, runMeleeLunge } from "@/utils/meleeLunge";
import { PixiParentContext, usePixiParent } from "@/utils/pixiContext";
import { loadCompassTexture } from "@/utils/pixiTextures";
import { Easings, runTween, type TweenHandle } from "@/utils/pixiTween";

import * as styles from "./BattleCanvas.css";

interface BattleCanvasProps {
  isCombat: boolean;
  battleLog: BattleLog | null | undefined;
  enemyPositions: Map<string, EnemyPlacement>;
  characterId: string | undefined;
}

function isSameRect(a: BattleRect | null, b: BattleRect) {
  return (
    !!a && a.left === b.left && a.top === b.top && a.right === b.right && a.bottom === b.bottom
  );
}

const SHAKE_BY_EFFECT: Readonly<Record<AttackEffectKind, number>> = {
  SLASH: 5,
  BLUNT: 9,
  BURST: 3,
  SNIPE: 8,
};

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
  const playerLungeRef = useRef<TweenHandle | null>(null);
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

  // --- HUD(전투 로그, 하단 패널)에 가려지지 않는 안전 영역 측정 ---
  const occluders = useAtomValue(battleOccludersAtom);
  const [safeArea, setSafeArea] = useState<BattleRect | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const containerRect = container.getBoundingClientRect();
      let top = 0;
      let bottom = containerRect.height;

      for (const { element, edge } of occluders) {
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (edge === "top") {
          top = Math.max(top, rect.bottom - containerRect.top);
        } else {
          bottom = Math.min(bottom, rect.top - containerRect.top);
        }
      }

      const next = { left: 0, top, right: containerRect.width, bottom };
      setSafeArea((prev) => (isSameRect(prev, next) ? prev : next));
    };

    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(container);
    occluders.forEach(({ element }) => resizeObserver.observe(element));

    return () => {
      resizeObserver.disconnect();
    };
  }, [occluders]);

  const layout = useMemo(
    () => computeBattleLayout(width, height, safeArea),
    [width, height, safeArea],
  );
  const { center } = layout;
  const setBattleCenter = useSetAtom(battleCenterAtom);

  useEffect(() => {
    if (width <= 0 || height <= 0) return;
    setBattleCenter(center);
  }, [center, width, height, setBattleCenter]);

  useEffect(() => {
    return () => setBattleCenter(null);
  }, [setBattleCenter]);
  const enemyPixelPositions = useMemo(
    () => resolveEnemyPixelPositions(enemyPositions, layout),
    [enemyPositions, layout],
  );

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
          app.destroy({ removeView: true }, { children: true, texture: false });
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
        // The field and battle canvases share Pixi's global resource pools.
        app.destroy({ removeView: true }, { children: true, texture: false });
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
      playerRootGroupRef.current.position.set(center.x, center.y);
    }
  }, [width, height, center, pixiLayers]);

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

  const deadEnemyIds = useMemo(() => {
    const ids = new Set<string>();
    processedEvents.forEach((event) => {
      if (event.type === "DEATH") {
        ids.add(event.playerId);
      }
    });
    return ids;
  }, [processedEvents]);

  const summonedUnits = useMemo(() => {
    return processedEvents
      .filter((event): event is BattleEvent & { type: "SUMMON" } => event.type === "SUMMON")
      .map((event) => event.combatant);
  }, [processedEvents]);

  const summonPixelPositions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    const aliveSummons = summonedUnits.filter((s) => !deadEnemyIds.has(s.id));
    const total = aliveSummons.length;
    if (total === 0) return map;
    const radius = 68;
    aliveSummons.forEach((summon, idx) => {
      const angle = -Math.PI / 2 + (idx * Math.PI * 2) / total;
      map.set(summon.id, {
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius,
      });
    });
    return map;
  }, [summonedUnits, deadEnemyIds, center]);

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
      const enemyPos = enemyPixelPositions.get(firstAliveEnemy.id);
      if (enemyPos) {
        const dx = enemyPos.x - center.x;
        const dy = enemyPos.y - center.y;
        const angleRad = Math.atan2(dy, dx);
        return (angleRad * 180) / Math.PI + 90;
      }
    }

    return playerRotation;
  }, [battleLog, deadEnemyIds, enemyPixelPositions, characterId, center, playerRotation]);

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
    for (const attack of attackEvents) {
      const attacker =
        battleLog?.initialState.players.find((p) => p.id === attack.actorId) ??
        summonedUnits.find((u) => u.id === attack.actorId);
      const kind = resolveAttackEffect(attacker?.weapons[attack.weaponIndex]);
      const isPlayerActor = attack.actorId === characterId;
      const base = SHAKE_BY_EFFECT[kind];
      triggerShake(isPlayerActor ? base : Math.max(2, base * 0.5));
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

      if (damageEvents.some((e) => e.isCritical && e.targetId !== characterId)) {
        triggerShake(10);
      }

      const newPopups: DamagePopup[] = [];
      damageEvents.forEach((e) => {
        let posX = center.x;
        let posY = center.y;

        if (e.targetId !== characterId) {
          const pos =
            enemyPixelPositions.get(e.targetId) ??
            summonPixelPositions.get(e.targetId);
          if (pos) {
            posX = pos.x;
            posY = pos.y;
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
  }, [
    displayEvents,
    characterId,
    enemyPixelPositions,
    summonPixelPositions,
    center,
    triggerShake,
    battleLog,
    summonedUnits,
  ]);

  // 컴포넌트 언마운트 시 진행 중인 플레이어 공격 모션 취소
  useEffect(() => {
    return () => {
      playerLungeRef.current?.destroy();
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

      playerLungeRef.current?.destroy();

      const targetPos = enemyPixelPositions.get(activePlayerMeleeAttack.targetId);
      if (targetPos) {
        const dx = targetPos.x - center.x;
        const dy = targetPos.y - center.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
          const ux = dx / distance;
          const uy = dy / distance;

          playerLungeRef.current = runMeleeLunge({
            ux,
            uy,
            dashX: dx - ux * 45,
            dashY: dy - uy * 45,
            setOffset: (ox, oy) => {
              if (playerDashGroupRef.current && !playerDashGroupRef.current.destroyed) {
                playerDashGroupRef.current.position.set(ox, oy);
              }
            },
          });
        }
      }
    }
  }, [activeAttacks, characterId, enemyPixelPositions, center, width, height, isCombat, battleLog]);

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
                  const pos = enemyPixelPositions.get(enemy.id);
                  if (!pos) return null;
                  const activeAttack = activeAttacks.find(
                    (a) => a.type === "ATTACK" && a.actorId === enemy.id,
                  );
                  const activeEffectKind =
                    activeAttack?.type === "ATTACK"
                      ? resolveAttackEffect(enemy.weapons[activeAttack.weaponIndex])
                      : undefined;
                  const isMeleeAttack =
                    activeEffectKind !== undefined &&
                    activeEffectKind !== "BURST" &&
                    activeEffectKind !== "SNIPE";
                  const isAttacking = isMeleeAttack;
                  const activeAttackId = isMeleeAttack
                    ? activeAttack?.id
                    : undefined;
                  const isEnemyDamaged = displayEvents.some(
                    (e) => e.type === "DAMAGE" && e.targetId === enemy.id,
                  );

                  const pixelX = pos.x;
                  const pixelY = pos.y;

                  const dx = pixelX - center.x;
                  const dy = pixelY - center.y;
                  const dist = Math.sqrt(dx * dx + dy * dy);

                  let spawnX = pixelX;
                  let spawnY = -100;

                  if (dist > 0) {
                    const maxDim = Math.max(width, height);
                    spawnX = center.x + (dx / dist) * maxDim;
                    spawnY = center.y + (dy / dist) * maxDim;
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
                      targetX={center.x}
                      targetY={center.y}
                      activeAttackId={activeAttackId}
                    />
                  );
                })}

            {isCombat &&
              summonedUnits
                .filter((s) => !deadEnemyIds.has(s.id))
                .map((summon) => {
                  const pos = summonPixelPositions.get(summon.id);
                  if (!pos) return null;
                  const activeAttack = activeAttacks.find(
                    (a) => a.type === "ATTACK" && a.actorId === summon.id,
                  );
                  const activeEffectKind =
                    activeAttack?.type === "ATTACK"
                      ? resolveAttackEffect(summon.weapons[activeAttack.weaponIndex])
                      : undefined;
                  const isMeleeAttack =
                    activeEffectKind !== undefined &&
                    activeEffectKind !== "BURST" &&
                    activeEffectKind !== "SNIPE";
                  const isAttacking = isMeleeAttack;
                  const activeAttackId = isMeleeAttack
                    ? activeAttack?.id
                    : undefined;
                  const isSummonDamaged = displayEvents.some(
                    (e) => e.type === "DAMAGE" && e.targetId === summon.id,
                  );
                  const targetPos =
                    (activeAttack?.type === "ATTACK"
                      ? enemyPixelPositions.get(activeAttack.targetId)
                      : undefined) ?? center;

                  return (
                    <CanvasEnemyUnit
                      key={`summon-${summon.id}`}
                      name={summon.name}
                      x={pos.x}
                      y={pos.y}
                      spawnX={center.x}
                      spawnY={center.y}
                      isAttacking={isAttacking}
                      isDamaged={isSummonDamaged}
                      targetX={targetPos.x}
                      targetY={targetPos.y}
                      activeAttackId={activeAttackId}
                      tone="ally"
                    />
                  );
                })}

            {activeAttacks.map((attack) => {
              if (attack.type !== "ATTACK") return null;

              const resolvePoint = (id: string) =>
                id === characterId
                  ? center
                  : (enemyPixelPositions.get(id) ??
                    summonPixelPositions.get(id) ??
                    center);
              const actorPoint = resolvePoint(attack.actorId);
              const targetPoint = resolvePoint(attack.targetId);
              const x1 = actorPoint.x;
              const y1 = actorPoint.y;
              const x2 = targetPoint.x;
              const y2 = targetPoint.y;

              const attacker =
                battleLog?.initialState.players.find(
                  (p) => p.id === attack.actorId,
                ) ?? summonedUnits.find((s) => s.id === attack.actorId);
              const weapon = attacker?.weapons[attack.weaponIndex];
              const effectKind = resolveAttackEffect(weapon);

              const direction = Math.atan2(y2 - y1, x2 - x1);

              if (effectKind === "BURST" || effectKind === "SNIPE") {
                const hitDelay = effectKind === "SNIPE" ? 0.33 : 0.2;
                return (
                  <Fragment key={attack.id}>
                    <RadarAttackLine points={[x1, y1, x2, y2]} variant={effectKind} />
                    <ImpactSparks
                      x={x1 + Math.cos(direction) * 14}
                      y={y1 + Math.sin(direction) * 14}
                      variant="MUZZLE"
                      direction={direction}
                      delay={effectKind === "SNIPE" ? 0.25 : 0}
                    />
                    <ImpactSparks
                      x={x2}
                      y={y2}
                      variant={effectKind}
                      direction={direction}
                      delay={hitDelay}
                    />
                  </Fragment>
                );
              }
              return (
                <Fragment key={attack.id}>
                  <MeleeSlashEffect
                    x={x2}
                    y={y2}
                    variant={effectKind}
                    delay={MELEE_IMPACT_DELAY_SECONDS}
                  />
                  <ImpactSparks
                    x={x2}
                    y={y2}
                    variant={effectKind}
                    direction={direction}
                    delay={MELEE_IMPACT_DELAY_SECONDS}
                  />
                </Fragment>
              );
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
