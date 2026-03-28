import type { Item } from "@webgame/types";
import styled from "styled-components";

import EquipmentSlot from "@/components/itemSlot/EquipmentSlot";
import SlotManager from "@/components/itemSlot/SlotManager";
import useItemSlot from "@/utils/hooks/useItemSlot";

interface EquipmentProps {
  initialItems: Item[];
}

const Equipment = ({ initialItems }: EquipmentProps) => {
  const { items } = useItemSlot({ initialItems });
  return (
    <Container>
      <SlotManager items={items}>{(item, index) => <EquipmentSlot item={item} key={index} />}</SlotManager>
    </Container>
  );
};

const Container = styled.div`
  width: 100%;
  display: flex;
  flex-wrap: nowrap;
  flex-direction: row;
  justify-content: space-between;
  padding: 16px 24px 33px;
  /* background-color: rgba(14, 14, 14, 0.6); */
`;

export default Equipment;
