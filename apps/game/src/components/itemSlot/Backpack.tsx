import { AnimatePresence } from "motion/react";
import { CgSpinner } from "react-icons/cg";
import { IoMdRefresh } from "react-icons/io";
import styled from "styled-components";

import { InheritMotionDiv } from "@/components/Commons";
import BackpackSlot from "@/components/itemSlot/BackpackSlot";
import SlotManager from "@/components/itemSlot/SlotManager";
import { useGetCharacter } from "@/utils/hooks/useGetCharacter";

const Backpack = () => {
  const { data: characterData, isLoading, isError } = useGetCharacter();

  return (
    <Container>
      <Title>Backpack Storage</Title>
      <AnimatePresence>
        {isLoading && (
          <InheritMotionDiv
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "100%", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0 }}
            style={{ overflow: "hidden" }}
            key="backpackloading"
          >
            <button>
              <CgSpinner />
            </button>
          </InheritMotionDiv>
        )}

        {isError && (
          <InheritMotionDiv
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "100%", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0 }}
            style={{ overflow: "hidden" }}
            key="backpackLoaderror"
          >
            <button>
              <MessageContainer>Something went wrong, please retry</MessageContainer>
              <IoMdRefresh />
            </button>
          </InheritMotionDiv>
        )}
        {characterData && (
          <InheritMotionDiv
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "100%", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0 }}
            style={{ overflow: "hidden" }}
            key="backpackLoadComplete"
          >
            <GridContainer>
              <SlotManager items={characterData?.inventory || []}>
                {(item, index) => (
                  <BackpackSlot item={item} key={item.id + index} slotIndex={"backpack-slot-" + index} />
                )}
              </SlotManager>
            </GridContainer>
          </InheritMotionDiv>
        )}
      </AnimatePresence>
    </Container>
  );
};

export default Backpack;

const Container = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex: 1;
  flex-direction: column;
  background-color: rgba(14, 14, 14, 0.6);
  overflow: auto;
`;

const MessageContainer = styled.div`
  padding: 24px;
  color: #ecf0f1;
  font-size: 14px;
`;

const GridContainer = styled.section`
  width: 100%;
  height: 100%;
  display: flex;
  flex-wrap: wrap;
  flex-direction: row;
  justify-content: space-between;
  row-gap: 8px;
  padding: 0 24px 8px;
  overflow: auto;
`;

const Title = styled.h3`
  font-size: 12px;
  font-weight: 700;
  color: #ecf0f1;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 0 24px 15px;
`;
