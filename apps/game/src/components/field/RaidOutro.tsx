import { useAtomValue } from "jotai";

import { type RaidEndStatus, raidOutroAtom } from "@/atoms/raidAtom";
import MapGraphCanvas from "@/components/field/MapGraphCanvas";
import { useNavigateRaid } from "@/utils/hooks/useNavigateRaid";
import type { RaidOutroStage } from "@/utils/useRaidOutroSequence";

import * as styles from "./RaidOutro.css";

interface RaidOutroStageProps {
  result: RaidEndStatus;
  stage: RaidOutroStage;
  onSkip: () => void;
}

const noopTriggerCombat = () => undefined;

export function RaidOutroBackdrop({ result, stage, onSkip }: RaidOutroStageProps) {
  const navigateRaid = useNavigateRaid();
  const outro = useAtomValue(raidOutroAtom);
  const isDead = result === "DEAD";

  if (!outro) return null;

  return (
    <div className={styles.stage}>
      <div className={styles.map}>
        <MapGraphCanvas
          isCombat={false}
          navigateRaid={navigateRaid}
          triggerCombat={noopTriggerCombat}
        />
      </div>
      <div className={styles.fade({ visible: isDead && stage !== "hold" })} />
      {stage !== "panel" && (
        <button
          type="button"
          className={styles.skipLayer}
          onClick={onSkip}
          aria-label="연출 건너뛰기"
        />
      )}
    </div>
  );
}
