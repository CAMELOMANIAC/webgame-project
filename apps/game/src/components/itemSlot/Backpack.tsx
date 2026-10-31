import { useAtomValue } from "jotai";
import { AnimatePresence, motion } from "motion/react";
import { memo } from "react";
import { CgSpinner } from "react-icons/cg";
import { IoMdRefresh } from "react-icons/io";

import { isCombatAtom } from "@/atoms/raidAtom";
import BackpackSlot from "@/components/itemSlot/BackpackSlot";
import SlotManager from "@/components/itemSlot/SlotManager";
import { inheritMotionDiv } from "@/styles/theme.css";
import { useGetCharacter } from "@/utils/hooks/useGetCharacter";

import * as styles from "./Backpack.css";

const Backpack = memo(() => {
  const { data: characterData, isLoading, isError } = useGetCharacter();
  const isCombat = useAtomValue(isCombatAtom);
  const occupiedCount =
    characterData?.inventory.filter(
      (item) => !item.id.toString().includes("empty"),
    ).length ?? 0;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>출격 가방</h3>
        <span className={styles.subCode}>
          PACK // {occupiedCount} / {characterData?.inventory.length ?? 32}
        </span>
      </div>
      <AnimatePresence>
        {isLoading && (
          <motion.div
            className={inheritMotionDiv}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", duration: 0.45, bounce: 0 }}
            style={{ overflow: "hidden" }}
            key="backpackloading"
          >
            <div className={styles.statusBox}>
              <CgSpinner />
              <span>가방 데이터를 불러오는 중...</span>
            </div>
          </motion.div>
        )}

        {isError && (
          <motion.div
            className={inheritMotionDiv}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", duration: 0.45, bounce: 0 }}
            style={{ overflow: "hidden" }}
            key="backpackLoaderror"
          >
            <div className={styles.statusBox}>
              <span className={styles.messageContainer}>
                가방 정보를 불러오지 못했습니다.
              </span>
              <IoMdRefresh />
            </div>
          </motion.div>
        )}
        {characterData && (
          <motion.div
            className={inheritMotionDiv}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", duration: 0.45, bounce: 0 }}
            style={{ overflow: "hidden" }}
            key="backpackLoadComplete"
          >
            <motion.section
              className={styles.gridContainer}
              layout={isCombat ? undefined : true}
            >
              <SlotManager items={characterData?.inventory || []}>
                {(item) => <BackpackSlot item={item} />}
              </SlotManager>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default Backpack;
