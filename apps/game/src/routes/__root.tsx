import { createRootRouteWithContext, useMatch, useMatches } from "@tanstack/react-router";
import { AnimatePresence } from "motion/react";
import { useState } from "react";
import styled from "styled-components";

import AnimatedOutlet from "../components/AnimatedOutlet";

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RouteComponent,
});

type RouterContext = {
  moveDirection: "left" | "right";
};

function RouteComponent() {
  const matches = useMatches();
  const match = useMatch({ strict: false });
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  // 현재 매치 다음의 매치를 찾습니다. (새로 진입하는 라우트)
  const nextMatchIndex = matches.findIndex((d) => d.id === match.id) + 1;
  const nextMatch = matches[nextMatchIndex];

  return (
    <Main $isAnimating={isAnimating}>
      <AnimatePresence mode="popLayout">
        <AnimatedOutlet key={nextMatch.id} isAnimating={isAnimating} setIsAnimating={setIsAnimating} />
      </AnimatePresence>
    </Main>
  );
}

type MainProps = {
  $isAnimating: boolean;
};
const Main = styled.main<MainProps>`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  align-items: center;
  justify-content: flex-start;
  position: relative;

  width: 100%;
  height: 100%;

  overflow-x: hidden;
  /* ${(props) => (props.$isAnimating ? "hidden" : "auto")}; */
`;
