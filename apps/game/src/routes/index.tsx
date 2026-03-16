import { createFileRoute, Link } from "@tanstack/react-router";
import styled from "styled-components";

import { BattleScene } from "../components/BattleScene";
import Inventory from "../components/inventory/Inventory";
import SideBar from "../components/sideBar/SideBar";

export const Route = createFileRoute("/")({
  component: () => <RouteComponent />,
});

function RouteComponent() {
  return (
    <PageContainer>
      <SideBar />
      <MainContent>
        <ScrollArea>
          <BattleScene />
          <InventorySection>
             <Inventory />
          </InventorySection>
        </ScrollArea>
        <DebugLink to="/testpage/">
          ⚙️ SYSTEM CALIBRATION
        </DebugLink>
      </MainContent>
    </PageContainer>
  );
}

const PageContainer = styled.div`
  display: flex;
  flex-direction: row;
  height: 100vh;
  width: 100%;
  background-color: #0f141a;
  overflow: hidden;
`;

const MainContent = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  position: relative;
  height: 100%;
`;

const ScrollArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  align-items: center;

  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
  }
`;

const InventorySection = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  padding-bottom: 2rem;
`;

const DebugLink = styled(Link)`
  position: absolute;
  bottom: 20px;
  right: 20px;
  color: #576574;
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 2px;
  text-transform: uppercase;
  transition: all 0.2s ease;
  z-index: 100;
  text-decoration: none;
  background: rgba(0, 0, 0, 0.2);
  padding: 8px 16px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.05);

  &:hover {
    color: #ecf0f1;
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
  }
`;
