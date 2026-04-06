import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "motion/react";
import { CgSpinner } from "react-icons/cg";
import { IoMdRefresh } from "react-icons/io";
import styled from "styled-components";

import { InheritMotionDiv } from "@/components/Commons";
import BackpackSlot from "@/components/itemSlot/BackpackSlot";
import SlotManager from "@/components/itemSlot/SlotManager";
import { type CharacterData, useGetCharacter } from "@/utils/hooks/useGetCharacter";

const Backpack = () => {
  const queryClient = useQueryClient();
  const { data: characterData, isLoading, isError } = useGetCharacter();

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id.toString();
    const overId = over.id.toString();

    if (activeId === overId) return;

    queryClient.setQueryData(["character", characterData?.raw.userId], (old: CharacterData | undefined) => {
      if (!old) return old;

      const newInventory = [...old.inventory];
      const newRawInventory = [...old.raw.inventory];

      const activeIndex = newInventory.findIndex((item) => item.id === activeId);
      const overIndex = newInventory.findIndex((item) => item.id === overId);

      if (activeIndex === -1 || overIndex === -1) return old;

      // Swap items
      [newInventory[activeIndex], newInventory[overIndex]] = [newInventory[overIndex], newInventory[activeIndex]];
      [newRawInventory[activeIndex], newRawInventory[overIndex]] = [
        newRawInventory[overIndex],
        newRawInventory[activeIndex],
      ];

      // Update slotIndex for server sync later
      newRawInventory[activeIndex] = { ...newRawInventory[activeIndex], slotIndex: activeIndex };
      newRawInventory[overIndex] = { ...newRawInventory[overIndex], slotIndex: overIndex };

      return {
        ...old,
        inventory: newInventory,
        raw: {
          ...old.raw,
          inventory: newRawInventory,
        },
      };
    });
  };

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
            <DndContext onDragEnd={handleDragEnd}>
              <GridContainer>
                <SlotManager items={characterData?.inventory || []}>
                  {(item, index) => <BackpackSlot item={item} key={item.id + index} />}
                </SlotManager>
              </GridContainer>
            </DndContext>
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
