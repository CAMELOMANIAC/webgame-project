import { useAtomValue } from "jotai";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { memo } from "react";
import { CgSpinner } from "react-icons/cg";
import { IoMdRefresh } from "react-icons/io";

import { animatingSlotIdsAtom } from "@/atoms/raidAtom";
import BackpackSlot from "@/components/itemSlot/BackpackSlot";
import SlotManager from "@/components/itemSlot/SlotManager";
import { inheritMotionDiv } from "@/styles/theme.css";
import type { CharacterData } from "@/utils/hooks/useGetCharacter";

import * as styles from "./Backpack.css";

interface BackpackProps {
  characterData: CharacterData | undefined;
  isLoading: boolean;
  isError: boolean;
}

const Backpack = memo(
  ({ characterData, isLoading, isError }: BackpackProps) => {
    const reduceMotion = useReducedMotion();
    const statusExit = { opacity: 0, y: reduceMotion ? 0 : 12 };
    const animatingSlotIds = useAtomValue(animatingSlotIdsAtom);
    const isSlotAnimating = animatingSlotIds.length > 0;
    const occupiedCount =
      characterData?.inventory.filter(
        (item) => !item.id.toString().includes("empty"),
      ).length ?? 0;

    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>배치 가방</h3>
          <span className={styles.subCode}>
            PACK // {occupiedCount} / {characterData?.inventory.length ?? 32}
          </span>
        </div>
        <AnimatePresence>
          {isLoading && (
            <motion.div
              className={inheritMotionDiv}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, y: 0 }}
              exit={statusExit}
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
              animate={{ opacity: 1, y: 0 }}
              exit={statusExit}
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
            <div
              className={inheritMotionDiv}
              style={{
                overflow: isSlotAnimating ? "visible" : "hidden",
                flex: 1,
                minHeight: 0,
                display: "flex",
              }}
              key="backpackLoadComplete"
            >
              <motion.section
                className={styles.gridContainer}
                style={{ overflow: isSlotAnimating ? "visible" : "auto" }}
                layoutScroll
              >
                <SlotManager items={characterData?.inventory || []}>
                  {(item, index) => <BackpackSlot item={item} index={index} />}
                </SlotManager>
              </motion.section>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  },
);

export default Backpack;
