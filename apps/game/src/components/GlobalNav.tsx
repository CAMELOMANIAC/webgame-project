import { type AnyRouter, Link, useLocation, useSearch } from "@tanstack/react-router";
import { motion } from "motion/react";
import { BiRadio, BiSolidRadio } from "react-icons/bi";
import { FaCircleUser, FaRegCircleUser } from "react-icons/fa6";
import { MdBackpack, MdOutlineBackpack } from "react-icons/md";
import { RiMap2Fill, RiMap2Line } from "react-icons/ri";
import styled from "styled-components";

const GlobalNav = () => {
  const location = useLocation();
  const { tab } = useSearch({ strict: false });

  const isFieldMap = location.pathname === "/field" && !tab;
  const isBackpack = tab === "backpack";
  const isQuest = location.pathname === "/field/quest";
  const isUser = location.pathname === "/field/user";

  return (
    <StyledNavContainer aria-label="하단 글로벌 내비게이션">
      <Link to="/field" viewTransition={location.pathname !== "/field"}>
        {isFieldMap && <StyledActivePill layoutId="highlight" />}
        <StyledNavItem $active={isFieldMap}>
          {isFieldMap ? <StyledFieldFillIcon /> : <StyledFieldLineIcon />}
          <StyledNavLabel>
            <StyledNavIndex>01</StyledNavIndex>전술지도
          </StyledNavLabel>
        </StyledNavItem>
      </Link>

      <Link
        to="."
        from="/field"
        search={(prev: AnyRouter) => ({ ...prev, tab: "backpack" })}
        viewTransition={location.pathname !== "/field"}
      >
        {isBackpack && <StyledActivePill layoutId="highlight" />}
        <StyledNavItem $active={isBackpack}>
          {isBackpack ? <StyledBackpackFillIcon /> : <StyledBackpackLineIcon />}
          <StyledNavLabel>
            <StyledNavIndex>02</StyledNavIndex>가방
          </StyledNavLabel>
        </StyledNavItem>
      </Link>

      <Link to="/field/quest" viewTransition>
        {isQuest && <StyledActivePill layoutId="highlight" />}
        <StyledNavItem $active={isQuest}>
          {isQuest ? <StyledRadioFillIcon /> : <StyledRadioLineIcon />}
          <StyledNavLabel>
            <StyledNavIndex>03</StyledNavIndex>임무통신
          </StyledNavLabel>
        </StyledNavItem>
      </Link>

      <Link to="/field/user" viewTransition>
        {isUser && <StyledActivePill layoutId="highlight" />}
        <StyledNavItem $active={isUser}>
          {isUser ? <StyledUserFillIcon /> : <StyledUserLineIcon />}
          <StyledNavLabel>
            <StyledNavIndex>04</StyledNavIndex>거점정비
          </StyledNavLabel>
        </StyledNavItem>
      </Link>
    </StyledNavContainer>
  );
};

export default GlobalNav;

const StyledNavContainer = styled.nav`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  bottom: 0;
  position: sticky;
  z-index: 30;
  width: 100%;
  height: 64px;
  padding: 8px 12px 12px;
  background-color: #0c0c0f;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  color: #71717a;

  a {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    border-radius: 6px;
  }
`;

const StyledActivePill = styled(motion.div)`
  position: absolute;
  inset: 0;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.14);
  z-index: 0;
`;

const StyledNavItem = styled.div<{ $active?: boolean }>`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  width: 100%;
  height: 100%;
  color: ${(props) => (props.$active ? "#fafafa" : "#71717a")};
  transition: color 0.15s ease;
`;

const StyledNavLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  letter-spacing: -0.01em;
  display: flex;
  align-items: center;
  gap: 3px;
`;

const StyledNavIndex = styled.span`
  font-family: var(--font-mono);
  font-size: 10px;
  opacity: 0.65;
  font-variant-numeric: tabular-nums;
`;

const StyledFieldFillIcon = styled(RiMap2Fill)`
  width: 16px;
  height: 16px;
  color: #fafafa;
`;

const StyledFieldLineIcon = styled(RiMap2Line)`
  width: 16px;
  height: 16px;
`;

const StyledBackpackFillIcon = styled(MdBackpack)`
  width: 16px;
  height: 16px;
  color: #fafafa;
`;

const StyledBackpackLineIcon = styled(MdOutlineBackpack)`
  width: 16px;
  height: 16px;
`;

const StyledRadioFillIcon = styled(BiSolidRadio)`
  width: 16px;
  height: 16px;
  color: #fafafa;
`;

const StyledRadioLineIcon = styled(BiRadio)`
  width: 16px;
  height: 16px;
`;

const StyledUserFillIcon = styled(FaCircleUser)`
  width: 15px;
  height: 15px;
  color: #fafafa;
`;

const StyledUserLineIcon = styled(FaRegCircleUser)`
  width: 15px;
  height: 15px;
`;
