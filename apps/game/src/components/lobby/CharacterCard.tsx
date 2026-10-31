import { motion } from "motion/react";

import type { CharacterResponse } from "@/utils/hooks/useGetCharacter";

import * as styles from "./CharacterCard.css";

interface CharacterCardProps {
  character: CharacterResponse | undefined;
  onRaidAction: () => void;
  disabled?: boolean;
  pendingResult?: boolean;
}

export function CharacterCard({
  character,
  onRaidAction,
  disabled,
  pendingResult,
}: CharacterCardProps) {
  const isRaiding = !!character?.isRaiding;
  const hpRatio =
    character && character.maxHp > 0 ? character.hp / character.maxHp : 1;
  const isCriticalHp = hpRatio <= 0.3;

  return (
    <div className={styles.cardContainer({ raiding: isRaiding })}>
      <div className={styles.headerRow}>
        <div>
          <span className={styles.telemetryCode}>
            OPERATOR // #{character?.id.slice(0, 8) ?? "--------"}
          </span>
          <h2 className={styles.nickname}>
            {character?.displayName || "미확인 개체"}
          </h2>
        </div>
        <span className={styles.statusBadge({ raiding: isRaiding })}>
          <span className={styles.statusDot({ raiding: isRaiding })} />
          {isRaiding ? "탐사 진행 중" : "출격 대기"}
        </span>
      </div>

      {/* 1px 밀착 데이터 그리드 (Exposed Hairline Telemetry Grid) */}
      <div className={styles.telemetryGrid}>
        <div className={styles.gridCell}>
          <div className={styles.cellHeader}>
            <p className={styles.statLabel}>VIT // 체력</p>
            <span
              className={styles.metricDot({
                tone: isCriticalHp ? "negative" : "positive",
              })}
            />
          </div>
          <p className={styles.statValue({ critical: isCriticalHp })}>
            {character?.hp ?? "—"} / {character?.maxHp ?? "—"}
          </p>
        </div>

        <div className={styles.gridCell}>
          <div className={styles.cellHeader}>
            <p className={styles.statLabel}>STM // 기력</p>
            <span className={styles.metricDot({ tone: "positive" })} />
          </div>
          <p className={styles.statValue({ critical: false })}>
            {character?.stamina ?? "—"} / {character?.maxStamina ?? "—"}
          </p>
        </div>

        <div className={styles.gridCell}>
          <div className={styles.cellHeader}>
            <p className={styles.statLabel}>LOAD // 중량</p>
            <span className={styles.metricDot({ tone: "neutral" })} />
          </div>
          <p className={styles.statValue({ critical: false })}>
            {character?.weight ?? 0} / {character?.maxWeight ?? 0} kg
          </p>
        </div>
      </div>

      {/* 탐사 시작/복귀 버튼 */}
      <motion.button
        type="button"
        disabled={disabled}
        className={styles.actionButton({ raiding: isRaiding })}
        onClick={onRaidAction}
        whileTap={{ scale: 0.99 }}
      >
        <span>
          {pendingResult
            ? "탐사 결과 확인"
            : isRaiding
              ? "진행 중인 탐사로 복귀"
              : "서포시 탐사 출격"}
        </span>
        <span className={styles.buttonCode}>
          {pendingResult ? "SYNC →" : isRaiding ? "ACTIVE →" : "DEPLOY → #00"}
        </span>
      </motion.button>
    </div>
  );
}
