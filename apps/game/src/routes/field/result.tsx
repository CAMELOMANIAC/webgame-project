import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useAtom, useAtomValue } from "jotai";

import { selectedUserIdAtom } from "@/atoms/authAtom";
import {
  type RaidEndStatus,
  unacknowledgedRaidResultsAtom,
} from "@/atoms/raidAtom";
import { page } from "@/styles/theme.css";
import { useGetCharacter } from "@/utils/hooks/useGetCharacter";

import * as styles from "./result.css";

export const Route = createFileRoute("/field/result")({
  component: RaidResultRoute,
});

const results = {
  EXTRACTED: {
    title: "탈출 성공",
    description: "가방의 물품을 거점 창고로 옮겼습니다.",
    statusLabel: "탈출 완료",
  },
  DEAD: {
    title: "탐사 실패",
    description: "탐사 중 쓰러져 장착 장비와 가방의 물품을 잃었습니다.",
    statusLabel: "사망",
  },
} satisfies Record<
  RaidEndStatus,
  { title: string; description: string; statusLabel: string }
>;

function RaidResultRoute() {
  const navigate = useNavigate();
  const userId = useAtomValue(selectedUserIdAtom);
  const [raidResults, setRaidResults] = useAtom(unacknowledgedRaidResultsAtom);
  const { data: characterData } = useGetCharacter();

  const result = userId ? raidResults[userId] : undefined;
  if (!result || !userId) {
    return <Navigate to="/field" replace />;
  }

  const { title, description, statusLabel } = results[result];

  const handleReturn = () => {
    setRaidResults((prev) => {
      const remaining = { ...prev };
      delete remaining[userId];
      return remaining;
    });
    void navigate({ to: "/base", replace: true });
  };

  return (
    <div className={page} style={{ paddingBottom: 0, overflowY: "auto" }}>
      <div className={styles.wrapper}>
        <section className={styles.panel}>
          <p className={styles.eyebrow}>탐사 결과</p>
          <h1
            className={styles.title({
              tone: result === "DEAD" ? "negative" : "positive",
            })}
          >
            {title}
          </h1>
          <p className={styles.description}>{description}</p>

          <div className={styles.summaryGrid}>
            <div className={styles.summaryCell}>
              <span className={styles.cellLabel}>생존자</span>
              <span className={styles.cellValue}>
                {characterData?.raw.displayName ?? "—"}
              </span>
            </div>
            <div className={styles.summaryCell}>
              <span className={styles.cellLabel}>결과</span>
              <span className={styles.cellValue}>{statusLabel}</span>
            </div>
          </div>

          <button
            type="button"
            className={styles.returnButton}
            onClick={handleReturn}
          >
            거점으로 돌아가기
          </button>
        </section>
      </div>
    </div>
  );
}
