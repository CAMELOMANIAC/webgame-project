import type { UseMutationResult } from "@tanstack/react-query";
import type { BattleLog } from "@webgame/types";
import { useAtom } from "jotai";
import Konva from "konva";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Circle, Group, Image, Layer, Line, Shape, Stage } from "react-konva";
import styled from "styled-components";
import useImage from "use-image";

import { useGetCharacter } from "@/utils/hooks/useGetCharacter";
import type { NavigateRaidResponse } from "@/utils/hooks/useNavigateRaid";

import compass from "../assets/compass.svg";
import mapData from "../assets/map_graph.json";
import {
  currentNodeIdAtom,
  followPlayerAtom,
  isNavigatingAtom,
  playerCoordsAtom,
  playerRotationAtom,
  shortestPathAtom,
  targetNodeIdAtom,
} from "../atoms/raidAtom";
import { findShortestPath } from "../utils/pathfinding";

interface Node {
  x: number;
  y: number;
}

interface Edge {
  source: number;
  target: number;
  type: "minor" | "major" | "main";
}

interface Building {
  id: number;
  height: number;
  coordinates: { x: number; y: number }[];
  flatPoints: number[]; // 렌더링 성능 최적화를 위해 플랫화된 정점 캐시
  roadNodeId: number;
}

interface WaterPoint {
  x: number;
  y: number;
}
type Water = WaterPoint[];

const nodes = mapData.nodes as Node[];
const edges = mapData.edges as unknown as Edge[];

// 빌딩 렌더링 고속화를 위해 coordinates 배열을 1차원 플랫 구조로 미리 변환 (모듈 스코프 1회 수행)
const buildings = ((mapData.buildings || []) as unknown as Building[]).map((b) => ({
  ...b,
  flatPoints: b.coordinates.flatMap((p) => [p.x, p.y]),
}));

const water = (mapData.water || []) as unknown as Water;

// Konva Line 렌더링에 적합하도록 통합된 물 좌표 배열을 1차원 플랫 구조로 변환
const waterPoints = water.flatMap((p) => [p.x, p.y]);

const DEFAULT_NODE_COLOR = "#8e95a5";
const DEFAULT_NODE_RADIUS = 4;

interface MapGraphCanvasProps {
  isCombat?: boolean;
  isArrivePending?: boolean;
  navigateRaid: UseMutationResult<
    NavigateRaidResponse,
    Error,
    { characterId: string; path: number[] }
  >;
  triggerCombat: (log: BattleLog) => void;
}

