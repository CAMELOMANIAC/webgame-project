import { useAtomValue } from "jotai";
import { type HTMLMotionProps,motion } from "motion/react";
import { useMemo } from "react";
import { styled } from "styled-components";

import { selectItemAtIndex } from "../../atoms/inventoryItemAtom";

type InventorySlotProps = {
  slotId: number;
  selectedSlot: number | null;
} & HTMLMotionProps<"div">;

const InventorySlot = ({ slotId, selectedSlot, ...props }: InventorySlotProps) => {
  const itemAtom = useMemo(() => selectItemAtIndex(slotId), [slotId]);
  const inventoryItem = useAtomValue(itemAtom);

  return (
    <SlotBox
      key={slotId}
      data-slot-id={slotId}
      // style={slotStyle}
      layoutId={`slot-${slotId}`}
      $isSelected={selectedSlot === slotId}
      {...props}
    >
      {inventoryItem?.name || slotId}
    </SlotBox>
  );
};

export default InventorySlot;

type SlotBoxProps = {
  $isSelected: boolean;
};
export const SlotBox = styled(motion.div)<SlotBoxProps>`
  position: relative;

  width: 4rem;
  height: 4rem;
  border: 1px solid black;

  opacity: ${({ $isSelected }) => ($isSelected ? "hidden" : "visible")};
  user-select: none;

  &:hover {
    border-color: red;
    /*cursor: ${({ $isSelected }) => ($isSelected ? "grabbing" : "grab")};*/
  }
`;
