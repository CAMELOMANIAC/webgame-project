import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { motion } from "motion/react";
import { FaBolt, FaHeart, FaSignInAlt, FaWeightHanging } from "react-icons/fa";
import { GiBackpack, GiChest } from "react-icons/gi";
import styled from "styled-components";

import { battleLogAtom } from "@/atoms/globalAtom";
import {
  currentNodeIdAtom,
  isCombatAtom,
  isNavigatingAtom,
  playerCoordsAtom,
  shortestPathAtom,
  targetNodeIdAtom,
} from "@/atoms/raidAtom";
import { Page } from "@/components/Commons";
import { useGetCharacter } from "@/utils/hooks/useGetCharacter";
import { useGetStash } from "@/utils/hooks/useGetStash";
import { useMoveStashItem } from "@/utils/hooks/useMoveStashItem";
import { useRaidSession } from "@/utils/hooks/useRaidSession";

export const Route = createFileRoute("/field/user/")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { data: characterData, isLoading: charLoading } = useGetCharacter();
  const { data: stashData, isLoading: stashLoading } = useGetStash();
  
  const moveItemMutation = useMoveStashItem();
  const { startRaid } = useRaidSession();

  const [, setCurrentNodeId] = useAtom(currentNodeIdAtom);
  const [, setIsCombat] = useAtom(isCombatAtom);
  const [, setIsNavigating] = useAtom(isNavigatingAtom);
  const [, setTargetNodeId] = useAtom(targetNodeIdAtom);
  const [, setShortestPath] = useAtom(shortestPathAtom);
  const [, setPlayerCoords] = useAtom(playerCoordsAtom);
  const [, setBattleLog] = useAtom(battleLogAtom);

  if (charLoading || stashLoading) {
    return (
      <Page>
        <LoadingContainer>
          <LoadingSpinner />
          <LoadingText>SYNCHRONIZING WITH MATRIX...</LoadingText>
        </LoadingContainer>
      </Page>
    );
  }

  const character = characterData?.raw;
  const stash = stashData || [];
  const backpack = character?.inventory || [];

  // 탐사 진입/시작 처리
  const handleRaidAction = () => {
    if (!character) return;
    if (character.isRaiding) {
      // 이미 탐사 중이면 바로 필드 화면으로 이동
      navigate({ to: "/field" });
    } else {
      // 탐사 새로 시작
      startRaid.mutate(character.id, {
        onSuccess: () => {
          // 탐사 상태 초기화
          setCurrentNodeId(0);
          setIsCombat(false);
          setIsNavigating(false);
          setTargetNodeId(null);
          setShortestPath([]);
          setPlayerCoords(null);
          setBattleLog(null);
          navigate({ to: "/field" });
        },
      });
    }
  };

  // 창고 -> 가방 이동
  const handleMoveToBackpack = (weaponMasterId: string) => {
    if (!character) return;
    
    // 가방에서 비어있는 첫 슬롯 찾기
    const emptySlot = backpack.find((slot) => !slot.weaponMaster);
    if (!emptySlot) {
      alert("Backpack is fully loaded!");
      return;
    }

    moveItemMutation.mutate({
      characterId: character.id,
      direction: "to_backpack",
      weaponMasterId,
      slotIndex: emptySlot.slotIndex,
    });
  };

  // 가방 -> 창고 이동
  const handleMoveToStash = (weaponMasterId: string, slotIndex: number) => {
    if (!character) return;

    moveItemMutation.mutate({
      characterId: character.id,
      direction: "to_stash",
      weaponMasterId,
      slotIndex,
    });
  };

  return (
    <Page style={{ overflowY: "auto", paddingBottom: "100px" }}>
      <LobbyContainer>
        {/* 상단 타이틀 */}
        <HeaderArea>
          <SubTitle>OPERATIONS CENTER</SubTitle>
          <MainTitle>STAGING LOBBY</MainTitle>
        </HeaderArea>

        {/* 메인 정보 레이아웃 */}
        <MainGrid>
          {/* 캐릭터 현황 카드 */}
          <CharacterCard>
            <StatusBadge $raiding={character?.isRaiding}>
              {character?.isRaiding ? "IN ACTIVE RAID" : "STATIONED"}
            </StatusBadge>
            <AvatarCircle>
              <GiBackpack size={48} color="#74a4ff" />
            </AvatarCircle>
            <Nickname>{character?.user?.nickname || "Unknown"}</Nickname>
            <SubInfo>Ghost Extractor Class A</SubInfo>

            {/* 스탯 그리드 */}
            <StatGrid>
              <StatItem>
                <IconBox $color="#ff7162">
                  <FaHeart size={14} />
                </IconBox>
                <div>
                  <StatLabel>VITALITY (HP)</StatLabel>
                  <StatValue>{character?.hp} / {character?.maxHp}</StatValue>
                </div>
              </StatItem>
              <StatItem>
                <IconBox $color="#ffbe76">
                  <FaBolt size={14} />
                </IconBox>
                <div>
                  <StatLabel>ENERGY (STAMINA)</StatLabel>
                  <StatValue>{character?.stamina} / {character?.maxStamina}</StatValue>
                </div>
              </StatItem>
              <StatItem>
                <IconBox $color="#b8ffb9">
                  <FaWeightHanging size={14} />
                </IconBox>
                <div>
                  <StatLabel>LOAD LIMIT</StatLabel>
                  <StatValue>{character?.weight} / {character?.maxWeight} kg</StatValue>
                </div>
              </StatItem>
            </StatGrid>

            {/* 탐사 시작/복귀 버튼 */}
            <ActionButton 
              $raiding={character?.isRaiding} 
              onClick={handleRaidAction}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <FaSignInAlt style={{ marginRight: "8px" }} />
              {character?.isRaiding ? "RETURN TO ACTIVE RAID" : "LAUNCH EXPEDITION"}
            </ActionButton>
          </CharacterCard>

          {/* 창고 <-> 가방 아이템 정비 영역 */}
          <InventoryStashArea>
            {/* 1. 창고 (Stash) */}
            <SectionPanel>
              <SectionHeader>
                <GiChest size={20} color="#74a4ff" style={{ marginRight: "8px" }} />
                Stash Warehouse ({stash.length} Items)
              </SectionHeader>
              <ItemGrid>
                {stash.length === 0 ? (
                  <EmptyMessage>STASH IS EMPTY</EmptyMessage>
                ) : (
                  stash.map((item) => (
                    <ItemSlotButton
                      key={item.id}
                      onClick={() => handleMoveToBackpack(item.weaponMasterId)}
                      whileHover={{ y: -4, borderColor: "#74a4ff" }}
                    >
                      <ItemName>{item.weaponMaster.name}</ItemName>
                      <ItemDetails>
                        Dmg: {item.weaponMaster.damage} | Wt: {item.weaponMaster.weight}kg
                      </ItemDetails>
                      <QuantityBadge>x{item.quantity}</QuantityBadge>
                    </ItemSlotButton>
                  ))
                )}
              </ItemGrid>
            </SectionPanel>

            {/* 2. 가방 (Backpack) */}
            <SectionPanel>
              <SectionHeader>
                <GiBackpack size={20} color="#b8ffb9" style={{ marginRight: "8px" }} />
                Raid Backpack ({backpack.filter(b => b.weaponMaster).length} / 32 Slots)
              </SectionHeader>
              <ItemGrid>
                {backpack.map((slot, index) => {
                  if (slot.weaponMaster) {
                    return (
                      <ItemSlotButton
                        key={slot.id}
                        onClick={() => handleMoveToStash(slot.weaponMaster!.id, slot.slotIndex)}
                        style={{ borderColor: "rgba(184, 255, 185, 0.2)" }}
                        whileHover={{ y: -4, borderColor: "#b8ffb9" }}
                      >
                        <ItemName $color="#b8ffb9">{slot.weaponMaster.name}</ItemName>
                        <ItemDetails>
                          Dmg: {slot.weaponMaster.damage} | Slot: {slot.slotIndex + 1}
                        </ItemDetails>
                      </ItemSlotButton>
                    );
                  } else {
                    return (
                      <EmptySlot key={`empty-${index}`}>
                        <EmptySlotIndex>{index + 1}</EmptySlotIndex>
                      </EmptySlot>
                    );
                  }
                })}
              </ItemGrid>
            </SectionPanel>
          </InventoryStashArea>
        </MainGrid>
      </LobbyContainer>
    </Page>
  );
}

