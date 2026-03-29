import styled from "styled-components";

import { FieldWidget } from "@/components/Commons";

const CombatInfo = () => {
  return (
    <Container>
      <FieldWidget>
        <SubTitle>BATTLE LOG</SubTitle>
      </FieldWidget>
      ;
    </Container>
  );
};

export default CombatInfo;

const Container = styled.div``;

const SubTitle = styled.h3`
  font-size: 10px;
  font-weight: 300;
  color: #adaaaa;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0 0 5px;
`;
