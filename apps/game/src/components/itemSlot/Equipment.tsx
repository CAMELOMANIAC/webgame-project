import { memo } from "react";
import styled from "styled-components";

import EquipmentSlot from "@/components/itemSlot/EquipmentSlot";
import SlotManager from "@/components/itemSlot/SlotManager";
import { useGetCharacter } from "@/utils/hooks/useGetCharacter";

const Equipment = memo(() => {
  const { data: characterData, isLoading } = useGetCharacter();

  if (isLoading) {
    return <StyledContainer />;
  }

  return (
    <StyledContainer>
      <SlotManager items={characterData?.equipment || []} sortable>
        {(item, index) => <EquipmentSlot item={item} index={index} />}
      </SlotManager>
    </StyledContainer>
  );
});

const StyledContainer = styled.div`
  width: 100%;
  display: flex;
  flex-wrap: nowrap;
  flex-direction: row;
  justify-content: space-between;
  gap: 6px;
  padding: 10px 16px 16px;
`;

export default Equipment;
