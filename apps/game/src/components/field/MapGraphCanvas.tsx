import type { UseMutationResult } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import {
  type BattleLog,
  type DistrictKind,
  getBuildingDistrict,
  MAP_DISTRICTS,
  type MapBuilding,
} from "@webgame/types";
import { getDefaultStore, useAtom, useAtomValue, useSetAtom } from "jotai";
import { Application, Container, Graphics, Sprite, Text, TextStyle } from "pixi.js";
import { memo, useEffect, useMemo, useRef, useState } from "react";

import compass from "@/assets/compass.svg";
import { selectedUserIdAtom } from "@/atoms/authAtom";
import { pendingNavigationAtom, pendingNavigationKey } from "@/atoms/pendingNavigationAtom";
import {
  currentNodeIdAtom,
  enemyNoiseSignalsAtom,
  focusPlayerTriggerAtom,
  focusRouteTargetAtom,
  followPlayerAtom,
  isInventoryDirtyAtom,
  isNavigatingAtom,
  navigationProgressAtom,
  navigationStartTimeAtom,
  playerCoordsAtom,
  playerRotationAtom,
  raidNoiseState,
  requestedBuildingIdAtom,
  requestedNodeIdAtom,
  shortestPathAtom,
  startNavigationTriggerAtom,
  targetBuildingIdAtom,
  targetNodeIdAtom,
} from "@/atoms/raidAtom";
import { getBuildingCenter } from "@/utils/getBuildingCenter";
import { useGetCharacter } from "@/utils/hooks/useGetCharacter";
import type { NavigateRaidParams, NavigateRaidResponse } from "@/utils/hooks/useNavigateRaid";
import { useRaidRules } from "@/utils/hooks/useRaidRules";
import { findShortestPath } from "@/utils/pathfinding";
import { createNoiseRipple } from "@/utils/pixiNoiseRipple";
import { getFogOfWarTexture, loadCompassTexture } from "@/utils/pixiTextures";
import { Easings, runTween, type TweenHandle } from "@/utils/pixiTween";
import { createRTreeIndex, searchRTreeIndex } from "@/utils/rtreeCulling";

import mapData from "../../../../../packages/types/src/assets/map_graph.json";
import * as styles from "./MapGraphCanvas.css";

interface Node {
  x: number;
  y: number;
}

interface IndexedNode {
  id: number;
  x: number;
  y: number;
}

interface Edge {
  source: number;
  target: number;
  type: "minor" | "major" | "main";
}

interface Building extends MapBuilding {
  flatPoints: number[]; // 렌더링 성능 최적화를 위해 플랫화된 정점 캐시
}

interface WaterPoint {
  x: number;
  y: number;
}

const DISTRICT_COLORS: Record<DistrictKind, number> = {
  RESIDENTIAL: 0x5c80b8,
  COMMERCIAL: 0x85adff,
  INDUSTRIAL: 0xd98e5f,
  MEDICAL: 0xff7162,
  INFRA: 0x7c9eb2,
};

const BUILDING_CATEGORY_KO: Record<string, string> = {
  COMMERCIAL: "상업",
  PUBLIC: "공공",
  MEDICAL: "의료",
  LOGISTICS: "물류",
  INFRA: "기반",
  CULTURAL: "문화",
};
type Water = WaterPoint[];

const nodes = mapData.nodes as Node[];
const edges = mapData.edges as unknown as Edge[];

const MIN_ZOOM_SCALE = 0.2;
const MAX_ZOOM_SCALE = 10;
const FOG_VISIBLE_MIN_SCALE = 1.0;
const NOISE_PULSE_SECONDS = 1.35;
const NOISE_ECHO_DELAY_SECONDS = 0.3;
const NOISE_ECHO_STRENGTH = 0.55;
const NOISE_PULSE_INTERVAL_MS = 3000;

function syncFogVisibility(
  sightMaskSprite: Sprite | null,
  scale: number,
  hasPlayerCoords: boolean,
) {
  if (sightMaskSprite && !sightMaskSprite.destroyed) {
    sightMaskSprite.visible = hasPlayerCoords && scale >= FOG_VISIBLE_MIN_SCALE;
  }
}
const MAP_BOUNDS = nodes.reduce(
  (acc, node) => ({
    minX: Math.min(acc.minX, node.x),
    maxX: Math.max(acc.maxX, node.x),
    minY: Math.min(acc.minY, node.y),
    maxY: Math.max(acc.maxY, node.y),
  }),
  { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
);

/** 뷰포트 중심이 지도 노드 경계를 벗어나지 않도록 월드 좌표를 제한한다. */
function clampWorldPosition(
  x: number,
  y: number,
  scale: number,
  viewportWidth: number,
  viewportHeight: number,
): { x: number; y: number } {
  if (!Number.isFinite(MAP_BOUNDS.minX) || viewportWidth <= 0 || viewportHeight <= 0) {
    return { x, y };
  }
  const halfW = viewportWidth / 2;
  const halfH = viewportHeight / 2;
  const minWorldX = halfW - MAP_BOUNDS.maxX * scale;
  const maxWorldX = halfW - MAP_BOUNDS.minX * scale;
  const minWorldY = halfH - MAP_BOUNDS.maxY * scale;
  const maxWorldY = halfH - MAP_BOUNDS.minY * scale;
  return {
    x: Math.max(minWorldX, Math.min(maxWorldX, x)),
    y: Math.max(minWorldY, Math.min(maxWorldY, y)),
  };
}

// 빌딩 렌더링 고속화를 위해 coordinates 배열을 1차원 플랫 구조로 미리 변환 (모듈 스코프 1회 수행)
const buildings = ((mapData.buildings || []) as unknown as Building[]).map((b) => ({
  ...b,
  flatPoints: b.coordinates.flatMap((p) => [p.x, p.y]),
}));

const water = (mapData.water || []) as unknown as Water;

// 폴리곤 렌더링에 적합하도록 통합된 물 좌표 배열을 1차원 플랫 구조로 변환
const waterPoints = water.flatMap((p) => [p.x, p.y]);

function isPointInPolygon(x: number, y: number, polygon: { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i]!.x;
    const yi = polygon[i]!.y;
    const xj = polygon[j]!.x;
    const yj = polygon[j]!.y;
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// 2D R-tree (rbush) 인덱스 구축 (STR Bulk-loading 1회 사전 생성)
const indexedNodes: IndexedNode[] = nodes.map((n, idx) => ({ id: idx, x: n.x, y: n.y }));

const nodesRTreeResult = createRTreeIndex(indexedNodes, (item) => ({
  minX: item.x,
  minY: item.y,
  maxX: item.x,
  maxY: item.y,
}));

const buildingsRTreeResult = createRTreeIndex(buildings, (b) => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  b.coordinates.forEach((p) => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });
  return { minX, minY, maxX, maxY };
});

const nodeTreeBuildTimeMs = nodesRTreeResult.buildTimeMs;
const buildingTreeBuildTimeMs = buildingsRTreeResult.buildTimeMs;
const nodesRTree = nodesRTreeResult.tree;
const buildingsRTree = buildingsRTreeResult.tree;

const buildCoordPath = (
  path: number[],
  startPos: { x: number; y: number },
  targetB: Building | null,
) => {
  const coordPath: { x: number; y: number }[] = [];
  if (path.length <= 1) {
    if (path.length !== 1 || !targetB || targetB.roadNodeId !== path[0]) {
      return coordPath;
    }
    const destination = getBuildingCenter(targetB);
    return Math.hypot(destination.x - startPos.x, destination.y - startPos.y) > 0.1
      ? [startPos, destination]
      : coordPath;
  }

  const startNode = nodes[path[0]];
  if (startNode) {
    const dx = startPos.x - startNode.x;
    const dy = startPos.y - startNode.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 2) {
      coordPath.push({ x: startPos.x, y: startPos.y });
    }
  }

  path.forEach((idx) => {
    const node = nodes[idx];
    if (node) {
      coordPath.push({ x: node.x, y: node.y });
    }
  });

  if (targetB) {
    coordPath.push(getBuildingCenter(targetB));
  }

  return coordPath;
};

function drawPathLineGraphics(g: Graphics, points: number[]) {
  if (g.destroyed) return;
  g.clear();
  if (points.length < 4) return;

  g.alpha = 0.65;
  g.moveTo(points[0]!, points[1]!);
  for (let i = 2; i < points.length; i += 2) {
    g.lineTo(points[i]!, points[i + 1]!);
  }
  g.stroke({
    width: 5,
    color: 0xffffff,
    alpha: 1,
    cap: "round",
    join: "round",
  });
}

const DEFAULT_NODE_COLOR_HEX = "#8e95a5";
const DEFAULT_NODE_COLOR_NUM = 0x8e95a5;
const DEFAULT_NODE_RADIUS = 4;

interface MapGraphCanvasProps {
  isCombat?: boolean;
  navigateRaid: UseMutationResult<NavigateRaidResponse, Error, NavigateRaidParams>;
  triggerCombat: (log: BattleLog) => void;
}

