import { AnimatePresence, motion } from "motion/react";
import React from "react";
import styled from "styled-components";

import type { BattleEvent } from "../utils/simulateBattle.types";
import type { PlayerLiveState } from "../utils/useBattlePlayer";

interface BattlePlayerProps {
  player: PlayerLiveState;
  damageEvents: BattleEvent[];
  isEnemy?: boolean;
}

export const BattlePlayer: React.FC<BattlePlayerProps> = ({ player, damageEvents, isEnemy = false }) => {
  const lastDamageEventId = damageEvents.length > 0 ? damageEvents[damageEvents.length - 1].id : null;
  const hpPercent = (player.currentHp / player.maxHp) * 100;
  const staminaPercent = (player.currentStamina / player.maxStamina) * 100;
  const weightPercent = (player.weight / player.maxWeight) * 100;

  return (
    <PlayerCard $isDead={player.isDead}>
      <PlayerHeader>
        <StatusIcons>
          {player.isDead && <span>💀</span>}
          {isEnemy && !player.isDead && <span>👿</span>}
          {!isEnemy && !player.isDead && <span>🛡️</span>}
        </StatusIcons>
        <PlayerInfo>
          <PlayerName>{player.id}</PlayerName>
          <DayBadge>Day {player.day}</DayBadge>
        </PlayerInfo>
      </PlayerHeader>

      <AvatarSection>
        <motion.div
          key={lastDamageEventId}
          animate={lastDamageEventId ? { x: [0, -10, 10, -10, 0] } : {}}
          transition={{ duration: 0.2 }}
        >
          <Avatar $isEnemy={isEnemy} $isDead={player.isDead}>
            {player.isDead ? "💀" : (isEnemy ? "👾" : "🦸")}
          </Avatar>
        </motion.div>

        <AnimatePresence>
          {damageEvents.map((e, idx) => (
            <DamageText
              key={`${e.id}-${idx}`}
              initial={{ opacity: 0, y: 0, scale: 0.5 }}
              animate={{ opacity: 1, y: -60, scale: 1.2 }}
              exit={{ opacity: 0 }}
            >
              {e.type === "DAMAGE" && `-${e.amount}`}
            </DamageText>
          ))}
        </AnimatePresence>
      </AvatarSection>

      <StatsContainer>
        {/* HP Bar */}
        <StatRow>
          <BarContainer>
            <HpBarFill 
              $percent={hpPercent} 
              initial={{ width: "100%" }} 
              animate={{ width: `${hpPercent}%` }} 
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
            />
          </BarContainer>
          <BarLabel>
            HP <span>{Math.ceil(player.currentHp)} / {player.maxHp}</span>
          </BarLabel>
        </StatRow>

        {/* Stamina Bar */}
        <StatRow>
          <BarContainer>
            <StaminaBarFill 
              $percent={staminaPercent} 
              initial={{ width: "100%" }} 
              animate={{ width: `${staminaPercent}%` }} 
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
            />
          </BarContainer>
          <BarLabel>
            STAMINA <span>{Math.ceil(player.currentStamina)} / {player.maxStamina}</span>
          </BarLabel>
        </StatRow>

        {/* Weight Bar */}
        <StatRow>
          <BarContainer style={{ height: "4px" }}>
            <WeightBarFill 
              $percent={weightPercent} 
              animate={{ width: `${weightPercent}%` }} 
            />
          </BarContainer>
          <BarLabel style={{ fontSize: "0.55rem" }}>
            WEIGHT <span>{player.weight} / {player.maxWeight} kg</span>
          </BarLabel>
        </StatRow>
      </StatsContainer>

      <WeaponInventory>
        {player.weapons.map((w, i) => {
          const cooldownRemaining = player.weaponCooldownRemaining[i];
          const isCooling = w ? cooldownRemaining > 0 : false;
          const isCastingThis = player.castingWeaponIndex === i;
          const castPercent = isCastingThis && w ? (1 - player.castingTicksRemaining / w.castTicks) * 100 : 0;
          const isActive = player.currentWeaponIndex === i && !player.isDead;
          
          return (
            <WeaponSlot 
              key={i} 
              $isCooling={isCooling} 
              $isActive={isActive}
              $isCasting={isCastingThis}
            >
              {w ? (
                <>
                  <WeaponIconText>{w.name.charAt(0)}</WeaponIconText>
                  {isCooling && (
                    <CooldownOverlay $percent={(cooldownRemaining / w.cooldownTicks) * 100} />
                  )}
                  {isCastingThis && (
                    <CastOverlay $percent={castPercent} />
                  )}
                  <Tooltip>
                    <strong>{w.name}</strong>
                    <br />
                    DMG: {w.damage} | ST: {w.staminaCost}
                    <br />
                    Cast: {w.castTicks} | CD: {w.cooldownTicks}
                    <br />
                    Weight: {w.weight}kg
                  </Tooltip>
                </>
              ) : (
                <WeaponIconText style={{ opacity: 0.1 }}>{i + 1}</WeaponIconText>
              )}
              {isActive && <ActiveIndicator layoutId={`active-${player.id}`} />}
            </WeaponSlot>
          );
        })}
      </WeaponInventory>
    </PlayerCard>
  );
};

