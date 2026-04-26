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

  const revealBackLog = useCallback(
    async (encodedBackLog: string) => {
      try {
        const response = await fetch("http://localhost:3001/battle/reveal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ encodedBackLog }),
        });
        const data = await response.json();
        if (data.backLog && battleLog) {
          setBattleLogData({
            ...battleLog,
            timeline: [...battleLog.timeline, ...data.backLog],
          });
        }
      } catch (e) {
        console.error("Failed to reveal backlog:", e);
      }
    },
    [battleLog, setBattleLogData]
  );

  return { battleLog, setBattleLog: setBattleLogData, revealBackLog };
}
