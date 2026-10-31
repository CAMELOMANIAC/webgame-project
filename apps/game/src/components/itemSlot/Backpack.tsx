import { useAtomValue } from "jotai";
import { AnimatePresence, motion } from "motion/react";
import { memo } from "react";
import { CgSpinner } from "react-icons/cg";
import { IoMdRefresh } from "react-icons/io";
import styled from "styled-components";

import { isCombatAtom } from "@/atoms/raidAtom";
import { InheritMotionDiv } from "@/components/Commons";
import BackpackSlot from "@/components/itemSlot/BackpackSlot";
import SlotManager from "@/components/itemSlot/SlotManager";
import { useGetCharacter } from "@/utils/hooks/useGetCharacter";

const Backpack = memo(() => {
  const { data: characterData, isLoading, isError } = useGetCharacter();
  const isCombat = useAtomValue(isCombatAtom);
  const occupiedCount =
    characterData?.inventory.filter(
      (item) => !item.id.toString().includes("empty"),
    ).length ?? 0;

  return (
    <StyledContainer>
      <StyledHeader>
        <StyledTitle>출격 가방</StyledTitle>
        <StyledSubCode>
          PACK // {occupiedCount} / {characterData?.inventory.length ?? 32}
        </StyledSubCode>
      </StyledHeader>
      <AnimatePresence>
        {isLoading && (
          <InheritMotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", duration: 0.45, bounce: 0 }}
            style={{ overflow: "hidden" }}
            key="backpackloading"
          >
            <StyledStatusBox>
              <CgSpinner />
              <span>가방 데이터를 불러오는 중...</span>
            </StyledStatusBox>
          </InheritMotionDiv>
        )}

        {isError && (
          <InheritMotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", duration: 0.45, bounce: 0 }}
            style={{ overflow: "hidden" }}
            key="backpackLoaderror"
          >
            <StyledStatusBox>
              <StyledMessageContainer>
                가방 정보를 불러오지 못했습니다.
              </StyledMessageContainer>
              <IoMdRefresh />
            </StyledStatusBox>
          </InheritMotionDiv>
        )}
        {characterData && (
          <InheritMotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", duration: 0.45, bounce: 0 }}
            style={{ overflow: "hidden" }}
            key="backpackLoadComplete"
          >
            <StyledGridContainer layout={isCombat ? undefined : true}>
              <SlotManager items={characterData?.inventory || []}>
                {(item) => <BackpackSlot item={item} />}
              </SlotManager>
            </StyledGridContainer>
          </InheritMotionDiv>
        )}
      </AnimatePresence>
    </StyledContainer>
  );
});

export default Backpack;

const StyledContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex: 1;
  flex-direction: column;
  background: rgba(12, 12, 15, 0.92);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  overflow: auto;
`;

const StyledHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
`;

const StyledTitle = styled.h3`
  font-size: 13px;
  font-weight: 600;
  color: #fafafa;
  margin: 0;
`;

const StyledSubCode = styled.span`
  font-family: var(--font-mono);
  font-size: 11px;
  color: #71717a;
  font-variant-numeric: tabular-nums;
`;

const StyledStatusBox = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  color: #a1a1aa;
  font-size: 12px;
`;

const StyledMessageContainer = styled.span`
  color: #ff7162;
  font-size: 12px;
`;

const StyledGridContainer = styled(motion.section)`
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  padding: 12px 16px 16px;
  overflow: auto;
`;
