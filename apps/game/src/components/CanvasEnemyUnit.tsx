import Konva from "konva";
import { useEffect, useRef } from "react";
import { Circle, Group, Label, Tag, Text } from "react-konva";

interface CanvasEnemyUnitProps {
  name: string;
  x: number;
  y: number;
  isAttacking: boolean;
}

const CanvasEnemyUnit = ({ name, x, y, isAttacking }: CanvasEnemyUnitProps) => {
  const groupRef = useRef<Konva.Group>(null);
  const labelRef = useRef<Konva.Label>(null);

  useEffect(() => {
    if (labelRef.current) {
      // 1. 라벨의 실제 렌더링된 너비를 가져옵니다.
      const width = labelRef.current.width();
      // 2. 너비의 절반만큼 offsetX를 주어 기준점을 가로 중앙으로 바꿉니다.
      labelRef.current.offsetX(width / 2);
    }
  }, [name]); // 이름이 바뀔 때마다 너비를 재계산합니다.

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
      <Label y={15} ref={labelRef}>
        <Tag fill="#000000" padding={4} />
        <Text text={name} fontSize={8} fill="#ff716c" align="center" verticalAlign="middle" fontStyle="300" />
      </Label>
    </Group>
  );
};

export default CanvasEnemyUnit;
