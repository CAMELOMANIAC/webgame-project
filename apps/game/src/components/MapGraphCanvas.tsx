import Konva from "konva";
import { useEffect, useMemo,useRef, useState } from "react";
import { Circle, Group, Layer, Line,Shape, Stage } from "react-konva";
import styled from "styled-components";

import mapData from "../assets/map_graph.json";

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

const DEFAULT_NODE_COLOR = "#4d7cff";
const DEFAULT_NODE_RADIUS = 4;

export default function MapGraphCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [stageTransform, setStageTransform] = useState({
    x: 0,
    y: 0,
    scale: 0.8,
  });

  const [showNodes, setShowNodes] = useState(true);
  const [showEdges, setShowEdges] = useState(true);
  const [showBuildings, setShowBuildings] = useState(true);
  const [isOptionsExpanded, setIsOptionsExpanded] = useState(false);
  const [isStatusExpanded, setIsStatusExpanded] = useState(true);

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

  // 2. 처음 마운트 및 창 크기 변경 시 그래프를 중앙 정렬하고 스크린에 피팅
  useEffect(() => {
    if (!stageRef.current || dimensions.width === 0 || dimensions.height === 0) return;

    const stage = stageRef.current;
    
    // 그래프 전체 바운딩 박스 계산
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    nodes.forEach(n => {
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    });

    const graphWidth = maxX - minX;
    const graphHeight = maxY - minY;
    
    // 약간의 여백을 둔 스케일 계산
    const scaleX = (dimensions.width * 0.85) / graphWidth;
    const scaleY = (dimensions.height * 0.85) / graphHeight;
    const initialScale = Math.min(scaleX, scaleY);
    
    // 그래프 중심점 계산
    const graphCenterX = minX + graphWidth / 2;
    const graphCenterY = minY + graphHeight / 2;

    const newX = dimensions.width / 2 - graphCenterX * initialScale;
    const newY = dimensions.height / 2 - graphCenterY * initialScale;

    stage.position({ x: newX, y: newY });
    stage.scale({ x: initialScale, y: initialScale });
    stage.batchDraw();

    setStageTransform({
      x: newX,
      y: newY,
      scale: initialScale,
    });
  }, [dimensions.width, dimensions.height]);

  // 3. 뷰포트 기준 경계 상자(Bounding Box) 계산
  const visibleBounds = useMemo(() => {
    const { width, height } = dimensions;
    const { x, y, scale } = stageTransform;

    const margin = 400; 
    const minX = -x / scale - margin;
    const minY = -y / scale - margin;
    const maxX = minX + (width / scale) + margin * 2;
    const maxY = minY + (height / scale) + margin * 2;

    return { minX, minY, maxX, maxY };
  }, [stageTransform, dimensions]);

  // 4. 뷰포트 내부에 위치하는 노드의 인덱스들 필터링 (컬링)
  const visibleNodeIndices = useMemo(() => {
    const indices = new Set<number>();
    const { minX, minY, maxX, maxY } = visibleBounds;

    nodes.forEach((node, idx) => {
      if (
        node.x >= minX &&
        node.x <= maxX &&
        node.y >= minY &&
        node.y <= maxY
      ) {
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
      return (
        first.x >= minX &&
        first.x <= maxX &&
        first.y >= minY &&
        first.y <= maxY
      );
    });
  }, [visibleBounds]);

  // 6. 마우스 휠 이벤트로 줌 처리 (커서 좌표 기준 줌)
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

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

    setStageTransform({
      x: newPos.x,
      y: newPos.y,
      scale: clampedScale,
    });
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
      {/* 하이테크 스타일 정보 패널 오버레이 */}
      <InfoPanel
        onMouseDown={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
      >
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
            <MetricValue>{nodes.length} / {edges.length}</MetricValue>
          </MetricRow>
          <MetricRow>
            <MetricLabel>Total Buildings</MetricLabel>
            <MetricValue>{buildings.length}</MetricValue>
          </MetricRow>
          <MetricRow>
            <MetricLabel>Rendered Nodes (Culled)</MetricLabel>
            <MetricValue>{showNodes ? visibleNodeIndices.size : 0} ({showNodes ? Math.round((visibleNodeIndices.size / nodes.length) * 100) : 0}%)</MetricValue>
          </MetricRow>
          <MetricRow>
            <MetricLabel>Rendered Buildings (Culled)</MetricLabel>
            <MetricValue>{showBuildings ? visibleBuildings.length : 0} ({showBuildings ? Math.round((visibleBuildings.length / buildings.length) * 100) : 0}%)</MetricValue>
          </MetricRow>
          <MetricRow>
            <MetricLabel>Zoom Factor</MetricLabel>
            <MetricValue>{Math.round(stageTransform.scale * 100)}%</MetricValue>
          </MetricRow>
          <MetricRow>
            <MetricLabel>Viewport Area</MetricLabel>
            <MetricValue>{dimensions.width}x{dimensions.height}</MetricValue>
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
            <ToggleButton 
              $active={showEdges} 
              onClick={() => setShowEdges(!showEdges)}
            >
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
        </ExpandableContent>
        
        {/* 호버 정보 상세 표시창 (React 리렌더링 차단을 위해 DOM 명령형 주입) */}
        <HoverDetail id="hud-hover-detail" style={{ display: "none" }} />
        
        <ControlHint>Drag to Pan / Scroll to Zoom</ControlHint>
      </InfoPanel>

      {dimensions.width > 0 && dimensions.height > 0 && (
        <Stage
          ref={stageRef}
          width={dimensions.width}
          height={dimensions.height}
          draggable
          onWheel={handleWheel}
          onDragEnd={handleDragEnd}
        >
          {/* Layer 1: Water Backdrop (통합된 물 영역) - 최하단 레이어 (1 DrawCall) */}
          <Layer listening={false}>
            {waterPoints.length > 0 && (
              <Line
                points={waterPoints}
                closed
                fill="rgba(20, 42, 85, 0.35)"
                stroke="rgba(77, 124, 255, 0.2)"
                strokeWidth={1.5}
              />
            )}
          </Layer>

          {/* Layer 2: Buildings (건물 배치) */}
          {showBuildings && (
            <Layer>
              {stageTransform.scale >= 3.0 ? (
                // 줌인 상태(300% 이상): 개별 인터랙티브 다각형 그리기 (호버 감지 활성화)
                visibleBuildings.map((b) => {
                  return (
                    <Line
                      key={`building-${b.id}`}
                      points={b.flatPoints}
                      closed
                      fill="rgba(30, 35, 55, 0.45)"
                      stroke="rgba(77, 124, 255, 0.12)"
                      strokeWidth={1}
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
                          fill: "rgba(30, 35, 55, 0.45)",
                          stroke: "rgba(77, 124, 255, 0.12)",
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
                  fill="rgba(30, 35, 55, 0.45)"
                  stroke="rgba(77, 124, 255, 0.12)"
                  strokeWidth={1}
                  listening={false}
                />
              )}
            </Layer>
          )}

          {/* Layer 3: Edges (도로망) - showEdges가 true일 때 3 DrawCalls로 분할하여 최적화 및 타입별 시각화 */}
          {showEdges && (
            <Layer listening={false}>
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
                stroke="rgba(85, 140, 255, 0.25)"
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
                stroke="rgba(77, 124, 255, 0.14)"
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
                stroke="rgba(77, 124, 255, 0.05)"
                strokeWidth={1}
              />
            </Layer>
          )}

          {/* Layer 4: Nodes (도로망 교차점 정점) */}
          {showNodes && (
            <Layer>
              {stageTransform.scale >= 3.0 ? (
                // 줌인 상태(300% 이상): 개별 인터랙티브 노드 그리기 (호버 감지 활성화)
                Array.from(visibleNodeIndices).map((nodeIdx) => {
                  const node = nodes[nodeIdx];
                  if (!node) return null;
                  return (
                    <Group
                      key={`node-${nodeIdx}`}
                      x={node.x}
                      y={node.y}
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
            </Layer>
          )}
        </Stage>
      )}
    </CanvasContainer>
  );
}

const CanvasContainer = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
  background: radial-gradient(circle at center, #0f111a 0%, #06070a 100%);
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
  font-family: 'Outfit', 'Inter', sans-serif;
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
  transform: rotate(${props => props.$expanded ? "180deg" : "0deg"});
`;

const ExpandableContent = styled.div<{ $expanded: boolean }>`
  max-height: ${props => props.$expanded ? "200px" : "0px"};
  overflow: hidden;
  transition: max-height 0.25s ease-out;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: ${props => props.$expanded ? "12px" : "0px"};
`;

const ToggleButton = styled.button<{ $active: boolean }>`
  background: ${props => props.$active ? "rgba(77, 124, 255, 0.2)" : "rgba(255, 255, 255, 0.05)"};
  border: 1px solid ${props => props.$active ? "#4d7cff" : "rgba(255, 255, 255, 0.15)"};
  color: ${props => props.$active ? "#ffffff" : "#8a8d98"};
  padding: 4px 12px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: monospace;

  &:hover {
    background: ${props => props.$active ? "rgba(77, 124, 255, 0.3)" : "rgba(255, 255, 255, 0.1)"};
    border-color: ${props => props.$active ? "#4d7cff" : "rgba(255, 255, 255, 0.3)"};
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
