import { useNavigate } from "@tanstack/react-router";
import { firstMissionNodeId } from "@webgame/types";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useId, useMemo, useRef } from "react";
import { RiCloseLine, RiCompass3Line } from "react-icons/ri";

import {
  pendingNavigationAtom,
  pendingNavigationKey,
} from "@/atoms/pendingNavigationAtom";
import {
  currentNodeIdAtom,
  focusRouteTargetAtom,
  isCombatAtom,
  isNavigatingAtom,
  isRecommendDestinationsOpenAtom,
  playerCoordsAtom,
  requestedNodeIdAtom,
  shortestPathAtom,
  startNavigationTriggerAtom,
  targetBuildingIdAtom,
  targetNodeIdAtom,
} from "@/atoms/raidAtom";
import { useGetCharacter } from "@/utils/hooks/useGetCharacter";
import { useJournal } from "@/utils/hooks/useJournal";
import { useRaidRules } from "@/utils/hooks/useRaidRules";
import { useRaidSession } from "@/utils/hooks/useRaidSession";
import {
  estimatePathTravelMinutes,
  findShortestPath,
} from "@/utils/pathfinding";
import {
  type RecommendedDestination,
  STATIC_RECOMMENDED_DESTINATIONS,
} from "@/utils/recommendedDestinations";

import * as styles from "./FieldNavTargetSection.css";

const formatRaidTime = (minutes: number) => {
  const safeMinutes = Math.max(0, Math.floor(minutes));
  const hours = String(Math.floor(safeMinutes / 60)).padStart(2, "0");
  const mins = String(safeMinutes % 60).padStart(2, "0");
  return `${hours}:${mins}`;
};

