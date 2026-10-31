import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAtom, useAtomValue } from "jotai";
import { motion } from "motion/react";
import styled, { css } from "styled-components";

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
import { cornerBracketsMixin, Page } from "@/components/Commons";
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
        <StyledLoadingContainer>
          <StyledLoadingSpinner />
          <StyledLoadingText>HL-LAB // 데이터 동기화 중...</StyledLoadingText>
        </StyledLoadingContainer>
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
        <StyledLobbyContainer>
          <StyledBanner $tone="negative" role="alert">
            생존자 정보를 불러오지 못했습니다.
          </StyledBanner>
          <StyledSmallAction
            type="button"
            onClick={() => {
              void refetchCharacter();
              void refetchStash();
            }}
          >
            다시 불러오기
          </StyledSmallAction>
        </StyledLobbyContainer>
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

  const handleRaidAction = () => {
    if (!character) return;
    if (character.isRaiding || hasPendingResult) {
      navigate({ to: "/field" });
    } else {
      startRaid.mutate(character.id, {
        onSuccess: () => {
          setNotice(null);
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

  const handleMoveToBackpack = (weaponMasterId: string) => {
    if (!character) return;
    const emptySlot = backpack.find((slot) => !slot.weaponMaster);
    if (!emptySlot) {
      alert("가방 슬롯이 가득 찼습니다.");
      return;
    }

    moveItemMutation.mutate({
      characterId: character.id,
      direction: "to_backpack",
      weaponMasterId,
      slotIndex: emptySlot.slotIndex,
    });
  };

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
    <Page style={{ overflowY: "auto", paddingBottom: "96px" }}>
      <StyledLobbyContainer>
        {/* 상단 텔레메트리 헤더 */}
        <StyledHeaderArea>
          <StyledHeaderTop>
            <StyledSubTitle>HL-LAB // SEC-00</StyledSubTitle>
            <StyledSubTitle>STANDBY BAY</StyledSubTitle>
          </StyledHeaderTop>
          <StyledMainTitle>거점 출격 편성</StyledMainTitle>
          <StyledLeadText>
            한림 복귀 실험실 · 정비와 신체 검사를 마치고 서포시로 출격합니다.
          </StyledLeadText>
          <StyledMissionLink to="/field/quest">
            <span>한림그룹 임무 통신 확인</span>
            <StyledLinkCode>COMM →</StyledLinkCode>
          </StyledMissionLink>
        </StyledHeaderArea>

        {error && (
          <StyledBanner $tone="negative" role="alert">
            {error.message}
          </StyledBanner>
        )}
        {notice && (
          <StyledBanner $tone="positive" role="status">
            {notice}
          </StyledBanner>
        )}

        <CharacterCollection disabled={gearLocked} />

        {character?.isRaiding && (
          <StyledBanner $tone="negative">
            탐사 중에는 창고와 장비를 변경할 수 없습니다. 탐사를 마치고
            복귀하세요.
          </StyledBanner>
        )}

        {character &&
          !gearLocked &&
          rules?.basicSuppliesEnabled &&
          stash.length === 0 &&
          !backpack.some((item) => item.weaponMaster) &&
          !character.equipment.some((item) => item.weaponMaster) && (
            <StyledSupplyButton
              type="button"
              onClick={() => supplies.mutate(character.id)}
            >
              한림그룹 기본 장비 지원 받기
            </StyledSupplyButton>
          )}

        {/* 메인 정보 레이아웃 */}
        <StyledMainGrid>
          <CharacterCard
            character={character}
            onRaidAction={handleRaidAction}
            disabled={busy || !character}
            pendingResult={hasPendingResult}
          />

          {/* 창고 <-> 가방 아이템 정비 영역 */}
          <StyledInventoryStashArea>
            <StyledSectionPanel>
              <StyledSectionHeader>
                <span>출격 장비</span>
                <StyledSectionCode>
                  LOADOUT //{" "}
                  {character?.equipment.filter((e) => e.weaponMaster).length ??
                    0}
                  /{character?.equipment.length ?? 0}
                </StyledSectionCode>
              </StyledSectionHeader>
              <StyledItemGrid>
                {character?.equipment.map((slot) =>
                  slot.weaponMaster ? (
                    <StyledItemSlotButton
                      key={slot.id}
                      disabled={gearLocked}
                      $equipped
                      $bracketTone="default"
                      onClick={() =>
                        character &&
                        equip.mutate({
                          characterId: character.id,
                          weaponMasterId: null,
                          slotIndex: slot.slotIndex,
                        })
                      }
                    >
                      <StyledSlotTopMeta>
                        <span>EQ-0{slot.slotIndex + 1}</span>
                        <span>해제</span>
                      </StyledSlotTopMeta>
                      <StyledItemName>{slot.weaponMaster.name}</StyledItemName>
                      <StyledItemDetails>
                        DMG {slot.weaponMaster.damage} ·{" "}
                        {slot.weaponMaster.weight}kg
                      </StyledItemDetails>
                    </StyledItemSlotButton>
                  ) : (
                    <StyledEmptySlot key={slot.id}>
                      <StyledEmptySlotCode>EMPTY</StyledEmptySlotCode>
                      <StyledEmptySlotIndex>
                        장비 {slot.slotIndex + 1}
                      </StyledEmptySlotIndex>
                    </StyledEmptySlot>
                  ),
                )}
              </StyledItemGrid>
            </StyledSectionPanel>

            {/* 1. 창고 (Stash) */}
            <StyledSectionPanel>
              <StyledSectionHeader>
                <span>거점 공용 창고</span>
                <StyledSectionCode>
                  STASH // {stash.length} ITEMS
                </StyledSectionCode>
              </StyledSectionHeader>
              <StyledItemGrid>
                {stash.length === 0 ? (
                  <StyledEmptyMessage>보관 중인 물품이 없습니다.</StyledEmptyMessage>
                ) : (
                  stash.map((item) => (
                    <StyledItemSlotButton
                      disabled={gearLocked}
                      key={item.id}
                      onClick={() => handleMoveToBackpack(item.weaponMasterId)}
                    >
                      <StyledSlotTopMeta>
                        <span>STASH</span>
                        <StyledQuantityBadge>×{item.quantity}</StyledQuantityBadge>
                      </StyledSlotTopMeta>
                      <StyledItemName>{item.weaponMaster.name}</StyledItemName>
                      <StyledItemDetails>
                        DMG {item.weaponMaster.damage} ·{" "}
                        {item.weaponMaster.weight}kg
                      </StyledItemDetails>
                    </StyledItemSlotButton>
                  ))
                )}
              </StyledItemGrid>
            </StyledSectionPanel>

            {/* 2. 가방 (Backpack) */}
            <StyledSectionPanel>
              <StyledSectionHeader>
                <span>출격 가방</span>
                <StyledSectionCode>
                  PACK // {backpack.filter((b) => b.weaponMaster).length} / 32
                </StyledSectionCode>
              </StyledSectionHeader>
              <StyledItemGrid>
                {backpack.map((slot, index) => {
                  if (slot.weaponMaster) {
                    return (
                      <StyledSlotActions key={slot.id}>
                        <StyledItemSlotButton
                          disabled={gearLocked}
                          key={slot.id}
                          onClick={() =>
                            handleMoveToStash(
                              slot.weaponMaster!.id,
                              slot.slotIndex,
                            )
                          }
                        >
                          <StyledSlotTopMeta>
                            <span>
                              #{String(slot.slotIndex + 1).padStart(2, "0")}
                            </span>
                            <StyledQuantityBadge>
                              ×{slot.quantity}
                            </StyledQuantityBadge>
                          </StyledSlotTopMeta>
                          <StyledItemName>
                            {slot.weaponMaster.name}
                          </StyledItemName>
                          <StyledItemDetails>
                            DMG {slot.weaponMaster.damage} · 창고 이관
                          </StyledItemDetails>
                        </StyledItemSlotButton>
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
                      <StyledEmptySlot key={`empty-${index}`}>
                        <StyledEmptySlotCode>SLOT</StyledEmptySlotCode>
                        <StyledEmptySlotIndex>
                          {String(index + 1).padStart(2, "0")}
                        </StyledEmptySlotIndex>
                      </StyledEmptySlot>
                    );
                  }
                })}
              </StyledItemGrid>
            </StyledSectionPanel>
          </StyledInventoryStashArea>
        </StyledMainGrid>
      </StyledLobbyContainer>
    </Page>
  );
}

const StyledLobbyContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 1200px;
  min-width: 0;
  container-type: inline-size;
  color: #fafafa;
  margin: 0 auto;
  padding: 20px 16px;
`;

const StyledHeaderArea = styled.div`
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
`;

const StyledHeaderTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
`;

const StyledSubTitle = styled.span`
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  color: #71717a;
  letter-spacing: 0.05em;
  font-variant-numeric: tabular-nums;
`;

const StyledMainTitle = styled.h1`
  font-size: 22px;
  font-weight: 700;
  color: #fafafa;
  letter-spacing: -0.02em;
  margin: 0 0 6px;
`;

const StyledLeadText = styled.p`
  font-size: 12px;
  color: #a1a1aa;
  line-height: 1.5;
  margin: 0 0 12px;
`;

const StyledMissionLink = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 6px;
  background: rgba(133, 173, 255, 0.08);
  border: 1px solid rgba(133, 173, 255, 0.28);
  color: #85adff;
  font-size: 12px;
  font-weight: 600;
  transition: background-color 0.15s ease;

  &:hover {
    background: rgba(133, 173, 255, 0.14);
  }
`;

const StyledLinkCode = styled.span`
  font-family: var(--font-mono);
  font-size: 11px;
`;

const StyledBanner = styled.p<{ $tone: "positive" | "negative" }>`
  margin-bottom: 16px;
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: ${(props) => (props.$tone === "negative" ? "#ff7162" : "#85adff")};
  background: ${(props) =>
    props.$tone === "negative"
      ? "rgba(255, 113, 98, 0.12)"
      : "rgba(133, 173, 255, 0.1)"};
  border: 1px solid
    ${(props) =>
      props.$tone === "negative"
        ? "rgba(255, 113, 98, 0.3)"
        : "rgba(133, 173, 255, 0.28)"};
`;

const StyledSupplyButton = styled.button`
  width: 100%;
  margin-bottom: 16px;
  padding: 12px 14px;
  border-radius: 6px;
  border: 1px solid rgba(133, 173, 255, 0.35);
  background: rgba(133, 173, 255, 0.12);
  color: #85adff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
`;

const StyledMainGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  align-items: start;

  @container (min-width: 760px) {
    grid-template-columns: minmax(0, 340px) minmax(0, 1fr);
  }
`;

const StyledInventoryStashArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
`;

const StyledSectionPanel = styled.div`
  background: #101013;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 10px;
  padding: 16px;
`;

const StyledSectionHeader = styled.h3`
  font-size: 14px;
  font-weight: 600;
  color: #fafafa;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 0 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
`;

const StyledSectionCode = styled.span`
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  color: #71717a;
  font-variant-numeric: tabular-nums;
`;

const StyledItemGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 104px), 1fr));
  gap: 8px;
`;

const StyledItemSlotButton = styled(motion.button)<{
  $equipped?: boolean;
  $bracketTone?: "default" | "positive" | "negative";
}>`
  background: #141418;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 6px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  text-align: left;
  cursor: pointer;
  position: relative;
  min-height: 78px;
  width: 100%;
  transition: background-color 0.15s ease, border-color 0.15s ease;

  ${(props) => (props.$equipped ? cornerBracketsMixin : css``)}

  &:hover:not(:disabled) {
    background: #18181d;
    border-color: rgba(133, 173, 255, 0.4);
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`;

const StyledSlotTopMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  font-family: var(--font-mono);
  font-size: 11px;
  color: #71717a;
  font-variant-numeric: tabular-nums;
`;

const StyledSlotActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const StyledSmallAction = styled.button`
  padding: 7px 10px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 6px;
  background: #18181b;
  color: #fafafa;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s ease;

  &:hover:not(:disabled) {
    background: #27272a;
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`;

const StyledItemName = styled.p`
  font-size: 12px;
  font-weight: 600;
  color: #fafafa;
  margin: 4px 0 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const StyledItemDetails = styled.span`
  font-family: var(--font-mono);
  font-size: 11px;
  color: #a1a1aa;
  font-variant-numeric: tabular-nums;
`;

const StyledQuantityBadge = styled.span`
  font-family: var(--font-mono);
  font-size: 11px;
  color: #85adff;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
`;

const StyledEmptySlot = styled.div`
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: #0c0c0f;
  border-radius: 6px;
  min-height: 78px;
  width: 100%;
  padding: 10px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
`;

const StyledEmptySlotCode = styled.span`
  font-family: var(--font-mono);
  font-size: 11px;
  color: #52525b;
`;

const StyledEmptySlotIndex = styled.span`
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  color: #52525b;
  font-variant-numeric: tabular-nums;
`;

const StyledEmptyMessage = styled.p`
  grid-column: 1 / -1;
  text-align: center;
  font-size: 12px;
  color: #71717a;
  padding: 24px 0;
`;

const StyledLoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 60vh;
`;

const StyledLoadingText = styled.p`
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 500;
  color: #a1a1aa;
  margin-top: 16px;
`;

const StyledLoadingSpinner = styled.div`
  width: 28px;
  height: 28px;
  border: 2px solid rgba(255, 255, 255, 0.12);
  border-top-color: #fafafa;
  border-radius: 50%;
  animation: spin 0.9s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;
