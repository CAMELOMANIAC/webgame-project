import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  formatRaidTime,
  type RaidCombatRecord,
  type RaidSettlementSummary,
} from "@webgame/types";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";

import { resolveItemImageSrc } from "@/assets/items";
import { selectedUserIdAtom } from "@/atoms/authAtom";
import {
  currentNodeIdAtom,
  playerCoordsAtom,
  type RaidEndStatus,
  raidOutroAtom,
  unacknowledgedRaidResultsAtom,
} from "@/atoms/raidAtom";
import { RaidOutroBackdrop } from "@/components/field/RaidOutro";
import { page } from "@/styles/theme.css";
import { API_BASE_URL, apiFetch } from "@/utils/api";
import { useGetCharacter } from "@/utils/hooks/useGetCharacter";
import { lastRaidSummaryKey } from "@/utils/hooks/useRaidSession";
import { readApiResponse } from "@/utils/request";
import { useRaidOutroSequence } from "@/utils/useRaidOutroSequence";

import * as styles from "./result.css";

export const Route = createFileRoute("/field/result")({
  component: RaidResultRoute,
});

const results = {
  EXTRACTED: {
    title: "탈출 성공",
    description: "가방의 물품을 거점 창고로 옮겼습니다.",
    itemSectionTitle: "회수 전리품",
    emptyItemsLabel: "회수한 물품 없음",
  },
  DEAD: {
    title: "탐사 실패",
    description: "탐사 중 쓰러져 장착 장비와 가방의 물품을 잃었습니다.",
    itemSectionTitle: "소실 장비·물품",
    emptyItemsLabel: "소실된 물품 없음",
  },
} satisfies Record<
  RaidEndStatus,
  {
    title: string;
    description: string;
    itemSectionTitle: string;
    emptyItemsLabel: string;
  }
>;

const OUTCOME_LABELS: Record<RaidCombatRecord["outcome"], string> = {
  WIN: "승리",
  RETREAT: "후퇴",
  LOSS: "패배",
};