const MapGraphCanvas = ({
  isCombat = false,
  isArrivePending = false,
  navigateRaid,
  triggerCombat,
}: MapGraphCanvasProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const mapLayerRef = useRef<Konva.Layer | null>(null);
  const [compassImg] = useImage(compass);

  const { data: characterData } = useGetCharacter();

  // 1-Hop Gate 를 위한 서버 응답 저장 Ref 및 비주얼 상 경로 단절 스포일러 방지용 원본 경로 Ref
  const navigateRaidResponseRef = useRef<NavigateRaidResponse | null>(null);
  const originalPathRef = useRef<number[]>([]);
  // 카메라 연출(Tween) 중 맵 캐싱 꼬임 방지를 위한 Ref
  const isCameraTweeningRef = useRef(false);



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
  const [targetNodeId, setTargetNodeId] = useAtom(targetNodeIdAtom);
  const [shortestPath, setShortestPath] = useAtom(shortestPathAtom);
  const [isNavigating, setIsNavigating] = useAtom(isNavigatingAtom);
  const [, setPlayerRotation] = useAtom(playerRotationAtom);

  // 플레이어의 실제 화면 드로잉 좌표 상태 및 최신 값 동기화용 Ref (부드러운 보간용)
  const [playerCoords, setPlayerCoords] = useAtom(playerCoordsAtom);
  const playerCoordsRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // 캐싱 기준점 추적용 Ref (이동 중 불필요한 캐시 무효화 방지)
  const lastCacheCoordsRef = useRef<{ x: number; y: number } | null>(null);

  // 줌 조작 감지 및 디바운스용 Ref
  const isZoomingRef = useRef(false);
  const zoomTimeoutRef = useRef<number | null>(null);

  // 플레이어 마커 및 경로 라인 Konva 레퍼런스 (애니메이션 떨림 차단용 직접 조작)
  const playerMarkerRef = useRef<Konva.Image | null>(null);
  const pathLineRef = useRef<Konva.Line | null>(null);
  const sightMaskRef = useRef<Konva.Circle | null>(null);

  // 네비게이션 경로 및 현재 도달 스텝을 추적하는 Ref (단일 requestAnimationFrame 유지용)
  const navigationPathRef = useRef<number[]>([]);
  const currentPathStepRef = useRef<number>(1);

  // 카메라 자동 화면 따라가기 상태 및 Ref
  const [followPlayer, setFollowPlayer] = useAtom(followPlayerAtom);
  const followPlayerRef = useRef(true);

  // followPlayer 상태에 맞춰 ref를 항시 최신화
  useEffect(() => {
    followPlayerRef.current = followPlayer;
  }, [followPlayer]);

  // 컴포넌트 언마운트 시 디바운스 타이머 클린업
  useEffect(() => {
    return () => {
      if (zoomTimeoutRef.current) {
        clearTimeout(zoomTimeoutRef.current);
      }
    };
  }, []);

  // 맵 레이어 캐싱을 동적으로 관리하는 헬퍼 함수
  const updateMapCache = (force = false) => {
    const layer = mapLayerRef.current;
    const stage = stageRef.current;
    if (!layer || !stage || dimensions.width === 0) return;

    const scale = stage.scaleX();
    // 픽셀 비율(pixelRatio) 계산 시 줌 배율(scale) 곱연산에 상한선(Max 2.0)을 적용하여 기하급수적 캔버스 할당 방지
    const rawPixelRatio = (window.devicePixelRatio || 1) * scale;
    const pixelRatio = Math.min(2.0, rawPixelRatio);

    // 1. 전투 중인 경우: 고정 뷰포트 영역 최초 1회만 타이트하게 캐싱
    if (isCombat) {
      if (isCameraTweeningRef.current) return; // 카메라 트윈 중에는 캐싱 유보
      if (!force && layer.isCached()) return;
      const x = -stage.x() / scale;
      const y = -stage.y() / scale;
      const w = dimensions.width / scale;
      const h = dimensions.height / scale;
      const pad = 50 / scale; // 카메라 쉐이크 마진

      layer.clearCache();
      layer.cache({
        x: x - pad,
        y: y - pad,
        width: w + pad * 2,
        height: h + pad * 2,
        pixelRatio
      });
      return;
    }

    // 2. 네비게이션 이동 중인 경우: 슬라이딩 윈도우 방식으로 주변 넉넉한 영역 고화질 캐싱
    if (isNavigating) {
      const playerPos = playerCoordsRef.current || { x: nodes[currentNodeId]?.x ?? 0, y: nodes[currentNodeId]?.y ?? 0 };

      // 이동 거리가 임계값(200px)을 초과할 때만 점진적으로 캐시 갱신
      if (!force && lastCacheCoordsRef.current && layer.isCached()) {
        const dx = playerPos.x - lastCacheCoordsRef.current.x;
        const dy = playerPos.y - lastCacheCoordsRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200) return; // 캐시 범위 내이므로 유지
      }

      lastCacheCoordsRef.current = { x: playerPos.x, y: playerPos.y };

      const w = dimensions.width / scale;
      const h = dimensions.height / scale;
      const x = playerPos.x - w / 2;
      const y = playerPos.y - h / 2;
      const pad = 600 / scale; // 주행 시 즉각 화면에서 잘려 보이지 않도록 넉넉한 버퍼 마진 추가

      layer.clearCache();
      layer.cache({
        x: x - pad,
        y: y - pad,
        width: w + pad * 2,
        height: h + pad * 2,
        pixelRatio
      });
      return;
    }

    // 3. 평상시(대기 중)에는 실시간 인터랙션을 보장하기 위해 캐시를 해제
    if (layer.isCached()) {
      layer.clearCache();
      lastCacheCoordsRef.current = null;
    }
  };

  // 전투 중 상태 변경에 대응하는 캐시 라이프사이클 관리
  useEffect(() => {
    // 줌 조작 중(isZoomingRef.current === true)일 때는 이 훅에서 캐싱을 트리거하지 않고 디바운스 타이머가 담당하도록 함
    if (isZoomingRef.current) return;

    updateMapCache(true);
    mapLayerRef.current?.batchDraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCombat, dimensions.width, dimensions.height, stageTransform]);

  // 네비게이션 이동 시작/종료에 대응하는 캐시 라이프사이클 관리
  useEffect(() => {
    if (isNavigating) {
      updateMapCache(true); // 최초 1회 이동용 대형 고화질 캐싱 생성
    } else {
      updateMapCache(false); // 이동 완료 시 캐시를 제거하여 자유 탐색 복원
      mapLayerRef.current?.batchDraw();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNavigating]);

  const startNavigation = (path: number[]) => {
    if (path.length <= 1) return;
    if (!characterData?.raw.id) {
      console.warn('[Navigation] characterData not ready, skipping navigation start.');
      return; // characterData 없으면 이동 자체를 차단 (1홉 무한 대기 방지)
    }

    // 1-Hop Gate 초기화
    navigateRaidResponseRef.current = null;

    navigateRaid.mutate(
      { characterId: characterData.raw.id, path },
      {
        onSuccess: (res) => {
          console.log('[startNavigation SUCCESS] navigate response:', res);
          navigateRaidResponseRef.current = res;
        },
        onError: (err) => {
          console.error("Failed to pre-roll encounters:", err);
          // 네트워크 에러 발생 시 안전하게 1번 노드까지만 가고 멈춤 처리
          navigateRaidResponseRef.current = { encounterTriggered: false };
        }
      }
    );

    setIsNavigating(true);
  };

  // 대상 노드 선택 시 네비게이션 트리거 (개발 모드인 경우 승인 단계를 거치고, 일반 모드면 즉시 출발)
  const handleTargetSelect = (targetId: number) => {
    console.log('[handleTargetSelect] called', {
      targetId,
      isCombat,
      isNavigating,
      isArrivePending,
      navigateRaidIsPending: navigateRaid.isPending,
      navigateRaidStatus: navigateRaid.status,
      currentNodeId,
      characterDataId: characterData?.raw.id,
    });
    if (isNavigating) {
      console.warn('[handleTargetSelect] BLOCKED: Character is already navigating.');
      return;
    }
    if (showDevPanel) {
      setTargetNodeId(targetId);
    } else {
      const path = findShortestPath(currentNodeId, targetId);
      console.log('[handleTargetSelect] path found:', path);
      if (path.length > 1) {
        setTargetNodeId(targetId);
        setShortestPath(path);
        startNavigation(path);
      }
    }
  };

  // 1. ResizeObserver를 사용하여 부모 컨테이너 크기 추적 (모바일 뷰포트 대응)
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

  // 2. 처음 마운트 및 창 크기 변경 시 카메라를 플레이어 위치에 고정하고 배율을 3으로 설정
  useEffect(() => {
    if (!stageRef.current || dimensions.width === 0 || dimensions.height === 0) return;
    if (isNavigating || isCombat) return; // 이동 중이거나 전투 중인 경우 카메라 스냅 차단!

    const stage = stageRef.current;
    const scale = 3.0;
    const playerNode = nodes[currentNodeId];
    if (!playerNode) return;

    const newX = dimensions.width / 2 - playerNode.x * scale;
    const newY = dimensions.height / 2 - playerNode.y * scale;

    // 이미 최종 위치 및 줌 배율에 충분히 근접해 있다면 불필요한 카메라 튐(Jump) 방지
    const currentScale = stage.scaleX();
    const currentX = stage.x();
    const currentY = stage.y();
    const isAlreadyAligned =
      Math.abs(currentScale - scale) < 0.05 &&
      Math.abs(currentX - newX) < 5 &&
      Math.abs(currentY - newY) < 5;

    if (isAlreadyAligned) {
      return;
    }

    stage.position({ x: newX, y: newY });
    stage.scale({ x: scale, y: scale });
    stage.batchDraw();

    setStageTransform({
      x: newX,
      y: newY,
      scale: scale,
    });
  }, [dimensions.width, dimensions.height, currentNodeId, isNavigating, isCombat]);

  // 2.1. 전투 시작 시 플레이어 중심 3.0배율 카메라 줌인 트랜지션 (Konva Tween 활용)
  useEffect(() => {
    if (!isCombat || !stageRef.current || dimensions.width === 0 || dimensions.height === 0) return;

    const stage = stageRef.current;
    const targetScale = 3.0;

    // 플레이어의 현재 위치
    const playerPos =
      playerCoordsRef.current ||
      (playerCoords ? playerCoords : { x: nodes[currentNodeId]?.x ?? 0, y: nodes[currentNodeId]?.y ?? 0 });

    const targetX = dimensions.width / 2 - playerPos.x * targetScale;
    const targetY = dimensions.height / 2 - playerPos.y * targetScale;

    // 이미 줌 배율이 3.0이고 중심도 맞아있다면 굳이 트윈하지 않음
    const currentScale = stage.scaleX();
    const currentX = stage.x();
    const currentY = stage.y();
    if (
      Math.abs(currentScale - targetScale) < 0.01 &&
      Math.abs(currentX - targetX) < 1 &&
      Math.abs(currentY - targetY) < 1
    ) {
      return;
    }

    isCameraTweeningRef.current = true;

    const tween = new Konva.Tween({
      node: stage,
      duration: 0.8, // 자연스러운 0.8초 애니메이션
      x: targetX,
      y: targetY,
      scaleX: targetScale,
      scaleY: targetScale,
      easing: Konva.Easings.EaseInOut,
      onFinish: () => {
        isCameraTweeningRef.current = false;
        setStageTransform({
          x: targetX,
          y: targetY,
          scale: targetScale,
        });
      },
    });

    tween.play();

    return () => {
      tween.destroy();
    };
  }, [isCombat, dimensions.width, dimensions.height, currentNodeId, setStageTransform]);

  // 3. 뷰포트 기준 경계 상자(Bounding Box) 계산
  const visibleBounds = useMemo(() => {
    const { width, height } = dimensions;
    const { x, y, scale } = stageTransform;

    // 네비게이션 주행 중에는 카메라 스크롤에 따른 리액트 리렌더링(컬링 갱신)을 원천 차단하기 위해 마진을 6000px로 대폭 확장
    const margin = isNavigating ? 6000 : 400;
    const minX = -x / scale - margin;
    const minY = -y / scale - margin;
    const maxX = minX + width / scale + margin * 2;
    const maxY = minY + height / scale + margin * 2;

    return { minX, minY, maxX, maxY };
  }, [stageTransform, dimensions, isNavigating]);

  // 4. 뷰포트 내부에 위치하는 노드의 인덱스들 필터링 (컬링)
  const visibleNodeIndices = useMemo(() => {
    const indices = new Set<number>();
    const { minX, minY, maxX, maxY } = visibleBounds;

    nodes.forEach((node, idx) => {
      if (node.x >= minX && node.x <= maxX && node.y >= minY && node.y <= maxY) {
        indices.add(idx);
      }
    });

    return indices;
  }, [visibleBounds]);

  // 5. 뷰포트 내부에 위치하는 빌딩 필터링 (컬링)
  const visibleBuildings = useMemo(() => {
    const { minX, minY, maxX, maxY } = visibleBounds;

    return buildings.filter((b) => {
      const first = b.coordinates[0];
      if (!first) return false;
      return first.x >= minX && first.x <= maxX && first.y >= minY && first.y <= maxY;
    });
  }, [visibleBounds]);

  // 5.1. 실시간 최단 경로 연산 (A* 알고리즘 연동)
  useEffect(() => {
    if (targetNodeId !== null) {
      const path = findShortestPath(currentNodeId, targetNodeId);
      setShortestPath(path);
    } else {
      setShortestPath([]);
    }
  }, [currentNodeId, targetNodeId]);

  // 5.2. 드로잉을 위한 최단 경로 플랫 좌표 배열
  const shortestPathPoints = useMemo(() => {
    return shortestPath.flatMap((nodeIdx) => {
      const node = nodes[nodeIdx];
      return node ? [node.x, node.y] : [];
    });
  }, [shortestPath]);

  // 5.3. playerCoords 상태값에 맞춰 ref를 항시 최신화
  useEffect(() => {
    if (playerCoords) {
      playerCoordsRef.current = playerCoords;
    }
  }, [playerCoords]);

  // 5.4. 대기 중(네비게이션 정지) 상태 시 플레이어 좌표를 현재 currentNodeId에 즉시 강제 고정
  useEffect(() => {
    if (!isNavigating && nodes[currentNodeId]) {
      const initPos = { x: nodes[currentNodeId].x, y: nodes[currentNodeId].y };
      setPlayerCoords(initPos);
      playerCoordsRef.current = initPos;
    }
  }, [currentNodeId, isNavigating, setPlayerCoords]);

  // 5.5. requestAnimationFrame 기반 등속(Constant Speed) 부드러운 네비게이션 보간 루프 (단일 세션 유지)
  useEffect(() => {
    if (!isNavigating || targetNodeId === null || shortestPath.length <= 1) {
      return;
    }

    // 네비게이션 시작 시점의 경로와 스텝 초기화
    navigationPathRef.current = shortestPath;
    originalPathRef.current = shortestPath;
    currentPathStepRef.current = 1;

    // 첫 스텝 각도 계산 및 상태 동기화
    const startNode = nodes[shortestPath[0]];
    const nextNode = nodes[shortestPath[1]];
    if (startNode && nextNode) {
      const dx = nextNode.x - startNode.x;
      const dy = nextNode.y - startNode.y;
      const angleRad = Math.atan2(dy, dx);
      const angleDeg = (angleRad * 180) / Math.PI + 90;
      setPlayerRotation(angleDeg);
    }

    // 총 주행 물리 거리 미리 연산 (속도 가감속 Easing 정규화용)
    let totalDistance = 0;
    for (let i = 0; i < shortestPath.length - 1; i++) {
      const n1 = nodes[shortestPath[i]];
      const n2 = nodes[shortestPath[i + 1]];
      if (n1 && n2) {
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        totalDistance += Math.sqrt(dx * dx + dy * dy);
      }
    }

    let accumulatedDistance = 0;
    let animId: number;
    let lastTime = performance.now();
    let hopGateWaitStart: number | null = null; // 1홉 게이트 대기 시작 시각 기록 (타임아웃 안전장치)
    let cameraCatchUpStart: number | null = null; // 카메라 정렬 대기 시작 시각 기록 (타임아웃 안전장치)
    const minSpeed = 20;   // 출발 및 도달 부근 최소 속도
    const maxSpeed = 120;  // 중간 구간 최고 속도 (전반적으로 천천히 이동하도록 조정)

    // 실시간 카메라 중심 카메라 트래킹 헬퍼 (Lerp 기반 부드러운 전환 추가)
    const updateCameraFollow = (px: number, py: number, deltaTime: number) => {
      if (!followPlayerRef.current || !stageRef.current) return;
      const stage = stageRef.current;
      
      const currentScale = stage.scaleX();
      const targetScale = 3.0; // 이동 중 3배율 고정
      
      // 프레임 레이트 독립적인 Lerp 보간 계수 계산
      const scaleLerpFactor = 1 - Math.exp(-5 * deltaTime);
      const posLerpFactor = 1 - Math.exp(-5 * deltaTime);
      
      const newScale = currentScale + (targetScale - currentScale) * scaleLerpFactor;
      
      const targetStageX = dimensions.width / 2 - px * newScale;
      const targetStageY = dimensions.height / 2 - py * newScale;
      
      const currentX = stage.x();
      const currentY = stage.y();
      
      const newStageX = currentX + (targetStageX - currentX) * posLerpFactor;
      const newStageY = currentY + (targetStageY - currentY) * posLerpFactor;
      
      stage.scale({ x: newScale, y: newScale });
      stage.position({ x: newStageX, y: newStageY });
      stage.batchDraw();
    };

    const hasCameraArrived = (px: number, py: number) => {
      if (!followPlayerRef.current || !stageRef.current) return true;
      const stage = stageRef.current;
      const scale = stage.scaleX();
      const targetStageX = dimensions.width / 2 - px * scale;
      const targetStageY = dimensions.height / 2 - py * scale;
      const dx = stage.x() - targetStageX;
      const dy = stage.y() - targetStageY;
      return Math.sqrt(dx * dx + dy * dy) < 0.5;
    };

    const tick = (time: number) => {
      const deltaTime = (time - lastTime) / 1000;
      lastTime = time;

      const path = navigationPathRef.current;
      const stepIdx = currentPathStepRef.current;

      if (stepIdx >= path.length) {
        // 경로의 끝에 도달 완료
        const finalNodeId = path[path.length - 1];
        if (finalNodeId !== undefined) {
          const finalNode = nodes[finalNodeId];
          if (finalNode) {
            if (cameraCatchUpStart === null) {
              cameraCatchUpStart = performance.now();
            }
            const waitedMs = performance.now() - cameraCatchUpStart;
            const forceArrived = waitedMs > 1500;

            // 카메라가 플레이어 위치에 부드럽게 도달할 때까지 대기
            if (!hasCameraArrived(finalNode.x, finalNode.y) && !forceArrived) {
              const finalPos = { x: finalNode.x, y: finalNode.y };
              playerCoordsRef.current = finalPos;
              if (playerMarkerRef.current) {
                playerMarkerRef.current.x(finalPos.x);
                playerMarkerRef.current.y(finalPos.y);
                playerMarkerRef.current.getLayer()?.batchDraw();
              }
              if (sightMaskRef.current) {
                sightMaskRef.current.x(finalPos.x);
                sightMaskRef.current.y(finalPos.y);
              }
              updateCameraFollow(finalPos.x, finalPos.y, deltaTime);
              animId = requestAnimationFrame(tick);
              return;
            }

            cameraCatchUpStart = null; // 대기 완료 시 리셋
            setCurrentNodeId(finalNodeId);
            const finalPos = { x: finalNode.x, y: finalNode.y };
            setPlayerCoords(finalPos);
            // 최종 도착 후 각도 상태 갱신
            if (path.length > 1) {
              const prevNode = nodes[path[path.length - 2]];
              if (prevNode) {
                const dx = finalNode.x - prevNode.x;
                const dy = finalNode.y - prevNode.y;
                setPlayerRotation((Math.atan2(dy, dx) * 180) / Math.PI + 90);
              }
            }
          }
        }
        setIsNavigating(false);
        setTargetNodeId(null);

        // 최종 목적지 도달 시에만 카메라 트랜스폼 상태를 리액트에 단 1회 갱신 (컬링 영역 최종 싱크)
        if (stageRef.current) {
          const stage = stageRef.current;
          setStageTransform({
            x: stage.x(),
            y: stage.y(),
            scale: stage.scaleX(),
          });
        }

        // 최종 도착한 목적지가 사전 예약된 인카운터(전투) 노드였다면 즉시 전투 트리거
        const res = navigateRaidResponseRef.current;
        console.log('[Arrival Check] path finished:', {
          resExists: !!res,
          encounterTriggered: res?.encounterTriggered,
          stopNodeId: res?.stopNodeId,
          finalNodeId,
          match: res ? res.stopNodeId === finalNodeId : false,
          hasBattleLog: res ? !!res.battleLog : false
        });
        if (res && res.encounterTriggered && res.stopNodeId === finalNodeId && res.battleLog) {
          console.log('[Arrival Check] Triggering combat now!');
          triggerCombat(res.battleLog);
        }
        return;
      }

      const nextNodeId = path[stepIdx];
      if (nextNodeId === undefined) {
        setIsNavigating(false);
        return;
      }
      const nextNode = nodes[nextNodeId];
      if (!nextNode) {
        setIsNavigating(false);
        return;
      }

      let currentPos = playerCoordsRef.current;
      // 방어 코드: currentPos가 0,0이거나 없으면 이전 노드의 좌표로 복구
      if (!currentPos || (currentPos.x === 0 && currentPos.y === 0)) {
        const prevNodeId = path[stepIdx - 1] ?? currentNodeId;
        const prevNode = nodes[prevNodeId];
        if (prevNode) {
          currentPos = { x: prevNode.x, y: prevNode.y };
          playerCoordsRef.current = currentPos;
        } else {
          setIsNavigating(false);
          return;
        }
      }

      const dx = nextNode.x - currentPos.x;
      const dy = nextNode.y - currentPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // 이동 방향 각도 계산 (도 단위 변환 및 나침반 기본 방향 북쪽 상쇄 90도)
      const angleRad = Math.atan2(dy, dx);
      const angleDeg = (angleRad * 180) / Math.PI + 90;

      // 주행 진행률(0.0 ~ 1.0) 계산 및 사인파 Easing 보간 속도 설정
      const progress = totalDistance > 0 ? Math.min(1.0, Math.max(0.0, accumulatedDistance / totalDistance)) : 1.0;
      const speedFactor = Math.sin(progress * Math.PI);
      const currentSpeed = minSpeed + (maxSpeed - minSpeed) * speedFactor;

      // 1-Hop Gate: 첫 번째 경유지(nextNodeId가 path[1])로 향할 때는 기본 주행 속도를 크게 낮춤 (기어가듯 이동)
      let finalSpeed = currentSpeed;
      if (stepIdx === 1) {
        finalSpeed = currentSpeed * 0.3; // 1홉 이동 속도를 기본 속도의 30% 수준으로 하향

        // 아직 서버 응답이 없다면 도착하기 전에 추가로 부드럽게 감속하여 거의 멈춤
        if (navigateRaidResponseRef.current === null) {
          const prevNodeId = path[0] ?? currentNodeId;
          const prevNode = nodes[prevNodeId];
          if (prevNode) {
            const hdx = nextNode.x - prevNode.x;
            const hdy = nextNode.y - prevNode.y;
            const hopTotalDistance = Math.sqrt(hdx * hdx + hdy * hdy);

            if (hopTotalDistance > 0) {
              const ratio = distance / hopTotalDistance; // 1.0 (출발지) -> 0.0 (첫 번째 노드)
              // 첫 번째 노드까지 거리의 70% 미만이 되면 부드럽게 감속하기 시작
              if (ratio < 0.7) {
                const slowDownFactor = ratio / 0.7; // 1.0 -> 0.0
                const easedFactor = Math.sin((slowDownFactor * Math.PI) / 2); // 1.0 -> 0.0
                // 최종적으로 2px/s의 극도로 미세한 속도까지 서서히 감속
                finalSpeed = 2 + (finalSpeed - 2) * easedFactor;
              }
            }
          }
        }
      }

      const step = finalSpeed * deltaTime;

      if (distance <= step) {
        // 1-Hop Gate: 첫 번째 경유지(nextNodeId가 path[1])에 도달했을 때 서버 응답 확인
        if (stepIdx === 1) {
          if (navigateRaidResponseRef.current === null) {
            // 대기 시작 시각 기록 (최초 진입 시에만)
            if (hopGateWaitStart === null) {
              hopGateWaitStart = performance.now();
            }
            // 안전장치: 5초 이상 응답 없으면 강제로 안전 통과 처리 (무한 대기 방지)
            const waitedMs = performance.now() - hopGateWaitStart;
            if (waitedMs > 5000) {
              console.warn('[1-Hop Gate] Server response timed out after 5s, forcing safe pass-through.');
              navigateRaidResponseRef.current = { encounterTriggered: false };
              hopGateWaitStart = null;
              // fall-through to response handling below
            } else {
              // 서버 응답이 올 때까지 1번 노드 위에 마커를 고정하고 대기시킵니다.
              const holdPos = { x: nextNode.x, y: nextNode.y };
              playerCoordsRef.current = holdPos;

              if (playerMarkerRef.current) {
                playerMarkerRef.current.x(holdPos.x);
                playerMarkerRef.current.y(holdPos.y);
                playerMarkerRef.current.rotation(angleDeg);
                playerMarkerRef.current.getLayer()?.batchDraw();
              }
              if (sightMaskRef.current) {
                sightMaskRef.current.x(holdPos.x);
                sightMaskRef.current.y(holdPos.y);
              }
              updateCameraFollow(holdPos.x, holdPos.y, deltaTime);

              animId = requestAnimationFrame(tick);
              return;
            }
          } else {
            hopGateWaitStart = null; // 응답 도착 시 타이머 초기화
          }

          // 응답이 도착했다면 가로채기 판정 진행
          const res = navigateRaidResponseRef.current;

          if (res.encounterTriggered && res.stopNodeId !== undefined) {
            const stopNodeId = res.stopNodeId;

            // 만약 1번 노드에서 바로 인카운터가 걸렸다면 여기서 즉각 중단하고 전투 켬 (카메라 정렬 후 진입)
            if (stopNodeId === nextNodeId) {
              const arrivedPos = { x: nextNode.x, y: nextNode.y };

              if (cameraCatchUpStart === null) {
                cameraCatchUpStart = performance.now();
              }
              const waitedMs = performance.now() - cameraCatchUpStart;
              const forceArrived = waitedMs > 1500;

              if (!hasCameraArrived(nextNode.x, nextNode.y) && !forceArrived) {
                playerCoordsRef.current = arrivedPos;
                if (playerMarkerRef.current) {
                  playerMarkerRef.current.x(arrivedPos.x);
                  playerMarkerRef.current.y(arrivedPos.y);
                  playerMarkerRef.current.rotation(angleDeg);
                  playerMarkerRef.current.getLayer()?.batchDraw();
                }
                if (sightMaskRef.current) {
                  sightMaskRef.current.x(arrivedPos.x);
                  sightMaskRef.current.y(arrivedPos.y);
                }
                updateCameraFollow(arrivedPos.x, arrivedPos.y, deltaTime);
                animId = requestAnimationFrame(tick);
                return;
              }

              cameraCatchUpStart = null; // 대기 완료 시 리셋
              playerCoordsRef.current = arrivedPos;

              if (playerMarkerRef.current) {
                playerMarkerRef.current.x(arrivedPos.x);
                playerMarkerRef.current.y(arrivedPos.y);
                playerMarkerRef.current.rotation(angleDeg);
                playerMarkerRef.current.getLayer()?.batchDraw();
              }
              if (sightMaskRef.current) {
                sightMaskRef.current.x(arrivedPos.x);
                sightMaskRef.current.y(arrivedPos.y);
              }
              updateCameraFollow(arrivedPos.x, arrivedPos.y, deltaTime);

              setIsNavigating(false);
              setTargetNodeId(null);
              setCurrentNodeId(nextNodeId);
              setPlayerCoords(arrivedPos);

              if (stageRef.current) {
                const stage = stageRef.current;
                setStageTransform({
                  x: stage.x(),
                  y: stage.y(),
                  scale: stage.scaleX(),
                });
              }

              console.log('[1st Node Encounter Check] Triggering combat now at first node:', {
                stopNodeId,
                nextNodeId,
                hasBattleLog: !!res.battleLog
              });
              if (res.battleLog) {
                triggerCombat(res.battleLog);
              }
              return;
            } else {
              // 1번 노드 이후의 노드에서 인카운터가 발생했다면, 경로를 해당 stopNodeId 까지만 깎아내고 통과시킴
              const stopIdx = path.indexOf(stopNodeId);
              if (stopIdx !== -1) {
                // stopNodeId 까지만으로 경로 깎음
                const truncatedPath = path.slice(0, stopIdx + 1);
                navigationPathRef.current = truncatedPath;
              }
            }
          }
        }

        // 1번 노드를 안전하게 통과하거나, 1번 노드 이후로 깎여진 경로대로 진행하는 경우
        // 목표 다음 노드에 근접하여 도착 완료
        const arrivedPos = { x: nextNode.x, y: nextNode.y };
        playerCoordsRef.current = arrivedPos;
        accumulatedDistance += distance; // 실제로 이동 완료한 물리적 거리 누적

        if (playerMarkerRef.current) {
          playerMarkerRef.current.x(arrivedPos.x);
          playerMarkerRef.current.y(arrivedPos.y);
          playerMarkerRef.current.rotation(angleDeg);
          playerMarkerRef.current.getLayer()?.batchDraw();
        }

        if (sightMaskRef.current) {
          sightMaskRef.current.x(arrivedPos.x);
          sightMaskRef.current.y(arrivedPos.y);
        }

        // 카메라 추적 활성화 시 즉시 카메라 중앙 정렬
        updateCameraFollow(arrivedPos.x, arrivedPos.y, deltaTime);

        // 이동 거리에 따른 동적 슬라이딩 캐시 리프레시 체크
        updateMapCache(false);

        // 실시간 경로선 꼬리 깎기 (에메랄드 라인 시작점을 다음 목표 노드로 단축)
        if (pathLineRef.current) {
          const remainingPoints = originalPathRef.current.slice(stepIdx).flatMap((idx) => {
            const node = nodes[idx];
            return node ? [node.x, node.y] : [];
          });
          pathLineRef.current.points(remainingPoints);
          pathLineRef.current.getLayer()?.batchDraw();
        }

        // 다음 스텝 인덱스로 진행 (리액트 리렌더링 없이 즉시 연속 이동)
        currentPathStepRef.current += 1;
        animId = requestAnimationFrame(tick);
      } else {
        // 등속 선형 보간 전진 (나누기 0에 의한 NaN 방지)
        const ratio = distance > 0 ? step / distance : 0;
        const newPos = {
          x: currentPos.x + dx * ratio,
          y: currentPos.y + dy * ratio,
        };

        playerCoordsRef.current = newPos;
        accumulatedDistance += step; // 전진한 프레임 스텝만큼 물리적 거리 누적

        // 리액트 State 리렌더링 우회: Konva 노드를 직접 위치 변경
        if (playerMarkerRef.current) {
          playerMarkerRef.current.x(newPos.x);
          playerMarkerRef.current.y(newPos.y);
          playerMarkerRef.current.rotation(angleDeg);
          playerMarkerRef.current.getLayer()?.batchDraw();
        }

        if (sightMaskRef.current) {
          sightMaskRef.current.x(newPos.x);
          sightMaskRef.current.y(newPos.y);
        }

        // 실시간 카메라 트래킹 적용
        updateCameraFollow(newPos.x, newPos.y, deltaTime);

        // 이동 거리에 따른 동적 슬라이딩 캐시 리프레시 체크
        updateMapCache(false);

        // 실시간 경로선 꼬리 깎기 (에메랄드 라인 시작점을 플레이어의 현재 실시간 좌표에 고정)
        if (pathLineRef.current) {
          const remainingPoints = [
            newPos.x,
            newPos.y,
            ...originalPathRef.current.slice(stepIdx).flatMap((idx) => {
              const node = nodes[idx];
              return node ? [node.x, node.y] : [];
            }),
          ];
          pathLineRef.current.points(remainingPoints);
          pathLineRef.current.getLayer()?.batchDraw();
        }

        animId = requestAnimationFrame(tick);
      }
    };

    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNavigating]);

  // 6. 마우스 휠 이벤트로 줌 처리 (커서 좌표 기준 줌)
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    if (isCombat) return;
    const stage = stageRef.current;
    const layer = mapLayerRef.current;
    if (!stage) return;

    // 휠 줌 시작됨: 캐싱 일시 정지용 플래그 On
    isZoomingRef.current = true;

    // 휠 줌을 시작하면 줌 조작 부하를 낮추고 원본 드로잉을 부드럽게 유지하기 위해 기존 캐시를 즉시 해제
    if (layer && layer.isCached()) {
      layer.clearCache();
      lastCacheCoordsRef.current = null;
      layer.batchDraw();
    }

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const scaleBy = 1.15;
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

    // 줌 범위 최소 0.05배 ~ 최대 10배 제한
    const clampedScale = Math.max(0.05, Math.min(10, newScale));

    const newPos = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    };

    stage.scale({ x: clampedScale, y: clampedScale });
    stage.position(newPos);
    stage.batchDraw();

    // 플레이어 마커 크기 보정 (React State 갱신 없이 즉시 반영하여 프레임 드랍 방지)
    if (playerMarkerRef.current) {
      const invScale = 1 / clampedScale;
      playerMarkerRef.current.width(50 * invScale);
      playerMarkerRef.current.height(50 * invScale);
      playerMarkerRef.current.offsetX(25 * invScale);
      playerMarkerRef.current.offsetY(25 * invScale);
    }

    // 디바운스 타이머 설정: 마우스 휠 입력이 멈춘 후 150ms 뒤에 캐싱 재개 및 React State 동기화
    if (zoomTimeoutRef.current) {
      clearTimeout(zoomTimeoutRef.current);
    }
    zoomTimeoutRef.current = setTimeout(() => {
      isZoomingRef.current = false;
      const currentStage = stageRef.current;
      if (currentStage) {
        setStageTransform({
          x: currentStage.x(),
          y: currentStage.y(),
          scale: currentStage.scaleX(),
        });
      }
      // 최종 줌 팩터에 도달했으므로 캐시 재생성
      updateMapCache(true);
      mapLayerRef.current?.batchDraw();
    }, 150);
  };

  // 7. 드래그(팬)가 완전히 끝났을 때만 뷰포트 상태를 업데이트하여 컬링 연산 재계산
  const handleDragEnd = () => {
    const stage = stageRef.current;
    if (!stage) return;
    setStageTransform({
      x: stage.x(),
      y: stage.y(),
      scale: stage.scaleX(),
    });
  };

  // 8. 노드/건물 호버 해제 안전 헬퍼 (Display 토글 조작 시 HUD 잔상 초기화)
  const resetHoverHud = () => {
    const el = document.getElementById("hud-hover-detail");
    if (el) {
      el.style.display = "none";
      el.innerHTML = "";
    }
  };

  return (
    <CanvasContainer ref={containerRef}>

      {/* 하이테크 스타일 정보 패널 오버레이 (개발 모드일 때만 렌더링) */}
      {!isCombat && showDevPanel && (
        <InfoPanel onMouseDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
          <ExpandableHeader
            onClick={() => setIsStatusExpanded(!isStatusExpanded)}
            style={{ marginTop: 0, paddingTop: 0, borderTop: "none" }}
          >
            <SectionLabel style={{ color: "#4d7cff", letterSpacing: "1.5px" }}>NETWORK MATRIX STATUS</SectionLabel>
            <ExpandIcon $expanded={isStatusExpanded}>▼</ExpandIcon>
          </ExpandableHeader>

          <ExpandableContent $expanded={isStatusExpanded}>
            <MetricRow style={{ marginTop: "12px" }}>
              <MetricLabel>Total Nodes / Edges</MetricLabel>
              <MetricValue>
                {nodes.length} / {edges.length}
              </MetricValue>
            </MetricRow>
            <MetricRow>
              <MetricLabel>Total Buildings</MetricLabel>
              <MetricValue>{buildings.length}</MetricValue>
            </MetricRow>
            <MetricRow>
              <MetricLabel>Rendered Nodes (Culled)</MetricLabel>
              <MetricValue>
                {showNodes ? visibleNodeIndices.size : 0} (
                {showNodes ? Math.round((visibleNodeIndices.size / nodes.length) * 100) : 0}%)
              </MetricValue>
            </MetricRow>
            <MetricRow>
              <MetricLabel>Rendered Buildings (Culled)</MetricLabel>
              <MetricValue>
                {showBuildings ? visibleBuildings.length : 0} (
                {showBuildings ? Math.round((visibleBuildings.length / buildings.length) * 100) : 0}%)
              </MetricValue>
            </MetricRow>
            <MetricRow>
              <MetricLabel>Zoom Factor</MetricLabel>
              <MetricValue>{Math.round(stageTransform.scale * 100)}%</MetricValue>
            </MetricRow>
            <MetricRow>
              <MetricLabel>Viewport Area</MetricLabel>
              <MetricValue>
                {dimensions.width}x{dimensions.height}
              </MetricValue>
            </MetricRow>
          </ExpandableContent>

          {/* 접이식(Expandable) 렌더링 옵션 아코디언 */}
          <ExpandableHeader onClick={() => setIsOptionsExpanded(!isOptionsExpanded)}>
            <SectionLabel>Rendering Config</SectionLabel>
            <ExpandIcon $expanded={isOptionsExpanded}>▼</ExpandIcon>
          </ExpandableHeader>

          <ExpandableContent $expanded={isOptionsExpanded}>
            <MetricRow>
              <MetricLabel>Display Nodes</MetricLabel>
              <ToggleButton
                $active={showNodes}
                onClick={() => {
                  setShowNodes(!showNodes);
                  resetHoverHud();
                }}
              >
                {showNodes ? "ON" : "OFF"}
              </ToggleButton>
            </MetricRow>
            <MetricRow>
              <MetricLabel>Display Edges</MetricLabel>
              <ToggleButton $active={showEdges} onClick={() => setShowEdges(!showEdges)}>
                {showEdges ? "ON" : "OFF"}
              </ToggleButton>
            </MetricRow>
            <MetricRow>
              <MetricLabel>Display Buildings</MetricLabel>
              <ToggleButton
                $active={showBuildings}
                onClick={() => {
                  setShowBuildings(!showBuildings);
                  resetHoverHud();
                }}
              >
                {showBuildings ? "ON" : "OFF"}
              </ToggleButton>
            </MetricRow>
            <MetricRow>
              <MetricLabel>Track Player</MetricLabel>
              <ToggleButton $active={followPlayer} onClick={() => setFollowPlayer(!followPlayer)}>
                {followPlayer ? "ON" : "OFF"}
              </ToggleButton>
            </MetricRow>
          </ExpandableContent>

          {/* 호버 정보 상세 표시창 (React 리렌더링 차단을 위해 DOM 명령형 주입) */}
          <HoverDetail id="hud-hover-detail" style={{ display: "none" }} />

          <ControlHint>Drag to Pan / Scroll to Zoom</ControlHint>
        </InfoPanel>
      )}

      {/* 하단 플로팅 네비게이션 HUD (개발 모드일 때만 렌더링) */}
      {!isCombat && showDevPanel && targetNodeId !== null && (
        <NavigationPanel onMouseDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
          <NavInfoArea>
            <SectionLabel style={{ color: "#2bcbba", display: "block", marginBottom: "4px" }}>
              Navigation Matrix
            </SectionLabel>
            <MetricRow style={{ margin: 0, display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                <MetricLabel>Current:</MetricLabel>
                <MetricValue>Node #{currentNodeId}</MetricValue>
              </div>
              <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                <MetricLabel>Target:</MetricLabel>
                <MetricValue>Node #{targetNodeId}</MetricValue>
              </div>
              <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                <MetricLabel>Cost:</MetricLabel>
                <MetricValue>{shortestPath.length > 0 ? `${shortestPath.length - 1} hops` : "UNREACHABLE"}</MetricValue>
              </div>
            </MetricRow>
          </NavInfoArea>

          <NavButtonArea>
            <StyledNavButton
              $primary
              disabled={shortestPath.length <= 1 || isNavigating || isArrivePending || navigateRaid.isPending}
              onClick={() => startNavigation(shortestPath)}
            >
              {isNavigating ? "IN TRANSIT..." : "START NAVIGATION"}
            </StyledNavButton>
            <StyledNavButton disabled={isNavigating} onClick={() => setTargetNodeId(null)}>
              CANCEL
            </StyledNavButton>
          </NavButtonArea>
        </NavigationPanel>
      )}

      {dimensions.width > 0 && dimensions.height > 0 && (
        <Stage
          ref={stageRef}
          width={dimensions.width}
          height={dimensions.height}
          draggable={!isCombat}
          listening={!isCombat}
          onWheel={handleWheel}
          onDragEnd={handleDragEnd}
          onClick={() => console.log('[Stage] clicked, isCombat:', isCombat, 'isNavigating:', isNavigating)}
        >
          {/* Layer 1: Static Map Layer (Water, Edges, Buildings, Nodes) */}
          <Layer ref={mapLayerRef} listening={!isNavigating}>
            {/* 1.1 Water Backdrop (통합된 물 영역 - 이벤트 불필요) */}
            <Group listening={false}>
              {waterPoints.length > 0 && (
                <Line
                  points={waterPoints}
                  closed
                  fill="rgba(30, 30, 32, 0.35)"
                  stroke="rgba(120, 120, 128, 0.2)"
                  strokeWidth={1.5}
                />
              )}
            </Group>

            {/* 1.2 Edges (도로망 - 이벤트 불필요) */}
            {showEdges && (
              <Group listening={false}>
                {/* 1. Main 도로 (가장 두껍고 선명한 청백색 형광) */}
                <Shape
                  sceneFunc={(context, shape) => {
                    context.beginPath();
                    edges.forEach((edge) => {
                      if (edge.type !== "main") return;
                      const start = nodes[edge.source];
                      const end = nodes[edge.target];
                      if (start && end) {
                        context.moveTo(start.x, start.y);
                        context.lineTo(end.x, end.y);
                      }
                    });
                    context.fillStrokeShape(shape);
                  }}
                  stroke="rgba(200, 200, 210, 0.35)"
                  strokeWidth={2.8}
                />
                {/* 2. Major 도로 (중간 굵기) */}
                <Shape
                  sceneFunc={(context, shape) => {
                    context.beginPath();
                    edges.forEach((edge) => {
                      if (edge.type !== "major") return;
                      const start = nodes[edge.source];
                      const end = nodes[edge.target];
                      if (start && end) {
                        context.moveTo(start.x, start.y);
                        context.lineTo(end.x, end.y);
                      }
                    });
                    context.fillStrokeShape(shape);
                  }}
                  stroke="rgba(150, 150, 160, 0.22)"
                  strokeWidth={1.8}
                />
                {/* 3. Minor 도로 (가장 얇고 희미한 골목망) */}
                <Shape
                  sceneFunc={(context, shape) => {
                    context.beginPath();
                    edges.forEach((edge) => {
                      if (edge.type !== "minor") return;
                      const start = nodes[edge.source];
                      const end = nodes[edge.target];
                      if (start && end) {
                        context.moveTo(start.x, start.y);
                        context.lineTo(end.x, end.y);
                      }
                    });
                    context.fillStrokeShape(shape);
                  }}
                  stroke="rgba(110, 110, 120, 0.15)"
                  strokeWidth={1}
                />
              </Group>
            )}

            {/* 1.3 Buildings (건물 배치) */}
            {showBuildings && (
              <Group>
                {stageTransform.scale >= 3.0 && !isNavigating ? (
                  // 줌인 상태(300% 이상, 이동 중 아님): 개별 인터랙티브 다각형 그리기 (호버 감지 활성화)
                  visibleBuildings.map((b) => {
                    return (
                      <Line
                        key={`building-${b.id}`}
                        points={b.flatPoints}
                        closed
                        fill="rgba(35, 35, 38, 0.45)"
                        stroke="rgba(120, 120, 128, 0.12)"
                        strokeWidth={1}
                        onClick={() => handleTargetSelect(b.roadNodeId)}
                        onTap={() => handleTargetSelect(b.roadNodeId)}
                        onMouseEnter={(e) => {
                          const shape = e.target;

                          // Z-Index 최상단 이동: 겹치는 건물 중 호버된 건물이 위로 올라오도록 처리
                          shape.moveToTop();

                          // React 리렌더링 방지를 위해 Konva 객체 직접 조작
                          shape.setAttrs({
                            fill: "rgba(43, 203, 186, 0.45)",
                            stroke: "#ffffff",
                            strokeWidth: 2,
                            shadowColor: "#2bcbba",
                            shadowBlur: 12,
                            shadowOpacity: 0.9,
                          });
                          shape.getLayer()?.batchDraw();

                          const container = shape.getStage()?.container();
                          if (container) container.style.cursor = "pointer";

                          // DOM 직접 조작으로 HUD 업데이트 (React Reconciliation 우회)
                          const el = document.getElementById("hud-hover-detail");
                          if (el) {
                            el.style.display = "block";
                            el.innerHTML = `
                              <div style="color: #2bcbba; font-size: 11px; font-weight: 700; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.5px;">
                                BUILDING #${b.id}
                              </div>
                              <div style="font-size: 10px; color: #8a8d98; font-family: monospace; line-height: 1.4;">
                                Height: ${b.height.toFixed(2)}m<br />
                                Connected Road: Node #${b.roadNodeId}
                              </div>
                            `;
                          }
                        }}
                        onMouseLeave={(e) => {
                          const shape = e.target;
                          shape.setAttrs({
                            fill: "rgba(35, 35, 38, 0.45)",
                            stroke: "rgba(80, 80, 85, 0.12)",
                            strokeWidth: 1,
                            shadowBlur: 0,
                            shadowOpacity: 0,
                          });
                          shape.getLayer()?.batchDraw();

                          const container = shape.getStage()?.container();
                          if (container) container.style.cursor = "default";

                          resetHoverHud();
                        }}
                      />
                    );
                  })
                ) : (
                  // 줌아웃 상태(300% 미만): 1 DrawCall 병합 드로잉 (성능 극대화, 이벤트 비활성화)
                  <Shape
                    sceneFunc={(context, shape) => {
                      context.beginPath();
                      visibleBuildings.forEach((b) => {
                        if (b.coordinates.length < 3) return;
                        const first = b.coordinates[0];
                        context.moveTo(first.x, first.y);
                        for (let i = 1; i < b.coordinates.length; i++) {
                          context.lineTo(b.coordinates[i].x, b.coordinates[i].y);
                        }
                        context.closePath();
                      });
                      context.fillStrokeShape(shape);
                    }}
                    fill="rgba(35, 35, 38, 0.45)"
                    stroke="rgba(80, 80, 85, 0.12)"
                    strokeWidth={1}
                    listening={false}
                  />
                )}
              </Group>
            )}

            {/* 1.4 Nodes (도로망 교차점 정점) */}
            {showNodes && (
              <Group>
                {stageTransform.scale >= 3.0 && !isNavigating ? (
                  // 줌인 상태(300% 이상, 이동 중 아님): 개별 인터랙티브 노드 그리기 (호버 감지 활성화)
                  Array.from(visibleNodeIndices).map((nodeIdx) => {
                    const node = nodes[nodeIdx];
                    if (!node) return null;
                    return (
                      <Group
                        key={`node-${nodeIdx}`}
                        x={node.x}
                        y={node.y}
                        onClick={() => handleTargetSelect(nodeIdx)}
                        onTap={() => handleTargetSelect(nodeIdx)}
                        onMouseEnter={(e) => {
                          const shape = e.target;

                          // Z-Index 최상단 이동: 겹치는 노드 중 호버된 노드가 위로 올라오도록 처리
                          shape.moveToTop();

                          // React 리렌더링 방지를 위해 Konva 객체 속성 직접 조작
                          shape.setAttrs({
                            radius: DEFAULT_NODE_RADIUS + 3,
                            fill: "#ffffff",
                            stroke: DEFAULT_NODE_COLOR,
                            strokeWidth: 2.5,
                            shadowColor: DEFAULT_NODE_COLOR,
                            shadowBlur: 12,
                            shadowOpacity: 0.9,
                          });
                          shape.getLayer()?.batchDraw();

                          const container = shape.getStage()?.container();
                          if (container) container.style.cursor = "pointer";

                          // DOM 직접 조작으로 HUD 업데이트
                          const el = document.getElementById("hud-hover-detail");
                          if (el) {
                            el.style.display = "block";
                            el.innerHTML = `
                              <div style="color: ${DEFAULT_NODE_COLOR}; font-size: 11px; font-weight: 700; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.5px;">
                                NODE #${nodeIdx}
                              </div>
                              <div style="font-size: 10px; color: #8a8d98; font-family: monospace; line-height: 1.4;">
                                X: ${node.x.toFixed(2)}<br />
                                Y: ${node.y.toFixed(2)}
                              </div>
                            `;
                          }
                        }}
                        onMouseLeave={(e) => {
                          const shape = e.target;
                          shape.setAttrs({
                            radius: DEFAULT_NODE_RADIUS,
                            fill: DEFAULT_NODE_COLOR,
                            stroke: "rgba(10, 10, 12, 0.8)",
                            strokeWidth: 1,
                            shadowBlur: 0,
                            shadowOpacity: 0,
                          });
                          shape.getLayer()?.batchDraw();

                          const container = shape.getStage()?.container();
                          if (container) container.style.cursor = "default";

                          resetHoverHud();
                        }}
                      >
                        <Circle
                          radius={DEFAULT_NODE_RADIUS}
                          fill={DEFAULT_NODE_COLOR}
                          stroke="rgba(10, 10, 12, 0.8)"
                          strokeWidth={1}
                        />
                      </Group>
                    );
                  })
                ) : (
                  // 줌아웃 상태(300% 미만): 1 DrawCall 병합 드로잉 (성능 극대화, 이벤트 비활성화)
                  <Shape
                    sceneFunc={(context, shape) => {
                      context.beginPath();
                      visibleNodeIndices.forEach((nodeIdx) => {
                        const node = nodes[nodeIdx];
                        if (node) {
                          context.moveTo(node.x + DEFAULT_NODE_RADIUS, node.y);
                          context.arc(node.x, node.y, DEFAULT_NODE_RADIUS, 0, Math.PI * 2);
                        }
                      });
                      context.fillStrokeShape(shape);
                    }}
                    fill={DEFAULT_NODE_COLOR}
                    stroke="rgba(10, 10, 12, 0.8)"
                    strokeWidth={1}
                    listening={false}
                  />
                )}
              </Group>
            )}
          </Layer>

          {/* Layer 2: Navigation & Path Layer (길찾기 가이드 라인 및 타겟 비콘 - 이벤트 불필요) */}
          {(shortestPathPoints.length > 0 || targetNodeId !== null) && (
            <Layer listening={false}>
              {/* 형광 에메랄드 최단 경로선 */}
              {shortestPathPoints.length > 1 && (
                <Line
                  ref={pathLineRef}
                  points={shortestPathPoints}
                  stroke="#ffffff"
                  strokeWidth={5}
                  lineCap="round"
                  lineJoin="round"
                  opacity={0.65}
                  shadowColor="#ffffff"
                  shadowBlur={10}
                  shadowOpacity={0.8}
                />
              )}
              {/* 타겟 목적지 마커 */}
              {targetNodeId !== null && nodes[targetNodeId] && (
                <Group x={nodes[targetNodeId].x} y={nodes[targetNodeId].y}>
                  <Circle
                    radius={10}
                    stroke="#ffffff"
                    strokeWidth={1.5}
                    shadowColor="#ffffff"
                    shadowBlur={8}
                    shadowOpacity={0.8}
                  />
                  <Circle radius={3} fill="#ffffff" />
                </Group>
              )}
            </Layer>
          )}

          {/* Layer 3: Player & Dynamic Overlay Layer (시야 안개 및 플레이어 마커 - 이벤트 불필요) */}
          <Layer listening={false}>
            {/* Vignette / Fog of War (플레이어 시야 외부 어둡게 마스킹) */}
            {playerCoords && (
              <Circle
                ref={sightMaskRef}
                x={playerCoords.x}
                y={playerCoords.y}
                radius={2000}
                fillRadialGradientStartPoint={{ x: 0, y: 0 }}
                fillRadialGradientStartRadius={0}
                fillRadialGradientEndPoint={{ x: 0, y: 0 }}
                fillRadialGradientEndRadius={150}
                fillRadialGradientColorStops={[
                  0,
                  "rgba(6, 7, 10, 0)",
                  0.15,
                  "rgba(6, 7, 10, 0)",
                  0.3,
                  "rgba(6, 7, 10, 0.2)",
                  0.5,
                  "rgba(6, 7, 10, 0.5)",
                ]}
              />
            )}
            {/* Player Marker (실시간 위치 Becon - SVG 나침반) */}
            {playerCoords && !isCombat && compassImg && (
              <Image
                ref={playerMarkerRef}
                image={compassImg}
                x={playerCoords.x}
                y={playerCoords.y}
                width={50 / stageTransform.scale}
                height={50 / stageTransform.scale}
                offsetX={25 / stageTransform.scale}
                offsetY={25 / stageTransform.scale}
              />
            )}
          </Layer>
        </Stage>
      )}
    </CanvasContainer>
  );
};

const CanvasContainer = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
  background: radial-gradient(circle at center, #1b1b1f 0%, #0c0c0e 100%);
  overflow: hidden;
`;

const InfoPanel = styled.div`
  position: absolute;
  top: 24px;
  left: 24px;
  z-index: 10;
  width: 250px;
  padding: 16px;
  background: rgba(10, 11, 18, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(77, 124, 255, 0.2);
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
  font-family: "Outfit", "Inter", sans-serif;
  color: #e4e6eb;
  pointer-events: auto; /* 패널 내부 스위치 등을 클릭할 수 있도록 활성화 */
`;

const MetricRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  font-size: 10px;
`;

const MetricLabel = styled.span`
  color: #8a8d98;
`;

const MetricValue = styled.span`
  font-weight: 600;
  color: #ffffff;
  font-family: monospace;
`;

const ExpandableHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  border-top: 1px dashed rgba(77, 124, 255, 0.2);
  padding-top: 12px;
  cursor: pointer;
  user-select: none;
`;

const SectionLabel = styled.span`
  color: #ffffff;
  font-weight: 700;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ExpandIcon = styled.span<{ $expanded: boolean }>`
  font-size: 8px;
  color: #4d7cff;
  transition: transform 0.2s ease;
  transform: rotate(${(props) => (props.$expanded ? "180deg" : "0deg")});
`;

const ExpandableContent = styled.div<{ $expanded: boolean }>`
  max-height: ${(props) => (props.$expanded ? "200px" : "0px")};
  overflow: hidden;
  transition: max-height 0.25s ease-out;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: ${(props) => (props.$expanded ? "12px" : "0px")};
`;

const ToggleButton = styled.button<{ $active: boolean }>`
  background: ${(props) => (props.$active ? "rgba(77, 124, 255, 0.2)" : "rgba(255, 255, 255, 0.05)")};
  border: 1px solid ${(props) => (props.$active ? "#4d7cff" : "rgba(255, 255, 255, 0.15)")};
  color: ${(props) => (props.$active ? "#ffffff" : "#8a8d98")};
  padding: 4px 12px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: monospace;

  &:hover {
    background: ${(props) => (props.$active ? "rgba(77, 124, 255, 0.3)" : "rgba(255, 255, 255, 0.1)")};
    border-color: ${(props) => (props.$active ? "#4d7cff" : "rgba(255, 255, 255, 0.3)")};
  }
`;

const HoverDetail = styled.div`
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const ControlHint = styled.div`
  margin-top: 12px;
  font-size: 9px;
  color: #4d7cff;
  text-align: center;
  opacity: 0.8;
  letter-spacing: 0.5px;
`;

const NavigationPanel = styled.div`
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  width: calc(100% - 48px);
  max-width: 500px;
  padding: 14px 20px;
  background: rgba(10, 11, 18, 0.85);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(43, 203, 186, 0.4);
  border-radius: 20px;
  box-shadow:
    0 15px 35px rgba(0, 0, 0, 0.6),
    0 0 15px rgba(43, 203, 186, 0.15);
  font-family: "Outfit", "Inter", sans-serif;
  color: #e4e6eb;
  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: auto;

  @media (min-width: 600px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
  }
`;

const NavInfoArea = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
`;

const NavButtonArea = styled.div`
  display: flex;
  gap: 10px;
  width: 100%;

  @media (min-width: 600px) {
    width: auto;
    min-width: 220px;
  }
`;

const StyledNavButton = styled.button<{ $primary?: boolean }>`
  flex: 1;
  background: ${(props) => (props.$primary ? "rgba(43, 203, 186, 0.2)" : "rgba(255, 71, 87, 0.15)")};
  border: 1px solid ${(props) => (props.$primary ? "#2bcbba" : "rgba(255, 71, 87, 0.4)")};
  color: ${(props) => (props.$primary ? "#2bcbba" : "#ff4757")};
  padding: 6px 0;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: "Outfit", sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  &:hover:not(:disabled) {
    background: ${(props) => (props.$primary ? "rgba(43, 203, 186, 0.35)" : "rgba(255, 71, 87, 0.25)")};
    border-color: ${(props) => (props.$primary ? "#2bcbba" : "#ff4757")};
    box-shadow: 0 0 10px ${(props) => (props.$primary ? "rgba(43, 203, 186, 0.3)" : "rgba(255, 71, 87, 0.3)")};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;



export default memo(MapGraphCanvas, (prevProps, nextProps) => {
  return (
    prevProps.isCombat === nextProps.isCombat &&
    prevProps.isArrivePending === nextProps.isArrivePending
  );
});
