import React, { useMemo } from "react";
import styled from "styled-components";

import simulateBattle from "../utils/simulateBattle";
import type { User } from "../utils/simulateBattle.types";
import { useBattlePlayer } from "../utils/useBattlePlayer";
import { defaultWeapon, defaultWeapon2 } from "../utils/weapon";
import { BattlePlayer } from "./BattlePlayer";

export const BattleScene: React.FC = () => {
  // 테스트 데이터 생성
  const battleLog = useMemo(() => {
    const u1: User = {
      id: "Hero",
      hp: 100,
      maxHp: 100,
      weapons: [defaultWeapon, null, null, null, null],
    };
    const u2: User = {
      id: "Monster",
      hp: 120,
      maxHp: 120,
      weapons: [defaultWeapon2, null, null, null, null],
    };
    return simulateBattle(u1, u2);
  }, []);

  const { players, isPlaying, start, activeEvents } = useBattlePlayer(battleLog);

  // 현재 발생한 데미지 이벤트 필터링 (애니메이션용)
  const damageEvents = activeEvents.filter((e) => e.type === "DAMAGE");

  return (
    <SceneContainer>
      <h3>Battle Simulator</h3>

      {!isPlaying && (
        <button onClick={start} style={{ padding: "0.5rem 1rem", cursor: "pointer" }}>
          Start Battle
        </button>
      )}

      <PlayersWrapper>
        {players.map((player, idx) => (
          <BattlePlayer
            key={player.id}
            player={player}
            damageEvents={damageEvents.filter((e) => e.targetId === player.id)}
            isEnemy={idx === 1}
          />
        ))}
      </PlayersWrapper>

      <div style={{ marginTop: "1rem", color: "#888", fontSize: "0.9rem" }}>
        {isPlaying ? "Battle in progress..." : "Waiting to start"}
      </div>
    </SceneContainer>
  );
};

const SceneContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  padding: 2rem;
  background: #1a1a1a;
  color: white;
  min-height: 400px;
  border-radius: 12px;
`;

const PlayersWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  max-width: 800px;
  position: relative;
`;
