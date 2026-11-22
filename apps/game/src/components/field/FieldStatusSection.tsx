import { useDroppable } from "@dnd-kit/core";
import { useAtomValue } from "jotai";
import { RiDeleteBinLine } from "react-icons/ri";

import { battleLogAtom } from "@/atoms/globalAtom";
import {
  isCombatAtom,
  isNavigatingAtom,
  navigationProgressAtom,
  shortestPathAtom,
  targetBuildingIdAtom,
} from "@/atoms/raidAtom";
import { RollingNumber } from "@/components/common/RollingValue";
import FieldCharacterInfo from "@/components/field/FieldCharacterInfo";
import { useGetCharacter } from "@/utils/hooks/useGetCharacter";
import { estimateSpentFatigueAtProgress } from "@/utils/pathfinding";

import * as styles from "./FieldStatusSection.css";

export const FIELD_DISCARD_DROP_ID = "field-discard-drop";

interface FieldStatusSectionProps {
  discardMode?: boolean;
}

const FieldStatusSection = ({ discardMode = false }: FieldStatusSectionProps) => {
  const { data } = useGetCharacter();
  const log = useAtomValue(battleLogAtom);
  const isCombat = useAtomValue(isCombatAtom);
  const isNavigating = useAtomValue(isNavigatingAtom);
  const navigationProgress = useAtomValue(navigationProgressAtom);
  const shortestPath = useAtomValue(shortestPathAtom);
  const targetBuildingId = useAtomValue(targetBuildingIdAtom);
  const { setNodeRef: setDiscardRef, isOver: isDiscardOver } = useDroppable({
    id: FIELD_DISCARD_DROP_ID,
    disabled: !discardMode,
  });
  const player = log?.initialState.players[0];
  const baseFatigue = data?.raw.fatigue ?? player?.fatigue;
  const maxFatigue = data?.raw.maxFatigue ?? player?.maxFatigue;
  const optimisticSpentFatigue =
    isNavigating && !log
      ? estimateSpentFatigueAtProgress(
          shortestPath,
          navigationProgress,
          shortestPath.length === 1 && targetBuildingId !== null,
        )
      : 0;
  const fatigue =
    baseFatigue !== undefined
      ? Math.max(0, baseFatigue - optimisticSpentFatigue)
      : undefined;
  const isExhausted = fatigue !== undefined && fatigue <= 0;
  const weight = data
    ? data.raw.equipment.reduce(
        (sum, item) => sum + (item.weaponMaster?.weight ?? 0),
        0,
      ) +
      data.raw.inventory.reduce(
        (sum, item) => sum + (item.weaponMaster?.weight ?? 0) * item.quantity,
        0,
      )
    : undefined;
  const displayWeight = player?.weight ?? weight;
  return (
    <section className={styles.statusSection({ combat: isCombat })}>
      <div className={styles.primaryCol}>
        <FieldCharacterInfo />
      </div>
      <div
        className={styles.sideCol({ combat: isCombat })}
        aria-hidden={isCombat}
      >
        <div
          className={styles.compactWidget({ hidden: discardMode })}
          aria-hidden={discardMode}
        >
          <div className={styles.cellHeader}>
            <p className={styles.widgetLabel}>ENG</p>
            <span
              className={styles.metricDot({
                tone: isExhausted ? "negative" : "positive",
              })}
            />
          </div>
          <p
            className={styles.capacityText({
              tone: isExhausted ? "negative" : "default",
            })}
          >
            <RollingNumber value={fatigue} /> / {maxFatigue ?? "—"}
          </p>
        </div>
        <div
          className={styles.compactWidget({ hidden: discardMode })}
          aria-hidden={discardMode}
        >
          <div className={styles.cellHeader}>
            <p className={styles.widgetLabel}>WGT</p>
            <span className={styles.metricDot({ tone: "neutral" })} />
          </div>
          <p className={styles.capacityText()}>
            <RollingNumber value={displayWeight} /> /{" "}
            {player?.maxWeight ?? data?.raw.maxWeight ?? "—"} kg
          </p>
        </div>
        {discardMode && (
          <div
            ref={setDiscardRef}
            className={styles.discardWidget({ active: isDiscardOver })}
          >
            <RiDeleteBinLine size={20} aria-hidden="true" />
            <span className={styles.discardLabel}>아이템 버리기</span>
          </div>
        )}
      </div>
    </section>
  );
};

export default FieldStatusSection;
