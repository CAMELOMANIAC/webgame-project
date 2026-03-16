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

  const getEventText = (event: BattleEvent, index: number) => {
    // 고유한 키 생성을 위해 id와 index를 조합합니다.
    const itemKey = `log-${event.id}-${index}`;
    
    switch (event.type) {
      case "ATTACK": {
        const actor = players.find(p => p.id === event.actorId);
        const target = players.find(p => p.id === event.targetId);
        const weaponName = actor?.weapons[event.weaponIndex]?.name || "weapon";
        return (
          <LogItem key={itemKey}>
            <ActorName $teamId={actor?.teamId}>{actor?.id}</ActorName> uses{" "}
            <WeaponName>{weaponName}</WeaponName> against{" "}
            <TargetName $teamId={target?.teamId}>{target?.id}</TargetName>
          </LogItem>
        );
      }
      case "DAMAGE": {
        const target = players.find(p => p.id === event.targetId);
        return (
          <LogItem key={itemKey} $isDamage>
            <TargetName $teamId={target?.teamId}>{target?.id}</TargetName> takes{" "}
            <DamageAmount>{event.amount}</DamageAmount> damage (Remaining HP: {Math.ceil(event.remainingHp)})
          </LogItem>
        );
      }
      case "HEAL": {
        const target = players.find(p => p.id === event.targetId);
        return (
          <LogItem key={itemKey} $isHeal>
            💚 <TargetName $teamId={target?.teamId}>{target?.id}</TargetName> recovers{" "}
            <HealAmount>{event.amount}</HealAmount> HP! (Current HP: {Math.ceil(event.remainingHp)})
          </LogItem>
        );
      }
      case "DEATH": {
        const player = players.find(p => p.id === event.playerId);
        return (
          <LogItem key={itemKey} $isDeath>
            💀 <ActorName $teamId={player?.teamId}>{player?.id}</ActorName> has been defeated!
          </LogItem>
        );
      }
      case "BATTLE_END": {
        return (
          <LogItem key={itemKey} $isEnd>
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
      <LogContent>
        {events.map((event, idx) => (
          <LogRow key={`row-${event.id}-${idx}`}>
             <LogIndex>{String(idx + 1).padStart(3, '0')}</LogIndex>
             {getEventText(event, idx)}
          </LogRow>
        ))}
        {events.length === 0 && <EmptyLog>Waiting for battle sequence...</EmptyLog>}
      </LogContent>
    </LogContainer>
  );
};

const LogContainer = styled.div`
  width: 100%;
  height: 250px;
  background: #1e272e;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  overflow-y: auto;
  font-family: 'Fira Code', 'Courier New', Courier, monospace;
  font-size: 0.8rem;
  box-shadow: inset 0 4px 12px rgba(0, 0, 0, 0.5);

  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

const LogContent = styled.div`
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const LogRow = styled.div`
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  border-left: 2px solid rgba(255, 255, 255, 0.05);
  padding-left: 0.5rem;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.02);
    border-left-color: rgba(255, 255, 255, 0.2);
  }
`;

const LogIndex = styled.span`
  color: #576574;
  font-size: 0.7rem;
  user-select: none;
`;

const LogItem = styled.div<{ $isDamage?: boolean; $isHeal?: boolean; $isDeath?: boolean; $isEnd?: boolean }>`
  color: ${props => 
    props.$isDamage ? "#ff7675" : 
    props.$isHeal ? "#55efc4" :
    props.$isDeath ? "#d63031" : 
    props.$isEnd ? "#fdcb6e" : "#dfe6e9"};
  line-height: 1.5;
  flex: 1;
  ${props => (props.$isDeath || props.$isEnd) && "font-weight: bold; text-transform: uppercase; letter-spacing: 1px;"}
`;

const ActorName = styled.span<{ $teamId?: string }>`
  color: ${props => props.$teamId === "TeamA" ? "#74b9ff" : "#ff7675"};
  font-weight: 600;
`;

const TargetName = styled.span<{ $teamId?: string }>`
  color: ${props => props.$teamId === "TeamA" ? "#74b9ff" : "#ff7675"};
  font-weight: 600;
`;

const WeaponName = styled.span`
  color: #fab1a0;
  background: rgba(250, 177, 160, 0.1);
  padding: 1px 4px;
  border-radius: 3px;
`;

const DamageAmount = styled.span`
  color: #d63031;
  font-weight: 800;
`;

const HealAmount = styled.span`
  color: #00b894;
  font-weight: 800;
`;

const WinnerName = styled.span`
  color: #fdcb6e;
  text-decoration: underline;
  font-size: 1.1rem;
`;

const EmptyLog = styled.div`
  color: #576574;
  text-align: center;
  padding: 2rem;
  font-style: italic;
`;
