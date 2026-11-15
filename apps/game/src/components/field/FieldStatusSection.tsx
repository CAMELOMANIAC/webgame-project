import { useDroppable } from "@dnd-kit/core";
import { useAtomValue } from "jotai";
import { RiDeleteBinLine } from "react-icons/ri";

import { battleLogAtom, processedEventsAtom } from "@/atoms/globalAtom";
import FieldCharacterInfo from "@/components/field/FieldCharacterInfo";
import { useGetCharacter } from "@/utils/hooks/useGetCharacter";

import * as styles from "./FieldStatusSection.css";

export const FIELD_DISCARD_DROP_ID = "field-discard-drop";

interface FieldStatusSectionProps {
  discardMode?: boolean;
}

const FieldStatusSection = ({ discardMode = false }: FieldStatusSectionProps) => {
  const { data } = useGetCharacter();
  const log = useAtomValue(battleLogAtom);
  const events = useAtomValue(processedEventsAtom);
  const { setNodeRef: setDiscardRef, isOver: isDiscardOver } = useDroppable({
    id: FIELD_DISCARD_DROP_ID,
    disabled: !discardMode,
  });
  const player = log?.initialState.players[0];
  let stamina = player?.stamina ?? data?.raw.stamina;
  for (const event of events)
    if (event.type === "STAMINA_CHANGE" && event.playerId === player?.id)
      stamina = event.currentStamina;
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
  return (
    <section className={styles.statusSection}>
      <div className={styles.primaryCol}>
        <FieldCharacterInfo />
      </div>
      <div className={styles.sideCol}>
        <div
          className={styles.compactWidget({ hidden: discardMode })}
          aria-hidden={discardMode}
        >
          <div className={styles.cellHeader}>
            <p className={styles.widgetLabel}>ENG</p>
            <span className={styles.metricDot({ tone: "positive" })} />
          </div>
          <p className={styles.capacityText}>
            {stamina ?? "—"} /{" "}
            {player?.maxStamina ?? data?.raw.maxStamina ?? "—"}
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
          <p className={styles.capacityText}>
            {player?.weight ?? weight ?? "—"} /{" "}
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