const MapGraphCanvas = ({ isCombat = false, navigateRaid, triggerCombat }: MapGraphCanvasProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasHostRef = useRef<HTMLDivElement | null>(null);

  const appRef = useRef<Application | null>(null);
  const worldContainerRef = useRef<Container | null>(null);
  const edgesGraphicsRef = useRef<Graphics | null>(null);
  const buildingsContainerRef = useRef<Container | null>(null);
  const nodesGraphicsRef = useRef<Graphics | null>(null);
  const hoverHighlightGraphicsRef = useRef<Graphics | null>(null);
  const explorationGraphicsRef = useRef<Graphics | null>(null);
  const exitContainerRef = useRef<Container | null>(null);
  const pathLineGraphicsRef = useRef<Graphics | null>(null);
  const targetMarkerGroupRef = useRef<Container | null>(null);
  const sightMaskSpriteRef = useRef<Sprite | null>(null);
  const playerMarkerSpriteRef = useRef<Sprite | null>(null);
  const noiseRippleRef = useRef<ReturnType<typeof createNoiseRipple>>(null);

  const [isPixiReady, setIsPixiReady] = useState(false);
  const focusTweenRef = useRef<TweenHandle | null>(null);
  const focusPlayerTrigger = useAtomValue(focusPlayerTriggerAtom);
  const focusRouteTarget = useAtomValue(focusRouteTargetAtom);
  const startNavigationTrigger = useAtomValue(startNavigationTriggerAtom);

  const { data: characterData } = useGetCharacter();
  const exploration = characterData?.raw.activeRaid?.exploration;
  const explorationRef = useRef(exploration);
  useEffect(() => {
    explorationRef.current = exploration;
  }, [exploration]);
  const [noiseSignals, setNoiseSignals] = useAtom(enemyNoiseSignalsAtom);
  const activeRaidId = characterData?.raw.activeRaid?.id;
  const queryClient = useQueryClient();
  const [isInventoryDirty, setIsInventoryDirty] = useAtom(isInventoryDirtyAtom);

  // 1-Hop Gate 를 위한 서버 응답 저장 Ref 및 비주얼 상 경로 단절 스포일러 방지용 원본 경로 Ref
  const navigateRaidResponseRef = useRef<NavigateRaidResponse | null>(null);

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [stageTransform, setStageTransform] = useState({
    x: 0,
    y: 0,
    scale: 3.0,
  });

  const [showNodes, setShowNodes] = useState(false);
  const [showEdges, setShowEdges] = useState(true);
  const [showBuildings, setShowBuildings] = useState(true);
  const [isOptionsExpanded, setIsOptionsExpanded] = useState(false);
  const [isStatusExpanded, setIsStatusExpanded] = useState(true);

  const showNodesRef = useRef(showNodes);
  const showBuildingsRef = useRef(showBuildings);
  const isCombatRef = useRef(isCombat);
  const isNavigatingRef = useRef(isNavigatingAtom);

  useEffect(() => {
    showNodesRef.current = showNodes;
    if (nodesGraphicsRef.current && !nodesGraphicsRef.current.destroyed) {
      nodesGraphicsRef.current.visible = showNodes;
    }
    if (hoverHighlightGraphicsRef.current && !hoverHighlightGraphicsRef.current.destroyed) {
      hoverHighlightGraphicsRef.current.clear();
    }
  }, [showNodes]);

  useEffect(() => {
    if (edgesGraphicsRef.current && !edgesGraphicsRef.current.destroyed) {
      edgesGraphicsRef.current.visible = showEdges;
    }
  }, [showEdges]);

  useEffect(() => {
    showBuildingsRef.current = showBuildings;
    if (buildingsContainerRef.current && !buildingsContainerRef.current.destroyed) {
      buildingsContainerRef.current.visible = showBuildings;
    }
    if (hoverHighlightGraphicsRef.current && !hoverHighlightGraphicsRef.current.destroyed) {
      hoverHighlightGraphicsRef.current.clear();
    }
  }, [showBuildings]);

  // 개발 환경의 설정에 따라 디버그 오버레이 노출 여부 결정
  const [showDevPanel] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const isDevParam = params.get("dev") === "true";
      const isDevStorage = localStorage.getItem("dev_mode") === "true";
      return !!(import.meta.env.DEV && (isDevParam || isDevStorage));
    }
    return false;
  });

  // 네비게이션/길찾기 상태 변수 (Jotai Atom 연동)
  const [currentNodeId, setCurrentNodeId] = useAtom(currentNodeIdAtom);
  const [pendingNavigations] = useAtom(pendingNavigationAtom);
  const [targetNodeId, setTargetNodeId] = useAtom(targetNodeIdAtom);
  const [, setTargetBuildingId] = useAtom(targetBuildingIdAtom);
  const [requestedNodeId, setRequestedNodeId] = useAtom(requestedNodeIdAtom);
  const [requestedBuildingId, setRequestedBuildingId] = useAtom(requestedBuildingIdAtom);
  const { data: raidRules } = useRaidRules();
  const raidRulesRef = useRef(raidRules);
  useEffect(() => {
    raidRulesRef.current = raidRules;
  }, [raidRules]);

  const selectTargetRef = useRef<(nodeId: number, targetB?: Building) => void>(() => {});
  const [shortestPath, setShortestPath] = useAtom(shortestPathAtom);
  const [isNavigating, setIsNavigating] = useAtom(isNavigatingAtom);
  const setNavigationProgress = useSetAtom(navigationProgressAtom);
  const setNavigationStartTime = useSetAtom(navigationStartTimeAtom);
  const [playerRotation, setPlayerRotation] = useAtom(playerRotationAtom);

  useEffect(() => {
    isCombatRef.current = isCombat;
    if (exitContainerRef.current && !exitContainerRef.current.destroyed) {
      exitContainerRef.current.visible = !isCombat;
    }
    if (playerMarkerSpriteRef.current && !playerMarkerSpriteRef.current.destroyed) {
      playerMarkerSpriteRef.current.visible = !isCombat && !!playerCoordsRef.current;
    }
    if (hoverHighlightGraphicsRef.current && !hoverHighlightGraphicsRef.current.destroyed && isCombat) {
      hoverHighlightGraphicsRef.current.clear();
    }
  }, [isCombat]);

  const isNavigatingBoolRef = useRef(isNavigating);
  useEffect(() => {
    isNavigatingBoolRef.current = isNavigating;
  }, [isNavigating]);
  void isNavigatingRef;

  // 플레이어의 실제 화면 드로잉 좌표 상태 및 최신 값 동기화용 Ref (부드러운 보간용)
  const [playerCoords, setPlayerCoords] = useAtom(playerCoordsAtom);
  const playerCoordsRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isInitializedRef = useRef(false);

  // 줌 조작 디바운스용 Ref
  const zoomTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 네비게이션 경로 및 현재 도달 스텝을 추적하는 Ref (단일 requestAnimationFrame 유지용)
  const currentPathStepRef = useRef<number>(1);

  const [targetBuilding, setTargetBuilding] = useState<Building | null>(null);
  const navigationPathCoordsRef = useRef<{ x: number; y: number }[]>([]);

  // 2D R-Tree (rbush) 벤치마크 수치 자동 기록용 Ref
  const benchmarkStatsRef = useRef<{
    rTreeSearchTimes: number[];
    frameDeltas: number[];
    lastFrameTime: number;
  }>({
    rTreeSearchTimes: [],
    frameDeltas: [],
    lastFrameTime: 0,
  });

  // 카메라 자동 화면 따라가기 상태 및 Ref
  const [followPlayer, setFollowPlayer] = useAtom(followPlayerAtom);
  const followPlayerRef = useRef(true);

  useEffect(() => {
    followPlayerRef.current = followPlayer;
  }, [followPlayer]);

  useEffect(() => {
    return () => {
      if (zoomTimeoutRef.current) {
        clearTimeout(zoomTimeoutRef.current);
      }
    };
  }, []);

  const hasActiveRaid =
    characterData?.raw.isRaiding && characterData.raw.activeRaid?.status === "ACTIVE";

  const startNavigation = (path: number[], targetB?: Building | null) => {
    if (!hasActiveRaid || isNavigating || isCombat) return;
    if (
      characterData &&
      pendingNavigations[pendingNavigationKey(characterData.raw.userId, characterData.raw.id)]
    ) {
      return;
    }
    if (!characterData?.raw.id) {
      console.warn("[Navigation] characterData not ready, skipping navigation start.");
      return;
    }

    const tBuilding = targetB !== undefined ? targetB : targetBuilding;
    const startPos = playerCoordsRef.current ?? nodes[currentNodeId];
    if (!startPos || path[0] !== currentNodeId) return;

    const coords = buildCoordPath(path, startPos, tBuilding);
    if (coords.length <= 1) return;

    focusTweenRef.current?.destroy();
    focusTweenRef.current = null;
    navigateRaidResponseRef.current = null;
    setNoiseSignals(null);
    navigationPathCoordsRef.current = coords;
    setTargetNodeId(path[path.length - 1]);
    setShortestPath(path);
    setNavigationStartTime(characterData.raw.activeRaid?.time ?? 0);
    setIsNavigating(true);

    let reqEquipment: { weaponMasterId: string; slotIndex: number }[] | undefined = undefined;
    let reqInventory: { weaponMasterId: string; slotIndex: number; quantity: number }[] | undefined =
      undefined;

    if (isInventoryDirty) {
      console.log("[Navigation] Inventory is dirty. Packing slot data to sync with navigate.");

      reqEquipment = characterData.raw.equipment
        .filter((w) => w.weaponMaster !== null)
        .map((w) => ({
          weaponMasterId: w.weaponMaster!.id,
          slotIndex: w.slotIndex,
        }));

      reqInventory = characterData.raw.inventory
        .filter((i) => i.weaponMaster !== null)
        .map((i) => ({
          weaponMasterId: i.weaponMaster!.id,
          slotIndex: i.slotIndex,
          quantity: i.quantity,
        }));
    }

    navigateRaid.mutate(
      {
        characterId: characterData.raw.id,
        path,
        destinationBuildingId: tBuilding?.id,
        equipment: reqEquipment,
        inventory: reqInventory,
      },
      {
        onSuccess: (res) => {
          if (getDefaultStore().get(selectedUserIdAtom) !== characterData.raw.userId) return;
          console.log("[startNavigation SUCCESS] navigate response:", res);
          navigateRaidResponseRef.current = res;
          setIsInventoryDirty(false);
        },
        onError: (err) => {
          if (getDefaultStore().get(selectedUserIdAtom) !== characterData.raw.userId) return;
          console.error("Failed to pre-roll encounters:", err);
          setTargetNodeId(null);
          setIsNavigating(false);
          void queryClient.invalidateQueries({ queryKey: ["character"] });
        },
      },
    );
  };

  // 대상 노드 선택 시 목적지 및 예상 경로 표시 (이동 버튼 클릭 시 실제 이동)
  const handleTargetSelect = (targetId: number, targetB?: Building) => {
    if (isNavigating || isCombat || !hasActiveRaid) {
      return;
    }
    const startPos = playerCoordsRef.current ?? nodes[currentNodeId];
    const path = findShortestPath(currentNodeId, targetId);
    const nextBuilding = targetB ?? null;
    if (!startPos || buildCoordPath(path, startPos, nextBuilding).length <= 1) {
      setTargetBuilding(null);
      setTargetBuildingId(null);
      setTargetNodeId(null);
      return;
    }
    setTargetBuilding(nextBuilding);
    setTargetBuildingId(nextBuilding?.id ?? null);
    setTargetNodeId(targetId);
  };

  selectTargetRef.current = handleTargetSelect;
  useEffect(() => {
    if (requestedNodeId === null || isNavigating || isCombat) return;
    const requestedBuilding =
      requestedBuildingId !== null
        ? (buildings.find((b) => b.id === requestedBuildingId) ?? undefined)
        : undefined;
    setRequestedNodeId(null);
    setRequestedBuildingId(null);
    selectTargetRef.current(requestedNodeId, requestedBuilding);
  }, [
    requestedNodeId,
    requestedBuildingId,
    isNavigating,
    isCombat,
    setRequestedNodeId,
    setRequestedBuildingId,
  ]);

  useEffect(() => {
    if (startNavigationTrigger === 0) return;
    if (targetNodeId === null || shortestPath.length === 0) return;
    startNavigation(shortestPath, targetBuilding);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startNavigationTrigger]);

  // 노드/건물 호버 해제 안전 헬퍼
  const resetHoverHud = () => {
    const el = document.getElementById("hud-hover-detail");
    if (el) {
      el.style.display = "none";
      el.innerHTML = "";
    }
    if (hoverHighlightGraphicsRef.current && !hoverHighlightGraphicsRef.current.destroyed) {
      hoverHighlightGraphicsRef.current.clear();
    }
  };

  // 1. ResizeObserver를 사용하여 부모 컨테이너 크기 추적
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.unobserve(container);
      resizeObserver.disconnect();
    };
  }, []);

  // 1.5. PixiJS Application 초기화 및 정적 월드 지오메트리 1회 GPU 업로드
  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return;

    let disposed = false;
    let initialized = false;
    const app = new Application();

    void (async () => {
      try {
        await app.init({
          width: Math.max(1, containerRef.current?.clientWidth || 1),
          height: Math.max(1, containerRef.current?.clientHeight || 1),
          backgroundAlpha: 0,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        });
        initialized = true;

        if (disposed) {
          app.destroy(true, { children: true, texture: false });
          return;
        }

        host.appendChild(app.canvas);
        appRef.current = app;

        const worldContainer = new Container();
        worldContainer.scale.set(3.0);
        app.stage.addChild(worldContainer);
        worldContainerRef.current = worldContainer;

        const mapLayer = new Container();
        worldContainer.addChild(mapLayer);

        // --- 1.1 Water Backdrop ---
        if (waterPoints.length > 0) {
          const waterGraphics = new Graphics();
          waterGraphics
            .poly(waterPoints, true)
            .fill({ color: 0x1e1e20, alpha: 0.35 })
            .stroke({ width: 1.5, color: 0x787880, alpha: 0.2 });
          mapLayer.addChild(waterGraphics);
        }

        // --- 1.15 Districts (14개 지적도 권역 폴리곤 및 지명 라벨) ---
        const districtsContainer = new Container();
        const districtGraphics = new Graphics();
        for (const district of MAP_DISTRICTS) {
          if (district.hull.length < 3) continue;
          const flatHull = district.hull.flatMap((pt) => [pt.x, pt.y]);
          const tint = DISTRICT_COLORS[district.kind];
          districtGraphics
            .poly(flatHull, true)
            .fill({ color: tint, alpha: 0.045 })
            .stroke({ width: 1.2, color: tint, alpha: 0.28, join: "round" });
        }
        districtsContainer.addChild(districtGraphics);

        const districtLabelStyle = new TextStyle({
          fontFamily: "monospace",
          fontSize: 11,
          fontWeight: "700",
          fill: 0xb0b7c4,
          letterSpacing: 1,
          stroke: { color: 0x0a0a0c, width: 3 },
        });
        for (const district of MAP_DISTRICTS) {
          const label = new Text({
            text: district.name,
            style: districtLabelStyle,
          });
          label.anchor.set(0.5);
          label.position.set(district.labelX, district.labelY);
          label.alpha = 0.65;
          districtsContainer.addChild(label);
        }
        mapLayer.addChild(districtsContainer);

        // --- 1.2 Edges (도로망 3종 일괄 드로잉) ---
        const edgesGraphics = new Graphics();
        edgesGraphics.visible = showEdges;

        // Main 도로
        edges.forEach((edge) => {
          if (edge.type !== "main") return;
          const start = nodes[edge.source];
          const end = nodes[edge.target];
          if (start && end) {
            edgesGraphics.moveTo(start.x, start.y).lineTo(end.x, end.y);
          }
        });
        edgesGraphics.stroke({ width: 2.8, color: 0xc8c8d2, alpha: 0.35 });

        // Major 도로
        edges.forEach((edge) => {
          if (edge.type !== "major") return;
          const start = nodes[edge.source];
          const end = nodes[edge.target];
          if (start && end) {
            edgesGraphics.moveTo(start.x, start.y).lineTo(end.x, end.y);
          }
        });
        edgesGraphics.stroke({ width: 1.8, color: 0x9696a0, alpha: 0.22 });

        // Minor 도로
        edges.forEach((edge) => {
          if (edge.type !== "minor") return;
          const start = nodes[edge.source];
          const end = nodes[edge.target];
          if (start && end) {
            edgesGraphics.moveTo(start.x, start.y).lineTo(end.x, end.y);
          }
        });
        edgesGraphics.stroke({ width: 1, color: 0x6e6e78, alpha: 0.15 });

        mapLayer.addChild(edgesGraphics);
        edgesGraphicsRef.current = edgesGraphics;

        // --- 1.3 Buildings (4,187개 폴리곤 청크 배칭 GPU 정점 업로드) ---
        const buildingsContainer = new Container();
        buildingsContainer.visible = showBuildingsRef.current;
        const CHUNK_SIZE = 700;
        for (let i = 0; i < buildings.length; i += CHUNK_SIZE) {
          const chunk = buildings.slice(i, i + CHUNK_SIZE);
          const bGraphics = new Graphics();
          chunk.forEach((b) => {
            if (b.flatPoints.length >= 6) {
              bGraphics.poly(b.flatPoints, true);
            }
          });
          bGraphics
            .fill({ color: 0x232326, alpha: 0.45 })
            .stroke({ width: 1, color: 0x787880, alpha: 0.12 });
          buildingsContainer.addChild(bGraphics);
        }
        mapLayer.addChild(buildingsContainer);
        buildingsContainerRef.current = buildingsContainer;

        // --- 1.4 Nodes (1,131개 교차점 일괄 드로잉) ---
        const nodesGraphics = new Graphics();
        nodesGraphics.visible = showNodesRef.current;
        nodes.forEach((n) => {
          nodesGraphics.circle(n.x, n.y, DEFAULT_NODE_RADIUS);
        });
        nodesGraphics
          .fill({ color: DEFAULT_NODE_COLOR_NUM })
          .stroke({ width: 1, color: 0x0a0a0c, alpha: 0.8 });
        mapLayer.addChild(nodesGraphics);
        nodesGraphicsRef.current = nodesGraphics;

        // --- 1.45 Exploration Status Overlay (조합 가능/소진 및 수색 완료 건물 표시) ---
        const explorationGraphics = new Graphics();
        mapLayer.addChild(explorationGraphics);
        explorationGraphicsRef.current = explorationGraphics;

        // --- 1.5 Hover Highlight Graphics (단일 동적 하이라이트 레이어) ---
        const hoverHighlightGraphics = new Graphics();
        mapLayer.addChild(hoverHighlightGraphics);
        hoverHighlightGraphicsRef.current = hoverHighlightGraphics;

        // --- 1.6 Exit Nodes Container ---
        const exitContainer = new Container();
        exitContainer.visible = !isCombatRef.current;
        mapLayer.addChild(exitContainer);
        exitContainerRef.current = exitContainer;

        // --- 2. Navigation & Path Layer ---
        const pathLineGraphics = new Graphics();
        mapLayer.addChild(pathLineGraphics);
        pathLineGraphicsRef.current = pathLineGraphics;

        const targetMarkerGroup = new Container();
        targetMarkerGroup.visible = false;
        const targetGlow = new Graphics();
        targetGlow
          .circle(0, 0, 10)
          .stroke({ width: 1.5, color: 0xffffff, alpha: 1 })
          .circle(0, 0, 3)
          .fill({ color: 0xffffff });
        targetMarkerGroup.addChild(targetGlow);
        mapLayer.addChild(targetMarkerGroup);
        targetMarkerGroupRef.current = targetMarkerGroup;

        // --- 3. Fog of War & Player Marker Layer ---
        const fogTex = getFogOfWarTexture();
        const sightMaskSprite = new Sprite(fogTex);
        sightMaskSprite.anchor.set(0.5);
        sightMaskSprite.width = 4000;
        sightMaskSprite.height = 4000;
        sightMaskSprite.visible = false;
        mapLayer.addChild(sightMaskSprite);
        sightMaskSpriteRef.current = sightMaskSprite;

        noiseRippleRef.current = createNoiseRipple(worldContainer, mapLayer);

        const compassTex = await loadCompassTexture(compass);
        if (disposed || worldContainer.destroyed) return;

        const playerMarkerSprite = new Sprite(compassTex);
        playerMarkerSprite.anchor.set(0.5);
        playerMarkerSprite.width = 50 / 3.0;
        playerMarkerSprite.height = 50 / 3.0;
        playerMarkerSprite.visible = false;
        worldContainer.addChild(playerMarkerSprite);
        playerMarkerSpriteRef.current = playerMarkerSprite;

        setIsPixiReady(true);
      } catch (err) {
        console.error("[MapGraphCanvas] Failed to initialize Pixi Application:", err);
      }
    })();

    return () => {
      disposed = true;
      setIsPixiReady(false);
      appRef.current = null;
      worldContainerRef.current = null;
      edgesGraphicsRef.current = null;
      buildingsContainerRef.current = null;
      nodesGraphicsRef.current = null;
      hoverHighlightGraphicsRef.current = null;
      explorationGraphicsRef.current = null;
      exitContainerRef.current = null;
      pathLineGraphicsRef.current = null;
      targetMarkerGroupRef.current = null;
      sightMaskSpriteRef.current = null;
      playerMarkerSpriteRef.current = null;
      noiseRippleRef.current?.destroy();
      noiseRippleRef.current = null;
      if (initialized) {
        app.destroy(true, { children: true, texture: false });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 1.6. 렌더러 리사이즈 동기화
  useEffect(() => {
    if (!isPixiReady || dimensions.width <= 0 || dimensions.height <= 0) return;
    appRef.current?.renderer.resize(dimensions.width, dimensions.height);
  }, [isPixiReady, dimensions.width, dimensions.height]);

  // 1.7. 탈출구(EXIT) 마커 렌더링 동기화
  useEffect(() => {
    const exitContainer = exitContainerRef.current;
    if (!isPixiReady || !exitContainer || exitContainer.destroyed) return;

    exitContainer.removeChildren().forEach((child) => child.destroy({ children: true }));

    const exitNodeIds = raidRules?.extractionNodeIds ?? [];
    const exitTextStyle = new TextStyle({
      fontFamily: "Inter, sans-serif",
      fontSize: 10,
      fill: "#b8ffb9",
      fontWeight: "600",
    });

    exitNodeIds.forEach((nodeId) => {
      const node = nodes[nodeId];
      if (!node) return;

      const group = new Container();
      group.position.set(node.x, node.y);

      const circleG = new Graphics();
      circleG.circle(0, 0, 9).stroke({ width: 2, color: 0xb8ffb9 });

      const label = new Text({
        text: "EXIT",
        style: exitTextStyle,
        resolution: 2,
      });
      label.position.set(-13, -21);

      group.addChild(circleG);
      group.addChild(label);
      exitContainer.addChild(group);
    });
  }, [isPixiReady, raidRules]);

  // 1.8. 포인터 인터랙션(패닝, 휠 줌, R-Tree 기반 초고속 호버/클릭 히트 테스트) 바인딩
  useEffect(() => {
    const host = canvasHostRef.current;
    if (!isPixiReady || !host) return;

    let isDragging = false;
    let hasMovedBeyondThreshold = false;
    let dragStartClientX = 0;
    let dragStartClientY = 0;
    let dragStartWorldX = 0;
    let dragStartWorldY = 0;
    let hoveredKey: string | null = null;

    const getLocalWorldCoords = (clientX: number, clientY: number) => {
      const world = worldContainerRef.current;
      if (!world) return null;
      const rect = host.getBoundingClientRect();
      const canvasX = clientX - rect.left;
      const canvasY = clientY - rect.top;
      const scale = world.scale.x;
      return {
        canvasX,
        canvasY,
        worldX: (canvasX - world.x) / scale,
        worldY: (canvasY - world.y) / scale,
      };
    };

    const findHitTarget = (worldX: number, worldY: number) => {
      // 1. 탈출구(EXIT) 노드 우선 검사 (반경 11px)
      const exitIds = raidRulesRef.current?.extractionNodeIds ?? [];
      for (const exitId of exitIds) {
        const n = nodes[exitId];
        if (n) {
          const dx = worldX - n.x;
          const dy = worldY - n.y;
          if (dx * dx + dy * dy <= 11 * 11) {
            return { type: "exit" as const, nodeId: exitId, node: n };
          }
        }
      }

      // 2. 도로 노드 검사 (showNodes 활성화 시)
      if (showNodesRef.current) {
        const hitRadius = DEFAULT_NODE_RADIUS + 4;
        const candidates = searchRTreeIndex<IndexedNode>(nodesRTree, {
          minX: worldX - hitRadius,
          minY: worldY - hitRadius,
          maxX: worldX + hitRadius,
          maxY: worldY + hitRadius,
        }).results;

        let closestNode: IndexedNode | null = null;
        let minDistSq = hitRadius * hitRadius;
        for (const item of candidates) {
          const dx = worldX - item.x;
          const dy = worldY - item.y;
          const dSq = dx * dx + dy * dy;
          if (dSq <= minDistSq) {
            minDistSq = dSq;
            closestNode = item;
          }
        }
        if (closestNode) {
          return { type: "node" as const, nodeId: closestNode.id, node: closestNode };
        }
      }

      // 3. 건물 폴리곤 검사 (showBuildings 활성화 및 전장의 안개 표시 배율 이상일 때만 허용)
      if (
        showBuildingsRef.current &&
        (worldContainerRef.current?.scale.x ?? 0) >= FOG_VISIBLE_MIN_SCALE
      ) {
        const candidates = searchRTreeIndex<Building>(buildingsRTree, {
          minX: worldX,
          minY: worldY,
          maxX: worldX,
          maxY: worldY,
        }).results;

        for (let i = candidates.length - 1; i >= 0; i--) {
          const b = candidates[i]!;
          if (isPointInPolygon(worldX, worldY, b.coordinates)) {
            return { type: "building" as const, building: b };
          }
        }
      }

      return null;
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (isCombatRef.current || e.button !== 0) return;
      const world = worldContainerRef.current;
      if (!world) return;

      focusTweenRef.current?.destroy();
      focusTweenRef.current = null;

      isDragging = true;
      hasMovedBeyondThreshold = false;
      dragStartClientX = e.clientX;
      dragStartClientY = e.clientY;
      dragStartWorldX = world.x;
      dragStartWorldY = world.y;
      benchmarkStatsRef.current.lastFrameTime = performance.now();
      host.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: PointerEvent) => {
      const world = worldContainerRef.current;
      if (!world || isCombatRef.current) return;

      if (isDragging) {
        const dx = e.clientX - dragStartClientX;
        const dy = e.clientY - dragStartClientY;
        if (!hasMovedBeyondThreshold && Math.hypot(dx, dy) > 4) {
          hasMovedBeyondThreshold = true;
        }

        if (hasMovedBeyondThreshold) {
          // GPU 유니폼 행렬만 즉시 갱신 (React 리렌더링 0회!)
          const clampedPos = clampWorldPosition(
            dragStartWorldX + dx,
            dragStartWorldY + dy,
            world.scale.x,
            host.clientWidth,
            host.clientHeight,
          );
          world.position.set(clampedPos.x, clampedPos.y);

          const now = performance.now();
          if (benchmarkStatsRef.current.lastFrameTime > 0) {
            benchmarkStatsRef.current.frameDeltas.push(
              now - benchmarkStatsRef.current.lastFrameTime,
            );
          }
          benchmarkStatsRef.current.lastFrameTime = now;
        }
        return;
      }

      if (isNavigatingBoolRef.current) return;

      // 호버 판정 (R-Tree 공간 쿼리)
      const coords = getLocalWorldCoords(e.clientX, e.clientY);
      if (!coords) return;

      const hit = findHitTarget(coords.worldX, coords.worldY);
      const hg = hoverHighlightGraphicsRef.current;

      if (!hit) {
        if (hoveredKey !== null) {
          hoveredKey = null;
          hg?.clear();
          host.style.cursor = "default";
          resetHoverHud();
        }
        return;
      }

      if (hit.type === "exit") {
        const nextKey = `exit-${hit.nodeId}`;
        if (hoveredKey !== nextKey) {
          hoveredKey = nextKey;
          hg?.clear();
          host.style.cursor = "pointer";
          resetHoverHud();
        }
        return;
      }

      if (hit.type === "node") {
        const nextKey = `node-${hit.nodeId}`;
        if (hoveredKey !== nextKey) {
          hoveredKey = nextKey;
          if (hg && !hg.destroyed) {
            hg.clear();
            hg.circle(hit.node.x, hit.node.y, DEFAULT_NODE_RADIUS + 3)
              .fill({ color: 0xffffff })
              .stroke({ width: 2.5, color: DEFAULT_NODE_COLOR_NUM });
          }
          host.style.cursor = "pointer";

          const el = document.getElementById("hud-hover-detail");
          if (el) {
            el.style.display = "block";
            el.innerHTML = `
              <div style="color: ${DEFAULT_NODE_COLOR_HEX}; font-size: 11px; font-weight: 700; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.5px;">
                NODE #${hit.nodeId}
              </div>
              <div style="font-size: 10px; color: #8a8d98; font-family: monospace; line-height: 1.4;">
                X: ${hit.node.x.toFixed(2)}<br />
                Y: ${hit.node.y.toFixed(2)}
              </div>
            `;
          }
        }
        return;
      }

      if (hit.type === "building") {
        const b = hit.building;
        const nextKey = `building-${b.id}`;
        if (hoveredKey !== nextKey) {
          hoveredKey = nextKey;
          if (hg && !hg.destroyed) {
            hg.clear();
            hg.poly(b.flatPoints, true)
              .fill({ color: 0x2bcbba, alpha: 0.45 })
              .stroke({ width: 2, color: 0xffffff, alpha: 1, join: "round" });
          }
          host.style.cursor = "pointer";

          const el = document.getElementById("hud-hover-detail");
          if (el) {
            const district = getBuildingDistrict(b);
            const exp = explorationRef.current;
            const isCrafted = exp?.usedCraftBuildingIds.includes(b.id) ?? false;
            const isLooted = exp?.lootedBuildingIds.includes(b.id) ?? false;
            const categoryKo = b.category
              ? (BUILDING_CATEGORY_KO[b.category] ?? b.category)
              : null;
            const districtLoot = exp?.districtLootCounts[district.id] ?? 0;
            const title = b.name
              ? `${b.name}${categoryKo ? ` · ${categoryKo}` : ""}`
              : `BUILDING #${b.id}`;
            const statusFlags = [
              isLooted ? "수색완료" : null,
              b.category ? (isCrafted ? "조합소진" : "조합가능") : null,
            ]
              .filter(Boolean)
              .join(" / ");
            el.style.display = "block";
            el.innerHTML = `
              <div style="color: #85adff; font-size: 11px; font-weight: 700; margin-bottom: 2px; letter-spacing: 0.4px;">
                ${title}
              </div>
              <div style="font-size: 10px; color: #b0b3be; font-family: monospace; line-height: 1.4;">
                ${district.name} (${districtLoot}/${district.maxLoot})<br />
                Height: ${b.height.toFixed(1)}m · Road #${b.roadNodeId}${statusFlags ? `<br /><span style="color: #e2e4ea;">${statusFlags}</span>` : ""}
              </div>
            `;
          }
        }
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;
      if (host.hasPointerCapture(e.pointerId)) {
        host.releasePointerCapture(e.pointerId);
      }

      const world = worldContainerRef.current;
      if (!world) return;

      if (hasMovedBeyondThreshold) {
        // 드래그 종료 시 단 1회만 React State 동기화
        setStageTransform({
          x: world.x,
          y: world.y,
          scale: world.scale.x,
        });

        const { rTreeSearchTimes, frameDeltas } = benchmarkStatsRef.current;
        if (frameDeltas.length > 0) {
          const validDeltas = frameDeltas.filter((d) => d > 0);
          if (validDeltas.length > 0) {
            const avgDelta = validDeltas.reduce((a, b) => a + b, 0) / validDeltas.length;
            const maxDelta = Math.max(...validDeltas);
            const avgFps = 1000 / avgDelta;
            const minFps = 1000 / maxDelta;
            const avgSearchMs =
              rTreeSearchTimes.length > 0
                ? rTreeSearchTimes.reduce((a, b) => a + b, 0) / rTreeSearchTimes.length
                : 0;
            const totalBuildTimeMs = nodeTreeBuildTimeMs + buildingTreeBuildTimeMs;

            console.log(
              `%c================ [PixiJS v8 GPU + 2D R-Tree Benchmark Summary] ================`,
              "color: #2bcbba; font-weight: bold; font-size: 13px;",
            );
            console.log(
              `🌲 STR Bulk-Loading 1회 트리 구축 시간: %c${totalBuildTimeMs.toFixed(3)} ms`,
              "color: #4d7cff; font-weight: bold;",
            );
            console.log(
              `⏱️ 평균 총 컬링 연산 시간: %c${avgSearchMs.toFixed(3)} ms`,
              "color: #2bcbba; font-weight: bold;",
            );
            console.log(
              `🎮 드래그 중 평균 프레임 (Avg FPS): %c${avgFps.toFixed(1)} FPS`,
              "color: #2bcbba; font-weight: bold;",
            );
            console.log(
              `📉 드래그 중 최저 프레임 (Min FPS): %c${minFps.toFixed(1)} FPS`,
              "color: #2bcbba; font-weight: bold;",
            );
            console.log(
              `===============================================================================`,
            );
          }
          benchmarkStatsRef.current.rTreeSearchTimes = [];
          benchmarkStatsRef.current.frameDeltas = [];
          benchmarkStatsRef.current.lastFrameTime = 0;
        }
        return;
      }

      // 클릭(Tap) 판정
      if (isCombatRef.current || isNavigatingBoolRef.current) return;
      const coords = getLocalWorldCoords(e.clientX, e.clientY);
      if (!coords) return;

      const hit = findHitTarget(coords.worldX, coords.worldY);
      if (!hit) return;

      if (hit.type === "exit" || hit.type === "node") {
        selectTargetRef.current(hit.nodeId);
      } else if (hit.type === "building") {
        selectTargetRef.current(hit.building.roadNodeId, hit.building);
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (isCombatRef.current) return;
      const world = worldContainerRef.current;
      if (!world) return;

      focusTweenRef.current?.destroy();
      focusTweenRef.current = null;

      const rect = host.getBoundingClientRect();
      const pointerX = e.clientX - rect.left;
      const pointerY = e.clientY - rect.top;

      const oldScale = world.scale.x;
      const mousePointTo = {
        x: (pointerX - world.x) / oldScale,
        y: (pointerY - world.y) / oldScale,
      };

      const scaleBy = 1.15;
      const newScale = e.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
      const clampedScale = Math.max(MIN_ZOOM_SCALE, Math.min(MAX_ZOOM_SCALE, newScale));

      const newPos = clampWorldPosition(
        pointerX - mousePointTo.x * clampedScale,
        pointerY - mousePointTo.y * clampedScale,
        clampedScale,
        host.clientWidth,
        host.clientHeight,
      );

      world.scale.set(clampedScale);
      world.position.set(newPos.x, newPos.y);
      syncFogVisibility(sightMaskSpriteRef.current, clampedScale, Boolean(playerCoordsRef.current));

      if (playerMarkerSpriteRef.current && !playerMarkerSpriteRef.current.destroyed) {
        const invScale = 1 / clampedScale;
        playerMarkerSpriteRef.current.width = 50 * invScale;
        playerMarkerSpriteRef.current.height = 50 * invScale;
      }

      if (zoomTimeoutRef.current) {
        clearTimeout(zoomTimeoutRef.current);
      }
      zoomTimeoutRef.current = setTimeout(() => {
        if (worldContainerRef.current) {
          setStageTransform({
            x: worldContainerRef.current.x,
            y: worldContainerRef.current.y,
            scale: worldContainerRef.current.scale.x,
          });
        }
      }, 150);
    };

    host.addEventListener("pointerdown", handlePointerDown);
    host.addEventListener("pointermove", handlePointerMove);
    host.addEventListener("pointerup", handlePointerUp);
    host.addEventListener("pointercancel", handlePointerUp);
    host.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      host.removeEventListener("pointerdown", handlePointerDown);
      host.removeEventListener("pointermove", handlePointerMove);
      host.removeEventListener("pointerup", handlePointerUp);
      host.removeEventListener("pointercancel", handlePointerUp);
      host.removeEventListener("wheel", handleWheel);
    };
  }, [isPixiReady]);

  // 2. 처음 마운트 및 창 크기 변경 시 카메라를 플레이어 위치에 고정하고 배율을 3으로 설정
  useEffect(() => {
    const world = worldContainerRef.current;
    if (!isPixiReady || !world || dimensions.width === 0 || dimensions.height === 0) return;
    if (isNavigating || isCombat) return;

    const scale = 3.0;
    const playerPos =
      playerCoordsRef.current ||
      (nodes[currentNodeId] ? { x: nodes[currentNodeId].x, y: nodes[currentNodeId].y } : null);
    if (!playerPos) return;

    const newX = dimensions.width / 2 - playerPos.x * scale;
    const newY = dimensions.height / 2 - playerPos.y * scale;

    const currentScale = world.scale.x;
    const currentX = world.x;
    const currentY = world.y;
    const isAlreadyAligned =
      Math.abs(currentScale - scale) < 0.05 &&
      Math.abs(currentX - newX) < 5 &&
      Math.abs(currentY - newY) < 5;

    if (isAlreadyAligned) {
      return;
    }

    world.position.set(newX, newY);
    world.scale.set(scale);
    syncFogVisibility(sightMaskSpriteRef.current, scale, Boolean(playerCoordsRef.current));

    if (playerMarkerSpriteRef.current && !playerMarkerSpriteRef.current.destroyed) {
      playerMarkerSpriteRef.current.width = 50 / scale;
      playerMarkerSpriteRef.current.height = 50 / scale;
    }

    setStageTransform({
      x: newX,
      y: newY,
      scale,
    });
  }, [isPixiReady, dimensions.width, dimensions.height, currentNodeId, playerCoords, isNavigating, isCombat]);

  // 2.1. 전투 시작 시 플레이어 중심 3.0배율 카메라 줌인 트랜지션
  useEffect(() => {
    const world = worldContainerRef.current;
    if (!isPixiReady || !isCombat || !world || dimensions.width === 0 || dimensions.height === 0) {
      return;
    }

    const targetScale = 3.0;
    const playerPos =
      playerCoordsRef.current ||
      (playerCoords
        ? playerCoords
        : { x: nodes[currentNodeId]?.x ?? 0, y: nodes[currentNodeId]?.y ?? 0 });

    const targetX = dimensions.width / 2 - playerPos.x * targetScale;
    const targetY = dimensions.height / 2 - playerPos.y * targetScale;

    const startScale = world.scale.x;
    const startX = world.x;
    const startY = world.y;

    if (
      Math.abs(startScale - targetScale) < 0.01 &&
      Math.abs(startX - targetX) < 1 &&
      Math.abs(startY - targetY) < 1
    ) {
      return;
    }

    const tween = runTween({
      duration: 0.8,
      easing: Easings.EaseInOut,
      onUpdate: (p) => {
        if (world.destroyed) return;
        const s = startScale + (targetScale - startScale) * p;
        world.scale.set(s);
        syncFogVisibility(sightMaskSpriteRef.current, s, Boolean(playerCoordsRef.current));
        world.position.set(
          startX + (targetX - startX) * p,
          startY + (targetY - startY) * p,
        );
      },
      onFinish: () => {
        setStageTransform({
          x: targetX,
          y: targetY,
          scale: targetScale,
        });
      },
    });

    return () => {
      tween.destroy();
    };
  }, [isPixiReady, isCombat, dimensions.width, dimensions.height, currentNodeId, playerCoords]);

  const animateCameraTo = (targetPos: { x: number; y: number }, targetScale: number) => {
    const world = worldContainerRef.current;
    if (!world) return;
    const startScale = world.scale.x;
    const startX = world.x;
    const startY = world.y;

    focusTweenRef.current?.destroy();
    focusTweenRef.current = runTween({
      duration: 0.45,
      easing: Easings.EaseInOut,
      onUpdate: (p) => {
        if (world.destroyed) return;
        const s = startScale + (targetScale - startScale) * p;
        world.scale.set(s);
        syncFogVisibility(sightMaskSpriteRef.current, s, Boolean(playerCoordsRef.current));
        world.position.set(
          startX + (targetPos.x - startX) * p,
          startY + (targetPos.y - startY) * p,
        );
        if (playerMarkerSpriteRef.current && !playerMarkerSpriteRef.current.destroyed) {
          playerMarkerSpriteRef.current.width = 50 / s;
          playerMarkerSpriteRef.current.height = 50 / s;
        }
      },
      onFinish: () => {
        focusTweenRef.current = null;
        setStageTransform({
          x: targetPos.x,
          y: targetPos.y,
          scale: targetScale,
        });
      },
    });
  };

  // 2.2. 캐릭터 HUD 클릭 시 카메라를 플레이어 위치 중앙으로 부드럽게 이동
  useEffect(() => {
    if (focusPlayerTrigger === 0) return;
    if (
      !isPixiReady ||
      isCombat ||
      !worldContainerRef.current ||
      dimensions.width === 0 ||
      dimensions.height === 0
    ) {
      return;
    }

    const playerPos =
      playerCoordsRef.current ||
      playerCoords ||
      (nodes[currentNodeId] ? { x: nodes[currentNodeId].x, y: nodes[currentNodeId].y } : null);
    if (!playerPos) return;

    const targetScale = 3.0;
    const targetPos = clampWorldPosition(
      dimensions.width / 2 - playerPos.x * targetScale,
      dimensions.height / 2 - playerPos.y * targetScale,
      targetScale,
      dimensions.width,
      dimensions.height,
    );
    animateCameraTo(targetPos, targetScale);

    return () => {
      focusTweenRef.current?.destroy();
      focusTweenRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusPlayerTrigger]);

  // 2.3. 추천 목적지 선택 시 출발지~도착지 경로가 한눈에 들어오도록 카메라 이동·축소
  useEffect(() => {
    if (!focusRouteTarget) return;
    if (
      !isPixiReady ||
      isCombat ||
      !worldContainerRef.current ||
      dimensions.width === 0 ||
      dimensions.height === 0
    ) {
      return;
    }

    const path = findShortestPath(currentNodeId, focusRouteTarget.nodeId);
    const routeNodeIds = path.length > 0 ? path : [currentNodeId, focusRouteTarget.nodeId];
    const points: { x: number; y: number }[] = [];
    const startPos = playerCoordsRef.current || playerCoords;
    if (startPos) points.push(startPos);
    for (const id of routeNodeIds) {
      const n = nodes[id];
      if (n) points.push({ x: n.x, y: n.y });
    }
    if (points.length === 0) return;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const pt of points) {
      minX = Math.min(minX, pt.x);
      maxX = Math.max(maxX, pt.x);
      minY = Math.min(minY, pt.y);
      maxY = Math.max(maxY, pt.y);
    }

    const availW = Math.max(120, dimensions.width - 120);
    const availH = Math.max(120, dimensions.height - 280);
    const rawScale = Math.min(
      availW / Math.max(maxX - minX, 80),
      availH / Math.max(maxY - minY, 80),
    );
    const targetScale = Math.max(MIN_ZOOM_SCALE, Math.min(3.0, rawScale));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const targetPos = clampWorldPosition(
      dimensions.width / 2 - centerX * targetScale,
      dimensions.height / 2 + 30 - centerY * targetScale,
      targetScale,
      dimensions.width,
      dimensions.height,
    );
    animateCameraTo(targetPos, targetScale);

    return () => {
      focusTweenRef.current?.destroy();
      focusTweenRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRouteTarget]);

  // [BENCHMARK] 컬링 연산 시간(ms) 상태
  const [cullingTimeMs, setCullingTimeMs] = useState<number>(0);

  // 3. 뷰포트 기준 경계 상자(Bounding Box) 계산 (개발자 패널 메트릭 표시용)
  const visibleBounds = useMemo(() => {
    const { width, height } = dimensions;
    const { x, y, scale } = stageTransform;

    const margin = 100;
    const minX = -x / scale - margin;
    const minY = -y / scale - margin;
    const maxX = minX + width / scale + margin * 2;
    const maxY = minY + height / scale + margin * 2;

    return { minX, minY, maxX, maxY };
  }, [stageTransform, dimensions]);

  const visibleNodeData = useMemo(() => {
    const res = searchRTreeIndex<IndexedNode>(nodesRTree, visibleBounds);
    const indices = new Set<number>(res.results.map((item) => item.id));
    return {
      indices,
      searchTimeMs: res.searchTimeMs,
      foundCount: res.foundCount,
    };
  }, [visibleBounds]);

  const visibleBuildingData = useMemo(() => {
    const res = searchRTreeIndex<Building>(buildingsRTree, visibleBounds);
    return {
      buildings: res.results,
      searchTimeMs: res.searchTimeMs,
      foundCount: res.foundCount,
    };
  }, [visibleBounds]);

  const visibleNodeIndices = visibleNodeData.indices;
  const visibleBuildings = visibleBuildingData.buildings;

  useEffect(() => {
    const totalMs = visibleNodeData.searchTimeMs + visibleBuildingData.searchTimeMs;
    setCullingTimeMs(totalMs);
    benchmarkStatsRef.current.rTreeSearchTimes.push(totalMs);
  }, [visibleNodeData, visibleBuildingData]);

  useEffect(() => {
    const g = explorationGraphicsRef.current;
    if (!isPixiReady || !g || g.destroyed) return;
    g.clear();
    g.visible = !isCombat;

    const lootedSet = new Set(exploration?.lootedBuildingIds ?? []);
    const usedCraftSet = new Set(exploration?.usedCraftBuildingIds ?? []);

    for (const b of buildings) {
      if (b.flatPoints.length < 6) continue;
      if (b.category) {
        const isUsed = usedCraftSet.has(b.id);
        g.poly(b.flatPoints, true)
          .fill({ color: isUsed ? 0x45454d : 0x85adff, alpha: isUsed ? 0.16 : 0.24 })
          .stroke({
            width: 1.4,
            color: isUsed ? 0x60606b : 0x85adff,
            alpha: isUsed ? 0.45 : 0.85,
          });
      } else if (lootedSet.has(b.id)) {
        g.poly(b.flatPoints, true).fill({ color: 0x0a0a0c, alpha: 0.48 });
      }
    }
  }, [isPixiReady, isCombat, exploration]);

  // 5.1. 실시간 최단 경로 연산 (A* 알고리즘 연동)
  useEffect(() => {
    if (targetNodeId !== null) {
      const path = findShortestPath(currentNodeId, targetNodeId);
      setShortestPath(path);
    } else {
      setShortestPath([]);
      setTargetBuilding(null);
      setTargetBuildingId(null);
    }
  }, [
    currentNodeId,
    targetNodeId,
    setShortestPath,
    setTargetBuilding,
    setTargetBuildingId,
  ]);

  // 5.2. 드로잉을 위한 최단 경로 플랫 좌표 배열
  const shortestPathPoints = useMemo(() => {
    const startPos = playerCoords ?? nodes[currentNodeId];
    if (!startPos) return [];
    return buildCoordPath(shortestPath, startPos, targetBuilding).flatMap(({ x, y }) => [x, y]);
  }, [currentNodeId, playerCoords, shortestPath, targetBuilding]);

  // 5.2.5. 최단 경로 라인 및 타겟 비콘 Pixi Graphics 동기화
  useEffect(() => {
    if (!isPixiReady) return;
    const pathLine = pathLineGraphicsRef.current;
    // 이동 중 남은 경로는 프레임 루프에서만 그린다.
    if (!isNavigating && pathLine && !pathLine.destroyed) {
      if (targetNodeId === null || isCombat) {
        pathLine.clear();
      } else {
        drawPathLineGraphics(pathLine, shortestPathPoints);
      }
    }
    if (targetMarkerGroupRef.current && !targetMarkerGroupRef.current.destroyed) {
      if (targetNodeId !== null) {
        const tx = targetBuilding
          ? getBuildingCenter(targetBuilding).x
          : (nodes[targetNodeId]?.x ?? 0);
        const ty = targetBuilding
          ? getBuildingCenter(targetBuilding).y
          : (nodes[targetNodeId]?.y ?? 0);
        targetMarkerGroupRef.current.position.set(tx, ty);
        targetMarkerGroupRef.current.visible = true;
      } else {
        targetMarkerGroupRef.current.visible = false;
      }
    }
  }, [
    isPixiReady,
    isNavigating,
    isCombat,
    shortestPathPoints,
    targetNodeId,
    targetBuilding,
  ]);

  // 5.3. playerCoords 및 playerRotation 상태값에 맞춰 Pixi Sprite 및 ref 동기화
  useEffect(() => {
    if (playerCoords) {
      playerCoordsRef.current = playerCoords;
      if (sightMaskSpriteRef.current && !sightMaskSpriteRef.current.destroyed) {
        sightMaskSpriteRef.current.position.set(playerCoords.x, playerCoords.y);
        syncFogVisibility(
          sightMaskSpriteRef.current,
          worldContainerRef.current?.scale.x ?? 3.0,
          true,
        );
      }
      if (playerMarkerSpriteRef.current && !playerMarkerSpriteRef.current.destroyed) {
        playerMarkerSpriteRef.current.position.set(playerCoords.x, playerCoords.y);
        playerMarkerSpriteRef.current.visible = !isCombat;
      }
    }
  }, [isPixiReady, playerCoords, isCombat]);

  useEffect(() => {
    if (playerMarkerSpriteRef.current && !playerMarkerSpriteRef.current.destroyed) {
      playerMarkerSpriteRef.current.angle = playerRotation;
    }
  }, [isPixiReady, playerRotation]);

  // 5.3.5. 최초 로드 및 서버 DB의 currentNodeId 값이 변경될 때 클라이언트 상태 동기화
  useEffect(() => {
    if (characterData && !isNavigating && !isCombat) {
      const serverNodeId = characterData.raw.currentNodeId;
      if (typeof serverNodeId === "number" && nodes[serverNodeId]) {
        if (serverNodeId !== currentNodeId || !isInitializedRef.current) {
          setCurrentNodeId(serverNodeId);

          const allBuildings = (mapData.buildings || []) as Building[];
          const buildingId = characterData.raw.activeRaid?.currentBuildingId;
          const matchedBuilding = allBuildings.find((b) =>
            b.roadNodeId === serverNodeId && (buildingId === undefined || b.id === buildingId),
          );
          const initPos = matchedBuilding
            ? getBuildingCenter(matchedBuilding)
            : { x: nodes[serverNodeId].x, y: nodes[serverNodeId].y };

          setPlayerCoords(initPos);
          playerCoordsRef.current = initPos;
          isInitializedRef.current = true;
          console.log(
            `[Sync] Synced character node ID to #${serverNodeId} from DB (Position: ${matchedBuilding ? "Building Center" : "Road Node"}).`,
          );
        }
      }
    }
  }, [characterData, isNavigating, isCombat, currentNodeId, setCurrentNodeId, setPlayerCoords]);

  useEffect(() => {
    const ripple = noiseRippleRef.current;
    if (
      !isPixiReady ||
      !ripple ||
      !noiseSignals ||
      noiseSignals.raidId !== activeRaidId ||
      isCombat ||
      isNavigating
    )
      return;

    ripple.setAreas(noiseSignals.areas);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      ripple.show({ radiusScale: 1, strength: 0.45 });
      return ripple.hide;
    }

    const duration = NOISE_PULSE_SECONDS + NOISE_ECHO_DELAY_SECONDS;
    const waveAt = (elapsed: number, strength: number) => {
      const progress = Math.min(elapsed / NOISE_PULSE_SECONDS, 1);
      return {
        radiusScale: 0.25 + 0.75 * Easings.EaseOut(progress),
        strength: strength * (1 - progress),
      };
    };
    let tween: TweenHandle | undefined;
    let nextPulse: number | undefined;
    const pulse = () => {
      ripple.show(waveAt(0, 1));
      tween = runTween({
        duration,
        onUpdate: (progress) => {
          const elapsed = progress * duration;
          const echoElapsed = elapsed - NOISE_ECHO_DELAY_SECONDS;
          ripple.show(
            waveAt(elapsed, 1),
            echoElapsed >= 0 ? waveAt(echoElapsed, NOISE_ECHO_STRENGTH) : undefined,
          );
        },
        onFinish: () => {
          ripple.hide();
          nextPulse = window.setTimeout(
            pulse,
            NOISE_PULSE_INTERVAL_MS - duration * 1000,
          );
        },
      });
    };

    pulse();
    return () => {
      window.clearTimeout(nextPulse);
      tween?.destroy();
      ripple.hide();
    };
  }, [activeRaidId, isCombat, isNavigating, isPixiReady, noiseSignals]);

  // 5.5. requestAnimationFrame 기반 등속(Constant Speed) 부드러운 네비게이션 보간 루프
  useEffect(() => {
    if (!isNavigating || targetNodeId === null || shortestPath.length === 0 || isCombat) {
      return;
    }

    let coords = navigationPathCoordsRef.current;
    let path = shortestPath;
    const hasRoadHops = path.length > 1;
    if (coords.length <= 1) {
      return;
    }

    currentPathStepRef.current = 1;

    const startC = coords[0];
    const nextC = coords[1];
    if (startC && nextC) {
      const dx = nextC.x - startC.x;
      const dy = nextC.y - startC.y;
      const angleRad = Math.atan2(dy, dx);
      const angleDeg = (angleRad * 180) / Math.PI + 90;
      setPlayerRotation(angleDeg);
    }

    let totalDistance = 0;
    for (let i = 0; i < coords.length - 1; i++) {
      const c1 = coords[i];
      const c2 = coords[i + 1];
      if (c1 && c2) {
        const dx = c2.x - c1.x;
        const dy = c2.y - c1.y;
        totalDistance += Math.sqrt(dx * dx + dy * dy);
      }
    }

    let accumulatedDistance = 0;
    let lastReportedProgress = 0;
    setNavigationProgress(0);
    let animId: number;
    let lastTime = performance.now();
    let hopGateWaitStart: number | null = null;
    let cameraCatchUpStart: number | null = null;
    const minSpeed = 20;
    const maxSpeed = 120;

    const updatePlayerMarkerAndFog = (px: number, py: number, angleDeg?: number) => {
      if (playerMarkerSpriteRef.current && !playerMarkerSpriteRef.current.destroyed) {
        playerMarkerSpriteRef.current.position.set(px, py);
        if (angleDeg !== undefined) {
          playerMarkerSpriteRef.current.angle = angleDeg;
        }
      }
      if (sightMaskSpriteRef.current && !sightMaskSpriteRef.current.destroyed) {
        sightMaskSpriteRef.current.position.set(px, py);
      }
    };

    const updateCameraFollow = (px: number, py: number, deltaTime: number) => {
      if (!followPlayerRef.current || !worldContainerRef.current) return;
      const world = worldContainerRef.current;

      const currentScale = world.scale.x;
      const targetScale = 3.0;
      const safeCurrentScale = currentScale > 0 ? currentScale : targetScale;

      const lerpFactor = 1 - Math.exp(-5 * deltaTime);
      const newScale = currentScale + (targetScale - currentScale) * lerpFactor;

      const currentFocusX = (dimensions.width / 2 - world.x) / safeCurrentScale;
      const currentFocusY = (dimensions.height / 2 - world.y) / safeCurrentScale;

      const nextFocusX = currentFocusX + (px - currentFocusX) * lerpFactor;
      const nextFocusY = currentFocusY + (py - currentFocusY) * lerpFactor;

      const newStageX = dimensions.width / 2 - nextFocusX * newScale;
      const newStageY = dimensions.height / 2 - nextFocusY * newScale;

      world.scale.set(newScale);
      world.position.set(newStageX, newStageY);
      syncFogVisibility(sightMaskSpriteRef.current, newScale, Boolean(playerCoordsRef.current));

      if (playerMarkerSpriteRef.current && !playerMarkerSpriteRef.current.destroyed) {
        playerMarkerSpriteRef.current.width = 50 / newScale;
        playerMarkerSpriteRef.current.height = 50 / newScale;
      }
    };

    const hasCameraArrived = (px: number, py: number) => {
      if (!followPlayerRef.current || !worldContainerRef.current) return true;
      const world = worldContainerRef.current;
      const scale = world.scale.x;
      const targetStageX = dimensions.width / 2 - px * scale;
      const targetStageY = dimensions.height / 2 - py * scale;
      const dx = world.x - targetStageX;
      const dy = world.y - targetStageY;
      return Math.sqrt(dx * dx + dy * dy) < 0.5 && Math.abs(scale - 3.0) < 0.01;
    };

    const tick = (time: number) => {
      const deltaTime = (time - lastTime) / 1000;
      lastTime = time;

      const stepIdx = currentPathStepRef.current;

      const hasStartPos =
        coords.length > 0 &&
        path.length > 0 &&
        (Math.abs(coords[0]!.x - (nodes[path[0]!]?.x ?? 0)) > 0.1 ||
          Math.abs(coords[0]!.y - (nodes[path[0]!]?.y ?? 0)) > 0.1);

      if (stepIdx >= coords.length) {
        const finalPos = coords[coords.length - 1];
        if (finalPos !== undefined) {
          if (cameraCatchUpStart === null) {
            cameraCatchUpStart = performance.now();
          }
          const waitedMs = performance.now() - cameraCatchUpStart;
          const forceArrived = waitedMs > 1500;

          if (!hasCameraArrived(finalPos.x, finalPos.y) && !forceArrived) {
            playerCoordsRef.current = finalPos;
            updatePlayerMarkerAndFog(finalPos.x, finalPos.y);
            updateCameraFollow(finalPos.x, finalPos.y, deltaTime);
            animId = requestAnimationFrame(tick);
            return;
          }

          cameraCatchUpStart = null;

          const finalNodeId = path[path.length - 1];
          if (finalNodeId !== undefined) {
            setCurrentNodeId(finalNodeId);
          }
          setPlayerCoords(finalPos);
          if (coords.length > 1) {
            const prevPos = coords[coords.length - 2];
            if (prevPos) {
              const dx = finalPos.x - prevPos.x;
              const dy = finalPos.y - prevPos.y;
              setPlayerRotation((Math.atan2(dy, dx) * 180) / Math.PI + 90);
            }
          }
        }
        setTargetNodeId(null);
        setTargetBuilding(null);
        setTargetBuildingId(null);
        setIsNavigating(false);
        void queryClient.invalidateQueries({ queryKey: ["character"] });

        if (worldContainerRef.current) {
          const world = worldContainerRef.current;
          setStageTransform({
            x: world.x,
            y: world.y,
            scale: world.scale.x,
          });
        }

        const res = navigateRaidResponseRef.current;
        const finalNodeId = path[path.length - 1];
        console.log("[Arrival Check] path finished:", {
          resExists: !!res,
          encounterTriggered: res?.encounterTriggered,
          stopNodeId: res?.stopNodeId,
          finalNodeId,
          match: res ? res.stopNodeId === finalNodeId : false,
          hasBattleLog: res ? !!res.battleLog : false,
        });
        if (res && res.encounterTriggered && res.stopNodeId === finalNodeId && res.battleLog) {
          console.log("[Arrival Check] Triggering combat now!");
          triggerCombat(res.battleLog);
        } else if (res && !res.encounterTriggered) {
          setNoiseSignals(raidNoiseState(res.raid.id, res));
        }
        return;
      }

      const nextPos = coords[stepIdx];
      if (nextPos === undefined) {
        setIsNavigating(false);
        return;
      }

      let currentPos = playerCoordsRef.current;
      if (!currentPos || (currentPos.x === 0 && currentPos.y === 0)) {
        const prevPos = coords[stepIdx - 1];
        if (prevPos) {
          currentPos = { x: prevPos.x, y: prevPos.y };
          playerCoordsRef.current = currentPos;
        } else {
          setIsNavigating(false);
          return;
        }
      }

      const dx = nextPos.x - currentPos.x;
      const dy = nextPos.y - currentPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const angleRad = Math.atan2(dy, dx);
      const angleDeg = (angleRad * 180) / Math.PI + 90;

      const progress =
        totalDistance > 0 ? Math.min(1.0, Math.max(0.0, accumulatedDistance / totalDistance)) : 1.0;
      if (progress - lastReportedProgress >= 0.01 || (progress >= 1.0 && lastReportedProgress < 1.0)) {
        lastReportedProgress = progress;
        setNavigationProgress(progress);
      }
      const speedFactor = Math.sin(progress * Math.PI);
      const currentSpeed = minSpeed + (maxSpeed - minSpeed) * speedFactor;

      const responseGateStepIdx = hasRoadHops && hasStartPos ? 2 : 1;

      let finalSpeed = currentSpeed;
      if (hasRoadHops && stepIdx === responseGateStepIdx) {
        finalSpeed = currentSpeed * 0.3;

        if (navigateRaidResponseRef.current === null) {
          const prevNodeId = path[0] ?? currentNodeId;
          const prevNode = nodes[prevNodeId];
          const nextNode = nodes[path[1]!];
          if (prevNode && nextNode) {
            const hdx = nextNode.x - prevNode.x;
            const hdy = nextNode.y - prevNode.y;
            const hopTotalDistance = Math.sqrt(hdx * hdx + hdy * hdy);

            if (hopTotalDistance > 0) {
              const ratio = distance / hopTotalDistance;
              if (ratio < 0.7) {
                const slowDownFactor = ratio / 0.7;
                const easedFactor = Math.sin((slowDownFactor * Math.PI) / 2);
                finalSpeed = 2 + (finalSpeed - 2) * easedFactor;
              }
            }
          }
        }
      }

      const step = finalSpeed * deltaTime;

      if (distance <= step) {
        if (stepIdx === responseGateStepIdx) {
          if (navigateRaidResponseRef.current === null) {
            if (hopGateWaitStart === null) {
              hopGateWaitStart = performance.now();
            }
            const waitedMs = performance.now() - hopGateWaitStart;
            if (waitedMs > 5000) {
              console.warn("[1-Hop Gate] Server response timed out; stopping navigation.");
              setTargetNodeId(null);
              setIsNavigating(false);
              void queryClient.invalidateQueries({ queryKey: ["character"] });
              hopGateWaitStart = null;
              return;
            } else {
              const holdPos = { x: nextPos.x, y: nextPos.y };
              playerCoordsRef.current = holdPos;
              updatePlayerMarkerAndFog(holdPos.x, holdPos.y, angleDeg);
              updateCameraFollow(holdPos.x, holdPos.y, deltaTime);
              animId = requestAnimationFrame(tick);
              return;
            }
          } else {
            hopGateWaitStart = null;
          }

          const res = navigateRaidResponseRef.current;
          if (hasRoadHops && res?.encounterTriggered && res.stopNodeId !== undefined) {
            const stopIndex = path.indexOf(res.stopNodeId, 1);
            if (stopIndex !== -1) {
              path = path.slice(0, stopIndex + 1);
              coords = coords.slice(0, stopIndex + (hasStartPos ? 2 : 1));
            }
          }
        }

        const arrivedPos = { x: nextPos.x, y: nextPos.y };
        playerCoordsRef.current = arrivedPos;
        accumulatedDistance += distance;

        updatePlayerMarkerAndFog(arrivedPos.x, arrivedPos.y, angleDeg);
        updateCameraFollow(arrivedPos.x, arrivedPos.y, deltaTime);

        if (pathLineGraphicsRef.current) {
          const remainingPoints = coords
            .slice(stepIdx)
            .flatMap((c) => [c.x, c.y]);
          drawPathLineGraphics(pathLineGraphicsRef.current, remainingPoints);
        }

        currentPathStepRef.current += 1;
        animId = requestAnimationFrame(tick);
      } else {
        const ratio = distance > 0 ? step / distance : 0;
        const newPos = {
          x: currentPos.x + dx * ratio,
          y: currentPos.y + dy * ratio,
        };

        playerCoordsRef.current = newPos;
        accumulatedDistance += step;

        updatePlayerMarkerAndFog(newPos.x, newPos.y, angleDeg);
        updateCameraFollow(newPos.x, newPos.y, deltaTime);

        if (pathLineGraphicsRef.current) {
          const remainingPoints = [
            newPos.x,
            newPos.y,
            ...coords.slice(stepIdx).flatMap((c) => [c.x, c.y]),
          ];
          drawPathLineGraphics(pathLineGraphicsRef.current, remainingPoints);
        }

        animId = requestAnimationFrame(tick);
      }
    };

    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
      setNavigationProgress(0);
      setNavigationStartTime(null);
      const pathLine = pathLineGraphicsRef.current;
      if (pathLine && !pathLine.destroyed) pathLine.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNavigating, isCombat]);

  return (
    <div className={styles.canvasContainer} ref={containerRef}>
      {/* 하이테크 스타일 정보 패널 오버레이 (개발 모드일 때만 렌더링) */}
      {!isCombat && showDevPanel && (
        <div
          className={styles.infoPanel}
          onMouseDown={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          <div
            className={styles.expandableHeader}
            onClick={() => setIsStatusExpanded(!isStatusExpanded)}
            style={{ marginTop: 0, paddingTop: 0, borderTop: "none" }}
          >
            <span className={styles.sectionLabel} style={{ color: "#4d7cff", letterSpacing: "1.5px" }}>
              NETWORK MATRIX STATUS
            </span>
            <span className={styles.expandIcon({ expanded: isStatusExpanded })}>▼</span>
          </div>

          <div className={styles.expandableContent({ expanded: isStatusExpanded })}>
            <div className={styles.metricRow} style={{ marginTop: "12px" }}>
              <span className={styles.metricLabel}>Total Nodes / Edges</span>
              <span className={styles.metricValue}>
                {nodes.length} / {edges.length}
              </span>
            </div>
            <div className={styles.metricRow}>
              <span className={styles.metricLabel}>Total Buildings</span>
              <span className={styles.metricValue}>{buildings.length}</span>
            </div>
            <div
              className={styles.metricRow}
              style={{
                background: "rgba(255, 71, 87, 0.15)",
                padding: "4px 6px",
                borderRadius: "6px",
                margin: "6px 0",
              }}
            >
              <span className={styles.metricLabel} style={{ color: "#ff4757", fontWeight: 700 }}>
                Culling CPU Time
              </span>
              <span className={styles.metricValue} style={{ color: "#ff4757", fontWeight: 800 }}>
                {cullingTimeMs.toFixed(3)} ms
              </span>
            </div>
            <div className={styles.metricRow}>
              <span className={styles.metricLabel}>Visible Nodes (R-Tree)</span>
              <span className={styles.metricValue}>
                {showNodes ? visibleNodeIndices.size : 0} (
                {showNodes ? Math.round((visibleNodeIndices.size / nodes.length) * 100) : 0}%)
              </span>
            </div>
            <div className={styles.metricRow}>
              <span className={styles.metricLabel}>Visible Buildings (R-Tree)</span>
              <span className={styles.metricValue}>
                {showBuildings ? visibleBuildings.length : 0} (
                {showBuildings ? Math.round((visibleBuildings.length / buildings.length) * 100) : 0}%)
              </span>
            </div>
            <div className={styles.metricRow}>
              <span className={styles.metricLabel}>Zoom Factor</span>
              <span className={styles.metricValue}>{Math.round(stageTransform.scale * 100)}%</span>
            </div>
            <div className={styles.metricRow}>
              <span className={styles.metricLabel}>Viewport Area</span>
              <span className={styles.metricValue}>
                {dimensions.width}x{dimensions.height}
              </span>
            </div>
          </div>

          <div className={styles.expandableHeader} onClick={() => setIsOptionsExpanded(!isOptionsExpanded)}>
            <span className={styles.sectionLabel}>Rendering Config</span>
            <span className={styles.expandIcon({ expanded: isOptionsExpanded })}>▼</span>
          </div>

          <div className={styles.expandableContent({ expanded: isOptionsExpanded })}>
            <div className={styles.metricRow}>
              <span className={styles.metricLabel}>Display Nodes</span>
              <button
                type="button"
                className={styles.toggleButton({ active: showNodes })}
                onClick={() => {
                  setShowNodes(!showNodes);
                  resetHoverHud();
                }}
              >
                {showNodes ? "ON" : "OFF"}
              </button>
            </div>
            <div className={styles.metricRow}>
              <span className={styles.metricLabel}>Display Edges</span>
              <button
                type="button"
                className={styles.toggleButton({ active: showEdges })}
                onClick={() => setShowEdges(!showEdges)}
              >
                {showEdges ? "ON" : "OFF"}
              </button>
            </div>
            <div className={styles.metricRow}>
              <span className={styles.metricLabel}>Display Buildings</span>
              <button
                type="button"
                className={styles.toggleButton({ active: showBuildings })}
                onClick={() => {
                  setShowBuildings(!showBuildings);
                  resetHoverHud();
                }}
              >
                {showBuildings ? "ON" : "OFF"}
              </button>
            </div>
            <div className={styles.metricRow}>
              <span className={styles.metricLabel}>Track Player</span>
              <button
                type="button"
                className={styles.toggleButton({ active: followPlayer })}
                onClick={() => setFollowPlayer(!followPlayer)}
              >
                {followPlayer ? "ON" : "OFF"}
              </button>
            </div>
          </div>

          <div className={styles.hoverDetail} id="hud-hover-detail" style={{ display: "none" }} />

          <div className={styles.controlHint}>Drag to Pan / Scroll to Zoom</div>
        </div>
      )}

      {/* 하단 플로팅 네비게이션 HUD (개발 모드일 때만 렌더링) */}
      {!isCombat && showDevPanel && targetNodeId !== null && (
        <div
          className={styles.navigationPanel}
          onMouseDown={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          <div className={styles.navInfoArea}>
            <span
              className={styles.sectionLabel}
              style={{ color: "#2bcbba", display: "block", marginBottom: "4px" }}
            >
              Navigation Matrix
            </span>
            <div
              className={styles.metricRow}
              style={{ margin: 0, display: "flex", gap: "12px", flexWrap: "wrap" }}
            >
              <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                <span className={styles.metricLabel}>Current:</span>
                <span className={styles.metricValue}>Node #{currentNodeId}</span>
              </div>
              <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                <span className={styles.metricLabel}>Target:</span>
                <span className={styles.metricValue}>Node #{targetNodeId}</span>
              </div>
              <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                <span className={styles.metricLabel}>Cost:</span>
                <span className={styles.metricValue}>
                  {shortestPath.length > 0 ? `${shortestPath.length - 1} hops` : "UNREACHABLE"}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.navButtonArea}>
            <button
              type="button"
              className={styles.navButton({ primary: true })}
              disabled={shortestPathPoints.length < 4 || isNavigating}
              onClick={() => startNavigation(shortestPath, targetBuilding)}
            >
              {isNavigating ? "IN TRANSIT..." : "START NAVIGATION"}
            </button>
            <button
              type="button"
              className={styles.navButton({ primary: false })}
              disabled={isNavigating}
              onClick={() => {
                setTargetNodeId(null);
                setTargetBuilding(null);
                setTargetBuildingId(null);
              }}
            >
              CANCEL
            </button>
          </div>
        </div>
      )}

      <div
        ref={canvasHostRef}
        style={{
          width: "100%",
          height: "100%",
          touchAction: "none",
          pointerEvents: isCombat ? "none" : "auto",
        }}
      />
    </div>
  );
};

export default memo(MapGraphCanvas, (prevProps, nextProps) => {
  return prevProps.isCombat === nextProps.isCombat;
});
