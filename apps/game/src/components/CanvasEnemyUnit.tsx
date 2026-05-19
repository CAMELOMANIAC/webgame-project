import Konva from "konva";
import { useEffect, useRef } from "react";
import { Circle, Group, Text } from "react-konva";

interface CanvasEnemyUnitProps {
  name: string;
  x: number;
  y: number;
  isAttacking: boolean;
}

const CanvasEnemyUnit = ({ name, x, y, isAttacking }: CanvasEnemyUnitProps) => {
  const groupRef = useRef<Konva.Group>(null);

  useEffect(() => {
    if (isAttacking && groupRef.current) {
      // 플레이어 방향으로 다가오는 대신 제자리에서 흔들리는 효과로 변경
      groupRef.current.to({
        x: x - 2,
        duration: 0.05,
        onFinish: () => {
          groupRef.current?.to({
            x: x + 4,
            duration: 0.05,
            onFinish: () => {
              groupRef.current?.to({
                x: x,
                duration: 0.05,
                easing: Konva.Easings.ElasticEaseOut,
              });
            },
          });
        },
      });
    }
  }, [isAttacking, x, y]);

  return (
    <Group x={x} y={y} ref={groupRef}>
      <Circle radius={5} fill="#ff716c" shadowColor="#ff716c" shadowBlur={8} shadowOpacity={0.9} />
      <Text
        text={name}
        fontSize={8}
        fill="#ff716c"
        align="center"
        verticalAlign="middle"
        x={-50}
        y={15}
        width={100}
        fontStyle="300"
      />
    </Group>
  );
};

export default CanvasEnemyUnit;
