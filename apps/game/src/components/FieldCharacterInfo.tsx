import { useAtomValue } from "jotai";
import { useMemo } from "react";
import styled from "styled-components";

import { battleLogAtom, currentTimeAtom, flattenedTimelineAtom } from "@/atoms/globalAtom";
import { FieldWidget } from "@/components/Commons";
import { useGetCharacter } from "@/utils/hooks/useGetCharacter";

import portrait from "../assets/portrait.png";

const FieldCharacterInfo = () => {
  const battleLog = useAtomValue(battleLogAtom);
  const events = useAtomValue(flattenedTimelineAtom);
  const currentTime = useAtomValue(currentTimeAtom);
  const { data: characterData } = useGetCharacter();

  const stats = useMemo(() => {
    // 1. 전투 중인 경우 로그 기반 계산
    if (battleLog) {
      const player = battleLog.initialState.players[0];
      let hp = player.hp;
      let stamina = player.stamina;

      const activeEvents = events.filter((e) => e.timestamp <= currentTime);

      for (const event of activeEvents) {
        if ((event.type === "DAMAGE" || event.type === "HEAL") && event.targetId === player.id) {
          hp = event.remainingHp;
        }
        if (event.type === "STAMINA_CHANGE" && event.playerId === player.id) {
          stamina = event.currentStamina;
        }
      }
      return { hp, stamina, maxHp: player.maxHp, maxStamina: player.maxStamina, name: player.name };
    }

    // 2. 평상시 상태 (Character API 활용)
    if (characterData) {
      return {
        hp: characterData.raw.hp,
        stamina: characterData.raw.stamina,
        maxHp: characterData.raw.maxHp,
        maxStamina: characterData.raw.maxStamina,
        name: characterData.raw.name,
      };
    }

    return null;
  }, [battleLog, events, currentTime, characterData]);

  if (!stats) return null;

  return (
    <Container>
      <Row>
        <PortraitContainer>
          <img src={portrait} />
        </PortraitContainer>
        <Column>
          <CharacterName>{stats.name}</CharacterName>
          <StatusText>STATUS: {battleLog ? (stats.hp <= 0 ? "DEFEATED" : "IN COMBAT") : "NORMAL"}</StatusText>
        </Column>
      </Row>
      <Column>
        <HPLabelContainer>
          <HPLabel>VITALITY (HP)</HPLabel>
          <HPText>{stats.hp}/{stats.maxHp}</HPText>
        </HPLabelContainer>
        <HPContainer $percent={(stats.hp / stats.maxHp) * 100} />
      </Column>
      <Column>
        <HPLabelContainer>
          <HPLabel>STAMINA</HPLabel>
          <HPText>{stats.stamina}/{stats.maxStamina}</HPText>
        </HPLabelContainer>
        <HPContainer $percent={(stats.stamina / stats.maxStamina) * 100} />
      </Column>
    </Container>
  );
};

export default FieldCharacterInfo;

const Container = styled(FieldWidget)`
  flex: 1;
  flex-direction: column;
  gap: 12px;
`;

const Row = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  height: 100%;
  gap: 12px;
`;

const Column = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
  width: 100%;
  height: 100%;
  gap: 6px;
`;

const PortraitContainer = styled.div`
  width: 46px;
  aspect-ratio: 1/1;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
`;

const CharacterName = styled.p`
  font-size: 12px;
  font-weight: 600;
  color: white;
`;

const HPContainer = styled.div<{ $percent: number }>`
  width: 100%;
  height: 6px;
  border-radius: 6px;
  background-color: black;
  position: relative;
  &::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: ${(props) => props.$percent}%;
    background-color: #ff716c;
    border-radius: 6px;
    transition: width 0.3s ease;
  }
`;

const HPLabelContainer = styled.div`
  width: 100%;
  height: auto;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const HPLabel = styled.p`
  font-size: 8px;
  font-weight: 300;
  color: #adaaaa;
`;

const HPText = styled.p`
  font-size: 12px;
  font-weight: 600;
  color: white;
`;

const StatusText = styled.p`
  font-size: 10px;
  font-weight: 300;
  color: #85adff;
`;
