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
  GiWizardStaff} from "react-icons/gi";
import styled from "styled-components";

import { currentTimeAtom, processedEventsAtom } from "@/atoms/globalAtom";
import { isCombatAtom } from "@/atoms/raidAtom";
import { useGetCharacter } from "@/utils/hooks/useGetCharacter";

interface EquipmentSlotProps {
  item: Item;
  index: number;
}

const getWeaponIcon = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes("dagger")) return <GiBowieKnife size={24} color="#ffd4d4" />;
  if (lower.includes("greatsword")) return <GiBroadsword size={24} color="#ccd9ff" />;
  if (lower.includes("sniper")) return <GiRifle size={24} color="#d4ffd4" />;
  if (lower.includes("giant slayer") || lower.includes("giant_slayer")) return <GiBattleAxe size={24} color="#ffb3b3" />;
  if (lower.includes("staff")) return <GiWizardStaff size={24} color="#ebd4ff" />;
  if (lower.includes("life-saver") || lower.includes("lifesaver") || lower.includes("heal")) return <GiRegeneration size={24} color="#b3ffb3" />;
  if (lower.includes("secondary")) return <GiTargetArrows size={24} color="#ffe6cc" />;
  return <GiShardSword size={24} color="#f0d38d" />; // Default/primary
};

const EquipmentSlot = ({ item, index }: EquipmentSlotProps) => {
  const isCombat = useAtomValue(isCombatAtom);
  const currentTime = useAtomValue(currentTimeAtom);
  const processedEvents = useAtomValue(processedEventsAtom);
  const { data: characterData } = useGetCharacter();

  const isEmpty = item.id.toString().includes("empty");
  const rawEquipmentItem = characterData?.raw.equipment[index];
  const weapon = rawEquipmentItem?.weaponMaster;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: isCombat ? true : (isEmpty ? { draggable: true } : false),
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : undefined,
    opacity: isDragging ? 0 : 1,
  };

  // Calculate combat states
  let isCasting = false;
  let castProgress = 0;
  let isOnCooldown = false;
  let cooldownProgress = 0;
  let remainingCooldown = 0;
  let isAttacking = false;

  if (isCombat && weapon && characterData?.raw.user.nickname) {
    const actorId = characterData.raw.user.nickname;

    // 1. Casting state
    const lastCastStart = [...processedEvents].reverse().find(
      (e) => e.type === "CAST_START" && e.actorId === actorId && e.weaponIndex === index
    );
    const lastCastEnd = [...processedEvents].reverse().find(
      (e) => (e.type === "CAST_COMPLETE" || e.type === "CAST_CANCEL") && e.actorId === actorId && e.weaponIndex === index
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

    // 2. Cooldown state
    const lastAttack = [...processedEvents].reverse().find(
      (e) => e.type === "ATTACK" && e.actorId === actorId && e.weaponIndex === index
    );

    if (lastAttack) {
      const elapsed = currentTime - lastAttack.timestamp;
      const cooldownDuration = weapon.cooldownTicks;
      if (elapsed < cooldownDuration) {
        isOnCooldown = true;
        remainingCooldown = cooldownDuration - elapsed;
        cooldownProgress = 1 - (elapsed / cooldownDuration);
      }

      // 3. Attack pulse check
      if (currentTime === lastAttack.timestamp) {
        isAttacking = true;
      }
    }
  }

  return (
    <Slot
      ref={setNodeRef}
      style={style}
      $isEmpty={isEmpty}
      $isCasting={isCasting}
      $isAttacking={isAttacking}
      animate={isAttacking ? { scale: [1, 1.25, 1], borderColor: ["#ffffff", "#ff716c", "rgb(33,33,33)"] } : {}}
      transition={{ duration: 0.3, ease: "easeOut" }}
      {...attributes}
      {...listeners}
    >
      {!isEmpty && (
        <>
          {getWeaponIcon(item.name)}
          <WeaponNameLabel>{item.name}</WeaponNameLabel>
          <TooltipLabel>
            <strong>{item.name}</strong>
            {weapon && (
              <TooltipStats>
                <span>Dmg: {weapon.damage}</span>
                <span>Cd: {weapon.cooldownTicks}s</span>
                {weapon.castTicks > 0 && <span>Cast: {weapon.castTicks}s</span>}
              </TooltipStats>
            )}
          </TooltipLabel>

          {/* Cooldown Overlay (Framer Motion Smooth Transition) */}
          {isOnCooldown && (
            <CooldownOverlay
              animate={{ "--cooldown-percent": cooldownProgress } as Record<string, number>}
              transition={{ duration: 0.95, ease: "linear" }}
              style={{
                "--cooldown-percent": cooldownProgress,
              } as React.CSSProperties}
            >
              <CooldownText>{Math.ceil(remainingCooldown)}</CooldownText>
            </CooldownOverlay>
          )}

          {/* Cast Bar (Framer Motion Smooth Transition) */}
          {isCasting && (
            <CastBar>
              <CastProgress
                animate={{ width: `${castProgress * 100}%` }}
                transition={{ duration: 0.95, ease: "linear" }}
                style={{ width: `${castProgress * 100}%` }}
              />
            </CastBar>
          )}
        </>
      )}
    </Slot>
  );
};

