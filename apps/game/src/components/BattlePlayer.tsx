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

  return (
    <PlayerCard>
      <div style={{ position: "relative" }}>
        <motion.div
          key={lastDamageEventId}
          animate={lastDamageEventId ? { x: [0, -10, 10, -10, 0] } : {}}
          transition={{ duration: 0.2 }}
        >
          <div style={{ fontSize: "3rem" }}>{isEnemy ? "👾" : "🛡️"}</div>
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

      <div>{player.id}</div>

      <HpBarContainer>
        <HpBarFill $percent={hpPercent} initial={{ width: "100%" }} animate={{ width: `${hpPercent}%` }} />
      </HpBarContainer>
      <div style={{ fontSize: "0.8rem" }}>
        {Math.ceil(player.currentHp)} / {player.maxHp}
      </div>

      <div style={{ display: "flex", gap: "5px" }}>
        {player.weapons.map(
          (w, i) =>
            w && (
              <WeaponSlot key={i} $isCooling={player.weaponCooldownRemaining[i] > 0}>
                {w.name}
              </WeaponSlot>
            ),
        )}
      </div>
    </PlayerCard>
  );
};

const PlayerCard = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  width: 200px;
`;

const HpBarContainer = styled.div`
  width: 100%;
  height: 20px;
  background: #444;
  border-radius: 10px;
  overflow: hidden;
  border: 2px solid #000;
`;

const HpBarFill = styled(motion.div)<{ $percent: number }>`
  height: 100%;
  background: ${(props) => (props.$percent > 30 ? "#4caf50" : "#f44336")};
  width: ${(props) => props.$percent}%;
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
  width: 50px;
  height: 50px;
  background: #333;
  border: 2px solid ${(props) => (props.$isCooling ? "#ff9800" : "#fff")};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  opacity: ${(props) => (props.$isCooling ? 0.5 : 1)};
`;
