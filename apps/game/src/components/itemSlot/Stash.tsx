import type { Item } from "@webgame/types";
import styled from "styled-components";

import SlotManager from "@/components/itemSlot/SlotManager";
import StashSlot from "@/components/itemSlot/StashSlot";
import useItemSlot from "@/utils/hooks/useItemSlot";

interface StashProps {
  initialItems: Item[];
}
const Stash = ({ initialItems }: StashProps) => {
  const { items } = useItemSlot({ initialItems });
  return (
    <>
      <StashTitle>Backpack Storage</StashTitle>
      <Container>
        <SlotManager items={items}>{(item, index) => <StashSlot item={item} key={index} />}</SlotManager>
      </Container>
    </>
  );
};

export default Stash;

const Container = styled.section`
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  flex-direction: row;
  justify-content: space-between;
  row-gap: 8px;
  padding: 0 24px 8px;
  background-color: rgba(14, 14, 14, 0.6);
`;

const StashTitle = styled.h3`
  font-size: 12px;
  font-weight: 700;
  color: #ecf0f1;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 0 24px 15px;
`;
