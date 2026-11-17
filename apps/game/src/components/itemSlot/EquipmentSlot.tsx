import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type BattleEvent, type Item, resolveCatalogWeaponData } from "@webgame/types";
import { useAtomValue } from "jotai";
import {
  animate,
  motion,
  useMotionTemplate,
  useMotionValue,
} from "motion/react";
import { useEffect } from "react";

import {
  currentTimeAtom,
  flattenedTimelineAtom,
  processedEventsAtom,
} from "@/atoms/globalAtom";
import { isCombatAtom } from "@/atoms/raidAtom";
import type { CharacterData } from "@/utils/hooks/useGetCharacter";
import { useSlotInteraction } from "@/utils/hooks/useSlotInteraction";

import * as styles from "./EquipmentSlot.css";
import * as slotStyles from "./ItemSlot.css";
import ItemSlotContent from "./ItemSlotContent";

/**
 * 현재 틱의 남은 이벤트 재생 시간을 기준으로 쿨다운 애니메이션 duration(초)을 계산한다.
 */
function getTickTransitionDuration(
  timeline: BattleEvent[],
  currentTime: number,
  cooldownEventId: string | undefined,
  isFirstCooldownTick: boolean,
): number {
  const tickEvents = timeline.filter((e) => e.timestamp === currentTime);
  const startIndex =
    isFirstCooldownTick && cooldownEventId
      ? Math.max(
          0,
          tickEvents.findIndex((e) => e.id === cooldownEventId),
        )
      : 0;

  let eventDelaySec = 0;
  for (let i = startIndex; i < tickEvents.length; i++) {
    const current = tickEvents[i];
    const next = tickEvents[i + 1];
    const isImmediate =
      current?.type === "DEATH" || next?.type === "DEATH";
    if (!isImmediate) {
      eventDelaySec += 0.25;
    }
  }

  return (isFirstCooldownTick ? 0 : 1) + eventDelaySec;
}

interface CooldownOverlayProps {
  targetProgress: number;
  duration: number;
  remainingCooldown: number;
}

function CooldownOverlay({
  targetProgress,
  duration,
  remainingCooldown,
}: CooldownOverlayProps) {
  const progress = useMotionValue(1);
  const background = useMotionTemplate`conic-gradient(rgba(9, 9, 11, 0.84) calc(${progress} * 360deg), rgba(9, 9, 11, 0.35) 0deg)`;

  useEffect(() => {
    const controls = animate(progress, targetProgress, {
      duration,
      ease: "linear",
    });
    return () => controls.stop();
  }, [progress, targetProgress, duration]);

  return (
    <motion.div className={styles.cooldownOverlay} style={{ background }}>
      <span className={styles.cooldownText}>
        {Math.ceil(remainingCooldown)}
      </span>
    </motion.div>
  );
}

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
  const timeline = useAtomValue(flattenedTimelineAtom);
  const processedEvents = useAtomValue(processedEventsAtom);
  const { onInspectSlot, isClickSuppressed } = useSlotInteraction();

  const isEmpty = item.id.toString().includes("empty");
  const rawEquipmentItem = characterData?.raw.equipment[index];
  const weapon = rawEquipmentItem?.weaponMaster;
  const resolvedWeapon = weapon
    ? resolveCatalogWeaponData({
        ...weapon,
        description: weapon.description ?? undefined,
        effect: weapon.effect ?? undefined,
      })
    : undefined;

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
  let cooldownKey: string | undefined;
  let cooldownProgress = 0;
  let cooldownTransitionDuration = 0.95;
  let remainingCooldown = 0;
  let isAttacking = false;

  if (isCombat && resolvedWeapon && characterData?.raw.id) {
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

    const lastCooldown = [...processedEvents]
      .reverse()
      .find(
        (e) =>
          e.type === "COOLDOWN" &&
          e.actorId === actorId &&
          e.weaponIndex === index,
      );

    if (lastCooldown && lastCooldown.type === "COOLDOWN") {
      const hasteReduction = processedEvents.reduce((total, e) => {
        if (
          e.type === "SYNERGY" &&
          e.actorId === actorId &&
          e.timestamp > lastCooldown.timestamp &&
          e.hasteTicks &&
          e.hasteTicks > 0 &&
          e.targetSlotIndices.includes(index)
        ) {
          return total + e.hasteTicks;
        }
        return total;
      }, 0);

      const elapsed = currentTime - lastCooldown.timestamp + hasteReduction;
      const cooldownDuration = lastCooldown.duration;
      if (cooldownDuration > 0 && elapsed < cooldownDuration) {
        isOnCooldown = true;
        cooldownKey = lastCooldown.id;
        remainingCooldown = cooldownDuration - elapsed;

        const endTick =
          lastCooldown.timestamp + cooldownDuration - hasteReduction;
        let totalCooldownTime = 0;
        let remainingTimeAfterTick = 0;

        for (let tick = lastCooldown.timestamp; tick < endTick; tick++) {
          const stepDuration = getTickTransitionDuration(
            timeline,
            tick,
            lastCooldown.id,
            tick === lastCooldown.timestamp,
          );
          totalCooldownTime += stepDuration;
          if (tick > currentTime) {
            remainingTimeAfterTick += stepDuration;
          }
          if (tick === currentTime) {
            cooldownTransitionDuration = stepDuration;
          }
        }

        cooldownProgress =
          totalCooldownTime > 0
            ? Math.max(0, remainingTimeAfterTick / totalCooldownTime)
            : 0;
      }

      if (currentTime === lastCooldown.timestamp) {
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
      onClick={() => {
        if (isEmpty || isClickSuppressed?.()) return;
        onInspectSlot?.({ source: "equipment", item, index });
      }}
      {...attributes}
      {...listeners}
    >
      <span className={slotStyles.slotIndex}>0{index + 1}</span>
      {!isEmpty && (
        <>
          <ItemSlotContent
            name={item.name}
            itemId={resolvedWeapon?.id ?? item.masterId}
            iconKey={resolvedWeapon?.iconKey}
          />

          {isOnCooldown && (
            <CooldownOverlay
              key={cooldownKey}
              targetProgress={cooldownProgress}
              duration={cooldownTransitionDuration}
              remainingCooldown={remainingCooldown}
            />
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
