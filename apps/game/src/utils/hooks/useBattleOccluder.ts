import { useSetAtom } from "jotai";
import { useCallback } from "react";

import { type BattleOccluderEdge, battleOccludersAtom } from "@/atoms/battleLayoutAtom";

// 전투 캔버스를 가리는 HUD 요소에 붙이는 callback ref
export function useBattleOccluder(edge: BattleOccluderEdge) {
  const setOccluders = useSetAtom(battleOccludersAtom);

  return useCallback(
    (element: HTMLElement | null) => {
      if (!element) return;
      setOccluders((prev) => [...prev, { element, edge }]);
      return () => {
        setOccluders((prev) => prev.filter((occluder) => occluder.element !== element));
      };
    },
    [edge, setOccluders],
  );
}
