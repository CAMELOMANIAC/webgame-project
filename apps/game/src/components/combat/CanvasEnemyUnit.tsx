import { Container, Graphics, Sprite, Text, TextStyle, Ticker } from "pixi.js";
import { useEffect, useRef, useState } from "react";

import { usePixiParent } from "@/utils/pixiContext";
import { getGlowingDotTexture } from "@/utils/pixiTextures";
import { Easings, runTween, type TweenHandle } from "@/utils/pixiTween";

interface CanvasEnemyUnitProps {
  name: string;
  x: number;
  y: number;
  spawnX: number;
  spawnY: number;
  isAttacking: boolean;
  isDamaged: boolean;
  targetX?: number;
  targetY?: number;
  activeAttackId?: string;
}

const CanvasEnemyUnit = ({
  name,
  x,
  y,
  spawnX,
  spawnY,
  isAttacking,
  isDamaged,
  targetX,
  targetY,
  activeAttackId,
}: CanvasEnemyUnitProps) => {
  const parent = usePixiParent();
  const rootGroupRef = useRef<Container | null>(null);
  const innerGroupRef = useRef<Container | null>(null);
  const labelGroupRef = useRef<Container | null>(null);
  const tagBgRef = useRef<Graphics | null>(null);
  const nameTextRef = useRef<Text | null>(null);

  const [isIntroFinished, setIsIntroFinished] = useState(false);
  const lastAttackIdRef = useRef<string | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. Pixi 컨테이너 및 기본 노드 생성/마운트
  useEffect(() => {
    if (!parent || parent.destroyed) return;

    const rootGroup = new Container();
    rootGroup.position.set(spawnX, spawnY);
    rootGroup.alpha = 0;

    const innerGroup = new Container();
    rootGroup.addChild(innerGroup);

    const { texture, logicalSize } = getGlowingDotTexture({
      radius: 5,
      fill: "#ff716c",
      shadowColor: "#ff716c",
      shadowBlur: 8,
      shadowAlpha: 0.9,
    });

    const dotSprite = new Sprite(texture);
    dotSprite.anchor.set(0.5);
    dotSprite.width = logicalSize;
    dotSprite.height = logicalSize;
    innerGroup.addChild(dotSprite);

    const labelGroup = new Container();
    labelGroup.y = 15;

    const tagBg = new Graphics();
    const textStyle = new TextStyle({
      fontFamily: "Inter, sans-serif",
      fontSize: 8,
      fill: "#ff716c",
      fontWeight: "300",
    });
    const nameText = new Text({
      text: name,
      style: textStyle,
      resolution: 2,
    });
    const padding = 4;
    nameText.position.set(padding, padding);

    const tagWidth = nameText.width + padding * 2;
    const tagHeight = nameText.height + padding * 2;
    tagBg.rect(0, 0, tagWidth, tagHeight).fill({ color: 0x000000 });
    labelGroup.pivot.set(tagWidth / 2, 0);

    labelGroup.addChild(tagBg);
    labelGroup.addChild(nameText);
    innerGroup.addChild(labelGroup);

    parent.addChild(rootGroup);

    rootGroupRef.current = rootGroup;
    innerGroupRef.current = innerGroup;
    labelGroupRef.current = labelGroup;
    tagBgRef.current = tagBg;
    nameTextRef.current = nameText;

    return () => {
      rootGroupRef.current = null;
      innerGroupRef.current = null;
      labelGroupRef.current = null;
      tagBgRef.current = null;
      nameTextRef.current = null;
      if (!rootGroup.destroyed) {
        rootGroup.destroy({ children: true, texture: false });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parent]);

  // 2. 이름 변경 시 라벨 텍스트 및 배경 박스 갱신
  useEffect(() => {
    const labelGroup = labelGroupRef.current;
    const tagBg = tagBgRef.current;
    const nameText = nameTextRef.current;
    if (!labelGroup || !tagBg || !nameText || labelGroup.destroyed) return;

    const padding = 4;
    nameText.text = name;
    const tagWidth = nameText.width + padding * 2;
    const tagHeight = nameText.height + padding * 2;
    tagBg.clear();
    tagBg.rect(0, 0, tagWidth, tagHeight).fill({ color: 0x000000 });
    labelGroup.pivot.set(tagWidth / 2, 0);
  }, [name]);

  // 3. 스폰 인트로 트윈 애니메이션
  useEffect(() => {
    const rootGroup = rootGroupRef.current;
    if (!rootGroup || rootGroup.destroyed) return;

    rootGroup.position.set(spawnX, spawnY);
    rootGroup.alpha = 0;

    const tween = runTween({
      duration: 1.2,
      easing: Easings.EaseOut,
      onUpdate: (p) => {
        if (rootGroup.destroyed) return;
        rootGroup.position.set(
          spawnX + (x - spawnX) * p,
          spawnY + (y - spawnY) * p,
        );
        rootGroup.alpha = p;
      },
      onFinish: () => {
        if (!rootGroup.destroyed) {
          rootGroup.position.set(x, y);
          rootGroup.alpha = 1;
          setIsIntroFinished(true);
        }
      },
    });

    return () => {
      tween.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parent, x, y]);

  // 4. 대기(Idle) 중일 때 제자리에서 미세하게 둥실둥실 배회하는 애니메이션 루프
  useEffect(() => {
    const rootGroup = rootGroupRef.current;
    if (!isIntroFinished || isAttacking || !rootGroup || rootGroup.destroyed) {
      return;
    }

    const randomPhaseX = Math.random() * 100;
    const randomPhaseY = Math.random() * 100;
    const speed = 1.0 + Math.random() * 1.5;
    const amplitude = 3 + Math.random() * 3;
    const startTime = performance.now();

    const tick = () => {
      if (!rootGroupRef.current || rootGroupRef.current.destroyed) return;
      const timeSec = (performance.now() - startTime) / 1000;
      const offsetX = Math.sin(timeSec * speed + randomPhaseX) * amplitude;
      const offsetY = Math.cos(timeSec * speed * 0.8 + randomPhaseY) * amplitude;

      rootGroupRef.current.position.set(x + offsetX, y + offsetY);
    };

    Ticker.shared.add(tick);

    return () => {
      Ticker.shared.remove(tick);
      if (rootGroupRef.current && !rootGroupRef.current.destroyed) {
        rootGroupRef.current.position.set(x, y);
      }
    };
  }, [isIntroFinished, isAttacking, x, y]);

  // 5. 컴포넌트 언마운트 시 애니메이션 프레임 및 타이머 취소
  useEffect(() => {
    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current);
      }
    };
  }, []);

  // 6. isAttacking 이 true가 되는 순간 내부 위치를 (x, y)로 명시 리셋
  useEffect(() => {
    if (isAttacking && rootGroupRef.current && !rootGroupRef.current.destroyed) {
      rootGroupRef.current.position.set(x, y);
    }
  }, [isAttacking, x, y]);

  // 7. RAF(Phase1·3) + setTimeout(Phase2) 기반의 결정론적 돌진-멈춤-복귀 애니메이션
  useEffect(() => {
    if (
      !activeAttackId ||
      activeAttackId === lastAttackIdRef.current ||
      targetX === undefined ||
      targetY === undefined
    ) {
      return;
    }
    lastAttackIdRef.current = activeAttackId;

    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
    }
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
    }

    const dx = targetX - x;
    const dy = targetY - y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance === 0) return;

    const ux = dx / distance;
    const uy = dy / distance;

    // 대상을 덮지 않도록 45px 앞에 도달
    const dashX = dx - ux * 45;
    const dashY = dy - uy * 45;

    const dashDuration = 250; // 돌격 시간 (0.25초)
    const pauseDuration = 300; // 타격 접점 대기 시간 (0.3초)
    const returnDuration = 350; // 제자리 복귀 시간 (0.35초)

    const setDashPos = (ox: number, oy: number) => {
      if (innerGroupRef.current && !innerGroupRef.current.destroyed) {
        innerGroupRef.current.position.set(ox, oy);
      }
    };

    // Phase 3: 제자리 슬라이딩 복귀 (Ease-Out) — RAF 루프
    const startReturn = () => {
      const returnStart = performance.now();
      const tickReturn = (now: number) => {
        const t = Math.min((now - returnStart) / returnDuration, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        setDashPos(dashX * (1 - ease), dashY * (1 - ease));
        if (t < 1) {
          animFrameIdRef.current = requestAnimationFrame(tickReturn);
        } else {
          setDashPos(0, 0);
          animFrameIdRef.current = null;
        }
      };
      animFrameIdRef.current = requestAnimationFrame(tickReturn);
    };

    // Phase 2: 타격 지점 대기
    const startPause = () => {
      setDashPos(dashX, dashY);
      pauseTimerRef.current = setTimeout(() => {
        pauseTimerRef.current = null;
        startReturn();
      }, pauseDuration);
    };

    // Phase 1: 돌격 (Quintic Ease-In)
    const dashStart = performance.now();
    const tickDash = (now: number) => {
      const t = Math.min((now - dashStart) / dashDuration, 1);
      const ease = Math.pow(t, 5);
      setDashPos(dashX * ease, dashY * ease);
      if (t < 1) {
        animFrameIdRef.current = requestAnimationFrame(tickDash);
      } else {
        animFrameIdRef.current = null;
        startPause();
      }
    };

    animFrameIdRef.current = requestAnimationFrame(tickDash);
  }, [activeAttackId, x, y, targetX, targetY]);

  // 8. 피격 시 미세한 피격 쉐이크
  useEffect(() => {
    const rootGroup = rootGroupRef.current;
    if (!isDamaged || !rootGroup || rootGroup.destroyed) return;

    const baseX = rootGroup.x;
    const tweens: TweenHandle[] = [];

    const t1 = runTween({
      duration: 0.04,
      onUpdate: (p) => {
        if (!rootGroup.destroyed) {
          rootGroup.x = baseX - 4 * p;
        }
      },
      onFinish: () => {
        if (rootGroup.destroyed) return;
        const startX2 = rootGroup.x;
        const targetX2 = baseX + 6;
        const t2 = runTween({
          duration: 0.04,
          onUpdate: (p) => {
            if (!rootGroup.destroyed) {
              rootGroup.x = startX2 + (targetX2 - startX2) * p;
            }
          },
          onFinish: () => {
            if (rootGroup.destroyed) return;
            const startX3 = rootGroup.x;
            const t3 = runTween({
              duration: 0.04,
              easing: Easings.ElasticEaseOut,
              onUpdate: (p) => {
                if (!rootGroup.destroyed) {
                  rootGroup.x = startX3 + (baseX - startX3) * p;
                }
              },
            });
            tweens.push(t3);
          },
        });
        tweens.push(t2);
      },
    });
    tweens.push(t1);

    return () => {
      tweens.forEach((t) => t.destroy());
    };
  }, [isDamaged, x, y]);

  return null;
};

export default CanvasEnemyUnit;
