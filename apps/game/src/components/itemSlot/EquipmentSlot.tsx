import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { Item } from "@webgame/types";
import styled from "styled-components";

interface EquipmentProps {
  item: Item;
}
const EquipmentSlot = ({ item }: EquipmentProps) => {
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: item.id,
  });

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: item.id,
    disabled: item.id.toString().includes("empty"),
  });

  const combinedRef = (node: HTMLElement | null) => {
    setDropRef(node);
    setDragRef(node);
  };

  return (
    <Slot
      ref={combinedRef}
      $isOver={isOver}
      $isDragging={isDragging}
      $isDraggable={!item.id.toString().includes("empty")}
      {...attributes}
      {...listeners}
    >
      {item.name}
    </Slot>
  );
};

export default EquipmentSlot;

type SlotProps = {
  $isOver: boolean;
  $isDragging: boolean;
  $isDraggable: boolean;
};

const Slot = styled.div<SlotProps>`
  display: flex;
  position: relative;
  width: 50px;
  aspect-ratio: 1/1;
  border: 1px solid rgb(33, 33, 33);
  background-color: ${(props) => (props.$isOver ? "rgba(255, 255, 255, 0.1)" : "rgb(22, 22, 22)")};
  border-radius: 16px;
  color: #ecf0f1;
  touch-action: none;
  cursor: ${(props) => (props.$isDraggable ? (props.$isDragging ? "grabbing" : "grab") : "")};
  opacity: ${(props) => (props.$isDragging ? 0.5 : 1)};
  transition:
    background-color 0.2s ease-in-out,
    opacity 0.2s ease-in-out;
`;
