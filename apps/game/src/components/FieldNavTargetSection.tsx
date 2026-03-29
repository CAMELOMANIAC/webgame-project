import { LuRefreshCw } from "react-icons/lu";
import { TbLocation } from "react-icons/tb";
import styled from "styled-components";

import { FieldWidget } from "@/components/Commons";

const FieldNavTargetSection = () => {
  return (
    <Container>
      <Row $flexGrow={0}>
        <Column $flexGrow={1}>
          <SubTitle>NAVIGATION TARGET</SubTitle>
          <DestinationText>EXTRACTION ZONE</DestinationText>
          <DestinationText>ALPHA</DestinationText>
          <HighlightText>
            <TbLocation />
            &nbsp;Moving to Destination
          </HighlightText>
        </Column>
        <Column $flexGrow={0}>
          <ChangeTarget>
            <LuRefreshCw />
          </ChangeTarget>
        </Column>
      </Row>
      <Row $flexGrow={0} $gap={"8px"}>
        <TimeContainer>
          <TimeText>13:01</TimeText>
          <SubLabel>CUR. TIME</SubLabel>
        </TimeContainer>
        <TimeContainer>
          <TimeText $color={"#85adff"}>15</TimeText>
          <SubLabel>DURATION</SubLabel>
        </TimeContainer>
        <TimeContainer>
          <TimeText>13:01</TimeText>
          <SubLabel>EXP. TIME</SubLabel>
        </TimeContainer>
      </Row>
    </Container>
  );
};

export default FieldNavTargetSection;

const Container = styled(FieldWidget)`
  height: auto;
  width: 100%;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
  padding: 24px;
  flex: 0;
  gap: 16px;
`;

type flexGrowProps = {
  $flexGrow?: number;
  $gap?: string;
};
const Column = styled.div<flexGrowProps>`
  display: flex;
  flex-direction: column;
  flex-grow: ${(props) => props.$flexGrow ?? 1};
  gap: ${(props) => props.$gap ?? 0};
  width: auto;
`;

const Row = styled.div<flexGrowProps>`
  display: flex;
  flex-direction: row;
  flex-grow: ${(props) => props.$flexGrow ?? 1};
  gap: ${(props) => props.$gap ?? 0};
  width: 100%;
  height: auto;
`;

const ChangeTarget = styled.button`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  width: 40px;
  aspect-ratio: 1/1;
  border-radius: 50%;
  background-color: #252525;
`;

const SubTitle = styled.h3`
  font-size: 10px;
  font-weight: 300;
  color: #adaaaa;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0 0 5px;
`;

const HighlightText = styled.p`
  color: #85adff;
  font-weight: 300;
  font-size: 12px;
  padding-top: 5px;
`;

const TimeContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: #131212;
  width: 100%;
  height: auto;
  border-radius: 16px;
  padding: 12px;
`;

type timeTextProps = {
  $color?: string;
};
const TimeText = styled.p<timeTextProps>`
  color: ${(props) => props.$color ?? `white`};
  font-weight: 600;
  font-size: 18px;
  padding: 0 0 5px 0;
`;

const SubLabel = styled.label`
  color: #adaaaa;
  font-weight: 300;
  font-size: 9px;
`;

const DestinationText = styled.strong`
  color: white;
  font-weight: 800;
  font-size: 20px;
`;
