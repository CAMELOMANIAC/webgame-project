import { Container, Graphics, Sprite, Text, TextStyle, Ticker } from "pixi.js";
import { useEffect, useRef, useState } from "react";

import { runMeleeLunge } from "@/utils/meleeLunge";
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
  tone?: "enemy" | "ally";
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
  tone = "enemy",
}: CanvasEnemyUnitProps) => {
  const parent = usePixiParent();
  const rootGroupRef = useRef<Container | null>(null);
  const hitGroupRef = useRef<Container | null>(null);
  const innerGroupRef = useRef<Container | null>(null);
  const flashRef = useRef<Graphics | null>(null);
  const labelGroupRef = useRef<Container | null>(null);
  const tagBgRef = useRef<Graphics | null>(null);
  const nameTextRef = useRef<Text | null>(null);

  const [isIntroFinished, setIsIntroFinished] = useState(false);
  const lastAttackIdRef = useRef<string | null>(null);
  const lungeRef = useRef<TweenHandle | null>(null);
  const hitTweenRef = useRef<TweenHandle | null>(null);

  // 1. Pixi 컨테이너 및 기본 노드 생성/마운트
  useEffect(() => {
    if (!parent || parent.destroyed) return;

    const rootGroup = new Container();
    rootGroup.position.set(spawnX, spawnY);
    rootGroup.alpha = 0;

    const hitGroup = new Container();
    rootGroup.addChild(hitGroup);

    const innerGroup = new Container();
    hitGroup.addChild(innerGroup);

    const unitColor = tone === "ally" ? "#fafafa" : "#ff716c";

    const { texture, logicalSize } = getGlowingDotTexture({
      radius: 5,
      fill: unitColor,
      shadowColor: unitColor,
      shadowBlur: 8,
      shadowAlpha: 0.9,
    });

    const dotSprite = new Sprite(texture);
    dotSprite.anchor.set(0.5);
    dotSprite.width = logicalSize;
    dotSprite.height = logicalSize;
    innerGroup.addChild(dotSprite);

    const flash = new Graphics();
    flash.alpha = 0;
    innerGroup.addChild(flash);

    const labelGroup = new Container();
    labelGroup.y = 15;

    const tagBg = new Graphics();
    const textStyle = new TextStyle({
      fontFamily: "Inter, sans-serif",
      fontSize: 8,
      fill: unitColor,
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
    hitGroupRef.current = hitGroup;
    innerGroupRef.current = innerGroup;
    flashRef.current = flash;
    labelGroupRef.current = labelGroup;
    tagBgRef.current = tagBg;
    nameTextRef.current = nameText;

    return () => {
      rootGroupRef.current = null;
      hitGroupRef.current = null;
      innerGroupRef.current = null;
      flashRef.current = null;
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

  // 5. 컴포넌트 언마운트 시 진행 중인 공격 모션 취소
  useEffect(() => {
    return () => {
      lungeRef.current?.destroy();
    };
  }, []);

  // 6. isAttacking 이 true가 되는 순간 내부 위치를 (x, y)로 명시 리셋
  useEffect(() => {
    if (isAttacking && rootGroupRef.current && !rootGroupRef.current.destroyed) {
      rootGroupRef.current.position.set(x, y);
    }
  }, [isAttacking, x, y]);

  // 7. 윈드업 → 돌진 → 정지 → 복귀 공격 모션
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
    lungeRef.current?.destroy();

    const dx = targetX - x;
    const dy = targetY - y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance === 0) return;

    const ux = dx / distance;
    const uy = dy / distance;

    // 대상을 덮지 않도록 45px 앞에 도달
    lungeRef.current = runMeleeLunge({
      ux,
      uy,
      dashX: dx - ux * 45,
      dashY: dy - uy * 45,
      setOffset: (ox, oy) => {
        if (innerGroupRef.current && !innerGroupRef.current.destroyed) {
          innerGroupRef.current.position.set(ox, oy);
        }
      },
    });
  }, [activeAttackId, x, y, targetX, targetY]);

  // 8. 피격 반응: 흰색 플래시 + 스케일 펀치 + 공격 반대 방향 넉백
  useEffect(() => {
    const hitGroup = hitGroupRef.current;
    const flash = flashRef.current;
    if (!isDamaged || !hitGroup || !flash || hitGroup.destroyed || flash.destroyed) return;

    // 적은 피격 시 중심(targetX, targetY)에서 멀어지는 방향으로 밀려난다
    const awayX = targetX === undefined ? 0 : x - targetX;
    const awayY = targetY === undefined ? -1 : y - targetY;
    const awayLength = Math.hypot(awayX, awayY) || 1;
    const knockX = (awayX / awayLength) * 9;
    const knockY = (awayY / awayLength) * 9;

    flash.clear();
    flash.circle(0, 0, 9).fill({ color: 0xffffff });

    hitTweenRef.current?.destroy();
    hitTweenRef.current = runTween({
      duration: 0.28,
      onUpdate: (p) => {
        if (hitGroup.destroyed || flash.destroyed) return;

        // 플래시: 첫 40% 동안 선형 감쇠
        flash.alpha = Math.max(0, 1 - p / 0.4);

        // 스케일 펀치: 빠르게 커졌다가 탄성 복귀
        const punch = p < 0.2 ? p / 0.2 : 1 - Easings.EaseOut((p - 0.2) / 0.8);
        hitGroup.scale.set(1 + 0.4 * punch);

        // 넉백: 순간적으로 밀려난 뒤 제자리로 탄성 복귀
        const knock = p < 0.15 ? p / 0.15 : 1 - Easings.ElasticEaseOut((p - 0.15) / 0.85);
        hitGroup.position.set(knockX * knock, knockY * knock);
      },
      onFinish: () => {
        if (hitGroup.destroyed || flash.destroyed) return;
        flash.alpha = 0;
        hitGroup.scale.set(1);
        hitGroup.position.set(0, 0);
      },
    });

  }, [isDamaged, x, y, targetX, targetY]);

  // 피격 모션은 isDamaged가 먼저 꺼져도 끝까지 재생하고, 언마운트 시에만 취소
  useEffect(() => {
    return () => {
      hitTweenRef.current?.destroy();
    };
  }, []);

  return null;
};

export default CanvasEnemyUnit;