// Styled Components
const LobbyContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 24px;
`;

const HeaderArea = styled.div`
  margin-bottom: 32px;
`;

const SubTitle = styled.h3`
  font-size: 11px;
  font-weight: 400;
  color: #74a4ff;
  letter-spacing: 2px;
  margin: 0 0 4px;
  text-transform: uppercase;
`;

const MainTitle = styled.h1`
  font-size: 32px;
  font-weight: 800;
  color: white;
  letter-spacing: -0.5px;
  margin: 0;
`;

const MainGrid = styled.div`
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 32px;
  align-items: start;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const CharacterCard = styled.div`
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  overflow: hidden;
`;

type StatusBadgeProps = {
  $raiding?: boolean;
};
const StatusBadge = styled.span<StatusBadgeProps>`
  position: absolute;
  top: 16px;
  right: 16px;
  font-size: 9px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 20px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  background: ${(props) => (props.$raiding ? "rgba(255, 113, 98, 0.15)" : "rgba(116, 164, 255, 0.15)")};
  color: ${(props) => (props.$raiding ? "#ff7162" : "#74a4ff")};
  border: 1px solid ${(props) => (props.$raiding ? "rgba(255, 113, 98, 0.3)" : "rgba(116, 164, 255, 0.3)")};
`;

const AvatarCircle = styled.div`
  width: 90px;
  aspect-ratio: 1/1;
  border-radius: 50%;
  background: rgba(116, 164, 255, 0.1);
  border: 1px solid rgba(116, 164, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 16px;
  margin-bottom: 20px;
  box-shadow: 0 10px 25px rgba(116, 164, 255, 0.15);
`;

