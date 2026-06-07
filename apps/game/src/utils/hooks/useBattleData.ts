import type { BattleLog } from "@webgame/types";
import { useAtom, useSetAtom } from "jotai";
import { useCallback } from "react";

import { battleLogAtom, flattenedTimelineAtom } from "../../atoms/globalAtom";

export function useBattleData() {
  const [battleLog, setBattleLog] = useAtom(battleLogAtom);
  const setFlattenedTimeline = useSetAtom(flattenedTimelineAtom);

  const setBattleLogData = useCallback(
    (log: BattleLog | null) => {
      setBattleLog(log);
      if (log) {
        setFlattenedTimeline(
          log.timeline.flatMap((entry) =>
            entry.events.map((event) => ({ ...event, timestamp: entry.timestamp }))
          )
        );
      } else {
        setFlattenedTimeline([]);
      }
    },
    [setBattleLog, setFlattenedTimeline]
  );

  return { battleLog, setBattleLog: setBattleLogData };
}
