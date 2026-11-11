import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { Item } from "@webgame/types";
import { useAtomValue } from "jotai";

import { isCombatAtom } from "@/atoms/raidAtom";

import * as styles from "./BackpackSlot.css";

interface BackpackProps {
  item: Item;
}

const BackpackSlot = ({ item }: BackpackProps) => {
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

  const isDraggable = !isEmpty && !isCombat;
  const slotState = isOver ? "over" : isEmpty ? "empty" : "occupied";

  return (
    <div
      ref={combinedRef}
      className={styles.slot({
        state: slotState,
        dragging: isDragging,
        draggable: isDraggable,
      })}
      {...attributes}
      {...listeners}
    >
      {isEmpty ? (
        <span className={styles.emptyLabel}>EMPTY</span>
      ) : (
        <>
          <span className={styles.itemName}>{item.name}</span>
          {(item.quantity ?? 0) > 1 && (
            <span className={styles.quantityBadge}>×{item.quantity}</span>
          )}
        </>
      )}
    </div>
  );
};

export default BackpackSlot;
