import { horizontalListSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import { useAtomValue } from "jotai";
import { motion } from "motion/react";
import React from "react";

import { activeDragIdAtom, isCombatAtom } from "@/atoms/raidAtom";

interface SlotManagerProps<T> {
  items: T[];
  sortable?: boolean;
  children: (item: T, index: number) => React.ReactNode;
}
const SlotManager = <T extends { id: string | number }>({ items, sortable, children }: SlotManagerProps<T>) => {
  const activeDragId = useAtomValue(activeDragIdAtom);
  const isCombat = useAtomValue(isCombatAtom);

  const content = items.map((item, index) => {
    // 드래그 중인 아이템은 layoutId를 제거하여 DragOverlay의 layoutId와 충돌 방지
    const isBeingDragged = activeDragId != null && String(item.id) === String(activeDragId);

    return (
      <motion.div
        key={item.id}
        layout={isCombat ? undefined : "position"}
        layoutId={isCombat || isBeingDragged ? undefined : String(item.id)}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30,
          mass: 1,
        }}
      >
        {children(item, index)}
      </motion.div>
    );
  });

  if (sortable) {
    return (
      <SortableContext items={items.map((i) => i.id)} strategy={horizontalListSortingStrategy}>
        {content}
      </SortableContext>
    );
  }

  return <>{content}</>;
};

export default SlotManager;
