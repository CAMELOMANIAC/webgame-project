import type { Item } from "@webgame/types";
import { FiPlus } from "react-icons/fi";
import styled from "styled-components";

interface StashProps {
  item: Item;
}
const StashSlot = ({ item }: StashProps) => {
  return (
    <Slot>
      {item.name}
      <PlusIcon />
    </Slot>
  );
};

export default StashSlot;

const Slot = styled.div`
  display: flex;
  position: relative;
  width: 76.5px;
  aspect-ratio: 1/1;
  border: 1px solid rgb(33, 33, 33);
  background-color: rgba(19, 19, 19, 0.4);
  border-radius: 16px;
  color: #ecf0f1;
`;

const PlusIcon = styled(FiPlus)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 12px;
  color: rgb(33, 33, 33);
`;
