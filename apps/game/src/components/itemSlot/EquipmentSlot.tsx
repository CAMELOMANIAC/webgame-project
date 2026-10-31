import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Item } from "@webgame/types";
import { useAtomValue } from "jotai";
import { motion } from "motion/react";
import React from "react";
import {
  GiBattleAxe,
  GiBowieKnife,
  GiBroadsword,
  GiRegeneration,
  GiRifle,
  GiShardSword,
  GiTargetArrows,
  GiWizardStaff,
} from "react-icons/gi";
import styled, { css } from "styled-components";

import { currentTimeAtom, processedEventsAtom } from "@/atoms/globalAtom";
import { isCombatAtom } from "@/atoms/raidAtom";
import { cornerBracketsMixin } from "@/components/Commons";
import { useGetCharacter } from "@/utils/hooks/useGetCharacter";

interface EquipmentSlotProps {
  item: Item;
  index: number;
}

const getWeaponIcon = (iconKey = "WEAPON") => {
  const icons = {
    DAGGER: GiBowieKnife,
    SWORD: GiBroadsword,
    RIFLE: GiRifle,
    AXE: GiBattleAxe,
    STAFF: GiWizardStaff,
    HEAL: GiRegeneration,
    TARGET: GiTargetArrows,
  };
  const Icon = icons[iconKey as keyof typeof icons] ?? GiShardSword;
  return <Icon size={20} color="#fafafa" />;
};

const EquipmentSlot = ({ item, index }: EquipmentSlotProps) => {
  const isCombat = useAtomValue(isCombatAtom);
  const currentTime = useAtomValue(currentTimeAtom);
  const processedEvents = useAtomValue(processedEventsAtom);
  const { data: characterData } = useGetCharacter();

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
  } = useSortable({
    id: item.id,
    disabled: isCombat ? true : isEmpty ? { draggable: true } : false,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : undefined,
    opacity: isDragging ? 0 : 1,
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

  return (
    <StyledSlot
      ref={setNodeRef}
      style={style}
      $isEmpty={isEmpty}
      $isCasting={isCasting}
      $isAttacking={isAttacking}
      $bracketTone={isAttacking ? "negative" : isCasting ? "positive" : "default"}
      animate={
        isAttacking
          ? {
              scale: [1, 1.12, 1],
              borderColor: [
                "#fafafa",
                "#ff7162",
                "rgba(255, 255, 255, 0.16)",
              ],
            }
          : {}
      }
      transition={{ duration: 0.25, ease: "easeOut" }}
      {...attributes}
      {...listeners}
    >
      <StyledSlotIndex>0{index + 1}</StyledSlotIndex>
      {!isEmpty && (
        <>
          {getWeaponIcon(weapon?.iconKey)}
          <StyledWeaponNameLabel>{item.name}</StyledWeaponNameLabel>
          <StyledTooltipLabel>
            <strong>{item.name}</strong>
            {weapon && (
              <StyledTooltipStats>
                <span>DMG {weapon.damage}</span>
                <span>CD {weapon.cooldownTicks}s</span>
                {weapon.castTicks > 0 && <span>CAST {weapon.castTicks}s</span>}
              </StyledTooltipStats>
            )}
          </StyledTooltipLabel>

          {isOnCooldown && (
            <StyledCooldownOverlay
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
              <StyledCooldownText>
                {Math.ceil(remainingCooldown)}
              </StyledCooldownText>
            </StyledCooldownOverlay>
          )}

          {isCasting && (
            <StyledCastBar>
              <StyledCastProgress
                animate={{ width: `${castProgress * 100}%` }}
                transition={{ duration: 0.95, ease: "linear" }}
                style={{ width: `${castProgress * 100}%` }}
              />
            </StyledCastBar>
          )}
        </>
      )}
    </StyledSlot>
  );
};

export default EquipmentSlot;

const StyledSlot = styled(motion.div)<{
  $isCasting?: boolean;
  $isEmpty?: boolean;
  $isAttacking?: boolean;
  $bracketTone?: "default" | "positive" | "negative";
}>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 52px;
  aspect-ratio: 1/1;
  border: 1px solid
    ${(props) =>
      props.$isCasting
        ? "rgba(133, 173, 255, 0.55)"
        : props.$isEmpty
          ? "rgba(255, 255, 255, 0.07)"
          : "rgba(255, 255, 255, 0.16)"};
  background-color: ${(props) =>
    props.$isEmpty ? "rgba(12, 12, 15, 0.78)" : "rgba(20, 20, 24, 0.92)"};
  backdrop-filter: blur(8px);
  border-radius: 6px;
  color: #fafafa;
  touch-action: none;
  overflow: visible;
  transition: border-color 0.15s ease, background-color 0.15s ease;
  cursor: grab;

  ${(props) => (!props.$isEmpty ? cornerBracketsMixin : css``)}

  &:active {
    cursor: grabbing;
  }

  &:hover {
    border-color: ${(props) =>
      props.$isEmpty
        ? "rgba(255, 255, 255, 0.12)"
        : "rgba(133, 173, 255, 0.45)"};
  }
`;

const StyledSlotIndex = styled.span`
  position: absolute;
  top: 3px;
  left: 4px;
  font-family: var(--font-mono);
  font-size: 9px;
  color: #52525b;
  font-variant-numeric: tabular-nums;
  pointer-events: none;
`;

const StyledWeaponNameLabel = styled.span`
  position: absolute;
  bottom: 3px;
  font-size: 10px;
  font-weight: 500;
  color: #a1a1aa;
  max-width: 90%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  pointer-events: none;
`;

const StyledCooldownOverlay = styled(motion.div)`
  position: absolute;
  inset: 0;
  border-radius: 5px;
  background: conic-gradient(
    rgba(9, 9, 11, 0.84) calc(var(--cooldown-percent, 0) * 360deg),
    rgba(9, 9, 11, 0.35) 0deg
  );
  pointer-events: none;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2;
`;

const StyledCooldownText = styled.span`
  font-family: var(--font-mono);
  color: #ff7162;
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
`;

const StyledCastBar = styled.div`
  position: absolute;
  bottom: 3px;
  left: 5px;
  right: 5px;
  height: 3px;
  background: #27272a;
  border-radius: 1px;
  overflow: hidden;
  z-index: 3;
`;

const StyledCastProgress = styled(motion.div)`
  height: 100%;
  background: #85adff;
`;

const StyledTooltipLabel = styled.div`
  display: none;
  position: absolute;
  bottom: 108%;
  left: 50%;
  transform: translateX(-50%);
  background-color: #101013;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 11px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 100;
  color: #fafafa;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.45);

  ${StyledSlot}:hover & {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
`;

const StyledTooltipStats = styled.div`
  display: flex;
  gap: 8px;
  font-family: var(--font-mono);
  color: #a1a1aa;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  margin-top: 2px;
`;
