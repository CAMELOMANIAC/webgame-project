import styled from "styled-components";

import { FieldWidget } from "@/components/Commons";

import portrait from "../assets/portrait.png";

const FieldCharacterInfo = () => {
  return (
    <Container>
      <Row>
        <PortraitContainer>
          <img src={portrait} />
        </PortraitContainer>
        <Column>
          <CharacterName>CHARACTER NAME</CharacterName>
          <StatusText>STATUS: NORMAL</StatusText>
        </Column>
      </Row>
      {/* <Column>asdf</Column> */}
      <Column>
        <HPLabelContainer>
          <HPLabel>VITALITY (HP)</HPLabel>
          <HPText>89</HPText>
        </HPLabelContainer>
        <HPContainer></HPContainer>
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

const HPContainer = styled.div`
  width: 100%;
  height: 6px;
  border-radius: 6px;
  background-color: black;
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
