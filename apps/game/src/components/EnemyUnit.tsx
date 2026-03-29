import styled from "styled-components";

interface EnemyUnitProps {
  name: string;
  left: string;
  top: string;
}
const EnemyUnit = ({ name, left, top }: EnemyUnitProps) => {
  return (
    <Container $left={left} $top={top}>
      <Unit />
      <NameLabel>{name}</NameLabel>
    </Container>
  );
};

export default EnemyUnit;

type ContainerProps = {
  $left: string;
  $top: string;
};
const Container = styled.div<ContainerProps>`
  display: flex;
  position: fixed;
  left: ${(props) => props.$left};
  top: ${(props) => props.$top};
`;

const Unit = styled.div`
  width: 10px;
  height: 10px;

  background: #ff716c;
  box-shadow: 0px 0px 8px rgba(255, 113, 108, 0.9);
  border-radius: 50%;
`;

const NameLabel = styled.label`
  position: absolute;
  font-size: 8px;
  border-radius: 4px;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  font-weight: 300;
  color: #ff716c;
  background-color: black;
  white-space: nowrap;
`;
