import { Easings, runTween, type TweenHandle } from "@/utils/pixiTween";

interface MeleeLungeOptions {
  /** 공격 방향 단위 벡터 */
  ux: number;
  uy: number;
  /** 타격 지점까지의 오프셋 */
  dashX: number;
  dashY: number;
  setOffset: (x: number, y: number) => void;
  /** 돌진이 끝나 타격이 닿는 순간 */
  onImpact?: () => void;
}

const WINDUP_DISTANCE = 12;
const WINDUP_SECONDS = 0.09;
const DASH_SECONDS = 0.14;
const HOLD_SECONDS = 0.08;
const RETURN_SECONDS = 0.3;

/** 근접 공격 총 소요 시간 중 타격에 닿기까지의 시간(초) */
export const MELEE_IMPACT_DELAY_SECONDS = WINDUP_SECONDS + DASH_SECONDS;

/**
 * 윈드업(뒤로 웅크림) → 돌진 → 짧은 정지(히트스톱) → 복귀 순서의 근접 공격 모션.
 * 반환된 핸들의 destroy()로 진행 중인 단계를 즉시 중단할 수 있습니다.
 */
export function runMeleeLunge({
  ux,
  uy,
  dashX,
  dashY,
  setOffset,
  onImpact,
}: MeleeLungeOptions): TweenHandle {
  const windX = -ux * WINDUP_DISTANCE;
  const windY = -uy * WINDUP_DISTANCE;
  let current: TweenHandle | null = null;
  let cancelled = false;

  const startReturn = () => {
    if (cancelled) return;
    current = runTween({
      duration: RETURN_SECONDS,
      easing: Easings.EaseOut,
      onUpdate: (p) => setOffset(dashX * (1 - p), dashY * (1 - p)),
      onFinish: () => setOffset(0, 0),
    });
  };

  const startHold = () => {
    if (cancelled) return;
    setOffset(dashX, dashY);
    onImpact?.();
    current = runTween({
      duration: HOLD_SECONDS,
      onFinish: startReturn,
    });
  };

  const startDash = () => {
    if (cancelled) return;
    current = runTween({
      duration: DASH_SECONDS,
      easing: Easings.EaseIn,
      onUpdate: (p) =>
        setOffset(windX + (dashX - windX) * p, windY + (dashY - windY) * p),
      onFinish: startHold,
    });
  };

  current = runTween({
    duration: WINDUP_SECONDS,
    easing: Easings.EaseOut,
    onUpdate: (p) => setOffset(windX * p, windY * p),
    onFinish: startDash,
  });

  return {
    destroy: () => {
      cancelled = true;
      current?.destroy();
    },
  };
}
