import { Graphics } from "pixi.js";
import { useEffect } from "react";

import { usePixiParent } from "@/utils/pixiContext";
import { Easings, runTween, type TweenHandle } from "@/utils/pixiTween";

interface MeleeSlashEffectProps {
  x: number;
  y: number;
  variant?: "SLASH" | "BLUNT";
  /** 이펙트 시작 지연(초) */
  delay?: number;
}

const MeleeSlashEffect = ({ x, y, variant = "SLASH", delay = 0 }: MeleeSlashEffectProps) => {
  const parent = usePixiParent();

  useEffect(() => {
    if (!parent || parent.destroyed) return;

    const graphics = new Graphics();
    graphics.position.set(x, y);
    graphics.visible = false;
    parent.addChild(graphics);

    const isBlunt = variant === "BLUNT";
    if (!isBlunt) {
      graphics.angle = Math.random() * 20 - 10;
    }

    let tween: TweenHandle | null = null;
    const timer = setTimeout(() => {
      if (graphics.destroyed) return;
      graphics.visible = true;
      tween = runTween({
      duration: isBlunt ? 0.3 : 0.25,
      easing: Easings.EaseOut,
      onUpdate: (progress) => {
        if (graphics.destroyed) return;

        const alpha = Math.max(0, 1 - progress);
        graphics.clear();

        if (isBlunt) {
          // 타격: 충격파 링이 퍼지고 중심 플래시가 사라진다
          const radius = 6 + 20 * progress;
          graphics.circle(0, 0, radius).stroke({ width: 3, color: 0xffffff, alpha });
          graphics
            .circle(0, 0, radius * 0.6)
            .stroke({ width: 1.5, color: 0xff716c, alpha });
          graphics.circle(0, 0, 5 * (1 - progress)).fill({ color: 0xffffff, alpha });
          return;
        }

        const startX = -18;
        const startY = 18;
        const endX = startX + 36 * progress;
        const endY = startY - 36 * progress;

        // White outer slash stroke
        graphics
          .moveTo(startX, startY)
          .lineTo(endX, endY)
          .stroke({ width: 4, color: 0xffffff, alpha, cap: "round" });

        // Inner crimson core stroke
        graphics
          .moveTo(startX, startY)
          .lineTo(endX, endY)
          .stroke({ width: 1.5, color: 0xff716c, alpha, cap: "round" });
      },
      onFinish: () => {
        if (!graphics.destroyed) {
          graphics.clear();
        }
      },
      });
    }, delay * 1000);

    return () => {
      clearTimeout(timer);
      tween?.destroy();
      if (!graphics.destroyed) {
        graphics.destroy();
      }
    };
  }, [parent, x, y, variant, delay]);

  return null;
};

export default MeleeSlashEffect;
