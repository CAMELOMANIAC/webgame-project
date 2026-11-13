import { useNavigate } from "@tanstack/react-router";
import {
  CRAFTING_RECIPES,
  findMaterialDistricts,
  firstMissionNodeId,
  formatRaidTime,
  getBuildingDistrict,
  getCatalogItemById,
  getCraftingRecipesForCategory,
  getRecipeChainForTarget,
  matchesRecipeBase,
} from "@webgame/types";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useMemo, useRef, useState } from "react";
import {
  RiBuilding2Line,
  RiCloseLine,
  RiCompass3Line,
  RiRouteLine,
} from "react-icons/ri";

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
  navigationProgressAtom,
  navigationStartTimeAtom,
  pendingBuildingCombatAtom,
  pinnedRecipeIdAtom,
  playerCoordsAtom,
  requestedBuildingIdAtom,
  requestedNodeIdAtom,
  shortestPathAtom,
  startNavigationTriggerAtom,
  targetBuildingIdAtom,
  targetNodeIdAtom,
} from "@/atoms/raidAtom";
import { useBuildingAction } from "@/utils/hooks/useBuildingAction";
import { useGetCharacter } from "@/utils/hooks/useGetCharacter";
import { useJournal } from "@/utils/hooks/useJournal";
import { useRaidRules } from "@/utils/hooks/useRaidRules";
import { useRaidSession } from "@/utils/hooks/useRaidSession";
import {
  estimatePathTravelMinutes,
  findShortestPath,
} from "@/utils/pathfinding";
import {
  ALL_BUILDINGS_BY_ID,
  BUILDING_CATEGORY_IMAGES,
  BUILDING_CATEGORY_LABELS,
  LANDMARK_BUILDING_BY_ID,
  LANDMARK_BUILDING_BY_ROAD_NODE,
  type RecommendedDestination,
  STATIC_RECOMMENDED_DESTINATIONS,
} from "@/utils/recommendedDestinations";

import * as styles from "./FieldNavTargetSection.css";

type RollDirection = "up" | "down";

function RollingDigit({
  digit,
  direction,
}: {
  digit: string;
  direction: RollDirection;
}) {
  const [digits, setDigits] = useState({ current: digit, previous: digit });
  if (digits.current !== digit) {
    setDigits({ current: digit, previous: digits.current });
  }

  return (
    <span className={styles.digitWindow}>
      {digits.previous === digit ? (
        digit
      ) : (
        <span key={digit} className={styles.digitRoll({ direction })}>
          <span>{direction === "up" ? digits.previous : digit}</span>
          <span>{direction === "up" ? digit : digits.previous}</span>
        </span>
      )}
    </span>
  );
}

