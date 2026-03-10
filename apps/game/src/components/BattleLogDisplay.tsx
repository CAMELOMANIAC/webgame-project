import React, { useEffect, useRef } from "react";
import styled from "styled-components";

import { type BattleEvent, type PlayerState } from "../utils/simulateBattle.types";

interface BattleLogDisplayProps {
  events: BattleEvent[];
  players: PlayerState[];
}

export const BattleLogDisplay: React.FC<BattleLogDisplayProps> = ({ events, players }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // 이벤트가 추가될 때마다 하단으로 자동 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  const getEventText = (event: BattleEvent) => {
    switch (event.type) {
      case "ATTACK": {
        const actor = players.find(p => p.id === event.actorId);
        const target = players.find(p => p.id === event.targetId);
        const weaponName = actor?.weapons[event.weaponIndex]?.name || "weapon";
        return (
          <LogItem key={event.id}>
            <ActorName $teamId={actor?.teamId}>{actor?.id}</ActorName> uses{" "}
            <WeaponName>{weaponName}</WeaponName> against{" "}
            <TargetName $teamId={target?.teamId}>{target?.id}</TargetName>
          </LogItem>
        );
      }
      case "DAMAGE": {
        const target = players.find(p => p.id === event.targetId);
        return (
          <LogItem key={event.id} $isDamage>
            <TargetName $teamId={target?.teamId}>{target?.id}</TargetName> takes{" "}
            <DamageAmount>{event.amount}</DamageAmount> damage (Remaining HP: {Math.ceil(event.remainingHp)})
          </LogItem>
        );
      }
      case "DEATH": {
        const player = players.find(p => p.id === event.playerId);
        return (
          <LogItem key={event.id} $isDeath>
            💀 <ActorName $teamId={player?.teamId}>{player?.id}</ActorName> has been defeated!
          </LogItem>
        );
      }
      case "BATTLE_END": {
        return (
          <LogItem key={event.id} $isEnd>
            🏁 Battle Ended. Winner: <WinnerName>{event.winnerTeamId || "None"}</WinnerName>
          </LogItem>
        );
      }
      default:
        return null;
    }
  };

  return (
    <LogContainer ref={scrollRef}>
      {events.map(getEventText)}
    </LogContainer>
  );
};

const LogContainer = styled.div`
  width: 100%;
  max-width: 600px;
  height: 200px;
  background: #000;
  border: 1px solid #444;
  border-radius: 8px;
  padding: 1rem;
  overflow-y: auto;
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: #333;
    border-radius: 3px;
  }
`;

const LogItem = styled.div<{ $isDamage?: boolean; $isDeath?: boolean; $isEnd?: boolean }>`
  color: ${props => props.$isDamage ? "#ff8a80" : props.$isDeath ? "#e91e63" : props.$isEnd ? "#ffd700" : "#eee"};
  line-height: 1.4;
  ${props => (props.$isDeath || props.$isEnd) && "font-weight: bold;"}
`;

const ActorName = styled.span<{ $teamId?: string }>`
  color: ${props => props.$teamId === "TeamA" ? "#64b5f6" : "#f06292"};
`;

const TargetName = styled.span<{ $teamId?: string }>`
  color: ${props => props.$teamId === "TeamA" ? "#64b5f6" : "#f06292"};
`;

const WeaponName = styled.span`
  color: #aed581;
  font-style: italic;
`;

const DamageAmount = styled.span`
  color: #f44336;
  font-weight: bold;
`;

const WinnerName = styled.span`
  color: #ffd700;
  text-decoration: underline;
`;