const FieldNavTargetSection = () => {
  const navigate = useNavigate();
  const recommendListId = useId();
  const recommendToggleRef = useRef<HTMLButtonElement>(null);
  const { data } = useGetCharacter();
  const { data: rules } = useRaidRules();
  const { extractRaid } = useRaidSession();
  const journal = useJournal();
  const nodeId = useAtomValue(currentNodeIdAtom);
  const targetNodeId = useAtomValue(targetNodeIdAtom);
  const targetBuildingId = useAtomValue(targetBuildingIdAtom);
  const shortestPath = useAtomValue(shortestPathAtom);
  const isMoving = useAtomValue(isNavigatingAtom);
  const isCombat = useAtomValue(isCombatAtom);
  const pending = useAtomValue(pendingNavigationAtom);
  const setRequestedNode = useSetAtom(requestedNodeIdAtom);
  const setFocusRouteTarget = useSetAtom(focusRouteTargetAtom);
  const [isRecommendOpen, setIsRecommendOpen] = useAtom(
    isRecommendDestinationsOpenAtom,
  );
  const triggerStartNavigation = useSetAtom(startNavigationTriggerAtom);
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
  const canMove =
    targetNodeId !== null &&
    (shortestPath.length > 1 ||
      (shortestPath.length === 1 && targetBuildingId !== null));
  const currentTime = character?.activeRaid?.time ?? 0;
  const travelMinutes = canMove
    ? estimatePathTravelMinutes(shortestPath, targetBuildingId !== null)
    : 0;
  const estimatedTime = currentTime + travelMinutes;
  const atExtraction = rules?.extractionNodeIds.includes(nodeId) ?? false;

  const recommendedDestinations = useMemo(() => {
    const candidates: RecommendedDestination[] = [];
    if (journal.data?.mission.status === "ACTIVE") {
      candidates.push({
        id: `mission-${journal.data.mission.targetNodeId}`,
        nodeId: journal.data.mission.targetNodeId,
        name: "기록 중계 시설",
        category: "MISSION",
      });
    }
    for (const extractionId of rules?.extractionNodeIds ?? []) {
      candidates.push({
        id: `extraction-${extractionId}`,
        nodeId: extractionId,
        name:
          extractionId === (rules?.startNodeId ?? 0)
            ? "임시 대피 구역"
            : "탈출 구역",
        category: "EXTRACTION",
      });
    }
    for (const staticDest of STATIC_RECOMMENDED_DESTINATIONS) {
      candidates.push(staticDest);
    }
    return candidates.map((dest) => {
      const path =
        dest.nodeId === nodeId ? [] : findShortestPath(nodeId, dest.nodeId);
      return {
        ...dest,
        travelMinutes:
          path.length > 1 ? estimatePathTravelMinutes(path, false) : 0,
      };
    });
  }, [
    journal.data?.mission,
    rules?.extractionNodeIds,
    rules?.startNodeId,
    nodeId,
  ]);

  const handleSelectRecommendation = (destNodeId: number) => {
    setRequestedNode(destNodeId);
    setFocusRouteTarget((prev) => ({
      nodeId: destNodeId,
      seq: (prev?.seq ?? 0) + 1,
    }));
    recommendToggleRef.current?.focus({ preventScroll: true });
    setIsRecommendOpen(false);
  };

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
      <div className={styles.destinationHeader}>
        <div className={styles.destinationRow}>
          <strong className={styles.destinationText}>
            {targetNodeId !== null
              ? `목적지 #${targetNodeId}`
              : `${locationName} #${nodeId}`}
          </strong>
          <p
            className={styles.statusHint({
              positive: atExtraction && !canMove,
            })}
          >
            {isMoving
              ? "목적지로 이동 중입니다"
              : canMove
                ? "이동 버튼을 눌러 목적지로 출발하세요"
                : atExtraction
                  ? "탈출 가능한 구역입니다"
                  : "지도에서 다음 목적지를 선택하세요"}
          </p>
        </div>
        <button
          ref={recommendToggleRef}
          type="button"
          className={styles.recommendToggle({ open: isRecommendOpen })}
          aria-expanded={isRecommendOpen}
          aria-controls={recommendListId}
          aria-label="추천 목적지"
          onClick={() => setIsRecommendOpen((open) => !open)}
        >
          {isRecommendOpen ? <RiCloseLine /> : <RiCompass3Line />}
        </button>
      </div>

      <div>
        <div
          id={recommendListId}
          className={styles.bodySection({ visible: isRecommendOpen })}
          inert={!isRecommendOpen}
        >
          <div className={styles.bodyContent}>
            <div className={styles.recommendList}>
              {recommendedDestinations.length === 0 ? (
                <p className={styles.recommendEmpty}>
                  표시할 추천 목적지가 없습니다.
                </p>
              ) : (
                recommendedDestinations.map((dest) => {
                  const isCurrent = dest.nodeId === nodeId;
                  const isSelected = targetNodeId === dest.nodeId;
                  const categoryLabel =
                    dest.category === "MISSION"
                      ? "임무"
                      : dest.category === "EXTRACTION"
                        ? "탈출"
                        : "거점";
                  return (
                    <button
                      key={dest.id}
                      type="button"
                      className={styles.recommendItem({ active: isSelected })}
                      aria-pressed={isSelected}
                      disabled={!canAct || isCurrent}
                      onClick={() => handleSelectRecommendation(dest.nodeId)}
                    >
                      <div className={styles.recommendInfo}>
                        <div className={styles.recommendMeta}>
                          <span
                            className={styles.recommendTag({
                              tone:
                                dest.category === "LANDMARK"
                                  ? "neutral"
                                  : "positive",
                            })}
                          >
                            {categoryLabel}
                          </span>
                          <span className={styles.recommendCode}>
                            NODE #{dest.nodeId}
                          </span>
                        </div>
                        <span className={styles.recommendName}>
                          {dest.name}
                        </span>
                      </div>
                      <span className={styles.recommendTime}>
                        {isCurrent
                          ? "현재 위치"
                          : `+${formatRaidTime(dest.travelMinutes)}`}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
        <div
          className={styles.bodySection({ visible: !isRecommendOpen })}
          inert={isRecommendOpen}
        >
          <div className={styles.bodyContent}>
            <div className={styles.telemetryGrid}>
              <div className={styles.telemetryCell}>
                <span className={styles.cellLabel}>현재 시간</span>
                <span className={styles.cellValue}>
                  {formatRaidTime(currentTime)}
                </span>
              </div>
              <div className={styles.telemetryCell}>
                <span className={styles.cellLabel}>예상 소모</span>
                <span className={styles.cellValue}>
                  {travelMinutes > 0
                    ? `+${formatRaidTime(travelMinutes)}`
                    : "—"}
                </span>
              </div>
              <div className={styles.telemetryCell}>
                <span className={styles.cellLabel}>예상 도착</span>
                <span className={styles.cellValue}>
                  {travelMinutes > 0 ? formatRaidTime(estimatedTime) : "—"}
                </span>
              </div>
            </div>

            {character?.isRaiding || isMoving || hasPending ? (
              atExtraction && !canMove && !isMoving ? (
                <button
                  type="button"
                  className={styles.primaryAction}
                  disabled={!canAct}
                  onClick={leave}
                >
                  <span>
                    {extractRaid.isPending ? "탈출 처리 중…" : "탈출하기"}
                  </span>
                  <span className={styles.actionCode}>EXTRACT →</span>
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.primaryAction}
                  disabled={!canAct || !canMove}
                  onClick={() => triggerStartNavigation((prev) => prev + 1)}
                >
                  <span>{isMoving ? "이동 중…" : "이동"}</span>
                  <span className={styles.actionCode}>
                    {targetNodeId !== null
                      ? `NODE #${targetNodeId} →`
                      : "MOVE →"}
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
        </div>
      </div>
    </div>
  );
};

export default FieldNavTargetSection;
