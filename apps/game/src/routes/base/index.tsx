import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAtomValue } from "jotai";

import { raidNoticeAtom } from "@/atoms/raidAtom";
import { BaseScreen } from "@/components/lobby/BaseScreen";
import * as styles from "@/components/lobby/BaseScreen.css";
import { CharacterCard } from "@/components/lobby/CharacterCard";
import { useGetCharacter } from "@/utils/hooks/useGetCharacter";
import { useRaidSession } from "@/utils/hooks/useRaidSession";

export const Route = createFileRoute("/base/")({ component: BaseHome });

function BaseHome() {
  const navigate = useNavigate();
  const { data } = useGetCharacter();
  const { startRaid } = useRaidSession();
  const notice = useAtomValue(raidNoticeAtom);
  const character = data?.raw;

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
      title="기업 복귀 실험실"
      description="선택한 개체의 배치 상태와 임무 통신을 확인합니다."
    >
      {notice && (
        <p className={styles.banner({ tone: "neutral" })} role="status">
          {notice}
        </p>
      )}
      {startRaid.error && (
        <p className={styles.banner({ tone: "negative" })} role="alert">
          {startRaid.error.message}
        </p>
      )}
      <div className={styles.mainGrid}>
        <CharacterCard
          character={character}
          onRaidAction={handleRaidAction}
          disabled={startRaid.isPending || (character ? character.hp <= 0 : false)}
        />
        <section className={styles.sectionPanel}>
          <h2 className={styles.sectionHeader}>임무 통신</h2>
          <p className={styles.leadText}>
            임무를 수락하거나 복귀한 탐사의 기록을 보고합니다.
          </p>
          <Link to="/base/quest" className={styles.missionLink}>
            <span>기업 임무 통신 확인</span>
            <span className={styles.linkCode}>COMM →</span>
          </Link>
        </section>
      </div>
    </BaseScreen>
  );
}
