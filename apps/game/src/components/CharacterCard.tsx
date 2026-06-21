import { motion } from "motion/react";
import { FaBolt, FaHeart, FaSignInAlt, FaWeightHanging } from "react-icons/fa";
import { GiBackpack } from "react-icons/gi";
import styled from "styled-components";

import type { CharacterResponse } from "@/utils/hooks/useGetCharacter";

interface CharacterCardProps {
  character: CharacterResponse | undefined;
  onRaidAction: () => void;
}

export function CharacterCard({ character, onRaidAction }: CharacterCardProps) {
  return (
    <CardContainer>
      <StatusBadge $raiding={character?.isRaiding}>
        {character?.isRaiding ? "IN ACTIVE RAID" : "STATIONED"}
      </StatusBadge>
      <AvatarCircle>
        <GiBackpack size={48} color="#74a4ff" />
      </AvatarCircle>
      <Nickname>{character?.user?.nickname || "Unknown"}</Nickname>
      <SubInfo>Ghost Extractor Class A</SubInfo>

      {/* 스탯 그리드 */}
      <StatGrid>
        <StatItem>
          <IconBox $color="#ff7162">
            <FaHeart size={14} />
          </IconBox>
          <div>
            <StatLabel>VITALITY (HP)</StatLabel>
            <StatValue>
              {character?.hp} / {character?.maxHp}
            </StatValue>
          </div>
        </StatItem>
        <StatItem>
          <IconBox $color="#ffbe76">
            <FaBolt size={14} />
          </IconBox>
          <div>
            <StatLabel>ENERGY (STAMINA)</StatLabel>
            <StatValue>
              {character?.stamina} / {character?.maxStamina}
            </StatValue>
          </div>
        </StatItem>
        <StatItem>
          <IconBox $color="#b8ffb9">
            <FaWeightHanging size={14} />
          </IconBox>
          <div>
            <StatLabel>LOAD LIMIT</StatLabel>
            <StatValue>
              {character?.weight} / {character?.maxWeight} kg
            </StatValue>
          </div>
        </StatItem>
      </StatGrid>

      {/* 탐사 시작/복귀 버튼 */}
      <ActionButton
        $raiding={character?.isRaiding}
        onClick={onRaidAction}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <FaSignInAlt style={{ marginRight: "8px" }} />
        {character?.isRaiding ? "RETURN TO ACTIVE RAID" : "LAUNCH EXPEDITION"}
      </ActionButton>
    </CardContainer>
  );
}

// Styled Components
const CardContainer = styled.div`
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  overflow: hidden;
`;

type StatusBadgeProps = {
  $raiding?: boolean;
};
const StatusBadge = styled.span<StatusBadgeProps>`
  position: absolute;
  top: 16px;
  right: 16px;
  font-size: 9px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 20px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  background: ${(props) =>
    props.$raiding ? "rgba(255, 113, 98, 0.15)" : "rgba(116, 164, 255, 0.15)"};
  color: ${(props) => (props.$raiding ? "#ff7162" : "#74a4ff")};
  border: 1px solid
    ${(props) => (props.$raiding ? "rgba(255, 113, 98, 0.3)" : "rgba(116, 164, 255, 0.3)")};
`;

const AvatarCircle = styled.div`
  width: 90px;
  aspect-ratio: 1/1;
  border-radius: 50%;
  background: rgba(116, 164, 255, 0.1);
  border: 1px solid rgba(116, 164, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 16px;
  margin-bottom: 20px;
  box-shadow: 0 10px 25px rgba(116, 164, 255, 0.15);
`;

const Nickname = styled.h2`
  font-size: 22px;
  font-weight: 700;
  color: white;
  margin: 0 0 4px;
`;

const SubInfo = styled.p`
  font-size: 12px;
  color: #adaaaa;
  margin: 0 0 32px;
`;

const StatGrid = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 32px;
`;

const StatItem = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 16px;
  padding: 12px 16px;
  border: 1px solid rgba(255, 255, 255, 0.04);
`;

type IconBoxProps = {
  $color: string;
};
const IconBox = styled.div<IconBoxProps>`
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: ${(props) => `${props.$color}1a`};
  color: ${(props) => props.$color};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const StatLabel = styled.p`
  font-size: 9px;
  font-weight: 500;
  color: #adaaaa;
  margin: 0 0 2px;
  letter-spacing: 0.5px;
`;

const StatValue = styled.p`
  font-size: 14px;
  font-weight: 700;
  color: white;
  margin: 0;
`;

type ActionButtonProps = {
  $raiding?: boolean;
};
const ActionButton = styled(motion.button)<ActionButtonProps>`
  width: 100%;
  height: 52px;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 700;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: none;
  background: ${(props) =>
    props.$raiding ? "linear-gradient(135deg, #ff7b72, #e05c54)" : "linear-gradient(135deg, #6c5ce7, #5345db)"};
  box-shadow: 0 10px 20px
    ${(props) => (props.$raiding ? "rgba(224, 92, 84, 0.25)" : "rgba(108, 92, 231, 0.25)")};
`;