function TelemetryValue({
  value,
  direction,
}: {
  value: string;
  direction?: RollDirection;
}) {
  return (
    <span className={styles.cellValue}>
      {direction ? (
        <>
          <span className={styles.accessibleValue}>{value}</span>
          <span aria-hidden="true" className={styles.digitRow}>
            {Array.from(value, (character, index) => {
              const place = value.length - index;
              return /[0-9]/.test(character) ? (
                <RollingDigit
                  key={place}
                  digit={character}
                  direction={direction}
                />
              ) : (
                <span key={place}>{character}</span>
              );
            })}
          </span>
        </>
      ) : (
        value
      )}
    </span>
  );
}

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
  const navigationProgress = useAtomValue(navigationProgressAtom);
  const navigationStartTime = useAtomValue(navigationStartTimeAtom);
  const isCombat = useAtomValue(isCombatAtom);
  const pending = useAtomValue(pendingNavigationAtom);
  const playerCoords = useAtomValue(playerCoordsAtom);
  const setRequestedNode = useSetAtom(requestedNodeIdAtom);
  const setRequestedBuilding = useSetAtom(requestedBuildingIdAtom);
  const setFocusRouteTarget = useSetAtom(focusRouteTargetAtom);
  const [isRecommendOpen, setIsRecommendOpen] = useAtom(
    isRecommendDestinationsOpenAtom,
  );
  const triggerStartNavigation = useSetAtom(startNavigationTriggerAtom);
  const setNode = useSetAtom(currentNodeIdAtom);
  const setCoords = useSetAtom(playerCoordsAtom);
  const [pinnedRecipeId, setPinnedRecipeId] = useAtom(pinnedRecipeIdAtom);
  const setPendingBuildingCombat = useSetAtom(pendingBuildingCombatAtom);
  const buildingAction = useBuildingAction();
  const [lastBuildingMsg, setLastBuildingMsg] = useState<{
    buildingId: number;
    text: string;
  } | null>(null);
  const [activeCard, setActiveCard] = useState<"nav" | "building">("nav");
  const reduceMotion = useReducedMotion();
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
    !extractRaid.isPending &&
    !buildingAction.isPending;

  const ownedItemCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const eqItem of character?.equipment ?? []) {
      if (eqItem.weaponMaster?.id) {
        counts.set(
          eqItem.weaponMaster.id,
          (counts.get(eqItem.weaponMaster.id) ?? 0) + 1,
        );
      }
    }
    for (const invItem of character?.inventory ?? []) {
      if (invItem.weaponMaster?.id) {
        counts.set(
          invItem.weaponMaster.id,
          (counts.get(invItem.weaponMaster.id) ?? 0) + invItem.quantity,
        );
      }
    }
    return counts;
  }, [character?.equipment, character?.inventory]);

  const pinnedChain = useMemo(
    () => (pinnedRecipeId ? getRecipeChainForTarget(pinnedRecipeId) : []),
    [pinnedRecipeId],
  );

  const missingPinnedMaterials = useMemo(() => {
    const needed = new Map<string, number>();
    for (const recipe of pinnedChain) {
      for (const matId of recipe.materialIds) {
        needed.set(matId, (needed.get(matId) ?? 0) + 1);
      }
    }
    const missing: { id: string; name: string }[] = [];
    for (const [matId, qty] of needed.entries()) {
      if ((ownedItemCounts.get(matId) ?? 0) < qty) {
        missing.push({
          id: matId,
          name: getCatalogItemById(matId)?.name ?? matId,
        });
      }
    }
    return missing;
  }, [pinnedChain, ownedItemCounts]);

  const exploration = character?.activeRaid?.exploration;
  const activeBuildingId = character?.activeRaid?.currentBuildingId ?? null;
  const activeBuilding =
    activeBuildingId !== null
      ? ALL_BUILDINGS_BY_ID.get(activeBuildingId)
      : undefined;
  const activeDistrict = activeBuilding
    ? getBuildingDistrict(activeBuilding)
    : undefined;
  const activeEventState =
    activeBuilding && exploration
      ? exploration.buildingEvents[String(activeBuilding.id)]
      : undefined;
  const isActiveBuildingLooted = activeBuilding
    ? (exploration?.lootedBuildingIds.includes(activeBuilding.id) ?? false)
    : false;
  const isActiveCraftUsed = activeBuilding
    ? (exploration?.usedCraftBuildingIds.includes(activeBuilding.id) ?? false)
    : false;
  const activeCategoryRecipes = activeBuilding?.category
    ? getCraftingRecipesForCategory(activeBuilding.category)
    : [];
  const canMove =
    targetNodeId !== null &&
    (shortestPath.length > 1 ||
      (shortestPath.length === 1 && targetBuildingId !== null));
  const currentTime =
    isMoving && navigationStartTime !== null
      ? navigationStartTime
      : (character?.activeRaid?.time ?? 0);
  const travelMinutes = canMove
    ? estimatePathTravelMinutes(shortestPath, targetBuildingId !== null)
    : 0;
  const estimatedTime = currentTime + travelMinutes;
  const elapsedMinutes = isMoving
    ? Math.min(travelMinutes, Math.floor(travelMinutes * navigationProgress))
    : 0;
  const displayCurrentTime = currentTime + elapsedMinutes;
  const displayRemainingMinutes = Math.max(0, travelMinutes - elapsedMinutes);
  const atExtraction = rules?.extractionNodeIds.includes(nodeId) ?? false;

  const currentLandmark = useMemo(() => {
    if (playerCoords) {
      for (const entry of LANDMARK_BUILDING_BY_ID.values()) {
        if (
          Math.hypot(
            playerCoords.x - entry.center.x,
            playerCoords.y - entry.center.y,
          ) <= 2
        ) {
          return entry.building;
        }
      }
    }
    return LANDMARK_BUILDING_BY_ROAD_NODE.get(nodeId);
  }, [playerCoords, nodeId]);

  const targetBuilding =
    targetBuildingId !== null ? ALL_BUILDINGS_BY_ID.get(targetBuildingId) : undefined;
  const targetLandmark =
    targetBuilding?.name !== undefined
      ? targetBuilding
      : targetNodeId !== null
        ? LANDMARK_BUILDING_BY_ROAD_NODE.get(targetNodeId)
        : undefined;

  const recommendedDestinations = useMemo(() => {
    const candidates: RecommendedDestination[] = [];
    const targetCategories = new Set(
      pinnedChain.map((recipe) => recipe.buildingCategory),
    );
    const usedCraftSet = new Set(exploration?.usedCraftBuildingIds ?? []);

    if (missingPinnedMaterials.length > 0) {
      const seenDistrictIds = new Set<string>();
      for (const mat of missingPinnedMaterials) {
        for (const district of findMaterialDistricts(mat.id)) {
          if (seenDistrictIds.has(district.id)) continue;
          seenDistrictIds.add(district.id);
          candidates.push({
            id: `district-${district.id}`,
            nodeId: district.centerNodeId,
            name: `${district.name} (${mat.name})`,
            category: "DISTRICT",
          });
        }
      }
    }

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
      if (
        staticDest.buildingId !== undefined &&
        usedCraftSet.has(staticDest.buildingId) &&
        targetCategories.size > 0
      ) {
        continue;
      }
      candidates.push(staticDest);
    }
    return candidates
      .map((dest) => {
        const isCurrent =
          dest.buildingId !== undefined
            ? currentLandmark?.id === dest.buildingId
            : dest.nodeId === nodeId;
        const path =
          dest.nodeId === nodeId
            ? [nodeId]
            : findShortestPath(nodeId, dest.nodeId);
        const matchesPinnedCategory =
          dest.category === "DISTRICT" ||
          (dest.buildingCategory !== undefined &&
            targetCategories.has(dest.buildingCategory));
        return {
          ...dest,
          isCurrent,
          matchesPinnedCategory,
          travelMinutes: isCurrent
            ? 0
            : estimatePathTravelMinutes(path, dest.buildingId !== undefined),
        };
      })
      .sort((a, b) => {
        if (a.matchesPinnedCategory !== b.matchesPinnedCategory) {
          return a.matchesPinnedCategory ? -1 : 1;
        }
        return a.travelMinutes - b.travelMinutes;
      });
  }, [
    pinnedChain,
    missingPinnedMaterials,
    exploration,
    journal.data?.mission,
    rules?.extractionNodeIds,
    rules?.startNodeId,
    nodeId,
    currentLandmark?.id,
  ]);

  const handleBuildingAction = (
    action: "INVESTIGATE" | "SEARCH" | "CRAFT",
    recipeId?: string,
  ) => {
    if (!character || !activeBuilding || !canAct) return;
    buildingAction.mutate(
      { characterId: character.id, action, recipeId },
      {
        onSuccess: (res) => {
          setLastBuildingMsg({ buildingId: activeBuilding.id, text: res.message });
          if (res.battleLog) {
            setPendingBuildingCombat(res.battleLog);
          }
        },
      },
    );
  };

  const handleSelectRecommendation = (dest: RecommendedDestination) => {
    setRequestedBuilding(dest.buildingId ?? null);
    setRequestedNode(dest.nodeId);
    setFocusRouteTarget((prev) => ({
      nodeId: dest.nodeId,
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

  const hasBuildingEvent = Boolean(
    activeBuilding && activeDistrict && !isMoving && character?.isRaiding,
  );
  const currentCard = hasBuildingEvent ? activeCard : "nav";
  const cardTransition = {
    type: "spring" as const,
    duration: reduceMotion ? 0 : 0.35,
    bounce: 0,
  };

  return (
    <div className={styles.cardDeck}>
      <AnimatePresence initial={false} mode="popLayout">
        {currentCard === "nav" ? (
          <motion.div
            key="nav"
            className={styles.container}
            initial={{ x: reduceMotion ? 0 : "-100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: reduceMotion ? 0 : "-100%", opacity: 0 }}
            transition={cardTransition}
          >
            <div className={styles.destinationHeader}>
              <div className={styles.destinationRow}>
                <div className={styles.titleRow}>
                  {hasBuildingEvent && (
                    <button
                      type="button"
                      className={styles.viewSwitchButton}
                      aria-label="건물 탐색 보기"
                      onClick={() => setActiveCard("building")}
                    >
                      <RiBuilding2Line />
                    </button>
                  )}
                  <strong className={styles.destinationText}>
                    {targetBuilding !== undefined
                      ? (targetBuilding.name ?? `건물 #${targetBuilding.id}`)
                      : targetNodeId !== null
                        ? (targetLandmark?.name ?? `목적지 #${targetNodeId}`)
                        : (currentLandmark?.name ?? `${locationName} #${nodeId}`)}
                  </strong>
                </div>
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
            <div className={styles.recipePinRow}>
              <select
                aria-label="목표 조합 아이템 지정"
                className={styles.recipeSelect}
                value={pinnedRecipeId ?? ""}
                onChange={(e) =>
                  setPinnedRecipeId(e.target.value ? e.target.value : null)
                }
              >
                <option value="">목표 조합 없음</option>
                {CRAFTING_RECIPES.map((recipe) => {
                  const item = getCatalogItemById(recipe.resultEquipmentId);
                  return (
                    <option key={recipe.id} value={recipe.id}>
                      [T{recipe.tier} · {BUILDING_CATEGORY_LABELS[recipe.buildingCategory]}]{" "}
                      {item?.name ?? recipe.resultEquipmentId}
                    </option>
                  );
                })}
              </select>
              {pinnedRecipeId && (
                <span className={styles.recipeNeedText}>
                  {missingPinnedMaterials.length > 0
                    ? `부족 재료: ${missingPinnedMaterials.map((m) => m.name).join(", ")}`
                    : "필요 재료 보유 완료"}
                </span>
              )}
            </div>
            <div className={styles.recommendList}>
              {recommendedDestinations.length === 0 ? (
                <p className={styles.recommendEmpty}>
                  표시할 추천 목적지가 없습니다.
                </p>
              ) : (
                recommendedDestinations.map((dest) => {
                  const isCurrent = dest.isCurrent;
                  const isSelected =
                    dest.buildingId !== undefined
                      ? targetBuildingId === dest.buildingId
                      : targetBuildingId === null && targetNodeId === dest.nodeId;
                  const categoryLabel =
                    dest.category === "MISSION"
                      ? "임무"
                      : dest.category === "EXTRACTION"
                        ? "탈출"
                        : dest.category === "DISTRICT"
                          ? "재료구역"
                          : dest.buildingCategory
                            ? BUILDING_CATEGORY_LABELS[dest.buildingCategory]
                            : "거점";
                  const backdropImage = dest.buildingCategory
                    ? BUILDING_CATEGORY_IMAGES[dest.buildingCategory]
                    : undefined;
                  return (
                    <button
                      key={dest.id}
                      type="button"
                      className={styles.recommendItem({ active: isSelected })}
                      aria-pressed={isSelected}
                      disabled={!canAct || isCurrent}
                      onClick={() => handleSelectRecommendation(dest)}
                    >
                      {backdropImage && (
                        <span
                          aria-hidden="true"
                          className={styles.recommendBackdrop}
                          style={{ backgroundImage: `url(${backdropImage})` }}
                        />
                      )}
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
                <span className={styles.cellLabel}>경과 시간</span>
                <TelemetryValue
                  value={formatRaidTime(displayCurrentTime)}
                  direction={isMoving ? "up" : undefined}
                />
              </div>
              <div className={styles.telemetryCell}>
                <span className={styles.cellLabel}>예상 소모</span>
                <TelemetryValue
                  value={
                    travelMinutes > 0
                      ? `+${formatRaidTime(displayRemainingMinutes)}`
                      : "—"
                  }
                  direction={isMoving && travelMinutes > 0 ? "down" : undefined}
                />
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
                    {targetBuilding !== undefined
                      ? (targetBuilding.name !== undefined
                          ? `${targetBuilding.name} →`
                          : `BLDG #${targetBuilding.id} →`)
                      : targetNodeId !== null
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
          </motion.div>
        ) : (
          activeBuilding &&
          activeDistrict &&
          character && (
            <motion.div
              key="building"
              className={styles.buildingEventCard}
              initial={{ x: reduceMotion ? 0 : "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: reduceMotion ? 0 : "100%", opacity: 0 }}
              transition={cardTransition}
            >
              <div className={styles.buildingEventHeader}>
                <div className={styles.titleRow}>
                  <button
                    type="button"
                    className={styles.viewSwitchButton}
                    aria-label="이동 정보 보기"
                    onClick={() => setActiveCard("nav")}
                  >
                    <RiRouteLine />
                  </button>
                  <span className={styles.buildingEventTitle}>
                    {activeBuilding.name ?? `건물 #${activeBuilding.id}`}
                    {activeBuilding.category
                      ? ` · ${BUILDING_CATEGORY_LABELS[activeBuilding.category]}`
                      : ""}
                  </span>
                </div>
                <span className={styles.districtBadge}>
                  {activeDistrict.name}
                </span>
              </div>

              <p className={styles.buildingEventText}>
                {lastBuildingMsg?.buildingId === activeBuilding.id
                  ? lastBuildingMsg.text
                  : (activeEventState?.text ??
                      "방금 전까지 사람이 있었던 흔적이 보입니다. 아직 내부에 가치 있는 것들이 남아 있을지도 모릅니다.")}
              </p>

              {buildingAction.error && (
                <p className={styles.buildingErrorText}>
                  {buildingAction.error.message}
                </p>
              )}

              {!activeEventState || activeEventState.stage === "INTRO" ? (
                <button
                  type="button"
                  className={styles.buildingActionBtn}
                  disabled={!canAct}
                  onClick={() => handleBuildingAction("INVESTIGATE")}
                >
                  <span>
                    {buildingAction.isPending ? "확인 중…" : "다음 · 내부 확인"}
                  </span>
                  <span className={styles.actionCode}>+00:10</span>
                </button>
              ) : !isActiveBuildingLooted ? (
                <button
                  type="button"
                  className={styles.buildingActionBtn}
                  disabled={!canAct}
                  onClick={() => handleBuildingAction("SEARCH")}
                >
                  <span>
                    {buildingAction.isPending ? "수색 중…" : "수색하기"}
                  </span>
                  <span className={styles.actionCode}>+00:10</span>
                </button>
              ) : (
                <p className={styles.buildingExhaustedText}>
                  이 건물은 이미 수색했습니다.
                </p>
              )}

              {activeBuilding.category && (
                <div className={styles.craftList}>
                  {isActiveCraftUsed ? (
                    <p className={styles.buildingExhaustedText}>
                      이미 조합 설비를 사용한 건물입니다.
                    </p>
                  ) : (
                    activeCategoryRecipes.map((recipe) => {
                      const resultItem = getCatalogItemById(
                        recipe.resultEquipmentId,
                      );
                      const hasBase =
                        character.equipment.some((s) =>
                          matchesRecipeBase(recipe, s.weaponMaster),
                        ) ||
                        character.inventory.some((s) =>
                          matchesRecipeBase(recipe, s.weaponMaster),
                        );
                      const matCountsNeeded = new Map<string, number>();
                      for (const mId of recipe.materialIds) {
                        matCountsNeeded.set(
                          mId,
                          (matCountsNeeded.get(mId) ?? 0) + 1,
                        );
                      }
                      const hasAllMats = [...matCountsNeeded.entries()].every(
                        ([mId, qty]) =>
                          (ownedItemCounts.get(mId) ?? 0) >= qty,
                      );
                      const baseName =
                        getCatalogItemById(recipe.baseEquipmentId)?.name ??
                        recipe.compatibleBaseNames[0] ??
                        recipe.baseEquipmentId;
                      const matNames = recipe.materialIds
                        .map((id) => getCatalogItemById(id)?.name ?? id)
                        .join(" + ");
                      return (
                        <div key={recipe.id} className={styles.craftRow}>
                          <div className={styles.craftInfo}>
                            <span className={styles.craftName}>
                              {resultItem?.name ?? recipe.resultEquipmentId}
                            </span>
                            <span className={styles.craftReqs}>
                              {baseName} + {matNames}
                            </span>
                          </div>
                          <button
                            type="button"
                            className={styles.craftActionBtn}
                            disabled={!canAct || !hasBase || !hasAllMats}
                            onClick={() =>
                              handleBuildingAction("CRAFT", recipe.id)
                            }
                          >
                            조합 +10m
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </motion.div>
          )
        )}
      </AnimatePresence>
    </div>
  );
};

export default FieldNavTargetSection;
