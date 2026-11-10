import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAtomValue, useSetAtom } from "jotai";

import { battleLogAtom } from "@/atoms/globalAtom";
import {
  currentNodeIdAtom,
  isCombatAtom,
  isNavigatingAtom,
  playerCoordsAtom,
  raidNoticeAtom,
  shortestPathAtom,
  targetNodeIdAtom,
} from "@/atoms/raidAtom";
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
  const setNotice = useSetAtom(raidNoticeAtom);
  const setNode = useSetAtom(currentNodeIdAtom);
  const setIsCombat = useSetAtom(isCombatAtom);
  const setIsNavigating = useSetAtom(isNavigatingAtom);
  const setTarget = useSetAtom(targetNodeIdAtom);
  const setPath = useSetAtom(shortestPathAtom);
  const setCoords = useSetAtom(playerCoordsAtom);
  const setBattleLog = useSetAtom(battleLogAtom);
  const character = data?.raw;

  const deploy = () => {
    if (!character || startRaid.isPending) return;
    startRaid.mutate(character.id, {
      onSuccess: ({ raid }) => {
        setNotice(null);
        setNode(raid.currentNodeId);
        setIsCombat(false);
        setIsNavigating(false);
        setTarget(null);
        setPath([]);
        setCoords(null);
        setBattleLog(null);
        void navigate({ to: "/field", replace: true });
      },
    });
  };

  return (
    <BaseScreen
      title="한림 복귀 실험실"
      description="선택한 개체의 출격 상태와 임무 통신을 확인합니다."
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
        {character ? (
          <CharacterCard
            character={character}
            onRaidAction={deploy}
            disabled={startRaid.isPending || character.hp <= 0}
          />
        ) : (
          <Link to="/base/quarters" className={styles.missionLink}>
            숙소에서 출격 개체 준비 →
          </Link>
        )}
        <section className={styles.sectionPanel}>
          <h2 className={styles.sectionHeader}>임무 통신</h2>
          <p className={styles.leadText}>
            임무를 수락하거나 복귀한 탐사의 기록을 보고합니다.
          </p>
          <Link to="/base/quest" className={styles.missionLink}>
            <span>한림그룹 임무 통신 확인</span>
            <span className={styles.linkCode}>COMM →</span>
          </Link>
        </section>
      </div>
    </BaseScreen>
  );
}
