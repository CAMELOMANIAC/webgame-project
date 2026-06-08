import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Item } from "@webgame/types";
import styled from "styled-components";

interface EquipmentProps {
  item: Item;
}
const EquipmentSlot = ({ item }: EquipmentProps) => {
  const isEmpty = item.id.toString().includes("empty");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: isEmpty ? { draggable: true } : false,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : undefined,
    opacity: isDragging ? 0 : 1,
  };

  return (
    <Slot
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      {item.name}
    </Slot>
  );
};

export default EquipmentSlot;

const Slot = styled.div`
  display: flex;
  position: relative;
  width: 50px;
  aspect-ratio: 1/1;
  border: 1px solid rgb(33, 33, 33);
  background-color: rgb(22, 22, 22);
  border-radius: 16px;
  color: #ecf0f1;
  touch-action: none;
`;
