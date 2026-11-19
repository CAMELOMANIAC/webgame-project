import { useSetAtom } from "jotai";
import { useCallback, useEffect, useRef, useState } from "react";

import { raidOutroAtom } from "@/atoms/raidAtom";
import { OUTRO_HOLD_SECONDS, OUTRO_ZOOM_SECONDS } from "@/utils/raidOutro";

export type RaidOutroStage = "hold" | "zoom" | "panel";

/**
 * 제목 낙하 → 지도 줌아웃 → 결과 패널 순서의 종료 연출 단계를 진행한다.
 * active가 false이면 곧바로 panel 단계다.
 */
export function useRaidOutroSequence(active: boolean) {
  const setOutro = useSetAtom(raidOutroAtom);
  const [stage, setStage] = useState<RaidOutroStage>(active ? "hold" : "panel");
  const stageRef = useRef(stage);

  const update = useCallback((next: RaidOutroStage) => {
    stageRef.current = next;
    setStage(next);
  }, []);

  useEffect(() => {
    if (!active) return;
    const zoomTimer = setTimeout(() => {
      if (stageRef.current !== "hold") return;
      setOutro((outro) => (outro ? { ...outro, phase: "zoomOut" } : outro));
      update("zoom");
    }, OUTRO_HOLD_SECONDS * 1000);
    const panelTimer = setTimeout(
      () => {
        if (stageRef.current === "panel") return;
        update("panel");
      },
      (OUTRO_HOLD_SECONDS + OUTRO_ZOOM_SECONDS + 0.2) * 1000,
    );
    return () => {
      clearTimeout(zoomTimer);
      clearTimeout(panelTimer);
    };
  }, [active, setOutro, update]);

  const skip = useCallback(() => {
    if (stageRef.current === "panel") return;
    setOutro((outro) => (outro ? { ...outro, phase: "settled" } : outro));
    update("panel");
  }, [setOutro, update]);

  useEffect(() => {
    if (!active || stage === "panel") return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Enter" || event.key === " ") {
        skip();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [active, stage, skip]);

  return { stage, skip };
}
