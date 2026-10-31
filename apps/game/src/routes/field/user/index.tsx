import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAtom, useAtomValue } from "jotai";
import { motion } from "motion/react";
import { GiBackpack, GiChest } from "react-icons/gi";
import styled from "styled-components";

import { battleLogAtom } from "@/atoms/globalAtom";
import {
  pendingNavigationAtom,
  pendingNavigationKey,
} from "@/atoms/pendingNavigationAtom";
import {
  currentNodeIdAtom,
  isCombatAtom,
  isNavigatingAtom,
  playerCoordsAtom,
  raidNoticeAtom,
  shortestPathAtom,
  targetNodeIdAtom,
} from "@/atoms/raidAtom";
import { CharacterCard } from "@/components/CharacterCard";
import CharacterCollection from "@/components/CharacterCollection";
import { Page } from "@/components/Commons";
import { useGearActions } from "@/utils/hooks/useGearActions";
import { useGetCharacter } from "@/utils/hooks/useGetCharacter";
import { useGetStash } from "@/utils/hooks/useGetStash";
import { useMoveStashItem } from "@/utils/hooks/useMoveStashItem";
import { useRaidRules } from "@/utils/hooks/useRaidRules";
import { useRaidSession } from "@/utils/hooks/useRaidSession";

export const Route = createFileRoute("/field/user/")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const {
    data: characterData,
    isLoading: charLoading,
    error: characterError,
    refetch: refetchCharacter,
  } = useGetCharacter();
  const {
    data: stashData,
    isLoading: stashLoading,
    error: stashError,
    refetch: refetchStash,
  } = useGetStash();
  const { equip, supplies } = useGearActions();
  const { data: rules } = useRaidRules();

  const moveItemMutation = useMoveStashItem();
  const { startRaid } = useRaidSession();

  const [, setCurrentNodeId] = useAtom(currentNodeIdAtom);
  const [, setIsCombat] = useAtom(isCombatAtom);
  const [, setIsNavigating] = useAtom(isNavigatingAtom);
  const [, setTargetNodeId] = useAtom(targetNodeIdAtom);
  const [, setShortestPath] = useAtom(shortestPathAtom);
  const [, setPlayerCoords] = useAtom(playerCoordsAtom);
  const [, setBattleLog] = useAtom(battleLogAtom);
  const [notice, setNotice] = useAtom(raidNoticeAtom);
  const pendingResults = useAtomValue(pendingNavigationAtom);

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
  const busy =
    startRaid.isPending ||
    moveItemMutation.isPending ||
    equip.isPending ||
    supplies.isPending;
  const hasPendingResult =
    !!pendingResults[pendingNavigationKey(character?.userId, character?.id)];
  const gearLocked = busy || !!character?.isRaiding || hasPendingResult;
  const error =
    characterError ??
    stashError ??
    startRaid.error ??
    moveItemMutation.error ??
    equip.error ??
    supplies.error;
  if (characterError || stashError)
    return (
      <Page>
        <LobbyContainer>
          <p role="alert">생존자 정보를 불러오지 못했습니다.</p>
          <button
            type="button"
            onClick={() => {
              void refetchCharacter();
              void refetchStash();
            }}
          >
            다시 불러오기
          </button>
        </LobbyContainer>
      </Page>
    );

  const handleEquip = (weaponMasterId: string) => {
    if (!character || gearLocked) return;
    const slot = character.equipment.find((item) => !item.weaponMaster);
    if (!slot) {
      alert("출격 장비 슬롯이 가득 찼습니다.");
      return;
    }
    equip.mutate({
      characterId: character.id,
      weaponMasterId,
      slotIndex: slot.slotIndex,
    });
  };

  // 탐사 진입/시작 처리
  const handleRaidAction = () => {
    if (!character) return;
    if (character.isRaiding || hasPendingResult) {
      // 이미 탐사 중이면 바로 필드 화면으로 이동
      navigate({ to: "/field" });
    } else {
      // 탐사 새로 시작
      startRaid.mutate(character.id, {
        onSuccess: () => {
          setNotice(null);
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
          <p>한림 복귀 실험실 · 정비와 신체 검사를 마치고 서포시로 출격합니다.</p>
          <Link to="/field/quest">한림그룹 임무 통신 확인</Link>
        </HeaderArea>
        {error && <p role="alert">{error.message}</p>}
        {notice && <p role="status">{notice}</p>}
        <CharacterCollection disabled={gearLocked} />
        {character?.isRaiding && (
          <p>
            탐사 중에는 창고와 장비를 변경할 수 없습니다. 탐사를 마치고
            복귀하세요.
          </p>
        )}
        {character &&
          !gearLocked &&
          rules?.basicSuppliesEnabled &&
          stash.length === 0 &&
          !backpack.some((item) => item.weaponMaster) &&
          !character.equipment.some((item) => item.weaponMaster) && (
            <StyledSmallAction
              type="button"
              onClick={() => supplies.mutate(character.id)}
            >
              한림그룹 기본 장비 지원 받기
            </StyledSmallAction>
          )}

        {/* 메인 정보 레이아웃 */}
        <MainGrid>
          <CharacterCard
            character={character}
            onRaidAction={handleRaidAction}
            disabled={busy || !character}
            pendingResult={hasPendingResult}
          />

          {/* 창고 <-> 가방 아이템 정비 영역 */}
          <InventoryStashArea>
            <SectionPanel>
              <SectionHeader>출격 장비</SectionHeader>
              <ItemGrid>
                {character?.equipment.map((slot) =>
                  slot.weaponMaster ? (
                    <ItemSlotButton
                      key={slot.id}
                      disabled={gearLocked}
                      onClick={() =>
                        character &&
                        equip.mutate({
                          characterId: character.id,
                          weaponMasterId: null,
                          slotIndex: slot.slotIndex,
                        })
                      }
                    >
                      <ItemName>{slot.weaponMaster.name}</ItemName>
                      <ItemDetails>
                        장비 {slot.slotIndex + 1} · 해제
                      </ItemDetails>
                    </ItemSlotButton>
                  ) : (
                    <EmptySlot key={slot.id}>
                      <EmptySlotIndex>장비 {slot.slotIndex + 1}</EmptySlotIndex>
                    </EmptySlot>
                  ),
                )}
              </ItemGrid>
            </SectionPanel>
            {/* 1. 창고 (Stash) */}
            <SectionPanel>
              <SectionHeader>
                <GiChest
                  size={20}
                  color="#74a4ff"
                  style={{ marginRight: "8px" }}
                />
                Stash Warehouse ({stash.length} Items)
              </SectionHeader>
              <ItemGrid>
                {stash.length === 0 ? (
                  <EmptyMessage>STASH IS EMPTY</EmptyMessage>
                ) : (
                  stash.map((item) => (
                    <ItemSlotButton
                      disabled={gearLocked}
                      key={item.id}
                      onClick={() => handleMoveToBackpack(item.weaponMasterId)}
                      whileHover={{ y: -4, borderColor: "#74a4ff" }}
                    >
                      <ItemName>{item.weaponMaster.name}</ItemName>
                      <ItemDetails>
                        Dmg: {item.weaponMaster.damage} | Wt:{" "}
                        {item.weaponMaster.weight}kg
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
                <GiBackpack
                  size={20}
                  color="#b8ffb9"
                  style={{ marginRight: "8px" }}
                />
                Raid Backpack ({backpack.filter((b) => b.weaponMaster).length} /
                32 Slots)
              </SectionHeader>
              <ItemGrid>
                {backpack.map((slot, index) => {
                  if (slot.weaponMaster) {
                    return (
                      <StyledSlotActions key={slot.id}>
                        <ItemSlotButton
                          disabled={gearLocked}
                          key={slot.id}
                          onClick={() =>
                            handleMoveToStash(
                              slot.weaponMaster!.id,
                              slot.slotIndex,
                            )
                          }
                          style={{ borderColor: "rgba(184, 255, 185, 0.2)" }}
                          whileHover={{ y: -4, borderColor: "#b8ffb9" }}
                        >
                          <ItemName $color="#b8ffb9">
                            {slot.weaponMaster.name}
                          </ItemName>
                          <ItemDetails>
                            Dmg: {slot.weaponMaster.damage} | Slot:{" "}
                            {slot.slotIndex + 1}
                          </ItemDetails>
                          <QuantityBadge>×{slot.quantity}</QuantityBadge>
                        </ItemSlotButton>
                        <StyledSmallAction
                          type="button"
                          disabled={gearLocked}
                          onClick={() => handleEquip(slot.weaponMaster!.id)}
                        >
                          하나 장착
                        </StyledSmallAction>
                      </StyledSlotActions>
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
  min-width: 0;
  container-type: inline-size;
  color: #ecf0f1;
  margin: 0 auto;
  padding: 24px 16px;
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
  grid-template-columns: minmax(0, 1fr);
  gap: 32px;
  align-items: start;

  @container (min-width: 760px) {
    grid-template-columns: minmax(0, 340px) minmax(0, 1fr);
  }
`;

const InventoryStashArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 32px;
  min-width: 0;
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
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 120px), 1fr));
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
  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`;

const StyledSlotActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const StyledSmallAction = styled.button`
  padding: 10px;
  border: 0;
  border-radius: 12px;
  background: #262626;
  color: #b8ffb9;
  cursor: pointer;
  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
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
    to {
      transform: rotate(360deg);
    }
  }
`;