export default EquipmentSlot;

const Slot = styled(motion.div)<{ $isCasting?: boolean; $isEmpty?: boolean; $isAttacking?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 50px;
  aspect-ratio: 1/1;
  border: 1px solid ${(props) => (props.$isCasting ? "#00f0ff" : "rgb(33, 33, 33)")};
  background-color: ${(props) => (props.$isEmpty ? "rgba(15, 15, 15, 0.4)" : "rgb(22, 22, 22)")};
  border-radius: 16px;
  color: #ecf0f1;
  touch-action: none;
  overflow: visible;
  box-shadow: ${(props) =>
    props.$isCasting
      ? "0 0 12px rgba(0, 240, 255, 0.5), inset 0 0 6px rgba(0, 240, 255, 0.3)"
      : "none"};
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  cursor: grab;

  &:active {
    cursor: grabbing;
  }

  &:hover {
    border-color: ${(props) => (props.$isEmpty ? "rgb(33, 33, 33)" : "#ff716c")};
    box-shadow: ${(props) => (props.$isEmpty ? "none" : "0 0 8px rgba(255, 113, 108, 0.3)")};
  }
`;

const WeaponNameLabel = styled.span`
  position: absolute;
  bottom: 3px;
  font-size: 7px;
  color: #85adff;
  max-width: 90%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  pointer-events: none;
`;

const CooldownOverlay = styled(motion.div)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 15px;
  background: conic-gradient(
    rgba(0, 0, 0, 0.75) calc(var(--cooldown-percent, 0) * 360deg), 
    rgba(0, 0, 0, 0.3) 0deg
  );
  pointer-events: none;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2;
`;

const CooldownText = styled.span`
  color: #ff716c;
  font-size: 14px;
  font-weight: 800;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.9);
`;

const CastBar = styled.div`
  position: absolute;
  bottom: 4px;
  left: 6px;
  right: 6px;
  height: 3px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 1.5px;
  overflow: hidden;
  z-index: 3;
`;

const CastProgress = styled(motion.div)`
  height: 100%;
  background: linear-gradient(to right, #00f0ff, #0077ff);
  box-shadow: 0 0 4px #00f0ff;
`;

const TooltipLabel = styled.div`
  display: none;
  position: absolute;
  bottom: 105%;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(10, 10, 10, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 10px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 100;
  color: white;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);

  ${Slot}:hover & {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
`;

const TooltipStats = styled.div`
  display: flex;
  gap: 8px;
  color: #adaaaa;
  font-size: 8px;
  margin-top: 2px;
`;
