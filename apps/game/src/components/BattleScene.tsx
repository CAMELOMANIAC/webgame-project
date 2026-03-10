import React, { useMemo, useState } from "react";
import styled from "styled-components";

import simulateBattle from "../utils/simulateBattle";
import type { User } from "../utils/simulateBattle.types";
import { useBattlePlayer } from "../utils/useBattlePlayer";
import { defaultWeapon, defaultWeapon2 } from "../utils/weapon";
import { BattleLogDisplay } from "./BattleLogDisplay";
import { BattlePlayer } from "./BattlePlayer";

export const BattleScene: React.FC = () => {
  // 테스트 데이터 생성
  const initialPlayers: User[] = useMemo(() => [
    {
      id: "Hero 1",
      teamId: "TeamA",
      hp: 100,
      maxHp: 100,
      weapons: [defaultWeapon, null, null, null, null],
    },
    {
      id: "Hero 2",
      teamId: "TeamA",
      hp: 80,
      maxHp: 80,
      weapons: [defaultWeapon2, null, null, null, null],
    },
    {
      id: "Monster 1",
      teamId: "TeamB",
      hp: 120,
      maxHp: 120,
      weapons: [defaultWeapon, null, null, null, null],
    },
    {
      id: "Monster 2",
      teamId: "TeamB",
      hp: 150,
      maxHp: 150,
      weapons: [defaultWeapon2, null, null, null, null],
    },
  ], []);

  const battleLog = useMemo(() => {
    const clonedPlayers = initialPlayers.map(p => ({
      ...p,
      weapons: p.weapons.map(w => w ? { ...w, currentCooldown: 0 } : null) as User["weapons"]
    }));
    return simulateBattle(clonedPlayers);
  }, [initialPlayers]);

  const { players, isPlaying, start, activeEvents, eventHistory } = useBattlePlayer(battleLog);

  // 현재 발생한 데미지 이벤트 필터링 (애니메이션용)
  const damageEvents = activeEvents.filter((e) => e.type === "DAMAGE");

  const teamA = players.filter(p => p.teamId === "TeamA");
  const teamB = players.filter(p => p.teamId === "TeamB");

  const winnerEvent = eventHistory.find(e => e.type === "BATTLE_END");
  const winnerTeamId = winnerEvent && winnerEvent.type === "BATTLE_END" ? winnerEvent.winnerTeamId : null;

  return (
    <SceneContainer>
      <h3>Battle Simulator (N:N)</h3>

      {!isPlaying && (
        <button onClick={start} style={{ padding: "0.5rem 1rem", cursor: "pointer" }}>
          Start Battle
        </button>
      )}

      {winnerTeamId && <WinnerBanner>Winner: {winnerTeamId}!</WinnerBanner>}

      <BattleArea>
        <TeamGroup>
          <h4>Team A</h4>
          {teamA.map((player) => (
            <BattlePlayer
              key={player.id}
              player={player}
              damageEvents={damageEvents.filter((e) => e.targetId === player.id)}
              isEnemy={false}
            />
          ))}
        </TeamGroup>

        <VS>VS</VS>

        <TeamGroup>
          <h4>Team B</h4>
          {teamB.map((player) => (
            <BattlePlayer
              key={player.id}
              player={player}
              damageEvents={damageEvents.filter((e) => e.targetId === player.id)}
              isEnemy={true}
            />
          ))}
        </TeamGroup>
      </BattleArea>

      <BattleLogWrapper>
        <h4>Battle Log</h4>
        <BattleLogDisplay 
          events={eventHistory} 
          players={battleLog?.initialState.players || []} 
        />
      </BattleLogWrapper>

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
  min-height: 800px;
  border-radius: 12px;
  width: 100%;
`;

const BattleArea = styled.div`
  display: flex;
  justify-content: space-around;
  align-items: flex-start;
  width: 100%;
  max-width: 1000px;
  position: relative;
`;

const TeamGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  align-items: center;
`;

const VS = styled.div`
  font-size: 2rem;
  font-weight: bold;
  align-self: center;
  color: #ff5252;
`;

const WinnerBanner = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: #ffd700;
  text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
  margin-bottom: 1rem;
`;

const BattleLogWrapper = styled.div`
  width: 100%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  
  h4 {
    margin: 0;
    color: #888;
  }
`;
