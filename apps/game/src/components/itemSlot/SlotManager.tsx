import { motion } from "motion/react";
import React from "react";

interface SlotManagerProps<T> {
  items: T[];
  // children이 함수 형태이며, 아이템 데이터를 인자로 받습니다.
  children: (item: T, index: number) => React.ReactNode;
}
const SlotManager = <T extends { id: string | number }>({ items, children }: SlotManagerProps<T>) => {
  return (
    <>
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
    </>
  );
};

export default SlotManager;
