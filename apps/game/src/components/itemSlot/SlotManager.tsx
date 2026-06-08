import { horizontalListSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import { motion } from "motion/react";
import React from "react";

interface SlotManagerProps<T> {
  items: T[];
  sortable?: boolean;
  children: (item: T, index: number) => React.ReactNode;
}
const SlotManager = <T extends { id: string | number }>({ items, sortable, children }: SlotManagerProps<T>) => {
  const content = items.map((item, index) => (
    <motion.div
      key={item.id}
      layout="position"
      layoutId={String(item.id)}
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 30,
        mass: 1,
      }}
    >
      {children(item, index)}
    </motion.div>
  ));

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
