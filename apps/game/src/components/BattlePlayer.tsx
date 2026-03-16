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

  return (
    <PlayerCard $isDead={player.isDead}>
      <PlayerHeader>
        <StatusIcons>
          {player.isDead && <span>💀</span>}
          {isEnemy && !player.isDead && <span>👿</span>}
          {!isEnemy && !player.isDead && <span>🛡️</span>}
        </StatusIcons>
        <PlayerName>{player.id}</PlayerName>
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
            ST <span>{Math.ceil(player.currentStamina)} / {player.maxStamina}</span>
          </BarLabel>
        </StatRow>
      </StatsContainer>

      <WeaponInventory>
        {player.weapons.map((w, i) => (
          <WeaponSlot key={i} $isCooling={w ? player.weaponCooldownRemaining[i] > 0 : false}>
            {w ? (
              <>
                <WeaponIconText>{w.name.charAt(0)}</WeaponIconText>
                {player.weaponCooldownRemaining[i] > 0 && (
                  <CooldownOverlay $percent={(player.weaponCooldownRemaining[i] / w.cooldown) * 100} />
                )}
                <Tooltip>{w.name}</Tooltip>
              </>
            ) : (
              <WeaponIconText style={{ opacity: 0.2 }}>{i + 1}</WeaponIconText>
            )}
          </WeaponSlot>
        ))}
      </WeaponInventory>
    </PlayerCard>
  );
};

const PlayerCard = styled(motion.div)<{ $isDead: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  width: 220px;
  opacity: ${(props) => (props.$isDead ? 0.6 : 1)};
  filter: ${(props) => (props.$isDead ? "grayscale(80%)" : "none")};
  transition: all 0.5s ease;
  padding: 1.25rem;
  background: rgba(44, 62, 80, 0.8);
  border: 2px solid rgba(52, 152, 219, 0.3);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  position: relative;

  &:hover {
    transform: translateY(-5px);
    border-color: rgba(52, 152, 219, 0.6);
    background: rgba(44, 62, 80, 0.9);
  }
`;

const PlayerHeader = styled.div`
  display: flex;
  width: 100%;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 0.5rem;
`;

const PlayerName = styled.div`
  font-weight: 700;
  font-size: 0.9rem;
  color: #ecf0f1;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
`;

const StatusIcons = styled.div`
  display: flex;
  gap: 4px;
  font-size: 0.8rem;
`;

const AvatarSection = styled.div`
  position: relative;
  margin: 0.5rem 0;
`;

const Avatar = styled.div<{ $isEnemy: boolean; $isDead: boolean }>`
  font-size: 3.5rem;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5));
  transition: transform 0.3s ease;
  
  ${(props) => !props.$isDead && `
    animation: float 3s ease-in-out infinite;
    @keyframes float {
      0% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
      100% { transform: translateY(0px); }
    }
  `}
`;

const StatsContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const StatRow = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const BarContainer = styled.div`
  width: 100%;
  height: 10px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 5px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5);
`;

const HpBarFill = styled(motion.div)<{ $percent: number }>`
  height: 100%;
  background: ${(props) =>
    props.$percent > 60
      ? "linear-gradient(90deg, #27ae60, #2ecc71)"
      : props.$percent > 30
      ? "linear-gradient(90deg, #f39c12, #f1c40f)"
      : "linear-gradient(90deg, #c0392b, #e74c3c)"};
  box-shadow: 0 0 10px ${(props) => (props.$percent > 30 ? "rgba(46, 204, 113, 0.4)" : "rgba(231, 76, 60, 0.4)")};
`;

const StaminaBarFill = styled(motion.div)<{ $percent: number }>`
  height: 100%;
  background: linear-gradient(90deg, #2980b9, #3498db);
  box-shadow: 0 0 10px rgba(52, 152, 219, 0.4);
`;

const BarLabel = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.65rem;
  font-weight: 600;
  color: #bdc3c7;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  span {
    color: #ecf0f1;
  }
`;

const DamageText = styled(motion.div)`
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 2rem;
  font-weight: 900;
  color: #ff5252;
  text-shadow: 2px 2px 0px #000, 0 0 8px rgba(255, 82, 82, 0.6);
  pointer-events: none;
  white-space: nowrap;
`;

const WeaponInventory = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
  width: 100%;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const WeaponSlot = styled.div<{ $isCooling: boolean }>`
  width: 40px;
  height: 40px;
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid ${(props) => (props.$isCooling ? "#f39c12" : "rgba(255,255,255,0.2)")};
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  position: relative;
  overflow: hidden;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: scale(1.1);
  }
`;

const WeaponIconText = styled.div`
  font-size: 0.9rem;
  font-weight: bold;
  z-index: 2;
  color: #ecf0f1;
`;

const Tooltip = styled.div`
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: #000;
  color: #fff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.6rem;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
  z-index: 10;

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
  background: rgba(243, 156, 18, 0.4);
  z-index: 1;
`;
