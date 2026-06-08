import type { BattleEvent, BattleLog } from "@webgame/types";
import styled from "styled-components";

import { BattleCanvas } from "@/components/BattleCanvas";
import MapGraphCanvas from "@/components/MapGraphCanvas";

interface FieldBackgroundProps {
  isCombat: boolean;
  battleLog: BattleLog | null | undefined;
  enemyPositions: Map<string, { x: number; y: number }>;
  activeAttacks: BattleEvent[];
  currentTime: number;
  characterNickname: string | undefined;
  isArrivePending: boolean;
}

export function FieldBackground({
  isCombat,
  battleLog,
  enemyPositions,
  activeAttacks,
  currentTime,
  characterNickname,
  isArrivePending,
}: FieldBackgroundProps) {
  return (
    <Container>
      {/* 맵 그래프 캔버스 (항상 뒤쪽에 렌더링) */}
      <MapGraphCanvas isCombat={isCombat} isArrivePending={isArrivePending} />

      {/* 전투 시뮬레이터 캔버스 (전투 중일 때만 맵 위에 렌더링) */}
      {isCombat && (
        <BattleCanvas
          isCombat={isCombat}
          battleLog={battleLog}
          enemyPositions={enemyPositions}
          activeAttacks={activeAttacks}
          currentTime={currentTime}
          characterNickname={characterNickname}
        />
      )}
    </Container>
  );
}

const Container = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
`;
