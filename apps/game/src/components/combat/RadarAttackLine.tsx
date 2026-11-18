import { Container, Graphics, Sprite } from "pixi.js";
import { useEffect } from "react";

import { usePixiParent } from "@/utils/pixiContext";
import { getGlowingDotTexture } from "@/utils/pixiTextures";
import { Easings, runTween, type TweenHandle } from "@/utils/pixiTween";

interface RadarAttackLineProps {
  points: number[];
  variant?: "BURST" | "SNIPE";
}

const RadarAttackLine = ({ points, variant = "BURST" }: RadarAttackLineProps) => {
  const parent = usePixiParent();
  const [x1 = 0, y1 = 0, x2 = 0, y2 = 0] = points;
  const isSnipe = variant === "SNIPE";
  const bulletCount = isSnipe ? 1 : 3; // 발사할 투사체 개수
  const bulletDuration = isSnipe ? 0.08 : 0.15;

  useEffect(() => {
    if (!parent || parent.destroyed) return;

    const group = new Container();
    parent.addChild(group);

    const { texture, logicalSize } = getGlowingDotTexture({
      radius: isSnipe ? 3.5 : 2.5,
      fill: "#ff716c",
      shadowColor: "#ff716c",
      shadowBlur: 10,
      shadowAlpha: 1,
    });

    const tweens: TweenHandle[] = [];

    if (isSnipe) {
      // 조준선이 발사 직전 번쩍인 뒤 사라진다
      const aimLine = new Graphics();
      group.addChild(aimLine);
      tweens.push(
        runTween({
          duration: 0.35,
          easing: Easings.Linear,
          onUpdate: (progress) => {
            if (aimLine.destroyed) return;
            aimLine.clear();
            aimLine
              .moveTo(x1, y1)
              .lineTo(x2, y2)
              .stroke({ width: 1, color: 0xff716c, alpha: Math.max(0, 1 - progress) * 0.8 });
          },
          onFinish: () => {
            if (!aimLine.destroyed) aimLine.clear();
          },
        }),
      );
    }

    const bullets: Sprite[] = [];
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let index = 0; index < bulletCount; index++) {
      const bullet = new Sprite(texture);
      bullet.anchor.set(0.5);
      bullet.width = logicalSize;
      bullet.height = logicalSize;
      bullet.position.set(x1, y1);
      bullet.alpha = 0;
      group.addChild(bullet);
      bullets.push(bullet);

      const timer = setTimeout(() => {
        if (bullet.destroyed || group.destroyed) return;
        bullet.alpha = 1;

        const tween = runTween({
          duration: bulletDuration,
          easing: Easings.Linear,
          onUpdate: (progress) => {
            if (bullet.destroyed) return;
            bullet.position.set(
              x1 + (x2 - x1) * progress,
              y1 + (y2 - y1) * progress,
            );
          },
          onFinish: () => {
            if (!bullet.destroyed) {
              bullet.alpha = 0;
            }
          },
        });
        tweens.push(tween);
      }, isSnipe ? 250 : index * 60);

      timers.push(timer);
    }

    return () => {
      timers.forEach(clearTimeout);
      tweens.forEach((t) => t.destroy());
      if (!group.destroyed) {
        group.destroy({ children: true, texture: false });
      }
    };
  }, [parent, x1, y1, x2, y2, isSnipe, bulletCount, bulletDuration]);

  return null;
};

export default RadarAttackLine;