const Nickname = styled.h2`
  font-size: 22px;
  font-weight: 700;
  color: white;
  margin: 0 0 4px;
`;

const SubInfo = styled.p`
  font-size: 12px;
  color: #adaaaa;
  margin: 0 0 32px;
`;

const StatGrid = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 32px;
`;

const StatItem = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 16px;
  padding: 12px 16px;
  border: 1px solid rgba(255, 255, 255, 0.04);
`;

type IconBoxProps = {
  $color: string;
};
const IconBox = styled.div<IconBoxProps>`
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: ${(props) => `${props.$color}1a`};
  color: ${(props) => props.$color};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const StatLabel = styled.p`
  font-size: 9px;
  font-weight: 500;
  color: #adaaaa;
  margin: 0 0 2px;
  letter-spacing: 0.5px;
`;

const StatValue = styled.p`
  font-size: 14px;
  font-weight: 700;
  color: white;
  margin: 0;
`;

type ActionButtonProps = {
  $raiding?: boolean;
};
const ActionButton = styled(motion.button)<ActionButtonProps>`
  width: 100%;
  height: 52px;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 700;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: none;
  background: ${(props) => (props.$raiding ? "linear-gradient(135deg, #ff7b72, #e05c54)" : "linear-gradient(135deg, #6c5ce7, #5345db)")};
  box-shadow: 0 10px 20px ${(props) => (props.$raiding ? "rgba(224, 92, 84, 0.25)" : "rgba(108, 92, 231, 0.25)")};
`;

const InventoryStashArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 32px;
`;

const SectionPanel = styled.div`
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 24px;
  padding: 24px;
`;

const SectionHeader = styled.h3`
  font-size: 16px;
  font-weight: 700;
  color: white;
  display: flex;
  align-items: center;
  margin: 0 0 20px;
`;

const ItemGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
`;

const ItemSlotButton = styled(motion.button)`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  cursor: pointer;
  position: relative;
  aspect-ratio: 1/1;
  width: 100%;
`;

type ItemNameProps = {
  $color?: string;
};
const ItemName = styled.p<ItemNameProps>`
  font-size: 12px;
  font-weight: 700;
  color: ${(props) => props.$color || "#74a4ff"};
  margin: 0 0 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const ItemDetails = styled.span`
  font-size: 9px;
  color: #adaaaa;
`;

const QuantityBadge = styled.span`
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(255, 255, 255, 0.08);
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 9px;
  color: white;
  font-weight: 600;
`;

const EmptySlot = styled.div`
  border: 1px dashed rgba(255, 255, 255, 0.05);
  background: rgba(255, 255, 255, 0.005);
  border-radius: 16px;
  aspect-ratio: 1/1;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const EmptySlotIndex = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.15);
`;

const EmptyMessage = styled.p`
  grid-column: 1 / -1;
  text-align: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.25);
  padding: 40px 0;
  letter-spacing: 1px;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 60vh;
`;

const LoadingText = styled.p`
  font-size: 11px;
  font-weight: 500;
  color: #74a4ff;
  letter-spacing: 2.5px;
  margin-top: 24px;
`;

const LoadingSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 2px solid rgba(116, 164, 255, 0.15);
  border-top-color: #74a4ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
