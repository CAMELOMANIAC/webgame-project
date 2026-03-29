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
    <Container>
      <StashTitle>Backpack Storage</StashTitle>
      <GridContainer>
        {/* GridContainer에서 motion 애니메이션이 정상적으로 동작하지 않음을 확인해야함 */}
        <SlotManager items={items}>{(item, index) => <StashSlot item={item} key={item.id + index} />}</SlotManager>
      </GridContainer>
    </Container>
  );
};

export default Stash;

const Container = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex: 1;
  flex-direction: column;
  background-color: rgba(14, 14, 14, 0.6);
  overflow: auto;
`;

const GridContainer = styled.section`
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  flex-direction: row;
  justify-content: space-between;
  row-gap: 8px;
  padding: 0 24px 8px;
  overflow: auto;
`;

const StashTitle = styled.h3`
  font-size: 12px;
  font-weight: 700;
  color: #ecf0f1;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 0 24px 15px;
`;
