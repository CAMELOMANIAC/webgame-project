import Konva from "konva";
import { useEffect, useRef } from "react";
import { Circle, Group } from "react-konva";

interface RadarAttackLineProps {
  points: number[];
}

const RadarAttackLine = ({ points }: RadarAttackLineProps) => {
  const [x1, y1, x2, y2] = points;
  const bulletCount = 3; // 발사할 투사체 개수
  const bulletRefs = useRef<(Konva.Circle | null)[]>([]);

  useEffect(() => {
    bulletRefs.current.forEach((bullet, index) => {
      if (bullet) {
        // 투사체 초기 위치 설정
        bullet.position({ x: x1, y: y1 });
        bullet.opacity(0);

        // 시차를 두고 발사 (staggered delay)
        setTimeout(() => {
          bullet.opacity(1);
          bullet.to({
            x: x2,
            y: y2,
            duration: 0.15, // 날아가는 속도
            easing: Konva.Easings.Linear,
            onFinish: () => {
              bullet.opacity(0);
            },
          });
        }, index * 60); // 각 발사체 사이의 간격 (60ms)
      }
    });
  }, [x1, y1, x2, y2]);

  return (
    <Group>
      {Array.from({ length: bulletCount }).map((_, i) => (
        <Circle
          key={i}
          ref={(el: Konva.Circle | null) => {
            bulletRefs.current[i] = el;
          }}
          radius={2.5}
          fill="#ff716c"
          shadowColor="#ff716c"
          shadowBlur={10}
          opacity={0}
        />
      ))}
    </Group>
  );
};

export default RadarAttackLine;

