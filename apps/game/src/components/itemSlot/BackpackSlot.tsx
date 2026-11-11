import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { Item } from "@webgame/types";
import { useAtomValue } from "jotai";

import { isCombatAtom } from "@/atoms/raidAtom";

import * as styles from "./ItemSlot.css";
import ItemSlotContent from "./ItemSlotContent";

interface BackpackProps {
  item: Item;
  index?: number;
}

const BackpackSlot = ({ item, index }: BackpackProps) => {
  const isCombat = useAtomValue(isCombatAtom);
  const isEmpty = item?.id.toString().includes("empty");

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: item?.id,
    disabled: isCombat,
  });

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: item?.id,
    disabled: isCombat || isEmpty,
  });

  const combinedRef = (node: HTMLElement | null) => {
    setDropRef(node);
    setDragRef(node);
  };

  const slotState = isOver ? "casting" : isEmpty ? "empty" : "occupied";

  return (
    <div
      ref={combinedRef}
      className={`${styles.slot({ state: slotState })} ${isDragging ? styles.dragging : ""} ${isCombat || isEmpty ? styles.staticSlot : ""}`}
      title={isEmpty ? "빈 가방 슬롯" : item.name}
      {...attributes}
      {...listeners}
    >
      {index !== undefined && (
        <span className={styles.slotIndex}>
          {String(index + 1).padStart(2, "0")}
        </span>
      )}
      {!isEmpty && (
        <ItemSlotContent
          name={item.name}
          iconKey={item.iconKey}
          quantity={item.quantity}
        />
      )}
    </div>
  );
};

export default BackpackSlot;
