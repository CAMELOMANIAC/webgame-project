import type { BattleEvent, BattleLog } from "@webgame/types";
import { motion } from "motion/react";
import styled from "styled-components";

import compass from "@/assets/compass.svg";
import EnemyUnit from "@/components/EnemyUnit";

interface FieldBackgroundProps {
  isCombat: boolean;
  battleLog: BattleLog | null | undefined;
  enemyPositions: Map<string, { x: number; y: number }>;
  activeAttacks: BattleEvent[];
  characterNickname: string | undefined;
}

export function FieldBackground({
  isCombat,
  battleLog,
  enemyPositions,
  activeAttacks,
  characterNickname,
}: FieldBackgroundProps) {
  return (
    <BackgroundContainer>
      <CompassImage src={compass} />
      {isCombat &&
        battleLog?.initialState.players
          .filter(
            (p) =>
              p.teamId !== battleLog.initialState.players.find((player) => player.id === characterNickname)?.teamId,
          )
          .map((enemy) => {
            const pos = enemyPositions.get(enemy.id);
            if (!pos) return null;
            const isAttacking = activeAttacks.some((a) => a.type === "ATTACK" && a.actorId === enemy.id);
            return (
              <motion.div
                key={`enemy-${enemy.id}`}
                initial={false}
                animate={{
                  x: isAttacking ? (50 - pos.x) * 1.5 : 0,
                  y: isAttacking ? (50 - pos.y) * 1.5 : 0,
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                style={{ position: "absolute", left: `${pos.x}%`, top: `${pos.y}%`, zIndex: 10 }}
              >
                <EnemyUnit name={enemy.name} left="0" top="0" />
              </motion.div>
            );
          })}
      <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: -1 }}>
        {activeAttacks.map((attack) => {
          if (attack.type !== "ATTACK") return null;
          const actorPos = attack.actorId === characterNickname ? { x: 50, y: 50 } : enemyPositions.get(attack.actorId);
          const targetPos =
            attack.targetId === characterNickname ? { x: 50, y: 50 } : enemyPositions.get(attack.targetId);

          if (!actorPos || !targetPos) return null;

          return (
            <motion.line
              key={attack.id}
              x1={`${actorPos.x}%`}
              y1={`${actorPos.y}%`}
              x2={`${targetPos.x}%`}
              y2={`${targetPos.y}%`}
              stroke="#ff716c"
              strokeWidth="2"
              initial={{ pathLength: 0, opacity: 1 }}
              animate={{ pathLength: 1, opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
          );
        })}
      </svg>
    </BackgroundContainer>
  );
}

const CompassImage = styled.img`
  width: 48px;
  height: 48px;
  object-fit: contain;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
`;

const BackgroundContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  overflow: hidden;
`;
