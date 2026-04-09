import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { motion } from "motion/react";
import React from "react";

interface SlotManagerProps<T> {
  items: T[];
  children: (item: T, index: number) => React.ReactNode;
}
const SlotManager = <T extends { id: string | number }>({ items, children }: SlotManagerProps<T>) => {
  return (
    <SortableContext items={items.map((i) => i.id)} strategy={horizontalListSortingStrategy}>
      {items.map((item, index) => (
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
      ))}
    </SortableContext>
  );
};

export default SlotManager;
