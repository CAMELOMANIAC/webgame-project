import { useAtomValue } from "jotai";

import { battleLogAtom, processedEventsAtom } from "@/atoms/globalAtom";
import FieldCharacterInfo from "@/components/field/FieldCharacterInfo";
import { useGetCharacter } from "@/utils/hooks/useGetCharacter";

import * as styles from "./FieldStatusSection.css";

const FieldStatusSection = () => {
  const { data } = useGetCharacter();
  const log = useAtomValue(battleLogAtom);
  const events = useAtomValue(processedEventsAtom);
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
        <div className={styles.compactWidget}>
          <div className={styles.cellHeader}>
            <p className={styles.widgetLabel}>ENERGY // 기력</p>
            <span className={styles.metricDot({ tone: "positive" })} />
          </div>
          <p className={styles.capacityText}>
            {stamina ?? "—"} /{" "}
            {player?.maxStamina ?? data?.raw.maxStamina ?? "—"}
          </p>
        </div>
        <div className={styles.compactWidget}>
          <div className={styles.cellHeader}>
            <p className={styles.widgetLabel}>WEIGHT // 중량</p>
            <span className={styles.metricDot({ tone: "neutral" })} />
          </div>
          <p className={styles.capacityText}>
            {player?.weight ?? weight ?? "—"} /{" "}
            {player?.maxWeight ?? data?.raw.maxWeight ?? "—"} kg
          </p>
        </div>
      </div>
    </section>
  );
};

export default FieldStatusSection;
