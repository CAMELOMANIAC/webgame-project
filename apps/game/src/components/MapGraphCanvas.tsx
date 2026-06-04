import Konva from "konva";
import { useEffect, useMemo,useRef, useState } from "react";
import { Circle, Group,Layer, Line, Stage } from "react-konva";
import styled from "styled-components";

import mapData from "../assets/map_graph.json";

interface Node {
  x: number;
  y: number;
}

type Edge = [number, number];

const nodes = mapData.nodes as Node[];
const edges = mapData.edges as Edge[];

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

  const [hoveredNode, setHoveredNode] = useState<{ index: number } | null>(null);

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

    const margin = 100; // 화면 외곽 클리핑 여유 공간
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

  // 5. 활성화된(화면에 그려질) 엣지들 필터링
  // 양끝 노드 중 최소 한 개가 화면 내에 있는 경우만 드로잉
  const visibleEdges = useMemo(() => {
    return edges.filter(
      ([startIdx, endIdx]) =>
        visibleNodeIndices.has(startIdx) || visibleNodeIndices.has(endIdx)
    );
  }, [visibleNodeIndices]);

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

  // 7. 드래그(팬)에 따른 뷰포트 트랜스폼 갱신
  const handleDragMove = () => {
    const stage = stageRef.current;
    if (!stage) return;
    setStageTransform({
      x: stage.x(),
      y: stage.y(),
      scale: stage.scaleX(),
    });
  };

  return (
    <CanvasContainer ref={containerRef}>
      {/* 하이테크 스타일 정보 패널 오버레이 */}
      <InfoPanel>
        <PanelTitle>NETWORK MATRIX STATUS</PanelTitle>
        <MetricRow>
          <MetricLabel>Total Nodes / Edges</MetricLabel>
          <MetricValue>{nodes.length} / {edges.length}</MetricValue>
        </MetricRow>
        <MetricRow>
          <MetricLabel>Rendered Nodes (Culled)</MetricLabel>
          <MetricValue>{visibleNodeIndices.size} ({Math.round((visibleNodeIndices.size / nodes.length) * 100)}%)</MetricValue>
        </MetricRow>
        <MetricRow>
          <MetricLabel>Rendered Edges (Culled)</MetricLabel>
          <MetricValue>{visibleEdges.length} ({Math.round((visibleEdges.length / edges.length) * 100)}%)</MetricValue>
        </MetricRow>
        <MetricRow>
          <MetricLabel>Zoom Factor</MetricLabel>
          <MetricValue>{Math.round(stageTransform.scale * 100)}%</MetricValue>
        </MetricRow>
        <MetricRow>
          <MetricLabel>Viewport Area</MetricLabel>
          <MetricValue>{dimensions.width}x{dimensions.height}</MetricValue>
        </MetricRow>
        
        {hoveredNode && (
          <HoverDetail>
            <DetailHeader style={{ color: DEFAULT_NODE_COLOR }}>
              NODE #{hoveredNode.index}
            </DetailHeader>
            <DetailBody>
              X: {nodes[hoveredNode.index].x.toFixed(2)}<br />
              Y: {nodes[hoveredNode.index].y.toFixed(2)}
            </DetailBody>
          </HoverDetail>
        )}
        
        <ControlHint>Drag to Pan / Scroll to Zoom</ControlHint>
      </InfoPanel>

      {dimensions.width > 0 && dimensions.height > 0 && (
        <Stage
          ref={stageRef}
          width={dimensions.width}
          height={dimensions.height}
          draggable
          onWheel={handleWheel}
          onDragMove={handleDragMove}
          onDragEnd={handleDragMove}
        >
          {/* Layer 1: Edges (연결선) - 최적화를 위해 listening={false} 처리 */}
          <Layer listening={false}>
            {visibleEdges.map(([startIdx, endIdx], idx) => {
              const start = nodes[startIdx];
              const end = nodes[endIdx];
              if (!start || !end) return null;
              
              return (
                <Line
                  key={`edge-${idx}`}
                  points={[start.x, start.y, end.x, end.y]}
                  stroke="rgba(77, 124, 255, 0.08)"
                  strokeWidth={1.5}
                />
              );
            })}
          </Layer>

          {/* Layer 2: Nodes (노드 포인트) */}
          <Layer>
            {Array.from(visibleNodeIndices).map((nodeIdx) => {
              const node = nodes[nodeIdx];
              const isHovered = hoveredNode?.index === nodeIdx;

              return (
                <Group
                  key={`node-${nodeIdx}`}
                  x={node.x}
                  y={node.y}
                  onMouseEnter={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = "pointer";
                    setHoveredNode({ index: nodeIdx });
                  }}
                  onMouseLeave={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = "default";
                    setHoveredNode(null);
                  }}
                >
                  <Circle
                    radius={isHovered ? DEFAULT_NODE_RADIUS + 3 : DEFAULT_NODE_RADIUS}
                    fill={isHovered ? "#ffffff" : DEFAULT_NODE_COLOR}
                    stroke={isHovered ? DEFAULT_NODE_COLOR : "rgba(10, 10, 12, 0.8)"}
                    strokeWidth={isHovered ? 2.5 : 1}
                    shadowColor={DEFAULT_NODE_COLOR}
                    shadowBlur={isHovered ? 12 : 0}
                    shadowOpacity={isHovered ? 0.9 : 0}
                  />
                </Group>
              );
            })}
          </Layer>
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
  pointer-events: none; /* Stage 마우스 이벤트를 가로막지 않음 */
`;

const PanelTitle = styled.h2`
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: #4d7cff;
  margin: 0 0 12px 0;
  text-transform: uppercase;
  border-bottom: 1px dashed rgba(77, 124, 255, 0.3);
  padding-bottom: 6px;
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

const HoverDetail = styled.div`
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const DetailHeader = styled.div`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  margin-bottom: 2px;
  line-height: 1.4;
`;

const DetailBody = styled.div`
  font-size: 10px;
  color: #8a8d98;
  font-family: monospace;
  line-height: 1.4;
`;

const ControlHint = styled.div`
  margin-top: 12px;
  font-size: 9px;
  color: #4d7cff;
  text-align: center;
  opacity: 0.8;
  letter-spacing: 0.5px;
`;
