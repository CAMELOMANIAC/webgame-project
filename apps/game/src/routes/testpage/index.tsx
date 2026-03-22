import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAtomValue, useSetAtom } from "jotai";
import { useState } from "react";
import styled from "styled-components";

import { battleUsersAtom } from "../../atoms/battleAtom";
import { playerStashAtom } from "../../atoms/playerStashAtom"; // Import the new atom
import { Page } from "../../components/Commons";
import { findMatch } from "../../utils/findMatch";

export const Route = createFileRoute("/testpage/")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const setBattleUsers = useSetAtom(battleUsersAtom);
  const [isFindingMatch, setIsFindingMatch] = useState(false);
  const playerStash = useAtomValue(playerStashAtom); // Get the player's stash

  const handleFindMatch = async () => {
    setIsFindingMatch(true);
    try {
      const players = await findMatch();
      setBattleUsers(players);
      navigate({ to: "/" }); // Navigate to the battle scene
    } catch (error) {
      console.error("Failed to find match:", error);
      setIsFindingMatch(false);
      // Optionally display an error message to the user
    }
  };

  return (
    <Page>
      <LobbyContainer>
        <LobbyTitle>Ready for Extraction?</LobbyTitle>
        <FindMatchButton onClick={handleFindMatch} disabled={isFindingMatch}>
          {isFindingMatch ? "FINDING MATCH..." : "FIND MATCH"}
        </FindMatchButton>
        <BackButton onClick={() => window.history.back()}>← Back</BackButton>

        <StashDisplay>
          <StashTitle>YOUR STASH</StashTitle>
          {playerStash.length > 0 ? (
            <StashItemList>
              {playerStash.map((item) => (
                <StashItem key={item.id}>
                  {item.name} ({item.weight}kg, {item.value}G)
                </StashItem>
              ))}
            </StashItemList>
          ) : (
            <NoStashItems>Your stash is empty. Find a match!</NoStashItems>
          )}
        </StashDisplay>
      </LobbyContainer>
    </Page>
  );
}

const LobbyContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  padding: 2rem;
  background-color: #1e272e;
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  max-width: 600px; // Limit width for better layout
  width: 100%;
`;

const LobbyTitle = styled.h2`
  font-size: 2.5rem;
  font-weight: 800;
  color: #ecf0f1;
  text-transform: uppercase;
  letter-spacing: 2px;
`;

const FindMatchButton = styled.button`
  padding: 1rem 3rem;
  background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
  color: white;
  border-radius: 50px;
  font-weight: 800;
  font-size: 1.1rem;
  letter-spacing: 2px;
  border: none;
  box-shadow: 0 10px 20px rgba(46, 204, 113, 0.3);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  cursor: pointer;

  &:hover:not(:disabled) {
    transform: scale(1.05) translateY(-3px);
    box-shadow: 0 15px 30px rgba(46, 204, 113, 0.4);
    filter: brightness(1.1);
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  &:disabled {
    background: linear-gradient(135deg, #7f8c8d 0%, #95a5a6 100%);
    cursor: not-allowed;
    box-shadow: none;
  }
`;

const BackButton = styled.button`
  background: none;
  border: none;
  color: #95a5a6;
  font-size: 0.9rem;
  margin-top: 1rem;
  cursor: pointer;
  transition: color 0.2s ease;

  &:hover {
    color: #ecf0f1;
  }
`;

const StashDisplay = styled.div`
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
`;

const StashTitle = styled.h3`
  font-size: 1.8rem;
  font-weight: 700;
  color: #ecf0f1;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0;
`;

const StashItemList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  width: 100%;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 1rem;
  background-color: rgba(0, 0, 0, 0.2);

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 3px;
  }
  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
  }
`;

const StashItem = styled.li`
  background-color: rgba(255, 255, 255, 0.05);
  padding: 0.8rem 1.2rem;
  border-radius: 6px;
  font-size: 0.9rem;
  color: #bdc3c7;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

const NoStashItems = styled.p`
  color: #7f8c8d;
  font-size: 1rem;
  text-align: center;
`;
