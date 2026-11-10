import { Graphics } from "pixi.js";
import { useEffect } from "react";

import { usePixiParent } from "@/utils/pixiContext";
import { Easings, runTween } from "@/utils/pixiTween";

interface MeleeSlashEffectProps {
  x: number;
  y: number;
}

const MeleeSlashEffect = ({ x, y }: MeleeSlashEffectProps) => {
  const parent = usePixiParent();

  useEffect(() => {
    if (!parent || parent.destroyed) return;

    const slashGraphics = new Graphics();
    slashGraphics.position.set(x, y);
    slashGraphics.angle = Math.random() * 20 - 10;
    parent.addChild(slashGraphics);

    const tween = runTween({
      duration: 0.25,
      easing: Easings.EaseOut,
      onUpdate: (progress) => {
        if (slashGraphics.destroyed) return;

        const alpha = Math.max(0, 1 - progress);
        const startX = -18;
        const startY = 18;
        const endX = startX + 36 * progress;
        const endY = startY - 36 * progress;

        slashGraphics.clear();

        // White outer slash stroke
        slashGraphics
          .moveTo(startX, startY)
          .lineTo(endX, endY)
          .stroke({
            width: 4,
            color: 0xffffff,
            alpha,
            cap: "round",
          });

        // Inner crimson core stroke
        slashGraphics
          .moveTo(startX, startY)
          .lineTo(endX, endY)
          .stroke({
            width: 1.5,
            color: 0xff716c,
            alpha,
            cap: "round",
          });
      },
      onFinish: () => {
        if (!slashGraphics.destroyed) {
          slashGraphics.clear();
        }
      },
    });

    return () => {
      tween.destroy();
      if (!slashGraphics.destroyed) {
        slashGraphics.destroy();
      }
    };
  }, [parent, x, y]);

  return null;
};

export default MeleeSlashEffect;
