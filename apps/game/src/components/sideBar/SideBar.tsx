import styled, { type CSSProperties } from "styled-components";

import Inventory from "../inventory/Inventory";
import HitPointBar from "./HitPointBar";
import WeaponList from "./WeaponList";

const SideBar = () => {
  return (
    <div style={paddingWrapperStyle}>
      <BoxContainer>
        <HitPointBar />
        <WeaponList />
        <Inventory />
      </BoxContainer>
    </div>
  );
};

const BoxContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;

  width: 20rem;
  height: 100%;
  padding: 0.5rem;
  border-radius: var(--border-radius);

  background-color: gray;

  color: white;

  > ul {
    width: 100%;
    padding: 0;

    list-style: none;
    > li {
      width: 100%;
      padding: 1rem;

      cursor: pointer;
    }
  }
`;

const paddingWrapperStyle: CSSProperties = {
  padding: "0.5rem",
  position: "relative",
  height: "100%",
};

export default SideBar;
