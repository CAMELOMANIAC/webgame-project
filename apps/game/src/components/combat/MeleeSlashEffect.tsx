import Konva from "konva";
import { useEffect, useRef } from "react";
import { Shape } from "react-konva";

interface MeleeSlashEffectProps {
  x: number;
  y: number;
}

const MeleeSlashEffect = ({ x, y }: MeleeSlashEffectProps) => {
  const shapeRef = useRef<Konva.Shape | null>(null);

  useEffect(() => {
    const shape = shapeRef.current;
    if (!shape) return;

    // Reset initial animation properties
    shape.opacity(0);
    shape.setAttr("progress", 0);
    
    // Add small random angle offset to keep the slash feeling dynamic
    const randomOffset = Math.random() * 20 - 10;
    shape.rotation(randomOffset);

    // Play drawing crossed slash animation
    shape.opacity(1);
    shape.to({
      progress: 1, // Draw slashes sequentially
      opacity: 0,
      duration: 0.25,
      easing: Konva.Easings.EaseOut,
    });
  }, [x, y]);

  return (
    <Shape
      ref={shapeRef}
      x={x}
      y={y}
      sceneFunc={(context, shape) => {
        const progress = shape.getAttr("progress") ?? 0;
        
        // Single diagonal slash '/' (bottom-left to top-right)
        const startX = -18;
        const startY = 18;
        const endX = startX + 36 * progress;
        const endY = startY - 36 * progress;

        context.beginPath();
        context.moveTo(startX, startY);
        context.lineTo(endX, endY);
        context.lineWidth = 4;
        context.strokeStyle = "#ffffff";
        context.stroke();

        context.beginPath();
        context.moveTo(startX, startY);
        context.lineTo(endX, endY);
        context.lineWidth = 1.5;
        context.strokeStyle = "#ff716c";
        context.stroke();
      }}
      shadowColor="#ff716c"
      shadowBlur={15}
      opacity={0}
      listening={false}
    />
  );
};

export default MeleeSlashEffect;
