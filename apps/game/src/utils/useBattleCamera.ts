import type { Container } from "pixi.js";
import { useCallback, useEffect, useRef } from "react";

import {
  type CameraFocus,
  computeWorldTransform,
  IDENTITY_TRANSFORM,
  type Point,
  type WorldTransform,
} from "@/utils/battleCamera";
import { Easings, runTween, type TweenHandle } from "@/utils/pixiTween";

const FOCUS_SECONDS = 0.18;
const HOLD_MS = 450;
const RELEASE_SECONDS = 0.35;

interface BattleCameraViewport {
  width: number;
  height: number;
  /** 줌 중심이 되는 화면 좌표(HUD를 제외한 안전 영역 중심) */
  center: Point;
}

/**
 * Pixi world 컨테이너를 확대/이동하는 전투 카메라.
 * focusOn은 즉시 새 포커스로 이동하고, 일정 시간 새 포커스가 없으면 원래 시점으로 복귀한다.
 */
export function useBattleCamera(
  world: Container | null,
  viewport: BattleCameraViewport,
  onChange?: (transform: WorldTransform) => void,
) {
  const currentRef = useRef<WorldTransform>({ ...IDENTITY_TRANSFORM });
  const tweenRef = useRef<TweenHandle | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewportRef = useRef(viewport);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  const moveTo = useCallback(
    (target: WorldTransform, seconds: number, easing: (t: number) => number) => {
      if (!world || world.destroyed) return;
      tweenRef.current?.destroy();
      const from = { ...currentRef.current };
      tweenRef.current = runTween({
        duration: seconds,
        easing,
        onUpdate: (p) => {
          if (world.destroyed) return;
          const next = {
            scale: from.scale + (target.scale - from.scale) * p,
            x: from.x + (target.x - from.x) * p,
            y: from.y + (target.y - from.y) * p,
          };
          currentRef.current = next;
          world.scale.set(next.scale);
          world.position.set(next.x, next.y);
          onChangeRef.current?.(next);
        },
      });
    },
    [world],
  );

  const reset = useCallback(() => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = null;
    tweenRef.current?.destroy();
    currentRef.current = { ...IDENTITY_TRANSFORM };
    if (world && !world.destroyed) {
      world.scale.set(1);
      world.position.set(0, 0);
    }
    onChangeRef.current?.(IDENTITY_TRANSFORM);
  }, [world]);

  const focusOn = useCallback(
    (focus: CameraFocus) => {
      const { width, height, center } = viewportRef.current;
      if (width <= 0 || height <= 0) return;

      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      moveTo(
        computeWorldTransform(focus, center, { width, height }),
        FOCUS_SECONDS,
        Easings.EaseOut,
      );
      holdTimerRef.current = setTimeout(() => {
        holdTimerRef.current = null;
        moveTo(IDENTITY_TRANSFORM, RELEASE_SECONDS, Easings.EaseInOut);
      }, HOLD_MS);
    },
    [moveTo],
  );

  useEffect(() => reset, [reset]);

  return { focusOn, reset };
}
