import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { Item } from "@webgame/types";
import { FiPlus } from "react-icons/fi";
import styled from "styled-components";

interface BackpackProps {
  item: Item;
  slotIndex: string;
}
const BackpackSlot = ({ item, slotIndex }: BackpackProps) => {
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: slotIndex, // 예: "slot-1"
  });

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
  } = useDraggable({
    id: item?.id,
    disabled: item?.id.toString().includes("empty"),
  });

  const combinedRef = (node: HTMLElement | null) => {
    setDropRef(node);
    setDragRef(node);
  };

  return (
    <Slot
      ref={combinedRef}
      draggable={!item?.id.toString().includes("empty")}
      $transform={transform}
      $isOver={isOver}
      $isDraggable={!item?.id.toString().includes("empty")}
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
  $transform: { x: number; y: number } | null;
  $isOver: boolean;
  $isDraggable: boolean;
};

const Slot = styled.div.attrs<SlotProps>((props) => ({
  style: {
    transform: props.$transform ? `translate3d(${props.$transform.x}px, ${props.$transform.y}px, 0)` : "none",
  },
}))<SlotProps>`
  display: flex;
  position: relative;
  width: 76.5px;
  aspect-ratio: 1/1;
  border: 1px solid rgb(33, 33, 33);
  border-radius: 16px;
  color: #ecf0f1;
  touch-action: none;
  cursor: ${(props) => (props.$isDraggable ? "grab" : "")};

  background-color: ${(props) => (props.$isOver ? "rgba(255, 255, 255, 0.1)" : "rgba(19, 19, 19, 0.4)")};
  transition: background-color 0.2s ease-in-out;
`;

const PlusIcon = styled(FiPlus)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 12px;
  color: rgb(33, 33, 33);
`;
