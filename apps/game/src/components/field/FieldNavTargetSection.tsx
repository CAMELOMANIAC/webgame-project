import { useNavigate } from "@tanstack/react-router";
import { seopoRegion } from "@webgame/types";
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
  raidNoticeAtom,
  requestedNodeIdAtom,
  targetNodeIdAtom,
} from "@/atoms/raidAtom";
import { useGetCharacter } from "@/utils/hooks/useGetCharacter";
import { useJournal } from "@/utils/hooks/useJournal";
import { useRaidRules } from "@/utils/hooks/useRaidRules";
import { useRaidSession } from "@/utils/hooks/useRaidSession";

import mapData from "../../../../../packages/types/src/assets/map_graph.json";
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
  const setNotice = useSetAtom(raidNoticeAtom);
  const notice = useAtomValue(raidNoticeAtom);
  const character = data?.raw;
  const region = seopoRegion(
    nodeId,
    character?.activeRaid?.round ?? 0,
    mapData.nodes[nodeId] ?? { x: 0, y: 0 },
  );
  const hasPending =
    !!pending[pendingNavigationKey(character?.userId, character?.id)];
  const canAct =
    !!character?.isRaiding &&
    !isMoving &&
    !isCombat &&
    !hasPending &&
    !extractRaid.isPending;
  const atExtraction = rules?.extractionNodeIds.includes(nodeId) ?? false;
  const isStable = region.overlap === "STABLE";

  const leave = () => {
    if (!character || !canAct) return;
    extractRaid.mutate(character.id, {
      onSuccess: () => {
        setNotice("탈출에 성공했습니다. 가방의 물품을 창고로 옮겼습니다.");
        setNode(rules?.startNodeId ?? 0);
        setCoords(null);
        void navigate({ to: "/field/user" });
      },
    });
  };

  return (
    <div className={styles.container({ stable: isStable })}>
      <div className={styles.topTelemetryBar}>
        <div className={styles.telemetryLeft}>
          <span className={styles.statusDot({ positive: isStable })} />
          <h3 className={styles.subTitle}>서포시 탐사</h3>
          <span className={styles.nodeCode}>[NODE #{nodeId}]</span>
        </div>
        <span className={styles.overlapBadge({ positive: isStable })}>
          중첩 {isStable ? "안정" : "불안정 · 통제 강화"}
        </span>
      </div>

      <div className={styles.destinationRow}>
        <strong className={styles.destinationText}>
          {isMoving && targetNodeId !== null
            ? `목적지 #${targetNodeId}`
            : `${region.name} #${nodeId}`}
        </strong>
        <p className={styles.statusHint({ positive: atExtraction })}>
          {isMoving
            ? "목적지로 이동 중입니다"
            : atExtraction
              ? "탈출 가능한 구역입니다"
              : "지도에서 다음 목적지를 선택하세요"}
        </p>
      </div>

      {notice && (
        <p className={styles.noticeBanner({ tone: "positive" })} role="status">
          {notice}
        </p>
      )}

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

      {journal.data?.mission.status === "RECOVERED" &&
        !isMoving &&
        !isCombat &&
        !hasPending && (
          <p
            className={styles.noticeBanner({ tone: "positive" })}
            role="status"
          >
            임무 기록을 확보했습니다. 살아서 탈출하세요.
          </p>
        )}

      <div className={styles.telemetryGrid}>
        <div className={styles.telemetryCell}>
          <span className={styles.cellLabel}>ROUND // 진행 라운드</span>
          <span className={styles.cellValue}>
            {character?.activeRaid?.round ?? 0}
          </span>
        </div>
        <div className={styles.telemetryCell}>
          <span className={styles.cellLabel}>EXTRACT // 탈출 구역</span>
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
                : "탈출하고 거점으로 복귀"}
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
            onClick={() => void navigate({ to: "/field/user" })}
          >
            <span>거점으로 돌아가기</span>
            <span className={styles.actionCode}>BASE →</span>
          </button>
        )
      )}

      {extractRaid.error && (
        <p className={styles.noticeBanner({ tone: "negative" })} role="alert">
          {extractRaid.error.message}
        </p>
      )}
    </div>
  );
};

export default FieldNavTargetSection;
