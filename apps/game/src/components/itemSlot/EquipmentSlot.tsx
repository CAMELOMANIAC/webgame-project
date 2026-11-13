import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatSynergySummary, type Item } from "@webgame/types";
import { useAtomValue } from "jotai";
import { motion } from "motion/react";
import React from "react";

import { currentTimeAtom, processedEventsAtom } from "@/atoms/globalAtom";
import { isCombatAtom } from "@/atoms/raidAtom";
import type { CharacterData } from "@/utils/hooks/useGetCharacter";

import * as styles from "./EquipmentSlot.css";
import * as slotStyles from "./ItemSlot.css";
import ItemSlotContent from "./ItemSlotContent";

interface EquipmentSlotProps {
  item: Item;
  index: number;
  characterData: CharacterData | undefined;
}

const EquipmentSlot = ({
  item,
  index,
  characterData,
}: EquipmentSlotProps) => {
  const isCombat = useAtomValue(isCombatAtom);
  const currentTime = useAtomValue(currentTimeAtom);
  const processedEvents = useAtomValue(processedEventsAtom);

  const isEmpty = item.id.toString().includes("empty");
  const rawEquipmentItem = characterData?.raw.equipment[index];
  const weapon = rawEquipmentItem?.weaponMaster;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
    activeIndex,
    overIndex,
  } = useSortable({
    id: item.id,
    disabled: isCombat ? true : isEmpty ? { draggable: true } : false,
  });

  const isSortingEquipment = activeIndex >= 0 && overIndex >= 0;
  const isExternalOver = isOver && activeIndex === -1 && !isCombat;

  const style = {
    transform: isSortingEquipment
      ? CSS.Transform.toString(transform)
      : undefined,
    transition: isSortingEquipment ? transition : undefined,
    zIndex: isDragging ? 1 : undefined,
    opacity: isDragging ? 0.25 : 1,
  };

  let isCasting = false;
  let castProgress = 0;
  let isOnCooldown = false;
  let cooldownProgress = 0;
  let remainingCooldown = 0;
  let isAttacking = false;

  if (isCombat && weapon && characterData?.raw.id) {
    const actorId = characterData.raw.id;

    const lastCastStart = [...processedEvents]
      .reverse()
      .find(
        (e) =>
          e.type === "CAST_START" &&
          e.actorId === actorId &&
          e.weaponIndex === index,
      );
    const lastCastEnd = [...processedEvents]
      .reverse()
      .find(
        (e) =>
          (e.type === "CAST_COMPLETE" || e.type === "CAST_CANCEL") &&
          e.actorId === actorId &&
          e.weaponIndex === index,
      );

    if (lastCastStart && lastCastStart.type === "CAST_START") {
      if (!lastCastEnd || lastCastEnd.timestamp < lastCastStart.timestamp) {
        const castDuration = lastCastStart.duration;
        const elapsed = currentTime - lastCastStart.timestamp;
        if (elapsed < castDuration) {
          isCasting = true;
          castProgress = elapsed / castDuration;
        }
      }
    }

    const lastAttack = [...processedEvents]
      .reverse()
      .find(
        (e) =>
          e.type === "ATTACK" &&
          e.actorId === actorId &&
          e.weaponIndex === index,
      );

    if (lastAttack) {
      const elapsed = currentTime - lastAttack.timestamp;
      const cooldownDuration = weapon.cooldownTicks;
      if (elapsed < cooldownDuration) {
        isOnCooldown = true;
        remainingCooldown = cooldownDuration - elapsed;
        cooldownProgress = 1 - elapsed / cooldownDuration;
      }

      if (currentTime === lastAttack.timestamp) {
        isAttacking = true;
      }
    }
  }

  const slotState = isExternalOver
    ? "casting"
    : isEmpty
      ? "empty"
      : isAttacking
        ? "attacking"
        : isCasting
          ? "casting"
          : "occupied";

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={slotStyles.slot({ state: slotState })}
      animate={
        isAttacking
          ? {
              scale: [1, 1.08, 1],
              borderColor: [
                "rgba(255, 255, 255, 0.16)",
                "#fafafa",
                "rgba(255, 255, 255, 0.16)",
              ],
            }
          : {}
      }
      transition={{ duration: 0.25, ease: "easeOut" }}
      {...attributes}
      {...listeners}
    >
      <span className={slotStyles.slotIndex}>0{index + 1}</span>
      {!isEmpty && (
        <>
          <ItemSlotContent name={item.name} iconKey={weapon?.iconKey} />
          <div className={styles.tooltipLabel}>
            <strong>{item.name}</strong>
            {weapon && (
              <div className={styles.tooltipStats}>
                <span>DMG {weapon.damage}</span>
                <span>CD {weapon.cooldownTicks}s</span>
                {weapon.castTicks > 0 && <span>CAST {weapon.castTicks}s</span>}
                {formatSynergySummary(weapon.effect) && (
                  <span>{formatSynergySummary(weapon.effect)}</span>
                )}
              </div>
            )}
          </div>

          {isOnCooldown && (
            <motion.div
              className={styles.cooldownOverlay}
              animate={
                { "--cooldown-percent": cooldownProgress } as Record<
                  string,
                  number
                >
              }
              transition={{ duration: 0.95, ease: "linear" }}
              style={
                {
                  "--cooldown-percent": cooldownProgress,
                } as React.CSSProperties
              }
            >
              <span className={styles.cooldownText}>
                {Math.ceil(remainingCooldown)}
              </span>
            </motion.div>
          )}

          {isCasting && (
            <div className={styles.castBar}>
              <motion.div
                className={styles.castProgress}
                animate={{ width: `${castProgress * 100}%` }}
                transition={{ duration: 0.95, ease: "linear" }}
                style={{ width: `${castProgress * 100}%` }}
              />
            </div>
          )}
        </>
      )}
    </motion.div>
  );
};

export default EquipmentSlot;
