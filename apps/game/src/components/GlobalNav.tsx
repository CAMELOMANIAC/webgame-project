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

  return (
    <Container className="global-nav">
      <Link to="/field" viewTransition={location.pathname !== "/field"}>
        {location.pathname === "/field" && !tab ? (
          <>
            <Highlight layoutId="highlight" />
            <IconWrapper>
              <FieldFillIcon />
            </IconWrapper>
          </>
        ) : (
          <IconWrapper>
            <FieldLineIcon />
          </IconWrapper>
        )}
      </Link>

      <Link
        to="."
        from="/field"
        search={(prev: AnyRouter) => ({ ...prev, tab: "backpack" })}
        viewTransition={location.pathname !== "/field"}
      >
        {tab === "backpack" ? (
          <>
            <Highlight layoutId="highlight" />
            <IconWrapper>
              <BackpackFillIcon />
            </IconWrapper>
          </>
        ) : (
          <IconWrapper>
            <BackpackLineIcon />
          </IconWrapper>
        )}
      </Link>

      <Link to="/field/quest" viewTransition>
        {location.pathname === "/field/quest" ? (
          <>
            <Highlight layoutId="highlight" />
            <IconWrapper>
              <RadioFillIcon />
            </IconWrapper>
          </>
        ) : (
          <IconWrapper>
            <RadioLineIcon />
          </IconWrapper>
        )}
      </Link>

      <Link to="/field/user" viewTransition>
        {location.pathname === "/field/user" ? (
          <>
            <Highlight layoutId="highlight" />
            <IconWrapper>
              <UserFillIcon />
            </IconWrapper>
          </>
        ) : (
          <IconWrapper>
            <UserLineIcon />
          </IconWrapper>
        )}
      </Link>
    </Container>
  );
};

export default GlobalNav;

const Container = styled.nav`
  display: flex;
  justify-content: space-between;
  bottom: 0;
  position: sticky;
  width: 100%;
  height: 84px;
  padding: 16px 48px 24px 48px;
  color: #adaaaa;
`;

const Highlight = styled(motion.div)`
  position: absolute;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  z-index: -1;
  display: flex;
  align-items: center;

  background: #74a4ff;
  box-shadow: 0px 0px 15px rgba(133, 173, 255, 0.5);
`;

const IconWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
`;

const FieldFillIcon = styled(RiMap2Fill)`
  width: 18px;
  height: 18px;
  color: white;
`;

const FieldLineIcon = styled(RiMap2Line)`
  width: 18px;
  height: 18px;
`;

const BackpackFillIcon = styled(MdBackpack)`
  width: 18px;
  height: 18px;
  color: white;
`;

const BackpackLineIcon = styled(MdOutlineBackpack)`
  width: 18px;
  height: 18px;
`;

const RadioFillIcon = styled(BiSolidRadio)`
  width: 18px;
  height: 18px;
  color: white;
`;

const RadioLineIcon = styled(BiRadio)`
  width: 18px;
  height: 18px;
`;

const UserFillIcon = styled(FaCircleUser)`
  width: 18px;
  height: 18px;
  color: white;
`;

const UserLineIcon = styled(FaRegCircleUser)`
  width: 18px;
  height: 18px;
`;
