import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

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
      description="선택한 개체의 배치 상태와 임무 통신을 확인합니다."
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
        <section className={styles.sectionPanel}>
          <h2 className={styles.sectionHeader}>임무 통신 · 조 시설과장</h2>
          <p className={styles.leadText}>
            거점 담당자들의 의뢰를 수락하고 복귀한 탐사의 기록을 보고합니다.
          </p>
          <Link to="/base/quest" className={styles.missionLink}>
            <span>임무 통신 확인</span>
            <span className={styles.linkCode} aria-hidden="true">→</span>
          </Link>
        </section>
        <section className={styles.sectionPanel}>
          <h2 className={styles.sectionHeader}>유전자 연구실 · 윤 책임연구원</h2>
          <p className={styles.leadText}>
            유전자 슬롯을 분석하고 재조합하거나 회수한 앰플을 이식합니다.
          </p>
          <Link to="/base/lab" className={styles.missionLink}>
            <span>유전자 연구실 입장</span>
            <span className={styles.linkCode} aria-hidden="true">→</span>
          </Link>
        </section>
        <section className={styles.sectionPanel}>
          <h2 className={styles.sectionHeader}>거점 거래소 · 최 사장</h2>
          <p className={styles.leadText}>
            회수한 전리품을 매각하거나 비공식 보급 물자와 경매에 참여합니다.
          </p>
          <Link to="/base/market" className={styles.missionLink}>
            <span>거점 거래소 입장</span>
            <span className={styles.linkCode} aria-hidden="true">→</span>
          </Link>
        </section>
      </div>
    </BaseScreen>
  );
}
