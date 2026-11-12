import { useAtomValue } from "jotai";
import { useMemo } from "react";

import { battleLogAtom, processedEventsAtom } from "@/atoms/globalAtom";
import { useGetCharacter } from "@/utils/hooks/useGetCharacter";

import defaultSurvivorPortrait from "../../assets/survivor-portrait-tranparent.png";
import * as styles from "./FieldCharacterInfo.css";

const SEGMENT_COUNT = 10;

const FieldCharacterInfo = () => {
  const battleLog = useAtomValue(battleLogAtom);
  const processedEvents = useAtomValue(processedEventsAtom);
  const { data: characterData } = useGetCharacter();

  const stats = useMemo(() => {
    if (battleLog) {
      const player = battleLog.initialState.players[0];
      let hp = player.hp;
      let stamina = player.stamina;

      for (const event of processedEvents) {
        if (
          (event.type === "DAMAGE" || event.type === "HEAL") &&
          event.targetId === player.id
        ) {
          hp = event.remainingHp;
        }
        if (event.type === "STAMINA_CHANGE" && event.playerId === player.id) {
          stamina = event.currentStamina;
        }
      }
      return {
        hp,
        stamina,
        maxHp: player.maxHp,
        maxStamina: player.maxStamina,
        name: player.name,
      };
    }

    if (characterData) {
      return {
        hp: characterData.raw.hp,
        stamina: characterData.raw.stamina,
        maxHp: characterData.raw.maxHp,
        maxStamina: characterData.raw.maxStamina,
        name: characterData.raw.displayName,
      };
    }

    return null;
  }, [battleLog, processedEvents, characterData]);

  if (!stats) return null;

  const hpRatio = stats.maxHp > 0 ? Math.max(0, stats.hp / stats.maxHp) : 0;
  const staminaRatio =
    stats.maxStamina > 0 ? Math.max(0, stats.stamina / stats.maxStamina) : 0;
  const filledHpSegments = Math.ceil(hpRatio * SEGMENT_COUNT);
  const filledStaminaSegments = Math.ceil(staminaRatio * SEGMENT_COUNT);
  const isCritical = !!battleLog || hpRatio <= 0.3;
  const hpTone = hpRatio <= 0.3 || battleLog ? "negative" : "positive";

  return (
    <div className={styles.container({ critical: isCritical })}>
      <div className={styles.headerRow}>
        <div className={styles.portraitWrap} aria-hidden="true">
          <img
            src={defaultSurvivorPortrait}
            alt=""
            className={styles.portraitImage({ dead: stats.hp <= 0 })}
          />
        </div>
        <p className={styles.name}>{stats.name}</p>
      </div>

      <div className={styles.gaugeSection}>
        <div className={styles.labelRow}>
          <p className={styles.metricLabel}>HP</p>
          <p className={styles.metricValue({ critical: hpRatio <= 0.3 })}>
            {stats.hp}/{stats.maxHp}
          </p>
        </div>
        <div className={styles.segmentTrack}>
          {Array.from({ length: SEGMENT_COUNT }).map((_, idx) => (
            <span
              key={`hp-${idx}`}
              className={styles.segmentCell({
                state: idx < filledHpSegments ? hpTone : "empty",
              })}
            />
          ))}
        </div>
      </div>

      <div className={styles.gaugeSection}>
        <div className={styles.labelRow}>
          <p className={styles.metricLabel}>STM</p>
          <p className={styles.metricValue({ critical: false })}>
            {stats.stamina}/{stats.maxStamina}
          </p>
        </div>
        <div className={styles.segmentTrack}>
          {Array.from({ length: SEGMENT_COUNT }).map((_, idx) => (
            <span
              key={`stm-${idx}`}
              className={styles.segmentCell({
                state: idx < filledStaminaSegments ? "positive" : "empty",
              })}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default FieldCharacterInfo;
