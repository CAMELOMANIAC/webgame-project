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
  isDamaged: boolean;
  targetX?: number;
  targetY?: number;
  activeAttackId?: string;
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
}: CanvasEnemyUnitProps) => {
  const groupRef = useRef<Konva.Group>(null);
  const labelRef = useRef<Konva.Label>(null);
  const [isIntroFinished, setIsIntroFinished] = useState(false);
  const lastAttackIdRef = useRef<string | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // 리액트 상태로 돌격 오프셋을 관리하여 컴파일 및 렌더링 동기화 버그 원천 해결
  const [dashOffset, setDashOffset] = useState({ x: 0, y: 0 });

  // 로컬 상태로 현재 리액트-콘바에 바인딩할 포지션과 투명도를 관리
  const [renderState, setRenderState] = useState({
    x: spawnX,
    y: spawnY,
    opacity: 0,
  });

  useEffect(() => {
    if (labelRef.current) {
      const width = labelRef.current.width();
      labelRef.current.offsetX(width / 2);
    }
  }, [name]);

  useLayoutEffect(() => {
    if (groupRef.current) {
      groupRef.current.position({ x: spawnX, y: spawnY });
      groupRef.current.opacity(0);

      groupRef.current.to({
        x: x,
        y: y,
        opacity: 1,
        duration: 1.2,
        easing: Konva.Easings.EaseOut,
        onFinish: () => {
          setRenderState({ x, y, opacity: 1 });
          setIsIntroFinished(true);
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

    const randomPhaseX = Math.random() * 100;
    const randomPhaseY = Math.random() * 100;
    const speed = 1.0 + Math.random() * 1.5;
    const amplitude = 3 + Math.random() * 3;

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
      if (currentGroup) {
        currentGroup.x(x);
        currentGroup.y(y);
      }
    };
  }, [isIntroFinished, isAttacking, x, y]);

  // 컴포넌트 언마운트 시에만 애니메이션 프레임 및 타이머 취소
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current);
      }
    };
  }, []);

  // isAttacking 이 true가 되는 순간 Konva 내부 위치를 (x, y)로 명시 리셋
  // → Idle 애니메이션이 남긴 groupRef 내부 좌표 드리프트를 방지
  useEffect(() => {
    if (isAttacking && groupRef.current) {
      groupRef.current.x(x);
      groupRef.current.y(y);
    }
  }, [isAttacking, x, y]);

  // RAF(Phase1·3) + setTimeout(Phase2) 기반의 결정론적 돌진-멈춤-복귀 애니메이션
  useEffect(() => {
    if (!activeAttackId || activeAttackId === lastAttackIdRef.current || targetX === undefined || targetY === undefined) {
      return;
    }
    lastAttackIdRef.current = activeAttackId;

    // 이전 진행 중인 애니메이션 강제 중단
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
    }
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
    }

    const dx = targetX - x;
    const dy = targetY - y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance === 0) return;

    const ux = dx / distance;
    const uy = dy / distance;

    // 대상을 덮지 않도록 45px 앞에 도달
    const dashX = dx - ux * 45;
    const dashY = dy - uy * 45;

    const dashDuration = 250;  // 돌격 시간 (0.25초)
    const pauseDuration = 300; // 타격 접점 대기 시간 (0.3초)
    const returnDuration = 350; // 제자리 복귀 시간 (0.35초)

    // Phase 3: 제자리 슬라이딩 복귀 (Ease-Out) — RAF 루프
    const startReturn = () => {
      const returnStart = performance.now();
      const tickReturn = (now: number) => {
        const t = Math.min((now - returnStart) / returnDuration, 1);
        // Cubic Ease-Out: 빠르게 시작해서 부드럽게 정지
        const ease = 1 - Math.pow(1 - t, 3);
        setDashOffset({
          x: dashX * (1 - ease),
          y: dashY * (1 - ease),
        });
        if (t < 1) {
          animFrameIdRef.current = requestAnimationFrame(tickReturn);
        } else {
          setDashOffset({ x: 0, y: 0 });
          animFrameIdRef.current = null;
        }
      };
      animFrameIdRef.current = requestAnimationFrame(tickReturn);
    };

    // Phase 2: 타격 지점 대기 — setTimeout으로 RAF 루프 없이 처리
    const startPause = () => {
      setDashOffset({ x: dashX, y: dashY });
      pauseTimerRef.current = setTimeout(() => {
        pauseTimerRef.current = null;
        startReturn();
      }, pauseDuration);
    };

    // Phase 1: 돌격 (Quintic Ease-In: 느리게 시작 → 급가속) — RAF 루프
    const dashStart = performance.now();
    const tickDash = (now: number) => {
      const t = Math.min((now - dashStart) / dashDuration, 1);
      // Quintic Ease-In: t^5 → 처음엔 거의 움직이지 않다가 마지막에 급가속
      const ease = Math.pow(t, 5);
      setDashOffset({
        x: dashX * ease,
        y: dashY * ease,
      });
      if (t < 1) {
        animFrameIdRef.current = requestAnimationFrame(tickDash);
      } else {
        animFrameIdRef.current = null;
        startPause();
      }
    };

    animFrameIdRef.current = requestAnimationFrame(tickDash);
  }, [activeAttackId, x, y, targetX, targetY]);

  // 피격 시 미세한 피격 쉐이크
  useEffect(() => {
    if (isDamaged && groupRef.current) {
      const currentX = groupRef.current.x();
      groupRef.current.to({
        x: currentX - 4,
        duration: 0.04,
        onFinish: () => {
          groupRef.current?.to({
            x: currentX + 6,
            duration: 0.04,
            onFinish: () => {
              groupRef.current?.to({
                x: currentX,
                duration: 0.04,
                easing: Konva.Easings.ElasticEaseOut,
              });
            },
          });
        },
      });
    }
  }, [isDamaged, x, y]);

  return (
    <Group x={renderState.x} y={renderState.y} opacity={renderState.opacity} ref={groupRef}>
      <Group x={dashOffset.x} y={dashOffset.y}>
        <Circle radius={5} fill="#ff716c" shadowColor="#ff716c" shadowBlur={8} shadowOpacity={0.9} />
        <Label y={15} ref={labelRef}>
          <Tag fill="#000000" padding={4} />
          <Text text={name} fontSize={8} fill="#ff716c" align="center" verticalAlign="middle" fontStyle="300" />
        </Label>
      </Group>
    </Group>
  );
};

export default CanvasEnemyUnit;
