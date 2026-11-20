import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import choPortrait from "@/assets/cho-portrait.png";
import choiPortrait from "@/assets/choi-portrait.png";
import yoonPortrait from "@/assets/yoon-portrait.png";
import { BaseScreen } from "@/components/lobby/BaseScreen";
import * as styles from "@/components/lobby/BaseScreen.css";
import { CharacterCard } from "@/components/lobby/CharacterCard";
import { useBaseRecovery } from "@/utils/hooks/useBaseRecovery";
import { useGetCharacter } from "@/utils/hooks/useGetCharacter";
import { useRaidSession } from "@/utils/hooks/useRaidSession";

export const Route = createFileRoute("/base/")({ component: BaseHome });

function BaseHome() {
  const navigate = useNavigate();
  const { data } = useGetCharacter();
  const { startRaid } = useRaidSession();
  const character = data?.raw;
  const recovery = useBaseRecovery(character);

  const handleRaidAction = () => {
    if (!character) return;
    if (character.isRaiding) {
      void navigate({ to: "/field", replace: true });
      return;
    }
    void navigate({ to: "/base/staging" });
  };

  return (
    <BaseScreen
      title="임시 대피 구역"
      description="선택한 개체의 배치 상태와 거점 시설을 확인합니다."
    >
      {startRaid.error && (
        <p className={styles.banner({ tone: "negative" })} role="alert">
          {startRaid.error.message}
        </p>
      )}
      <div className={styles.mainGrid}>
        <CharacterCard
          character={character}
          onRaidAction={handleRaidAction}
          disabled={startRaid.isPending || (character ? recovery.hp <= 0 : false)}
        />
        <div className={styles.facilityGrid}>
          <Link to="/base/stash" className={styles.facilityCard}>
            <div className={styles.facilityPortraitWrap} aria-hidden="true">
              <img
                src={choPortrait}
                alt=""
                className={styles.facilityPortraitImage}
              />
            </div>
            <div className={styles.facilityCardContent}>
              <h2 className={styles.facilityTitle}>거점 정비소</h2>
              <span className={styles.facilityRole}>조 시설과장</span>
            </div>
            <div className={styles.facilityFooter}>
              <span className={styles.linkCode} aria-hidden="true">→</span>
            </div>
          </Link>

          <Link to="/base/lab" className={styles.facilityCard}>
            <div className={styles.facilityPortraitWrap} aria-hidden="true">
              <img
                src={yoonPortrait}
                alt=""
                className={styles.facilityPortraitImage}
              />
            </div>
            <div className={styles.facilityCardContent}>
              <h2 className={styles.facilityTitle}>유전자 연구실</h2>
              <span className={styles.facilityRole}>윤 책임연구원</span>
            </div>
            <div className={styles.facilityFooter}>
              <span className={styles.linkCode} aria-hidden="true">→</span>
            </div>
          </Link>

          <Link to="/base/market" className={styles.facilityCard}>
            <div className={styles.facilityPortraitWrap} aria-hidden="true">
              <img
                src={choiPortrait}
                alt=""
                className={styles.facilityPortraitImage}
              />
            </div>
            <div className={styles.facilityCardContent}>
              <h2 className={styles.facilityTitle}>거점 거래소</h2>
              <span className={styles.facilityRole}>최 사장</span>
            </div>
            <div className={styles.facilityFooter}>
              <span className={styles.linkCode} aria-hidden="true">→</span>
            </div>
          </Link>

          <Link to="/base/quest" className={styles.facilityCard}>
            <div className={styles.facilityCardContent}>
              <h2 className={styles.facilityTitle}>임무</h2>
            </div>
            <div className={styles.facilityFooter}>
              <span className={styles.linkCode} aria-hidden="true">→</span>
            </div>
          </Link>
        </div>
      </div>
    </BaseScreen>
  );
}
