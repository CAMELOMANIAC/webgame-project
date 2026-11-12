import { useNavigate } from "@tanstack/react-router";
import { firstMissionNodeId } from "@webgame/types";
import { useAtomValue, useSetAtom } from "jotai";

import {
  pendingNavigationAtom,
  pendingNavigationKey,
} from "@/atoms/pendingNavigationAtom";
import {
  currentNodeIdAtom,
  isCombatAtom,
  isNavigatingAtom,
  playerCoordsAtom,
  requestedNodeIdAtom,
  targetNodeIdAtom,
} from "@/atoms/raidAtom";
import { useGetCharacter } from "@/utils/hooks/useGetCharacter";
import { useJournal } from "@/utils/hooks/useJournal";
import { useRaidRules } from "@/utils/hooks/useRaidRules";
import { useRaidSession } from "@/utils/hooks/useRaidSession";

import * as styles from "./FieldNavTargetSection.css";

const FieldNavTargetSection = () => {
  const navigate = useNavigate();
  const { data } = useGetCharacter();
  const { data: rules } = useRaidRules();
  const { extractRaid } = useRaidSession();
  const journal = useJournal();
  const nodeId = useAtomValue(currentNodeIdAtom);
  const targetNodeId = useAtomValue(targetNodeIdAtom);
  const isMoving = useAtomValue(isNavigatingAtom);
  const isCombat = useAtomValue(isCombatAtom);
  const pending = useAtomValue(pendingNavigationAtom);
  const setRequestedNode = useSetAtom(requestedNodeIdAtom);
  const setNode = useSetAtom(currentNodeIdAtom);
  const setCoords = useSetAtom(playerCoordsAtom);
  const character = data?.raw;
  const locationName =
    nodeId === (rules?.startNodeId ?? 0)
      ? "임시 대피 구역"
      : nodeId === firstMissionNodeId
        ? "기록 중계 시설"
        : "현재 위치";
  const hasPending =
    !!pending[pendingNavigationKey(character?.userId, character?.id)];
  const canAct =
    !!character?.isRaiding &&
    character.activeRaid?.status === "ACTIVE" &&
    !isMoving &&
    !isCombat &&
    !hasPending &&
    !extractRaid.isPending;
  const atExtraction = rules?.extractionNodeIds.includes(nodeId) ?? false;

  const leave = () => {
    if (!character || !canAct) return;
    extractRaid.mutate(character.id, {
      onSuccess: () => {
        setNode(rules?.startNodeId ?? 0);
        setCoords(null);
      },
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.destinationRow}>
        <strong className={styles.destinationText}>
          {isMoving && targetNodeId !== null
            ? `목적지 #${targetNodeId}`
            : `${locationName} #${nodeId}`}
        </strong>
        <p className={styles.statusHint({ positive: atExtraction })}>
          {isMoving
            ? "목적지로 이동 중입니다"
            : atExtraction
              ? "탈출 가능한 구역입니다"
              : "지도에서 다음 목적지를 선택하세요"}
        </p>
      </div>

      {journal.data?.mission.status === "ACTIVE" && (
        <button
          type="button"
          className={styles.secondaryAction}
          disabled={!canAct}
          onClick={() => setRequestedNode(journal.data!.mission.targetNodeId)}
        >
          <span>임무: 기록 중계 시설로 이동</span>
          <span className={styles.actionCode}>
            TARGET #{journal.data.mission.targetNodeId} →
          </span>
        </button>
      )}

      <div className={styles.telemetryGrid}>
        <div className={styles.telemetryCell}>
          <span className={styles.cellLabel}>진행 라운드</span>
          <span className={styles.cellValue}>
            {character?.activeRaid?.round ?? 0}
          </span>
        </div>
        <div className={styles.telemetryCell}>
          <span className={styles.cellLabel}>탈출 구역</span>
          <span className={styles.cellValue}>
            #{rules?.extractionNodeIds.join(", #") ?? "—"}
          </span>
        </div>
      </div>

      {character?.isRaiding || isMoving || hasPending ? (
        atExtraction ? (
          <button
            type="button"
            className={styles.primaryAction}
            disabled={!canAct}
            onClick={leave}
          >
            <span>
              {extractRaid.isPending
                ? "탈출 처리 중…"
                : "탈출하기"}
            </span>
            <span className={styles.actionCode}>EXTRACT →</span>
          </button>
        ) : (
          <button
            type="button"
            className={styles.primaryAction}
            disabled={!canAct || !rules}
            onClick={() => setRequestedNode(rules?.extractionNodeIds[0] ?? 0)}
          >
            <span>탈출 지점으로 이동</span>
            <span className={styles.actionCode}>
              NODE #{rules?.extractionNodeIds[0] ?? 0} →
            </span>
          </button>
        )
      ) : (
        character && (
          <button
            type="button"
            className={styles.primaryAction}
            onClick={() => void navigate({ to: "/base" })}
          >
            <span>거점으로 돌아가기</span>
            <span className={styles.actionCode}>BASE →</span>
          </button>
        )
      )}
    </div>
  );
};

export default FieldNavTargetSection;