function RaidResultRoute() {
  const navigate = useNavigate();
  const userId = useAtomValue(selectedUserIdAtom);
  const [raidResults, setRaidResults] = useAtom(unacknowledgedRaidResultsAtom);
  const { data: characterData } = useGetCharacter();
  const characterId = characterData?.raw.id;

  const result = userId ? raidResults[userId] : undefined;

  // 종료 연출은 탐사 종료 직후(위치 기록이 있을 때)에만 재생한다. 새로고침 복구 시에는 생략
  const outro = useAtomValue(raidOutroAtom);
  const setOutro = useSetAtom(raidOutroAtom);
  const setCurrentNodeId = useSetAtom(currentNodeIdAtom);
  const setPlayerCoords = useSetAtom(playerCoordsAtom);
  const reduceMotion = useReducedMotion();
  const [hadOutro] = useState(outro !== null);
  const playOutro = hadOutro && !reduceMotion;
  const { stage, skip } = useRaidOutroSequence(playOutro);
  const showPanel = stage === "panel";

  const { data: summary } = useQuery<RaidSettlementSummary | null>({
    queryKey: lastRaidSummaryKey(userId, characterId),
    enabled: Boolean(userId && characterId && result),
    staleTime: 60_000,
    queryFn: async () => {
      const payload = await readApiResponse<{
        summary: RaidSettlementSummary | null;
      }>(
        await apiFetch(
          `${API_BASE_URL}/character/${characterId}/raid/last-summary`,
        ),
      );
      return payload.summary;
    },
  });

  if (!result || !userId) {
    return null;
  }

  const isDead = result === "DEAD";
  const { title, description, itemSectionTitle, emptyItemsLabel } =
    results[result];
  const matchedSummary = summary?.status === result ? summary : null;
  const items = isDead
    ? (matchedSummary?.lostItems ?? [])
    : (matchedSummary?.recoveredItems ?? []);
  const totalValue = isDead
    ? (matchedSummary?.totalLostValue ?? 0)
    : (matchedSummary?.totalRecoveredValue ?? 0);
  const combatRecords = matchedSummary?.combatRecords ?? [];

  const handleReturn = () => {
    setRaidResults((prev) => {
      const remaining = { ...prev };
      delete remaining[userId];
      return remaining;
    });
    setCurrentNodeId(0);
    setPlayerCoords(null);
    setOutro(null);
    void navigate({ to: "/base", replace: true });
  };

  return (
    <div className={styles.outroRoot}>
      {playOutro && (
        <RaidOutroBackdrop result={result} stage={stage} onSkip={skip} />
      )}
    <div
      className={page}
      style={{
        paddingBottom: 0,
        overflowY: "auto",
        position: "relative",
        zIndex: 1,
        ...(playOutro
          ? {
              backgroundColor: "transparent",
              pointerEvents: showPanel ? "auto" : "none",
            }
          : {}),
      }}
    >
      <motion.div
        className={styles.wrapper}
        initial={false}
        animate={
          showPanel ? { y: 0, opacity: 1 } : { y: 160, opacity: 0 }
        }
        transition={{ duration: 0.55, ease: [0.2, 0.9, 0.3, 1] }}
      >
        <section className={styles.panel}>
          <div className={styles.headerBlock}>
            <p className={styles.eyebrow}>EXPEDITION REPORT</p>
            <h1
              className={styles.title({
                tone: isDead ? "negative" : "positive",
              })}
            >
              {title}
            </h1>
            <p className={styles.description}>{description}</p>
          </div>

          <div className={styles.summaryGrid}>
            <div className={styles.summaryCell}>
              <span className={styles.cellLabel}>생존자</span>
              <span className={styles.cellValue()}>
                {characterData?.raw.displayName ?? "—"}
              </span>
            </div>
            <div className={styles.summaryCell}>
              <span className={styles.cellLabel}>경과 시간</span>
              <span className={styles.cellValue()}>
                {matchedSummary
                  ? formatRaidTime(matchedSummary.elapsedMinutes)
                  : "—"}
              </span>
            </div>
            <div className={styles.summaryCell}>
              <span className={styles.cellLabel}>교전 / 처치</span>
              <span className={styles.cellValue()}>
                {matchedSummary
                  ? `${matchedSummary.encountersCount}회 / ${matchedSummary.defeatedCount}처치`
                  : "—"}
              </span>
            </div>
            <div className={styles.summaryCell}>
              <span className={styles.cellLabel}>
                {isDead ? "소실 가치" : "회수 가치"}
              </span>
              <span
                className={styles.cellValue({
                  tone: isDead ? "negative" : "positive",
                })}
              >
                {matchedSummary
                  ? `${isDead ? "-" : "+"}${totalValue.toLocaleString()} CR`
                  : "—"}
              </span>
            </div>
          </div>

          {matchedSummary?.missionRecovered && !isDead && (
            <div className={styles.missionBanner}>
              <span>임무 기록 회수 완료</span>
              <span>거점 보고 가능</span>
            </div>
          )}

          <div className={styles.sectionBox}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>{itemSectionTitle}</span>
              <span className={styles.sectionMeta}>{items.length}종</span>
            </div>
            {items.length > 0 ? (
              items.map((item) => {
                const imgSrc = resolveItemImageSrc(
                  item.weaponMasterId,
                  item.iconKey,
                );
                return (
                  <div key={item.weaponMasterId} className={styles.itemRow}>
                    <div className={styles.itemMain}>
                      {imgSrc && (
                        <img
                          src={imgSrc}
                          alt={item.name}
                          className={styles.itemThumb}
                        />
                      )}
                      <span className={styles.itemName}>{item.name}</span>
                      <span className={styles.itemQty}>×{item.quantity}</span>
                    </div>
                    <span
                      className={styles.itemValue({
                        tone: isDead ? "negative" : "positive",
                      })}
                    >
                      {isDead ? "-" : "+"}
                      {item.totalValue.toLocaleString()} CR
                    </span>
                  </div>
                );
              })
            ) : (
              <div className={styles.emptyRow}>{emptyItemsLabel}</div>
            )}
          </div>

          {combatRecords.length > 0 && (
            <div className={styles.sectionBox}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>교전 기록</span>
                <span className={styles.sectionMeta}>
                  {combatRecords.length}건
                </span>
              </div>
              {combatRecords.map((record, index) => (
                <div
                  key={`${record.timeMinutes}-${record.enemyName}-${index}`}
                  className={styles.combatRow}
                >
                  <div className={styles.combatMain}>
                    <span className={styles.combatTime}>
                      {formatRaidTime(record.timeMinutes)}
                    </span>
                    <span className={styles.combatName}>
                      {record.enemyName}
                    </span>
                    <span className={styles.combatSub}>
                      {record.enemyKind === "GHOST"
                        ? "고스트"
                        : (record.faction ?? "NPC")}
                    </span>
                  </div>
                  <span
                    className={styles.outcomeTag({ outcome: record.outcome })}
                  >
                    {OUTCOME_LABELS[record.outcome]}
                  </span>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            className={styles.returnButton}
            onClick={handleReturn}
          >
            거점으로 돌아가기
          </button>
        </section>
      </motion.div>
    </div>
    </div>
  );
}
