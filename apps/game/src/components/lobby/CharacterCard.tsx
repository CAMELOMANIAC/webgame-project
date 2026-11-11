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

  // 장착된 무기 목록 추출
  const equippedWeapons =
    character?.equipment
      .filter((e) => e.weaponMaster)
      .map((e) => e.weaponMaster!.name) ?? [];

  return (
    <motion.button
      type="button"
      disabled={disabled}
      className={styles.cardButton}
      onClick={onRaidAction}
      whileTap={{ scale: 0.99 }}
    >
      {/* 카드 상단 본문: 대원 이름 + 크게 표시된 체력 숫자 + 장착 장비 요약 */}
      <div className={styles.cardBody}>
        {character ? (
          <>
            <div className={styles.topRow}>
              <h2 className={styles.characterName}>
                {character.displayName || "미확인 개체"}
              </h2>
              {/* 체력만 숫자로 크게 표현 */}
              <div className={styles.hpNumber}>
                <span>{character.hp}</span>
                <span className={styles.hpMax}>/ {character.maxHp}</span>
                <span className={styles.hpUnit}>HP</span>
              </div>
            </div>
            <p className={styles.loadoutText}>
              {equippedWeapons.length > 0
                ? `장비: ${equippedWeapons.slice(0, 3).join(" · ")}${
                    equippedWeapons.length > 3
                      ? ` 외 ${equippedWeapons.length - 3}개`
                      : ""
                  }`
                : "장착 장비 없음 (비무장)"}
            </p>
          </>
        ) : (
          <>
            <div className={styles.topRow}>
              <h2 className={styles.characterName}>선택되지 않음</h2>
            </div>
            <p className={styles.emptySubtext}>
              클릭하여 원정에 투입할 대원을 선택하세요.
            </p>
          </>
        )}
      </div>

      {/* 카드 하단: 제목이 아래로 내려와 "탐사 준비"가 됨 */}
      <div className={styles.cardFooter}>
        <h3 className={styles.footerTitle}>
          {pendingResult
            ? "탐사 결과 확인"
            : isRaiding
              ? "진행 중인 탐사로 복귀"
              : "탐사 준비"}
        </h3>
        <span className={styles.footerCode}>
          {pendingResult ? "SYNC →" : isRaiding ? "ACTIVE →" : "PREPARE → #00"}
        </span>
      </div>
    </motion.button>
  );
}
