import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import styled from "styled-components";

import DevelopmentAccountGate from "@/components/DevelopmentAccountGate";
import GlobalNav from "@/components/GlobalNav";

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RouteComponent,
});

type RouterContext = {
  moveDirection: "left" | "right";
};

function RouteComponent() {
  return (
    <Main>
      <DevelopmentAccountGate>
        <OutletWrapper className="content-container">
          <Outlet />
        </OutletWrapper>
        <GlobalNav />
      </DevelopmentAccountGate>
    </Main>
  );
}

const Main = styled.main`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  align-items: center;
  justify-content: flex-start;
  position: relative;

  width: 100%;
  height: 100%;

  overflow-x: hidden;
`;

const OutletWrapper = styled.div`
  /* display: "inherit";
  flex: "inherit";
  flex-direction: "inherit";
  align-items: "inherit";
  justify-content: "inherit";
  position: "inherit";
  width: "inherit";
  height: "inherit"; */

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 100%;
  flex: 1;
  min-height: 0;
  overflow: hidden;
`;
