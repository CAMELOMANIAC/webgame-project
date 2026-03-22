import { useNavigate } from "@tanstack/react-router"; // Import useNavigate
import type { BattleLog, Item, User } from "@webgame/types";
import { motion } from "motion/react";
import React, { useEffect, useState } from "react";
import styled from "styled-components";

import simulateBattle from "../utils/simulateBattle";
import { useBattlePlayer } from "../utils/useBattlePlayer";
import { BattleLogDisplay } from "./BattleLogDisplay";
import { BattlePlayer } from "./BattlePlayer";
import { ExtractionScreen } from "./ExtractionScreen";
import { LootingScreen } from "./LootingScreen";

interface BattleSceneProps {
  initialPlayers: User[];
}

export const BattleScene: React.FC<BattleSceneProps> = ({ initialPlayers }) => {
  const navigate = useNavigate();
  const [battleLog, setBattleLog] = useState<BattleLog | null>(null);
  const [showLootingScreen, setShowLootingScreen] = useState(false);
  const [showExtractionScreen, setShowExtractionScreen] = useState(false); // New state
  const [availableLoot, setAvailableLoot] = useState<Item[]>([]);
  const [acquiredItemsDuringLoot, setAcquiredItemsDuringLoot] = useState<Item[]>([]); // To pass to extraction

  useEffect(() => {
    if (initialPlayers && initialPlayers.length > 0) {
      simulateBattle(initialPlayers).then((log) => {
        setBattleLog(log);
      });
    }
  }, [initialPlayers]);

  const { players, isPlaying, start, activeEvents, eventHistory } = useBattlePlayer(battleLog);

  const damageEvents = activeEvents.filter((e) => e.type === "DAMAGE");

  const teamA = players ? players.filter((p) => p.teamId === "TeamA") : [];
  const teamB = players ? players.filter((p) => p.teamId === "TeamB") : [];

  const winnerEvent = eventHistory.find((e) => e.type === "BATTLE_END");
  const winnerTeamId = winnerEvent && winnerEvent.type === "BATTLE_END" ? winnerEvent.winnerTeamId : null;

  useEffect(() => {
    // When battle ends and TeamA wins, show looting screen
    if (!isPlaying && winnerTeamId === "TeamA") {
      const defeatedEnemies = initialPlayers.filter((p) => p.teamId !== "TeamA" && p.droppedItems);
      const loot: Item[] = defeatedEnemies.flatMap((enemy) => enemy.droppedItems || []);
      setAvailableLoot(loot);
      setShowLootingScreen(true);
      setShowExtractionScreen(false); // Ensure extraction screen is hidden initially
    } else {
      setShowLootingScreen(false);
      setShowExtractionScreen(false); // Hide extraction screen too
    }
  }, [isPlaying, winnerTeamId, initialPlayers]);

  const handleAcquireItems = (items: Item[]) => {
    setAcquiredItemsDuringLoot(items);
    setShowLootingScreen(false);
    setShowExtractionScreen(true); // Transition to extraction
  };

  const handleCloseLooting = () => {
    setShowLootingScreen(false);
    // If user leaves loot, they still need to extract or go to lobby
    setShowExtractionScreen(true); // Still proceed to extraction for now
  };

  const handleExtractionComplete = () => {
    setShowExtractionScreen(false);
    navigate({ to: "/testpage/" }); // Go back to lobby/testpage
  };

  return (
    <SceneContainer>
      <SceneHeader>
        <BattleTitle>Ghost Extraction Simulator</BattleTitle>
        <GameStatus>
          {isPlaying ? (
            <StatusBadge $active>BATTLE IN PROGRESS</StatusBadge>
          ) : (
            <StatusBadge>READY FOR BATTLE</StatusBadge>
          )}
        </GameStatus>
      </SceneHeader>

      {!isPlaying && (
        <StartButton onClick={start}>
          <span>START BATTLE</span>
        </StartButton>
      )}

      {winnerTeamId && (
        <WinnerBanner
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 12 }}
        >
          🏆 {winnerTeamId} VICTORY!
        </WinnerBanner>
      )}

      <BattleArea>
        <TeamSection>
          <TeamHeader $team="A">TEAM ALPHA</TeamHeader>
          <TeamPlayers>
            {teamA.map((player) => (
              <BattlePlayer
                key={player.id}
                player={player}
                damageEvents={damageEvents.filter((e) => e.targetId === player.id)}
                isEnemy={false}
              />
            ))}
          </TeamPlayers>
        </TeamSection>

        <VSContainer>
          <VSLine />
          <VSBadge>VS</VSBadge>
          <VSLine />
        </VSContainer>

        <TeamSection>
          <TeamHeader $team="B">TEAM OMEGA</TeamHeader>
          <TeamPlayers>
            {teamB.map((player) => (
              <BattlePlayer
                key={player.id}
                player={player}
                damageEvents={damageEvents.filter((e) => e.targetId === player.id)}
                isEnemy={true}
              />
            ))}
          </TeamPlayers>
        </TeamSection>
      </BattleArea>

      <BattleLogWrapper>
        <LogHeader>
          <LogTitle>Battle Records</LogTitle>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.1)", marginLeft: "1rem" }} />
        </LogHeader>
        <BattleLogDisplay events={eventHistory} players={battleLog?.initialState.players || []} />
      </BattleLogWrapper>

      {showLootingScreen && (
        <LootingScreen droppedItems={availableLoot} onAcquireItems={handleAcquireItems} onClose={handleCloseLooting} />
      )}

      {showExtractionScreen && (
        <ExtractionScreen acquiredItems={acquiredItemsDuringLoot} onExtractionComplete={handleExtractionComplete} />
      )}
    </SceneContainer>
  );
};

const SceneContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  padding: 3rem 2rem;
  background: radial-gradient(circle at center, #1e272e 0%, #0f141a 100%);
  color: #ecf0f1;
  min-height: 850px;
  border-radius: 20px;
  width: 100%;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.05);
  overflow: hidden;
  position: relative;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  }
`;

const SceneHeader = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  z-index: 2;
`;

const BattleTitle = styled.h2`
  font-size: 2.5rem;
  font-weight: 800;
  margin: 0;
  background: linear-gradient(180deg, #fff 0%, #bdc3c7 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: 2px;
  text-transform: uppercase;
`;

const GameStatus = styled.div`
  margin-top: 0.5rem;
`;

const StatusBadge = styled.span<{ $active?: boolean }>`
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 1px;
  background: ${(props) => (props.$active ? "rgba(46, 204, 113, 0.15)" : "rgba(255, 255, 255, 0.05)")};
  color: ${(props) => (props.$active ? "#2ecc71" : "#95a5a6")};
  border: 1px solid ${(props) => (props.$active ? "rgba(46, 204, 113, 0.3)" : "rgba(255, 255, 255, 0.1)")};
`;

const StartButton = styled.button`
  padding: 1rem 3rem;
  background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
  color: white;
  border-radius: 50px;
  font-weight: 800;
  font-size: 1.1rem;
  letter-spacing: 2px;
  border: none;
  box-shadow: 0 10px 20px rgba(52, 152, 219, 0.3);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  z-index: 10;

  &:hover {
    transform: scale(1.05) translateY(-3px);
    box-shadow: 0 15px 30px rgba(52, 152, 219, 0.4);
    filter: brightness(1.1);
  }

  &:active {
    transform: scale(0.98);
  }
`;

const BattleArea = styled.div`
  display: flex;
  justify-content: center;
  align-items: flex-start;
  width: 100%;
  max-width: 1100px;
  gap: 3rem;
  margin-top: 1rem;
`;

const TeamSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  flex: 1;
`;

const TeamHeader = styled.h4<{ $team: string }>`
  margin: 0;
  font-size: 1.2rem;
  font-weight: 800;
  text-align: center;
  padding: 0.5rem 1rem;
  background: ${(props) => (props.$team === "A" ? "rgba(52, 152, 219, 0.1)" : "rgba(231, 76, 60, 0.1)")};
  color: ${(props) => (props.$team === "A" ? "#3498db" : "#e74c3c")};
  border-radius: 8px;
  border: 1px solid ${(props) => (props.$team === "A" ? "rgba(52, 152, 219, 0.2)" : "rgba(231, 76, 60, 0.2)")};
  letter-spacing: 2px;
`;

const TeamPlayers = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  align-items: center;
`;

const VSContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding-top: 100px;
`;

const VSBadge = styled.div`
  font-size: 2.5rem;
  font-weight: 900;
  color: #e74c3c;
  text-shadow: 0 0 20px rgba(231, 76, 60, 0.5);
  font-style: italic;
`;

const VSLine = styled.div`
  width: 2px;
  height: 100px;
  background: linear-gradient(to bottom, transparent, rgba(231, 76, 60, 0.3), transparent);
`;

const WinnerBanner = styled(motion.div)`
  font-size: 3rem;
  font-weight: 900;
  color: #f1c40f;
  text-shadow:
    0 0 20px rgba(241, 196, 15, 0.4),
    0 4px 8px rgba(0, 0, 0, 0.5);
  margin-bottom: 1rem;
  text-align: center;
  background: rgba(0, 0, 0, 0.3);
  padding: 1rem 3rem;
  border-radius: 50px;
  backdrop-filter: blur(10px);
  border: 2px solid rgba(241, 196, 15, 0.3);
  z-index: 100;
`;

const BattleLogWrapper = styled.div`
  width: 100%;
  max-width: 800px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 2rem;
`;

const LogHeader = styled.div`
  display: flex;
  align-items: center;
  width: 100%;
`;

const LogTitle = styled.h4`
  margin: 0;
  color: #95a5a6;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  font-weight: 700;
`;
