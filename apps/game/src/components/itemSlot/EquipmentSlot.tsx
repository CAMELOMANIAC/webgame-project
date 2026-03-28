import type { Item } from "@webgame/types";
import styled from "styled-components";

interface EquipmentProps {
  item: Item;
}
const EquipmentSlot = ({ item }: EquipmentProps) => {
  return <Slot>{item.name}</Slot>;
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
`;
