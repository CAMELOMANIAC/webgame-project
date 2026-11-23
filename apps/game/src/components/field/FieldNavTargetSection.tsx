import { useNavigate } from "@tanstack/react-router";
import {
  type BuildingActionInput,
  CRAFTING_RECIPES,
  type CraftingRecipe,
  FATIGUE_RULES,
  findMaterialDistricts,
  findWeaponDropDistricts,
  formatRaidTime,
  getBuildingDistrict,
  getBuildingEventById,
  getCatalogItemById,
  getCraftingRecipesForCategory,
  hasBuildingChoiceCondition,
  isBuildingLockedDown,
  LOCKDOWN_WARNING_MINUTES,
  type MapDistrict,
  matchesRecipeBase,
  MISSION_NODE_LABELS,
  resolveBuildingIntroEvent,
  resolveBuildingLockdownMinute,
  resolveBuildingMaxCraftTier,
} from "@webgame/types";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useMemo, useRef, useState } from "react";
import {
  RiBuilding2Line,
  RiCloseLine,
  RiCompass3Line,
  RiHammerLine,
  RiSearchLine,
} from "react-icons/ri";

import { resolveItemImageSrc } from "@/assets/items";
import {
  pendingNavigationAtom,
  pendingNavigationKey,
} from "@/atoms/pendingNavigationAtom";
import {
  currentNodeIdAtom,
  dismissedBuildingKeysAtom,
  focusRouteTargetAtom,
  highlightedDistrictIdsAtom,
  isCombatAtom,
  isNavigatingAtom,
  isRecommendDestinationsOpenAtom,
  navigationProgressAtom,
  navigationStartTimeAtom,
  navListModeAtom,
  pendingBuildingCombatAtom,
  pinnedRecipeIdAtom,
  playerCoordsAtom,
  raidOutroAtom,
  requestedBuildingIdAtom,
  requestedNodeIdAtom,
  shortestPathAtom,
  startNavigationTriggerAtom,
  targetBuildingIdAtom,
  targetNodeIdAtom,
} from "@/atoms/raidAtom";
import { RollingText } from "@/components/common/RollingValue";
import ItemDetailModal, {
  type InspectedItem,
} from "@/components/itemSlot/ItemDetailModal";
import ItemSlotContent from "@/components/itemSlot/ItemSlotContent";
import { useBuildingAction } from "@/utils/hooks/useBuildingAction";
import { useGetCharacter } from "@/utils/hooks/useGetCharacter";
import { useJournal } from "@/utils/hooks/useJournal";
import { useLootAction } from "@/utils/hooks/useLootAction";
import { useRaidRules } from "@/utils/hooks/useRaidRules";
import { useRaidSession } from "@/utils/hooks/useRaidSession";
import {
  estimatePathFatigueCost,
  estimatePathTravelMinutes,
  findNearestDistrictNode,
  findShortestPath,
} from "@/utils/pathfinding";
import {
  ALL_BUILDINGS_BY_ID,
  BUILDING_CATEGORY_IMAGES,
  BUILDING_CATEGORY_LABELS,
  LANDMARK_BUILDING_BY_ID,
  LANDMARK_BUILDING_BY_ROAD_NODE,
  type RecommendedDestination,
  resolveBuildingImage,
  STATIC_RECOMMENDED_DESTINATIONS,
} from "@/utils/recommendedDestinations";

import * as styles from "./FieldNavTargetSection.css";

type ActiveFieldCard = "nav" | "building" | "loot";

