import { Container, Sprite } from "pixi.js";
import { useEffect } from "react";

import { usePixiParent } from "@/utils/pixiContext";
import { getGlowingDotTexture } from "@/utils/pixiTextures";
import { Easings, runTween, type TweenHandle } from "@/utils/pixiTween";

interface RadarAttackLineProps {
  points: number[];
}

const RadarAttackLine = ({ points }: RadarAttackLineProps) => {
  const parent = usePixiParent();
  const [x1 = 0, y1 = 0, x2 = 0, y2 = 0] = points;
  const bulletCount = 3; // 발사할 투사체 개수

  useEffect(() => {
    if (!parent || parent.destroyed) return;

    const group = new Container();
    parent.addChild(group);

    const { texture, logicalSize } = getGlowingDotTexture({
      radius: 2.5,
      fill: "#ff716c",
      shadowColor: "#ff716c",
      shadowBlur: 10,
      shadowAlpha: 1,
    });

    const bullets: Sprite[] = [];
    const timers: ReturnType<typeof setTimeout>[] = [];
    const tweens: TweenHandle[] = [];

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
          duration: 0.15,
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
      }, index * 60);

      timers.push(timer);
    }

    return () => {
      timers.forEach(clearTimeout);
      tweens.forEach((t) => t.destroy());
      if (!group.destroyed) {
        group.destroy({ children: true, texture: false });
      }
    };
  }, [parent, x1, y1, x2, y2]);

  return null;
};

export default RadarAttackLine;
