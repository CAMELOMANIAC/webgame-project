import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { Item } from "@webgame/types";
import { useAtomValue } from "jotai";
import { FiPlus } from "react-icons/fi";
import styled from "styled-components";

import { isCombatAtom } from "@/atoms/raidAtom";

interface BackpackProps {
  item: Item;
}
const BackpackSlot = ({ item }: BackpackProps) => {
  const isCombat = useAtomValue(isCombatAtom);
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: item?.id,
    disabled: isCombat,
  });

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: item?.id,
    disabled: isCombat || item?.id.toString().includes("empty"),
  });

  const combinedRef = (node: HTMLElement | null) => {
    setDropRef(node);
    setDragRef(node);
  };

  const isDraggable = !item?.id.toString().includes("empty") && !isCombat;

  return (
    <Slot
      ref={combinedRef}
      draggable={isDraggable}
      $isOver={isOver}
      $isDragging={isDragging}
      $isDraggable={isDraggable}
      {...attributes}
      {...listeners}
    >
      {item.name}
      <PlusIcon />
    </Slot>
  );
};

export default BackpackSlot;

type SlotProps = {
  $isOver: boolean;
  $isDragging: boolean;
  $isDraggable: boolean;
};

const Slot = styled.div<SlotProps>`
  display: flex;
  position: relative;
  width: 76.5px;
  aspect-ratio: 1/1;
  border: 1px solid rgb(33, 33, 33);
  border-radius: 16px;
  color: #ecf0f1;
  touch-action: none;
  cursor: ${(props) => (props.$isDraggable ? (props.$isDragging ? "grabbing" : "grab") : "")};
  touch-action: ${(props) => (props.$isDraggable ? "none" : "pan-y")};

  background-color: ${(props) => (props.$isOver ? "rgba(255, 255, 255, 0.1)" : "rgba(19, 19, 19, 0.4)")};
  opacity: ${(props) => (props.$isDragging ? 0.2 : 1)};
  transition:
    background-color 0.2s ease-in-out,
    opacity 0.2s ease-in-out;
`;

const PlusIcon = styled(FiPlus)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 12px;
  color: rgb(33, 33, 33);
`;
