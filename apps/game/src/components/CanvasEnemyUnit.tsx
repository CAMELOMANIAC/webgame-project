import Konva from "konva";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Circle, Group, Label, Tag, Text } from "react-konva";

interface CanvasEnemyUnitProps {
  name: string;
  x: number;
  y: number;
  spawnX: number;
  spawnY: number;
  isAttacking: boolean;
}

const CanvasEnemyUnit = ({ name, x, y, spawnX, spawnY, isAttacking }: CanvasEnemyUnitProps) => {
  const groupRef = useRef<Konva.Group>(null);
  const labelRef = useRef<Konva.Label>(null);
  const [isIntroFinished, setIsIntroFinished] = useState(false);

  // 로컬 상태로 현재 리액트-콘바에 바인딩할 포지션과 투명도를 관리
  // 최초 렌더링 시에는 캔버스 바깥(spawnX, spawnY) 및 투명(opacity: 0) 상태로 시작합니다.
  const [renderState, setRenderState] = useState({
    x: spawnX,
    y: spawnY,
    opacity: 0,
  });

  useEffect(() => {
    if (labelRef.current) {
      // 1. 라벨의 실제 렌더링된 너비를 가져옵니다.
      const width = labelRef.current.width();
      // 2. 너비의 절반만큼 offsetX를 주어 기준점을 가로 중앙으로 바꿉니다.
      labelRef.current.offsetX(width / 2);
    }
  }, [name]); // 이름이 바뀔 때마다 너비를 재계산합니다.

  useLayoutEffect(() => {
    if (groupRef.current) {
      // 첫 프레임 페인팅 전, 메모리 상의 Konva 객체 위치와 투명도를 초기화
      groupRef.current.position({ x: spawnX, y: spawnY });
      groupRef.current.opacity(0);

      // 원래 목적지 (x, y)와 투명도 1로 활공 트윈을 실행합니다.
      groupRef.current.to({
        x: x,
        y: y,
        opacity: 1,
        duration: 1.2,
        easing: Konva.Easings.EaseOut,
        onFinish: () => {
          // 애니메이션이 완벽하게 끝난 시점에만 리액트 상태를 원래의 목적지 좌표로 동기화합니다.
          setRenderState({ x, y, opacity: 1 });
          setIsIntroFinished(true); // 등장 애니메이션 종료 기록
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [x, y]);

  // 대기(Idle) 중일 때 제자리에서 미세하게 둥실둥실 배회하는 애니메이션 루프
  useEffect(() => {
    if (!isIntroFinished || isAttacking || !groupRef.current) {
      return;
    }

    // 적 개체마다 다 다른 움직임 주기를 가지도록 난수화된 위상(Phase)과 반경 설정
    const randomPhaseX = Math.random() * 100;
    const randomPhaseY = Math.random() * 100;
    const speed = 1.0 + Math.random() * 1.5; // 느리고 자연스러운 진동 주기
    const amplitude = 3 + Math.random() * 3; // 3px ~ 6px 흔들림 반경

    const anim = new Konva.Animation((frame) => {
      if (!frame || !groupRef.current) return;

      const timeSec = frame.time / 1000;
      const offsetX = Math.sin(timeSec * speed + randomPhaseX) * amplitude;
      const offsetY = Math.cos(timeSec * speed * 0.8 + randomPhaseY) * amplitude;

      groupRef.current.x(x + offsetX);
      groupRef.current.y(y + offsetY);
    }, groupRef.current.getLayer());

    anim.start();

    const currentGroup = groupRef.current;

    return () => {
      anim.stop();
      // 배회가 종료되거나 공격 모드로 전환될 때 노드 좌표를 원래 (x, y) 정 위치로 되돌림
      if (currentGroup) {
        currentGroup.x(x);
        currentGroup.y(y);
      }
    };
  }, [isIntroFinished, isAttacking, x, y]);

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
    <Group x={renderState.x} y={renderState.y} opacity={renderState.opacity} ref={groupRef}>
      <Circle radius={5} fill="#ff716c" shadowColor="#ff716c" shadowBlur={8} shadowOpacity={0.9} />
      <Label y={15} ref={labelRef}>
        <Tag fill="#000000" padding={4} />
        <Text text={name} fontSize={8} fill="#ff716c" align="center" verticalAlign="middle" fontStyle="300" />
      </Label>
    </Group>
  );
};

export default CanvasEnemyUnit;
