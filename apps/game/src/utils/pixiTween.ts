import { Ticker } from "pixi.js";

export type EasingFunction = (t: number) => number;

export const Easings = {
  Linear: (t: number): number => t,
  EaseIn: (t: number): number => t * t * t,
  EaseOut: (t: number): number => 1 - Math.pow(1 - t, 3),
  EaseInOut: (t: number): number =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  ElasticEaseOut: (t: number): number => {
    if (t === 0 || t === 1) return t;
    const c4 = (2 * Math.PI) / 3;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
} as const;

export interface TweenOptions {
  duration: number; // 초 단위 (Konva.Tween과 동일하게 seconds 기준)
  easing?: EasingFunction;
  onUpdate?: (progress: number) => void;
  onFinish?: () => void;
}

export interface TweenHandle {
  destroy: () => void;
}

/**
 * PixiJS Ticker 기반의 경량 트윈 헬퍼.
 * duration은 기존 Konva.Tween과 호환되도록 초(seconds) 단위를 사용합니다.
 */
export function runTween(options: TweenOptions): TweenHandle {
  const {
    duration,
    easing = Easings.Linear,
    onUpdate,
    onFinish,
  } = options;

  const durationMs = Math.max(1, duration * 1000);
  const startTime = performance.now();
  let destroyed = false;

  const tick = () => {
    if (destroyed) return;
    const elapsed = performance.now() - startTime;
    const rawProgress = Math.min(1, Math.max(0, elapsed / durationMs));
    const easedProgress = easing(rawProgress);

    onUpdate?.(easedProgress);

    if (rawProgress >= 1) {
      destroyed = true;
      Ticker.shared.remove(tick);
      onFinish?.();
    }
  };

  Ticker.shared.add(tick);

  return {
    destroy: () => {
      if (!destroyed) {
        destroyed = true;
        Ticker.shared.remove(tick);
      }
    },
  };
}
