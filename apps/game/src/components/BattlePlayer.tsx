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

export const BattlePlayer: React.FC<BattlePlayerProps> = ({ player, damageEvents, isEnemy }) => {
  const lastDamageEventId = damageEvents.length > 0 ? damageEvents[damageEvents.length - 1].id : null;
  const hpPercent = (player.currentHp / player.maxHp) * 100;
  const staminaPercent = (player.currentStamina / player.maxStamina) * 100;

  return (
    <PlayerCard $isDead={player.isDead}>
      <div style={{ position: "relative" }}>
        <motion.div
          key={lastDamageEventId}
          animate={lastDamageEventId ? { x: [0, -10, 10, -10, 0] } : {}}
          transition={{ duration: 0.2 }}
        >
          <div style={{ fontSize: "3rem" }}>{player.isDead ? "💀" : (isEnemy ? "👾" : "🛡️")}</div>
        </motion.div>

        {/* 데미지 텍스트 애니메이션 */}
        <AnimatePresence>
          {damageEvents.map((e) => (
            <DamageText
              key={e.id}
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: 1, y: -50 }}
              exit={{ opacity: 0 }}
            >
              {e.type === "DAMAGE" && `-${e.amount}`}
            </DamageText>
          ))}
        </AnimatePresence>
      </div>

      <div style={{ fontWeight: "bold" }}>{player.id}</div>

      {/* HP 바 */}
      <div style={{ width: "100%" }}>
        <BarContainer>
          <HpBarFill $percent={hpPercent} initial={{ width: "100%" }} animate={{ width: `${hpPercent}%` }} />
        </BarContainer>
        <BarLabel>
          HP: {Math.ceil(player.currentHp)} / {player.maxHp}
        </BarLabel>
      </div>

      {/* 스태미너 바 */}
      <div style={{ width: "100%" }}>
        <BarContainer>
          <StaminaBarFill 
            $percent={staminaPercent} 
            initial={{ width: "100%" }} 
            animate={{ width: `${staminaPercent}%` }} 
          />
        </BarContainer>
        <BarLabel>
          ST: {Math.ceil(player.currentStamina)} / {player.maxStamina}
        </BarLabel>
      </div>

      <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", justifyContent: "center" }}>
        {player.weapons.map(
          (w, i) =>
            w && (
              <WeaponSlot key={i} $isCooling={player.weaponCooldownRemaining[i] > 0}>
                <WeaponName>{w.name}</WeaponName>
                {player.weaponCooldownRemaining[i] > 0 && (
                  <CooldownOverlay
                    $percent={(player.weaponCooldownRemaining[i] / w.cooldown) * 100}
                  />
                )}
              </WeaponSlot>
            ),
        )}
      </div>
    </PlayerCard>
  );
};

const PlayerCard = styled(motion.div)<{ $isDead: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8rem;
  width: 200px;
  opacity: ${(props) => (props.$isDead ? 0.5 : 1)};
  filter: ${(props) => (props.$isDead ? "grayscale(100%)" : "none")};
  transition: opacity 0.5s, filter 0.5s;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
`;

const BarContainer = styled.div`
  width: 100%;
  height: 12px;
  background: #333;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #000;
`;

const HpBarFill = styled(motion.div)<{ $percent: number }>`
  height: 100%;
  background: ${(props) => (props.$percent > 30 ? "#4caf50" : "#f44336")};
`;

const StaminaBarFill = styled(motion.div)<{ $percent: number }>`
  height: 100%;
  background: #2196f3;
`;

const BarLabel = styled.div`
  font-size: 0.7rem;
  text-align: right;
  margin-top: 2px;
  color: #ccc;
`;

const DamageText = styled(motion.div)`
  position: absolute;
  top: -40px;
  font-size: 1.5rem;
  font-weight: bold;
  color: #ff5252;
  text-shadow: 2px 2px 0px black;
  pointer-events: none;
`;

const WeaponSlot = styled.div<{ $isCooling: boolean }>`
  width: 45px;
  height: 45px;
  background: #222;
  border: 1px solid ${(props) => (props.$isCooling ? "#ff9800" : "#555")};
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  position: relative;
  overflow: hidden;
`;

const WeaponName = styled.div`
  font-size: 0.5rem;
  text-align: center;
  z-index: 2;
  color: #fff;
  padding: 2px;
  word-break: break-all;
`;

const CooldownOverlay = styled.div<{ $percent: number }>`
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: ${(props) => props.$percent}%;
  background: rgba(255, 152, 0, 0.4);
  z-index: 1;
`;
