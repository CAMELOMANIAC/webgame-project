import styled from "styled-components";

import BackpackSlot from "@/components/itemSlot/BackpackSlot";
import SlotManager from "@/components/itemSlot/SlotManager";
import { useGetCharacter } from "@/utils/hooks/useGetCharacter";

const Backpack = () => {
  const { data: characterData, isLoading, isError } = useGetCharacter();

  if (isLoading) {
    return (
      <Container>
        <Title>Backpack Storage</Title>
        <MessageContainer>Loading inventory...</MessageContainer>
      </Container>
    );
  }

  if (isError) {
    return (
      <Container>
        <Title>Backpack Storage</Title>
        <MessageContainer>Error loading inventory</MessageContainer>
      </Container>
    );
  }

  return (
    <Container>
      <Title>Backpack Storage</Title>
      <GridContainer>
        <SlotManager items={characterData?.inventory || []}>
          {(item, index) => <BackpackSlot item={item} key={item.id + index} slotIndex={"backpack-slot-" + index} />}
        </SlotManager>
      </GridContainer>
    </Container>
  );
};

export default Backpack;

const Container = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex: 1;
  flex-direction: column;
  background-color: rgba(14, 14, 14, 0.6);
  overflow: auto;
`;

const MessageContainer = styled.div`
  padding: 24px;
  color: #ecf0f1;
  font-size: 14px;
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

const Title = styled.h3`
  font-size: 12px;
  font-weight: 700;
  color: #ecf0f1;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 0 24px 15px;
`;
