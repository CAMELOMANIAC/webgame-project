import { useDndContext } from "@dnd-kit/core";
import { horizontalListSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import { useAtomValue } from "jotai";
import { motion } from "motion/react";
import React from "react";

import { animatingSlotIdsAtom, isCombatAtom } from "@/atoms/raidAtom";

interface SlotManagerProps<T> {
  items: T[];
  sortable?: boolean;
  children: (item: T, index: number) => React.ReactNode;
}
const SlotManager = <T extends { id: string | number }>({
  items,
  sortable,
  children,
}: SlotManagerProps<T>) => {
  const isCombat = useAtomValue(isCombatAtom);
  const animatingSlotIds = useAtomValue(animatingSlotIdsAtom);
  const { active, over } = useDndContext();

  const isActiveInList =
    active != null && items.some((i) => String(i.id) === String(active.id));
  const isOverInList =
    over != null && items.some((i) => String(i.id) === String(over.id));
  // Equipment 드래그 중 밀기는 sortable이, 드롭 후 위치 변경은 Motion의 layout이 처리한다.
  // Equipment <-> Backpack 이동/교환은 layoutId로 연결한다.
  const isSortingWithinList = Boolean(sortable && isActiveInList && isOverInList);

  const content = items.map((item, index) => {
    const idStr = String(item.id);
    const isEmpty = idStr.includes("empty");
    const isAnimating = !isEmpty && animatingSlotIds.includes(idStr);

    return (
      <motion.div
        key={item.id}
        layout={isCombat ? undefined : "position"}
        layoutId={
          isCombat || isEmpty || isSortingWithinList ? undefined : idStr
        }
        style={{
          position: "relative",
          zIndex: isAnimating ? 100 : 1,
        }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 35,
          mass: 0.8,
        }}
      >
        {children(item, index)}
      </motion.div>
    );
  });

  if (sortable) {
    return (
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={horizontalListSortingStrategy}
      >
        {content}
      </SortableContext>
    );
  }

  return <>{content}</>;
};

export default SlotManager;