const PlayerCard = styled(motion.div)<{ $isDead: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  width: 240px;
  opacity: ${(props) => (props.$isDead ? 0.6 : 1)};
  filter: ${(props) => (props.$isDead ? "grayscale(80%)" : "none")};
  transition: all 0.5s ease;
  padding: 1.25rem;
  background: rgba(30, 39, 46, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  position: relative;

  &:hover {
    border-color: rgba(52, 152, 219, 0.4);
  }
`;

const PlayerHeader = styled.div`
  display: flex;
  width: 100%;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding-bottom: 0.5rem;
`;

const PlayerInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
`;

const PlayerName = styled.div`
  font-weight: 800;
  font-size: 0.85rem;
  color: #ecf0f1;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const DayBadge = styled.div`
  font-size: 0.6rem;
  color: #3498db;
  font-weight: 700;
`;

const StatusIcons = styled.div`
  display: flex;
  gap: 4px;
  font-size: 1rem;
`;

const AvatarSection = styled.div`
  position: relative;
  margin: 0.25rem 0;
`;

const Avatar = styled.div<{ $isEnemy: boolean; $isDead: boolean }>`
  font-size: 3rem;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5));
`;

const StatsContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
`;

const StatRow = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const BarContainer = styled.div`
  width: 100%;
  height: 8px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 4px;
  overflow: hidden;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.5);
`;

const HpBarFill = styled(motion.div)<{ $percent: number }>`
  height: 100%;
  background: ${(props) =>
    props.$percent > 60
      ? "linear-gradient(90deg, #2ecc71, #27ae60)"
      : props.$percent > 30
      ? "#f1c40f"
      : "#e74c3c"};
`;

const StaminaBarFill = styled(motion.div)<{ $percent: number }>`
  height: 100%;
  background: linear-gradient(90deg, #3498db, #2980b9);
`;

const WeightBarFill = styled(motion.div)<{ $percent: number }>`
  height: 100%;
  background: #95a5a6;
`;

const BarLabel = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.6rem;
  font-weight: 700;
  color: #7f8c8d;
  text-transform: uppercase;

  span {
    color: #ecf0f1;
  }
`;

const DamageText = styled(motion.div)`
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 1.8rem;
  font-weight: 900;
  color: #ff5252;
  text-shadow: 0 0 10px rgba(255, 82, 82, 0.5);
  z-index: 10;
`;

const WeaponInventory = styled.div`
  display: flex;
  gap: 6px;
  justify-content: center;
  width: 100%;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
`;

const WeaponSlot = styled.div<{ $isCooling: boolean; $isActive: boolean; $isCasting?: boolean }>`
  width: 32px;
  height: 32px;
  background: ${(props) => (props.$isActive ? "rgba(52, 152, 219, 0.2)" : "rgba(0, 0, 0, 0.3)")};
  border: 1px solid ${(props) => 
    props.$isCasting ? "#e67e22" : (props.$isActive ? "#3498db" : "rgba(255,255,255,0.1)")};
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  position: relative;
  overflow: hidden;
  transition: all 0.2s ease;
  
  ${(props) => props.$isActive && `
    box-shadow: 0 0 8px rgba(52, 152, 219, 0.4);
    transform: scale(1.05);
  `}

  ${(props) => props.$isCasting && `
    box-shadow: 0 0 8px rgba(230, 126, 34, 0.6);
    transform: scale(1.1);
  `}
`;

const WeaponIconText = styled.div`
  font-size: 0.7rem;
  font-weight: 800;
  z-index: 2;
  color: #ecf0f1;
`;

const Tooltip = styled.div`
  position: absolute;
  bottom: 110%;
  left: 50%;
  transform: translateX(-50%);
  background: #000;
  color: #fff;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 0.6rem;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
  z-index: 20;
  border: 1px solid #333;
  line-height: 1.4;

  ${WeaponSlot}:hover & {
    opacity: 1;
  }
`;

const CooldownOverlay = styled.div.attrs<{ $percent: number }>((props) => ({
  style: {
    height: `${props.$percent}%`,
  },
}))<{ $percent: number }>`
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  background: rgba(243, 156, 18, 0.3);
  z-index: 1;
`;

const CastOverlay = styled.div.attrs<{ $percent: number }>((props) => ({
  style: {
    height: `${props.$percent}%`,
  },
}))<{ $percent: number }>`
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  background: rgba(46, 204, 113, 0.5);
  z-index: 1;
  box-shadow: 0 0 10px rgba(46, 204, 113, 0.5);
`;

const ActiveIndicator = styled(motion.div)`
  position: absolute;
  inset: 0;
  border: 2px solid #3498db;
  border-radius: 4px;
  pointer-events: none;
  z-index: 3;
`;