const FieldNavTargetSection = () => {
  const navigate = useNavigate();
  const recommendListId = useId();
  const modeSwitchLayoutId = useId();
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
  const outro = useAtomValue(raidOutroAtom);
  const [pinnedRecipeId, setPinnedRecipeId] = useAtom(pinnedRecipeIdAtom);
  const [navListMode, setNavListMode] = useAtom(navListModeAtom);
  const setHighlightedDistrictIds = useSetAtom(highlightedDistrictIdsAtom);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(
    null,
  );
  const setPendingBuildingCombat = useSetAtom(pendingBuildingCombatAtom);
  const buildingAction = useBuildingAction();
  const lootAction = useLootAction();
  const [lastBuildingMsg, setLastBuildingMsg] = useState<{
    buildingId: number;
    text: string;
  } | null>(null);
  const [dismissedBuildingKeys, setDismissedBuildingKeys] = useAtom(
    dismissedBuildingKeysAtom,
  );
  const [selectedCraftRecipeId, setSelectedCraftRecipeId] = useState<
    string | null
  >(null);
  const [inspectedRecipeItem, setInspectedRecipeItem] =
    useState<InspectedItem | null>(null);
  const [showAllDestinations, setShowAllDestinations] = useState(false);
  const [showAllRecipes, setShowAllRecipes] = useState(false);
  const reduceMotion = useReducedMotion();
  const character = data?.raw;
  const locationName =
    nodeId === (rules?.startNodeId ?? 0)
      ? "임시 대피 구역"
      : (MISSION_NODE_LABELS[nodeId] ?? "현재 위치");
  const hasPending =
    !!pending[pendingNavigationKey(character?.userId, character?.id)];
  const canAct =
    !!character?.isRaiding &&
    character.activeRaid?.status === "ACTIVE" &&
    !isMoving &&
    !isCombat &&
    !hasPending &&
    !extractRaid.isPending &&
    !buildingAction.isPending &&
    !lootAction.isPending;

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

  const ownedWeapons = useMemo(() => {
    const list: { id: string; name: string }[] = [];
    for (const eqItem of character?.equipment ?? []) {
      if (eqItem.weaponMaster) {
        list.push({ id: eqItem.weaponMaster.id, name: eqItem.weaponMaster.name });
      }
    }
    for (const invItem of character?.inventory ?? []) {
      if (invItem.weaponMaster) {
        list.push({
          id: invItem.weaponMaster.id,
          name: invItem.weaponMaster.name,
        });
      }
    }
    return list;
  }, [character?.equipment, character?.inventory]);

  const exploration = character?.activeRaid?.exploration;
  const raidId = character?.activeRaid?.id ?? "";
  const raidTime = character?.activeRaid?.time ?? 0;
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
  const isActiveBuildingLockedDown = activeBuilding
    ? isBuildingLockedDown(activeBuilding, raidTime, raidId)
    : false;
  const activeBuildingMaxCraftTier = activeBuilding
    ? resolveBuildingMaxCraftTier(activeBuilding)
    : 1;
  const activeCategoryRecipes = activeBuilding?.category
    ? getCraftingRecipesForCategory(activeBuilding.category).filter(
        (recipe) => recipe.tier <= activeBuildingMaxCraftTier,
      )
    : [];
  const completedEventIds =
    character?.activeRaid?.exploration?.completedEventIds ?? [];
  const isUnarmed =
    (character?.equipment?.filter((w) => w.weaponMaster !== null).length ??
      0) === 0;
  // 서버가 진입 시 확정한 이벤트를 우선 표시합니다.
  const activeIntroEvent = activeBuilding
    ? (getBuildingEventById(activeEventState?.eventId) ??
      resolveBuildingIntroEvent(
        activeBuilding,
        activeDistrict,
        completedEventIds,
        { isUnarmed },
      ))
    : undefined;
  const activeBuildingImage = activeBuilding
    ? resolveBuildingImage(activeBuilding, activeIntroEvent)
    : undefined;
  const isCurrentBuildingCompleted =
    activeBuildingId !== null &&
    (isActiveBuildingLockedDown ||
      activeEventState?.stage === "CLEARED" ||
      (activeBuilding?.category ? isActiveCraftUsed : isActiveBuildingLooted));
  const isAtTargetBuilding =
    shortestPath.length === 1 &&
    targetBuildingId !== null &&
    targetBuildingId === activeBuildingId;
  const isReenteringCurrentBuilding =
    isAtTargetBuilding && !isCurrentBuildingCompleted;
  const canMove =
    targetNodeId !== null &&
    (shortestPath.length > 1 ||
      (shortestPath.length === 1 &&
        targetBuildingId !== null &&
        !(isAtTargetBuilding && isCurrentBuildingCompleted)));
  const currentTime =
    isMoving && navigationStartTime !== null
      ? navigationStartTime
      : (character?.activeRaid?.time ?? 0);
  const isExhausted =
    character?.fatigue !== undefined && character.fatigue <= 0;
  const baseTravelMinutes = canMove
    ? estimatePathTravelMinutes(shortestPath, targetBuildingId !== null)
    : 0;
  const travelMinutes = canMove
    ? estimatePathTravelMinutes(
        shortestPath,
        targetBuildingId !== null,
        character?.fatigue,
      )
    : 0;
  const estimatedFatigueCost = canMove
    ? estimatePathFatigueCost(shortestPath, targetBuildingId !== null)
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
      if (staticDest.buildingId !== undefined) {
        const b = ALL_BUILDINGS_BY_ID.get(staticDest.buildingId);
        if (b && isBuildingLockedDown(b, raidTime, raidId)) continue;
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
        return {
          ...dest,
          isCurrent,
          travelMinutes: isCurrent
            ? 0
            : estimatePathTravelMinutes(
                path,
                dest.buildingId !== undefined,
                character?.fatigue,
              ),
          fatigueCost: isCurrent
            ? 0
            : estimatePathFatigueCost(path, dest.buildingId !== undefined),
        };
      })
      .sort((a, b) => a.travelMinutes - b.travelMinutes);
  }, [
    journal.data?.mission,
    rules?.extractionNodeIds,
    rules?.startNodeId,
    nodeId,
    currentLandmark?.id,
    character?.fatigue,
    raidTime,
    raidId,
  ]);

  const handleBuildingAction = (
    action: BuildingActionInput["action"],
    recipeId?: string,
    choiceId?: string,
  ) => {
    if (!character || !activeBuilding || !canAct) return;
    buildingAction.mutate(
      { characterId: character.id, action, recipeId, choiceId },
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
    setHighlightedDistrictIds([]);
    setSelectedMaterialId(null);
    setRequestedBuilding(dest.buildingId ?? null);
    setRequestedNode(dest.nodeId);
    setFocusRouteTarget((prev) => ({
      nodeId: dest.nodeId,
      seq: (prev?.seq ?? 0) + 1,
    }));
    recommendToggleRef.current?.focus({ preventScroll: true });
    setIsRecommendOpen(false);
  };

  const selectNearestDestinationForDistricts = (districts: MapDistrict[]) => {
    setHighlightedDistrictIds(districts.map((d) => d.id));
    if (districts.length === 0 || !canAct) return;
    const nearestNodeId = findNearestDistrictNode(
      nodeId,
      districts.map((d) => d.id),
    );
    if (nearestNodeId !== null) {
      setRequestedBuilding(null);
      setRequestedNode(nearestNodeId);
      setFocusRouteTarget((prev) => ({
        nodeId: nearestNodeId,
        seq: (prev?.seq ?? 0) + 1,
      }));
      recommendToggleRef.current?.focus({ preventScroll: true });
      setIsRecommendOpen(false);
    }
  };

  const routeToCraftingCategory = (
    buildingCategory: CraftingRecipe["buildingCategory"],
    requiredTier: CraftingRecipe["tier"] = 1,
  ) => {
    setHighlightedDistrictIds([]);
    if (!canAct) return;
    const usedCraftSet = new Set(exploration?.usedCraftBuildingIds ?? []);
    const matchingLandmarks = STATIC_RECOMMENDED_DESTINATIONS.filter((dest) => {
      if (dest.buildingCategory !== buildingCategory) return false;
      if (dest.buildingId !== undefined) {
        if (usedCraftSet.has(dest.buildingId)) return false;
        const b = ALL_BUILDINGS_BY_ID.get(dest.buildingId);
        if (!b) return false;
        if (isBuildingLockedDown(b, raidTime, raidId)) return false;
        if (resolveBuildingMaxCraftTier(b) < requiredTier) return false;
      }
      return true;
    });
    if (matchingLandmarks.length === 0) return;

    let nearest = matchingLandmarks[0];
    let minMinutes = Infinity;
    for (const dest of matchingLandmarks) {
      const path =
        dest.nodeId === nodeId ? [nodeId] : findShortestPath(nodeId, dest.nodeId);
      const minutes = estimatePathTravelMinutes(
        path,
        dest.buildingId !== undefined,
        character?.fatigue,
      );
      if (minutes < minMinutes) {
        minMinutes = minutes;
        nearest = dest;
      }
    }
    if (nearest) {
      handleSelectRecommendation(nearest);
    }
  };

  const handleSelectRecipeCard = (recipe: CraftingRecipe) => {
    if (pinnedRecipeId === recipe.id) {
      setPinnedRecipeId(null);
      setSelectedMaterialId(null);
      setHighlightedDistrictIds([]);
      return;
    }
    setPinnedRecipeId(recipe.id);
    setSelectedMaterialId(null);

    const missingMatIds = recipe.materialIds.filter(
      (matId) => (ownedItemCounts.get(matId) ?? 0) < 1,
    );

    if (missingMatIds.length > 0) {
      const districtMap = new Map<string, MapDistrict>();
      for (const matId of missingMatIds) {
        for (const district of findMaterialDistricts(matId)) {
          if (!districtMap.has(district.id)) {
            districtMap.set(district.id, district);
          }
        }
      }
      selectNearestDestinationForDistricts(Array.from(districtMap.values()));
      return;
    }

    routeToCraftingCategory(recipe.buildingCategory, recipe.tier);
  };

  const handleSelectBaseEquipment = (
    e: React.MouseEvent,
    recipe: CraftingRecipe,
  ) => {
    e.stopPropagation();
    const materialDistricts = findMaterialDistricts(recipe.baseEquipmentId);
    const districts =
      materialDistricts.length > 0
        ? materialDistricts
        : findWeaponDropDistricts(recipe.baseEquipmentId);
    if (districts.length > 0) {
      setPinnedRecipeId(recipe.id);
      setSelectedMaterialId(recipe.baseEquipmentId);
      selectNearestDestinationForDistricts(districts);
      return;
    }

    const baseRecipe = CRAFTING_RECIPES.find(
      (r) => r.resultEquipmentId === recipe.baseEquipmentId,
    );
    if (baseRecipe) {
      setPinnedRecipeId(baseRecipe.id);
      setSelectedMaterialId(null);
      routeToCraftingCategory(baseRecipe.buildingCategory, baseRecipe.tier);
      return;
    }

    setPinnedRecipeId(recipe.id);
    setSelectedMaterialId(recipe.baseEquipmentId);
    setHighlightedDistrictIds([]);
  };

  const handleSelectIngredient = (
    e: React.MouseEvent,
    recipe: CraftingRecipe,
    materialId: string,
  ) => {
    e.stopPropagation();
    setPinnedRecipeId(recipe.id);
    setSelectedMaterialId(materialId);
    const districts = findMaterialDistricts(materialId);
    selectNearestDestinationForDistricts(districts);
  };

  const leave = () => {
    if (!character || !canAct) return;
    extractRaid.mutate(character.id);
  };

  const pendingLoot = useMemo(
    () => exploration?.pendingLoot ?? [],
    [exploration?.pendingLoot],
  );
  const currentWeight = character?.weight ?? 0;
  const maxWeight = character?.maxWeight ?? 0;

  const claimableCount = useMemo(() => {
    let simulatedWeight = currentWeight;
    let claimable = 0;
    for (const item of pendingLoot) {
      const addWeight = item.weight * item.quantity;
      const fitsWeight = simulatedWeight + addWeight <= maxWeight;
      if (fitsWeight) {
        claimable += 1;
        simulatedWeight += addWeight;
      }
    }
    return claimable;
  }, [pendingLoot, currentWeight, maxWeight]);

  const activeBuildingDismissKey =
    raidId && activeBuildingId !== null
      ? `${raidId}:${activeBuildingId}`
      : null;
  const isBuildingDismissed = Boolean(
    activeBuildingDismissKey && dismissedBuildingKeys[activeBuildingDismissKey],
  );

  const hasBuildingEvent = Boolean(
    activeBuilding && activeDistrict && !isMoving && !isCombat && character?.isRaiding,
  );
  const canReenterBuilding = Boolean(
    hasBuildingEvent && isBuildingDismissed && !isCurrentBuildingCompleted,
  );
  const hasPendingLoot = Boolean(
    pendingLoot.length > 0 && !isMoving && !isCombat && character?.isRaiding,
  );

  const currentCard: ActiveFieldCard = hasPendingLoot
    ? "loot"
    : hasBuildingEvent && !isBuildingDismissed && !isCurrentBuildingCompleted
      ? "building"
      : "nav";
  const cardTransition = {
    type: "spring" as const,
    duration: reduceMotion ? 0 : 0.35,
    bounce: 0,
  };

  const handleClaimItem = (lootId: string) => {
    if (!character || !canAct) return;
    lootAction.mutate({ characterId: character.id, action: "CLAIM_ITEM", lootId });
  };

  const handleClaimAll = () => {
    if (!character || !canAct || claimableCount === 0) return;
    lootAction.mutate({ characterId: character.id, action: "CLAIM_ALL" });
  };

  const handleAbandonAll = () => {
    if (!character || !canAct) return;
    lootAction.mutate({ characterId: character.id, action: "ABANDON_ALL" });
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
                <strong className={styles.destinationText}>
                  {targetBuilding !== undefined
                    ? (targetBuilding.name ??
                      getBuildingDistrict(targetBuilding)?.name ??
                      "선택한 건물")
                    : targetNodeId !== null
                      ? (targetLandmark?.name ??
                        MISSION_NODE_LABELS[targetNodeId] ??
                        "선택한 목적지")
                      : (currentLandmark?.name ?? locationName)}
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
              <div className={styles.headerActions}>
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
            </div>

      <div>
        <div
          id={recommendListId}
          className={styles.bodySection({ visible: isRecommendOpen })}
          inert={!isRecommendOpen}
        >
          <div className={styles.bodyContent}>
            <div className={styles.modeSwitch} role="tablist" aria-label="목록 전환">
              <button
                type="button"
                role="tab"
                aria-selected={navListMode === "BUILDING"}
                className={styles.modeSwitchBtn({
                  active: navListMode === "BUILDING",
                })}
                onClick={() => setNavListMode("BUILDING")}
              >
                {navListMode === "BUILDING" && (
                  <motion.span
                    layoutId={modeSwitchLayoutId}
                    className={styles.modeSwitchIndicator}
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 460, damping: 34 }
                    }
                    aria-hidden="true"
                  />
                )}
                <span className={styles.modeSwitchBtnInner}>
                  <RiBuilding2Line aria-hidden="true" />
                  <span>건물</span>
                </span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={navListMode === "ITEM"}
                className={styles.modeSwitchBtn({
                  active: navListMode === "ITEM",
                })}
                onClick={() => setNavListMode("ITEM")}
              >
                {navListMode === "ITEM" && (
                  <motion.span
                    layoutId={modeSwitchLayoutId}
                    className={styles.modeSwitchIndicator}
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 460, damping: 34 }
                    }
                    aria-hidden="true"
                  />
                )}
                <span className={styles.modeSwitchBtnInner}>
                  <RiHammerLine aria-hidden="true" />
                  <span>아이템</span>
                </span>
              </button>
            </div>
            <div className={styles.recommendList}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={navListMode}
                  className={styles.recommendTabPanel}
                  initial={
                    reduceMotion
                      ? false
                      : { opacity: 0, x: navListMode === "ITEM" ? 16 : -16 }
                  }
                  animate={{ opacity: 1, x: 0 }}
                  exit={
                    reduceMotion
                      ? { opacity: 0 }
                      : { opacity: 0, x: navListMode === "ITEM" ? -16 : 16 }
                  }
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { duration: 0.16, ease: "easeOut" }
                  }
                >
                  {navListMode === "BUILDING" ? (
                recommendedDestinations.length === 0 ? (
                  <p className={styles.recommendEmpty}>
                    표시할 추천 목적지가 없습니다.
                  </p>
                ) : (() => {
                  const usedCraftSet = new Set(
                    exploration?.usedCraftBuildingIds ?? [],
                  );
                  const seenFacilityCategories = new Set<string>();
                  const coreDestinations = recommendedDestinations.filter(
                    (d) => {
                      if (
                        d.category === "MISSION" ||
                        d.category === "EXTRACTION" ||
                        d.isCurrent
                      ) {
                        return true;
                      }
                      if (d.buildingCategory) {
                        if (
                          d.buildingId !== undefined &&
                          usedCraftSet.has(d.buildingId)
                        ) {
                          return false;
                        }
                        if (seenFacilityCategories.has(d.buildingCategory)) {
                          return false;
                        }
                        seenFacilityCategories.add(d.buildingCategory);
                        return true;
                      }
                      return false;
                    },
                  );
                  const hiddenCount =
                    recommendedDestinations.length - coreDestinations.length;
                  const visibleDestinations = showAllDestinations
                    ? recommendedDestinations
                    : coreDestinations;
                  return (
                    <>
                      {visibleDestinations.map((dest) => {
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
                    const targetBuilding = dest.buildingId
                      ? ALL_BUILDINGS_BY_ID.get(dest.buildingId)
                      : undefined;
                    const craftTierBadge =
                      targetBuilding && dest.buildingCategory
                        ? resolveBuildingMaxCraftTier(targetBuilding) === 2
                          ? "T1·T2"
                          : "T1"
                        : null;
                    const lockdownMinute = targetBuilding
                      ? resolveBuildingLockdownMinute(
                          targetBuilding,
                          character?.activeRaid?.id ?? "",
                        )
                      : Number.POSITIVE_INFINITY;
                    const remainingLockdown = Number.isFinite(lockdownMinute)
                      ? lockdownMinute - (character?.activeRaid?.time ?? 0)
                      : Number.POSITIVE_INFINITY;
                    const isDestLocked =
                      Number.isFinite(remainingLockdown) &&
                      remainingLockdown <= 0;
                    const isDestWarning =
                      !isDestLocked &&
                      Number.isFinite(remainingLockdown) &&
                      remainingLockdown <= LOCKDOWN_WARNING_MINUTES;
                    return (
                      <button
                        key={dest.id}
                        type="button"
                        className={styles.recommendItem({ active: isSelected })}
                        aria-pressed={isSelected}
                        disabled={!canAct || isCurrent || isDestLocked}
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
                            <span className={styles.recommendTag}>
                              {categoryLabel}
                            </span>
                            {craftTierBadge && (
                              <span className={styles.recommendTag}>
                                {craftTierBadge}
                              </span>
                            )}
                            {isDestLocked && (
                              <span className={styles.lockdownWarningBadge}>
                                봉쇄됨
                              </span>
                            )}
                            {isDestWarning && (
                              <span className={styles.lockdownWarningBadge}>
                                봉쇄 {Math.max(1, remainingLockdown)}분 전
                              </span>
                            )}
                          </div>
                          <span className={styles.recommendName}>
                            {dest.name}
                          </span>
                        </div>
                        <span className={styles.recommendTime}>
                          {isCurrent
                            ? "현재 위치"
                            : dest.fatigueCost > 0
                              ? `+${formatRaidTime(dest.travelMinutes)} · -${dest.fatigueCost} ENG`
                              : `+${formatRaidTime(dest.travelMinutes)}`}
                        </span>
                      </button>
                    );
                      })}
                      {hiddenCount > 0 && (
                        <button
                          type="button"
                          className={styles.showMoreBtn}
                          onClick={() =>
                            setShowAllDestinations((prev) => !prev)
                          }
                        >
                          {showAllDestinations
                            ? "핵심 목적지만 보기"
                            : `전체 목적지 보기 (+${hiddenCount})`}
                        </button>
                      )}
                    </>
                  );
                })()
              ) : (() => {
                const sortedRecipes = [...CRAFTING_RECIPES].sort((a, b) => {
                  const aBase = ownedWeapons.some((w) =>
                    matchesRecipeBase(a, w),
                  );
                  const bBase = ownedWeapons.some((w) =>
                    matchesRecipeBase(b, w),
                  );
                  const aMats = a.materialIds.every(
                    (mId) => (ownedItemCounts.get(mId) ?? 0) >= 1,
                  );
                  const bMats = b.materialIds.every(
                    (mId) => (ownedItemCounts.get(mId) ?? 0) >= 1,
                  );
                  const aScore = (aBase ? 2 : 0) + (aBase && aMats ? 1 : 0);
                  const bScore = (bBase ? 2 : 0) + (bBase && bMats ? 1 : 0);
                  return bScore - aScore;
                });
                const upgradeableRecipes = sortedRecipes.filter((recipe) =>
                  ownedWeapons.some((w) => matchesRecipeBase(recipe, w)),
                );
                const visibleRecipes = showAllRecipes
                  ? sortedRecipes
                  : upgradeableRecipes;
                const hasHiddenRecipes =
                  sortedRecipes.length > upgradeableRecipes.length;

                return (
                  <>
                    {visibleRecipes.length === 0 ? (
                      <p className={styles.recommendEmpty}>
                        현재 보유 장비로 업그레이드 가능한 레시피가 없습니다.
                      </p>
                    ) : (
                      visibleRecipes.map((recipe) => {
                  const resultCatalog = getCatalogItemById(
                    recipe.resultEquipmentId,
                  );
                  const resultName =
                    resultCatalog?.name ?? recipe.resultEquipmentId;
                  const baseName =
                    getCatalogItemById(recipe.baseEquipmentId)?.name ??
                    recipe.baseEquipmentId;
                  const itemBackdrop = resolveItemImageSrc(
                    recipe.resultEquipmentId,
                    resultName,
                  );
                  const hasBase = ownedWeapons.some((w) =>
                    matchesRecipeBase(recipe, w),
                  );
                  const isCardSelected = pinnedRecipeId === recipe.id;

                  return (
                    <div
                      key={recipe.id}
                      role="button"
                      tabIndex={0}
                      className={styles.recipeCard({ active: isCardSelected })}
                      onClick={() => handleSelectRecipeCard(recipe)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleSelectRecipeCard(recipe);
                        }
                      }}
                    >
                      {itemBackdrop && (
                        <span
                          aria-hidden="true"
                          className={styles.recipeBackdropWrap}
                        >
                          <span
                            className={styles.recipeBackdrop}
                            style={{ backgroundImage: `url(${itemBackdrop})` }}
                          />
                        </span>
                      )}
                      <div className={styles.recipeCardContent}>
                        <div className={styles.recipeHeader}>
                          <div className={styles.recipeTitleGroup}>
                            <span className={styles.recommendTag}>
                              T{recipe.tier} ·{" "}
                              {BUILDING_CATEGORY_LABELS[recipe.buildingCategory]}
                            </span>
                            <span className={styles.recipeName}>
                              {resultName}
                            </span>
                          </div>
                          {resultCatalog && (
                            <button
                              type="button"
                              className={styles.recipeDetailBtn}
                              aria-label={`${resultName} 상세 보기`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setInspectedRecipeItem({
                                  id: resultCatalog.id,
                                  masterId: resultCatalog.id,
                                  name: resultCatalog.name,
                                  iconKey: resultCatalog.iconKey,
                                  weight: resultCatalog.weight,
                                  value: resultCatalog.value,
                                  weaponData: resultCatalog,
                                });
                              }}
                            >
                              <RiSearchLine size={14} aria-hidden="true" />
                            </button>
                          )}
                        </div>
                        <div className={styles.recipeIngredientsRow}>
                          <button
                            type="button"
                            className={styles.recipeBaseBadge({
                              owned: hasBase,
                              selected:
                                isCardSelected &&
                                selectedMaterialId === recipe.baseEquipmentId,
                            })}
                            onClick={(e) => handleSelectBaseEquipment(e, recipe)}
                          >
                            {baseName}
                          </button>
                          {recipe.materialIds.map((matId) => {
                            const matName =
                              getCatalogItemById(matId)?.name ?? matId;
                            const hasMat =
                              (ownedItemCounts.get(matId) ?? 0) >= 1;
                            const isMatSelected =
                              isCardSelected && selectedMaterialId === matId;
                            return (
                              <button
                                key={matId}
                                type="button"
                                className={styles.ingredientChip({
                                  owned: hasMat,
                                  selected: isMatSelected,
                                })}
                                onClick={(e) =>
                                  handleSelectIngredient(e, recipe, matId)
                                }
                              >
                                {matName}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                      })
                    )}
                    {hasHiddenRecipes && (
                      <button
                        type="button"
                        className={styles.showMoreBtn}
                        onClick={() => setShowAllRecipes((prev) => !prev)}
                      >
                        {showAllRecipes
                          ? "보유 장비 업그레이드만 보기"
                          : `전체 레시피 보기 (${sortedRecipes.length})`}
                      </button>
                    )}
                  </>
                );
              })()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
        <div
          className={styles.bodySection({ visible: !isRecommendOpen })}
          inert={isRecommendOpen}
        >
          <div className={styles.bodyContent}>
            <div className={styles.telemetryGroup}>
              <div className={styles.telemetryGrid}>
                <div className={styles.telemetryCell}>
                  <span className={styles.cellLabel}>경과 시간</span>
                  <RollingText
                    className={styles.cellValue}
                    value={formatRaidTime(displayCurrentTime)}
                    direction={isMoving ? "up" : undefined}
                  />
                </div>
                <div className={styles.telemetryCell}>
                  <span className={styles.cellLabel}>예상 소모</span>
                  <span className={styles.cellValueRow}>
                    <RollingText
                      className={styles.cellValue}
                      value={
                        travelMinutes > 0
                          ? `+${formatRaidTime(
                              isExhausted && !isMoving
                                ? baseTravelMinutes
                                : displayRemainingMinutes,
                            )}`
                          : "—"
                      }
                      direction={isMoving && travelMinutes > 0 ? "down" : undefined}
                    />
                    {isExhausted && !isMoving && travelMinutes > 0 && (
                      <span className={styles.exhaustedMultiplier}>×1.5</span>
                    )}
                  </span>
                </div>
                <div className={styles.telemetryCell}>
                  <span className={styles.cellLabel}>예상 도착</span>
                  <span className={styles.cellValue}>
                    {travelMinutes > 0 ? formatRaidTime(estimatedTime) : "—"}
                  </span>
                </div>
              </div>

              <div
                className={styles.pathRiskLegendWrap({
                  visible: targetNodeId !== null && travelMinutes > 0,
                })}
                aria-hidden={!(targetNodeId !== null && travelMinutes > 0)}
              >
                <div className={styles.pathRiskLegendInner}>
                  <div className={styles.pathRiskLegend} aria-label="경로 위험도 범례">
                    <span className={styles.pathRiskItem}>
                      <span className={styles.pathRiskSwatch({ tier: "safe" })} aria-hidden="true" />
                      안전 구간
                    </span>
                    <span className={styles.pathRiskItem}>
                      <span className={styles.pathRiskSwatch({ tier: "medium" })} aria-hidden="true" />
                      보통 구간
                    </span>
                    <span className={styles.pathRiskItem}>
                      <span className={styles.pathRiskSwatch({ tier: "high" })} aria-hidden="true" />
                      높은 위험
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {character?.isRaiding || isMoving || hasPending || Boolean(outro) ? (
              atExtraction && !canMove && !isMoving && !canReenterBuilding ? (
                <button
                  type="button"
                  className={styles.primaryAction}
                  disabled={!canAct}
                  onClick={leave}
                >
                  {extractRaid.isPending ? "탈출 처리 중…" : "탈출하기"}
                </button>
              ) : (() => {
                const isReenter =
                  isReenteringCurrentBuilding || (canReenterBuilding && !canMove);
                const selectedDestBuilding =
                  targetBuildingId !== null
                    ? ALL_BUILDINGS_BY_ID.get(targetBuildingId)
                    : undefined;
                const willTargetLockBeforeArrival =
                  !isMoving &&
                  canMove &&
                  !isReenter &&
                  !!selectedDestBuilding &&
                  isBuildingLockedDown(
                    selectedDestBuilding,
                    estimatedTime,
                    raidId,
                  );
                const showFatigueCost =
                  !isMoving &&
                  !isReenter &&
                  !willTargetLockBeforeArrival &&
                  estimatedFatigueCost > 0;
                return (
                  <button
                    type="button"
                    className={
                      showFatigueCost
                        ? styles.primaryActionWithCost
                        : styles.primaryAction
                    }
                    disabled={
                      !canAct ||
                      (!canMove && !canReenterBuilding) ||
                      willTargetLockBeforeArrival
                    }
                    onClick={() => {
                      if (
                        canReenterBuilding &&
                        (!canMove ||
                          (shortestPath.length === 1 &&
                            targetBuildingId === activeBuildingId))
                      ) {
                        if (activeBuildingDismissKey) {
                          setDismissedBuildingKeys((prev) => {
                            if (!prev[activeBuildingDismissKey]) return prev;
                            const next = { ...prev };
                            delete next[activeBuildingDismissKey];
                            return next;
                          });
                        }
                        return;
                      }
                      triggerStartNavigation((prev) => prev + 1);
                    }}
                  >
                    <span>
                      {isMoving
                        ? "이동 중…"
                        : isReenter
                          ? "건물 진입"
                          : willTargetLockBeforeArrival
                            ? "도착 전 봉쇄됨"
                            : "이동"}
                    </span>
                    {showFatigueCost && (
                      <span className={styles.actionCode}>
                        -{estimatedFatigueCost} ENG
                      </span>
                    )}
                  </button>
                );
              })()
            ) : (
              character && (
                <button
                  type="button"
                  className={styles.primaryAction}
                  onClick={() => void navigate({ to: "/base" })}
                >
                  거점으로 돌아가기
                </button>
              )
            )}
          </div>
        </div>
      </div>
          </motion.div>
        ) : currentCard === "loot" && character ? (
          <motion.div
            key="loot"
            className={styles.lootCard}
            initial={{ x: reduceMotion ? 0 : "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: reduceMotion ? 0 : "100%", opacity: 0 }}
            transition={cardTransition}
          >
            <div className={styles.lootHeader}>
              <span className={styles.lootTitle}>전리품 회수</span>
            </div>

            {lootAction.error && (
              <p className={styles.buildingErrorText}>
                {lootAction.error.message}
              </p>
            )}

            <div className={styles.lootList}>
              {pendingLoot.map((item) => {
                const itemWeight = item.weight * item.quantity;
                const canFitWeight = currentWeight + itemWeight <= maxWeight;
                const isBlocked = !canFitWeight;

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={styles.lootRow({ blocked: isBlocked })}
                    disabled={!canAct || isBlocked}
                    aria-label={item.name}
                    onClick={() => handleClaimItem(item.id)}
                  >
                    <span className={styles.lootSlotWeight}>
                      {itemWeight}kg
                    </span>
                    <ItemSlotContent
                      name={item.name}
                      itemId={item.weaponMasterId}
                      iconKey={item.iconKey}
                      quantity={item.quantity}
                    />
                  </button>
                );
              })}
            </div>

            <div className={styles.lootBulkRow}>
              <button
                type="button"
                className={styles.primaryAction}
                disabled={!canAct || claimableCount === 0}
                onClick={handleClaimAll}
              >
                모두 회수 ({claimableCount})
              </button>
              <button
                type="button"
                className={styles.lootAbandonBtn}
                disabled={!canAct}
                onClick={handleAbandonAll}
              >
                전리품 포기
              </button>
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
              <div className={styles.buildingEventContent}>
                <div className={styles.buildingEventHero}>
                  {activeBuildingImage && (
                    <div
                      className={styles.buildingEventImageWrap}
                      aria-hidden="true"
                    >
                      <img
                        src={activeBuildingImage}
                        alt=""
                        className={styles.buildingEventImage}
                      />
                    </div>
                  )}

                  <div className={styles.buildingEventHeader}>
                    <span className={styles.buildingEventTitle}>
                      {activeBuilding.name ?? activeDistrict.name}
                      {activeBuilding.category
                        ? ` · ${BUILDING_CATEGORY_LABELS[activeBuilding.category]} (${activeBuildingMaxCraftTier >= 2 ? "T1·T2" : "T1"})`
                        : ""}
                    </span>
                    <div className={styles.headerActions}>
                      <span className={styles.districtBadge}>
                        {activeDistrict.name}
                      </span>
                    </div>
                  </div>

                  <p className={styles.buildingEventText}>
                    {isActiveBuildingLockedDown
                      ? "봉쇄 구역에 포함되어 더 이상 진입·이용할 수 없는 건물입니다."
                      : activeBuilding.category && isActiveCraftUsed
                        ? "이미 업그레이드 설비를 사용한 건물입니다."
                        : lastBuildingMsg?.buildingId === activeBuilding.id
                          ? lastBuildingMsg.text
                          : (activeEventState?.text ??
                              activeIntroEvent?.introText ??
                              "")}
                  </p>
                </div>

              {buildingAction.error && (
                <p className={styles.buildingErrorText}>
                  {buildingAction.error.message}
                </p>
              )}

              {!isActiveBuildingLockedDown &&
                !activeBuilding.category &&
                !isActiveBuildingLooted &&
                (activeIntroEvent?.choices &&
                activeIntroEvent.choices.length > 0 ? (
                  <div className={styles.buildingChoiceList}>
                    {activeIntroEvent.choices.map((choice) => {
                      const ownedItemIds = [...ownedItemCounts.keys()];
                      const conditionMet = hasBuildingChoiceCondition(
                        choice,
                        ownedItemIds,
                      );
                      const fatigueCost = choice.fatigueCost ?? 0;
                      const isLowFatigue =
                        fatigueCost > 0 &&
                        (character.fatigue ?? 0) < fatigueCost;
                      const mins = choice.timeCostMinutes ?? 10;
                      const timeLabel = `+${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
                      const actionLabel =
                        fatigueCost > 0
                          ? `${timeLabel} · -${fatigueCost} ENG`
                          : timeLabel;
                      return (
                        <button
                          key={choice.id}
                          type="button"
                          className={styles.buildingActionBtn}
                          disabled={!canAct || !conditionMet}
                          onClick={() =>
                            handleBuildingAction(
                              "EVENT_CHOICE",
                              undefined,
                              choice.id,
                            )
                          }
                        >
                          <span className={styles.buildingChoiceTextGroup}>
                            <span>{choice.label}</span>
                            {choice.condition && (
                              <span className={styles.buildingChoiceCondition}>
                                조건: {choice.condition.label}
                              </span>
                            )}
                          </span>
                          <span className={styles.actionCode}>
                            {actionLabel}
                            {isLowFatigue && (
                              <span className={styles.exhaustedMultiplier}>
                                {" "}
                                ×1.5
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (() => {
                  const searchCost = FATIGUE_RULES.buildingActionCosts.SEARCH;
                  const isLowSearchFatigue =
                    (character.fatigue ?? 0) < searchCost;
                  return (
                    <button
                      type="button"
                      className={styles.buildingActionBtn}
                      disabled={!canAct}
                      onClick={() => handleBuildingAction("SEARCH")}
                    >
                      <span>
                        {buildingAction.isPending
                          ? "탐색 중…"
                          : (activeIntroEvent?.searchLabel ?? "탐색하기")}
                      </span>
                      <span className={styles.actionCode}>
                        +00:10 · -{searchCost} ENG
                        {isLowSearchFatigue && (
                          <span className={styles.exhaustedMultiplier}>
                            {" "}
                            ×1.5
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })())}

              {!isActiveBuildingLockedDown &&
                activeBuilding.category &&
                !isActiveCraftUsed && (() => {
                const craftEntries = activeCategoryRecipes.map((recipe) => {
                  const resultItem = getCatalogItemById(
                    recipe.resultEquipmentId,
                  );
                  const resultName =
                    resultItem?.name ?? recipe.resultEquipmentId;
                  const baseName =
                    getCatalogItemById(recipe.baseEquipmentId)?.name ??
                    recipe.compatibleBaseNames[0] ??
                    recipe.baseEquipmentId;
                  const itemBackdrop = resolveItemImageSrc(
                    recipe.resultEquipmentId,
                    resultName,
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
                    ([mId, qty]) => (ownedItemCounts.get(mId) ?? 0) >= qty,
                  );
                  return {
                    recipe,
                    resultItem,
                    resultName,
                    baseName,
                    itemBackdrop,
                    hasBase,
                    canCraft: hasBase && hasAllMats,
                  };
                });
                const selectedEntry =
                  craftEntries.find(
                    (entry) => entry.recipe.id === selectedCraftRecipeId,
                  ) ??
                  craftEntries.find((entry) => entry.canCraft) ??
                  craftEntries[0];
                const hasEnoughCraftFatigue =
                  (character.fatigue ?? 0) >=
                  FATIGUE_RULES.buildingActionCosts.CRAFT;
                return (
                  <>
                    <div
                      className={styles.craftList}
                      role="radiogroup"
                      aria-label="조합 레시피 선택"
                    >
                      {craftEntries.map((entry) => {
                        const isSelected =
                          selectedEntry?.recipe.id === entry.recipe.id;
                        const matSeenCounts = new Map<string, number>();
                        return (
                          <label
                            key={entry.recipe.id}
                            className={styles.craftOption({
                              selected: isSelected,
                              unavailable: !entry.canCraft,
                            })}
                          >
                            <input
                              type="radio"
                              name={`craft-recipe-${activeBuilding.id}`}
                              value={entry.recipe.id}
                              checked={isSelected}
                              disabled={!canAct}
                              onChange={() =>
                                setSelectedCraftRecipeId(entry.recipe.id)
                              }
                              className={styles.craftRadioInput}
                            />
                            {entry.itemBackdrop && (
                              <span
                                aria-hidden="true"
                                className={styles.recipeBackdropWrap}
                              >
                                <span
                                  className={styles.recipeBackdrop}
                                  style={{
                                    backgroundImage: `url(${entry.itemBackdrop})`,
                                  }}
                                />
                              </span>
                            )}
                            <span
                              className={styles.craftRadioIndicator({
                                selected: isSelected,
                              })}
                              aria-hidden="true"
                            />
                            <div className={styles.craftCardContent}>
                              <div className={styles.recipeHeader}>
                                <div className={styles.recipeTitleGroup}>
                                  <span className={styles.recommendTag}>
                                    T{entry.recipe.tier}
                                  </span>
                                  <span className={styles.recipeName}>
                                    {entry.resultName}
                                  </span>
                                </div>
                                {entry.resultItem && (
                                  <button
                                    type="button"
                                    className={styles.recipeDetailBtn}
                                    aria-label={`${entry.resultName} 상세 보기`}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      if (!entry.resultItem) return;
                                      setInspectedRecipeItem({
                                        id: entry.resultItem.id,
                                        masterId: entry.resultItem.id,
                                        name: entry.resultItem.name,
                                        iconKey: entry.resultItem.iconKey,
                                        weight: entry.resultItem.weight,
                                        value: entry.resultItem.value,
                                        weaponData: entry.resultItem,
                                      });
                                    }}
                                  >
                                    <RiSearchLine size={14} aria-hidden="true" />
                                  </button>
                                )}
                              </div>
                              <div className={styles.recipeIngredientsRow}>
                                <span
                                  className={styles.recipeBaseBadge({
                                    owned: entry.hasBase,
                                  })}
                                >
                                  {entry.baseName}
                                </span>
                                {entry.recipe.materialIds.map((matId, idx) => {
                                  const seen =
                                    (matSeenCounts.get(matId) ?? 0) + 1;
                                  matSeenCounts.set(matId, seen);
                                  const matName =
                                    getCatalogItemById(matId)?.name ?? matId;
                                  const hasMat =
                                    (ownedItemCounts.get(matId) ?? 0) >= seen;
                                  return (
                                    <span
                                      key={`${matId}-${idx}`}
                                      className={styles.ingredientChip({
                                        owned: hasMat,
                                      })}
                                    >
                                      {matName}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                    {selectedEntry && (
                      <button
                        type="button"
                        className={styles.craftSubmitBtn}
                        disabled={!canAct || !selectedEntry.canCraft}
                        onClick={() =>
                          handleBuildingAction("CRAFT", selectedEntry.recipe.id)
                        }
                      >
                        <span>
                          {buildingAction.isPending ? "조합 중…" : "조합하기"}
                        </span>
                        <span className={styles.actionCode}>
                          +00:10 · -{FATIGUE_RULES.buildingActionCosts.CRAFT}{" "}
                          ENG
                          {!hasEnoughCraftFatigue && (
                            <span className={styles.exhaustedMultiplier}>
                              {" "}
                              ×1.5
                            </span>
                          )}
                        </span>
                      </button>
                    )}
                  </>
                );
              })()}

              <button
                type="button"
                className={styles.buildingDismissBtn}
                disabled={!canAct}
                onClick={() => {
                  if (activeBuildingDismissKey) {
                    setDismissedBuildingKeys((prev) => ({
                      ...prev,
                      [activeBuildingDismissKey]: true,
                    }));
                  }
                }}
              >
                {isActiveBuildingLockedDown ||
                (!activeBuilding.category && isActiveBuildingLooted) ||
                (Boolean(activeBuilding.category) && isActiveCraftUsed)
                  ? "빠져나간다"
                  : "그냥 넘어간다"}
              </button>
              </div>
            </motion.div>
          )
        )}
      </AnimatePresence>
      <ItemDetailModal
        item={inspectedRecipeItem}
        onClose={() => setInspectedRecipeItem(null)}
      />
    </div>
  );
};

export default FieldNavTargetSection;
