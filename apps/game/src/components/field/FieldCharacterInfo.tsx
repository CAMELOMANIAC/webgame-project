import { useAtomValue, useSetAtom } from "jotai";
import { useMemo } from "react";

import { battleLogAtom, processedEventsAtom } from "@/atoms/globalAtom";
import { focusPlayerTriggerAtom } from "@/atoms/raidAtom";
import { RollingNumber } from "@/components/common/RollingValue";
import { useGetCharacter } from "@/utils/hooks/useGetCharacter";

import defaultSurvivorPortrait from "../../assets/survivor-portrait-tranparent.png";
import * as styles from "./FieldCharacterInfo.css";

const SEGMENT_COUNT = 10;

const FieldCharacterInfo = () => {
  const battleLog = useAtomValue(battleLogAtom);
  const processedEvents = useAtomValue(processedEventsAtom);
  const setFocusPlayerTrigger = useSetAtom(focusPlayerTriggerAtom);
  const { data: characterData } = useGetCharacter();

  const stats = useMemo(() => {
    if (battleLog) {
      const player = battleLog.initialState.players[0];
      let hp = player.hp;
      let shield = player.shield ?? 0;
      let stamina = player.stamina;

      for (const event of processedEvents) {
        if (event.type === "SHIELD" && event.targetId === player.id) {
          shield = event.currentShield;
        }
        if (event.type === "DAMAGE" && event.targetId === player.id) {
          hp = event.remainingHp;
          shield = event.remainingShield ?? 0;
        }
        if (event.type === "HEAL" && event.targetId === player.id) {
          hp = event.remainingHp;
        }
        if (event.type === "STAMINA_CHANGE" && event.playerId === player.id) {
          stamina = event.currentStamina;
        }
      }
      return {
        hp,
        shield,
        stamina,
        maxHp: player.maxHp,
        maxStamina: player.maxStamina,
        name: player.name,
      };
    }

    if (characterData) {
      return {
        hp: characterData.raw.hp,
        shield: 0,
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
  const hpTone = hpRatio <= 0.3 || battleLog ? "negative" : "positive";

  const activeBuff = characterData?.raw.activeFoodBuff;
  const buffLabel = activeBuff
    ? [
        activeBuff.maxHpBonus ? `MAXHP +${activeBuff.maxHpBonus}` : null,
        activeBuff.meleeDamageBonus
          ? `MELEE +${activeBuff.meleeDamageBonus}`
          : null,
        activeBuff.rangedCooldownReductionTicks
          ? `RANGED -${activeBuff.rangedCooldownReductionTicks}t`
          : null,
        activeBuff.critChanceBonus
          ? `CRIT +${Math.round(activeBuff.critChanceBonus * 100)}%`
          : null,
        activeBuff.tagDamageBonus
          ? `[${activeBuff.tagDamageBonus.tag}] +${activeBuff.tagDamageBonus.amount}`
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;
  const isBuffActive = (characterData?.raw.fatigue ?? 0) > 0;

  return (
    <button
      type="button"
      className={styles.container}
      onClick={() => setFocusPlayerTrigger((n) => n + 1)}
    >
      <div className={styles.headerRow}>
        <div className={styles.portraitWrap} aria-hidden="true">
          <img
            src={defaultSurvivorPortrait}
            alt=""
            className={styles.portraitImage({ dead: stats.hp <= 0 })}
          />
        </div>
        {buffLabel && (
          <span className={styles.buffPill({ active: isBuffActive })}>
            {buffLabel}
          </span>
        )}
        <p className={styles.name}>{stats.name}</p>
      </div>

      <div className={styles.gaugeSection}>
        <div className={styles.labelRow}>
          <p className={styles.metricLabel}>HP</p>
          <div className={styles.metricValueGroup}>
            {stats.shield > 0 && (
              <p className={styles.shieldValue}>SHD +{stats.shield}</p>
            )}
            <p className={styles.metricValue({ critical: hpRatio <= 0.3 })}>
              <RollingNumber value={stats.hp} />/{stats.maxHp}
            </p>
          </div>
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
            <RollingNumber value={stats.stamina} />/{stats.maxStamina}
          </p>
        </div>
        <div className={styles.segmentTrack}>
          {Array.from({ length: SEGMENT_COUNT }).map((_, idx) => (
            <span
              key={`stm-${idx}`}
              className={styles.segmentCell({
                state: idx < filledStaminaSegments ? "neutral" : "empty",
              })}
            />
          ))}
        </div>
      </div>
    </button>
  );
};

export default FieldCharacterInfo;
