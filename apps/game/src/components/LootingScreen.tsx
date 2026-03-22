import { type Item } from "@webgame/types";
import { AnimatePresence, motion } from "motion/react";
import React, { useState } from "react";
import styled from "styled-components";

interface LootingScreenProps {
  droppedItems: Item[];
  onAcquireItems: (items: Item[]) => void;
  onClose: () => void;
}

export const LootingScreen: React.FC<LootingScreenProps> = ({ droppedItems, onAcquireItems, onClose }) => {
  const [selectedItems, setSelectedItems] = useState<Item[]>([]);

  const handleToggleItem = (item: Item) => {
    setSelectedItems((prev) =>
      prev.some((selected) => selected.id === item.id)
        ? prev.filter((selected) => selected.id !== item.id)
        : [...prev, item],
    );
  };

  const handleAcquire = () => {
    onAcquireItems(selectedItems);
  };

  return (
    <LootingOverlay
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <LootingPanel
        initial={{ y: 50, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 50, opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", damping: 15, stiffness: 200 }}
      >
        <PanelHeader>
          <LootTitle>LOOT FOUND!</LootTitle>
          <LootSubtitle>Select items to acquire from defeated enemies.</LootSubtitle>
        </PanelHeader>

        <ItemList>
          {droppedItems.length > 0 ? (
            droppedItems.map((item) => {
              const isSelected = selectedItems.some((selected) => selected.id === item.id);
              return (
                <ItemCard key={item.id} $isSelected={isSelected} onClick={() => handleToggleItem(item)}>
                  <ItemName>{item.name}</ItemName>
                  <ItemDetails>
                    <span>Weight: {item.weight}kg</span>
                    <span>Value: {item.value}</span>
                  </ItemDetails>
                </ItemCard>
              );
            })
          ) : (
            <NoLootMessage>No items were dropped.</NoLootMessage>
          )}
        </ItemList>

        <PanelFooter>
          <AcquireButton onClick={handleAcquire} disabled={selectedItems.length === 0}>
            ACQUIRE {selectedItems.length > 0 && `(${selectedItems.length})`}
          </AcquireButton>
          <CloseButton onClick={onClose}>LEAVE LOOT</CloseButton>
        </PanelFooter>
      </LootingPanel>
    </LootingOverlay>
  );
};

const LootingOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const LootingPanel = styled(motion.div)`
  background: radial-gradient(circle at top left, #1a232a 0%, #0f141a 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 2.5rem;
  width: 90%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.6);
`;

const PanelHeader = styled.div`
  text-align: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding-bottom: 1.5rem;
`;

const LootTitle = styled.h3`
  font-size: 2.2rem;
  font-weight: 800;
  color: #f1c40f;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin: 0;
  text-shadow: 0 0 15px rgba(241, 196, 15, 0.3);
`;

const LootSubtitle = styled.p`
  font-size: 0.9rem;
  color: #bdc3c7;
  margin-top: 0.5rem;
`;

const ItemList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 300px;
  overflow-y: auto;
  padding-right: 10px; /* For scrollbar */

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

const ItemCard = styled.div<{ $isSelected: boolean }>`
  background: ${(props) => (props.$isSelected ? "rgba(46, 204, 113, 0.15)" : "rgba(30, 39, 46, 0.7)")};
  border: 1px solid ${(props) => (props.$isSelected ? "#2ecc71" : "rgba(255, 255, 255, 0.08)")};
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${(props) => (props.$isSelected ? "rgba(46, 204, 113, 0.25)" : "rgba(30, 39, 46, 0.9)")};
    transform: translateY(-2px);
  }
`;

const ItemName = styled.span`
  font-weight: 700;
  color: #ecf0f1;
  font-size: 1.1rem;
`;

const ItemDetails = styled.div`
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  color: #bdc3c7;
`;

const NoLootMessage = styled.p`
  text-align: center;
  color: #7f8c8d;
  font-size: 1.1rem;
  margin: 2rem 0;
`;

const PanelFooter = styled.div`
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
`;

const AcquireButton = styled.button`
  padding: 0.8rem 2rem;
  background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
  color: white;
  border-radius: 30px;
  font-weight: 700;
  font-size: 1rem;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    box-shadow: 0 5px 15px rgba(46, 204, 113, 0.3);
    transform: translateY(-2px);
  }

  &:disabled {
    background: linear-gradient(135deg, #7f8c8d 0%, #95a5a6 100%);
    cursor: not-allowed;
  }
`;

const CloseButton = styled.button`
  padding: 0.8rem 2rem;
  background: none;
  color: #bdc3c7;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 30px;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #ecf0f1;
  }
`;
