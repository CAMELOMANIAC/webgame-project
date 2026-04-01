import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { Transform } from "@dnd-kit/utilities";
import type { Item } from "@webgame/types";
import { FiPlus } from "react-icons/fi";
import styled from "styled-components";

interface BackpackProps {
  item: Item;
  slotIndex: string;
}
const BackpackSlot = ({ item, slotIndex }: BackpackProps) => {
  // 1. 드롭 영역 설정 (슬롯 기준)
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: slotIndex, // 예: "slot-1"
  });

  // 2. 드래그 요소 설정 (아이템 기준)
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
  } = useDraggable({
    id: item?.id || slotIndex, // 아이템이 있으면 아이템 ID, 없으면 슬롯 ID
    disabled: !item, // 아이템이 없는 빈 슬롯은 드래그 비활성화
  });

  // 3. 두 ref를 하나로 합치기 (두 기능을 한 요소에 부여)
  const combinedRef = (node: HTMLElement | null) => {
    setDropRef(node);
    setDragRef(node);
  };

  return (
    <Slot ref={combinedRef} $transform={transform} $isOver={isOver} {...attributes} {...listeners}>
      {item.name}
      <PlusIcon />
    </Slot>
  );
};

export default BackpackSlot;

type SlotProps = {
  $transform: Transform | null;
  $isOver: boolean;
};

const Slot = styled.div<SlotProps>`
  display: flex;
  position: relative;
  width: 76.5px;
  aspect-ratio: 1/1;
  border: 1px solid rgb(33, 33, 33);
  background-color: rgba(19, 19, 19, 0.4);
  border-radius: 16px;
  color: #ecf0f1;
  transform: ${(props) =>
    props.$transform ? `translate3d(${props.$transform.x}px, ${props.$transform.y}px, 0)` : "none"};
  background-color: ${(props) => (props.$isOver ? "rgba(0, 255, 0, 0.2)" : "transparent")};
  cursor: pointer;
  transition: background-color 0.2s ease-in-out;
  touch-action: none;
`;

const PlusIcon = styled(FiPlus)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 12px;
  color: rgb(33, 33, 33);
`;
