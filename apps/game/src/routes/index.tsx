import { createFileRoute, Link } from "@tanstack/react-router";
import type { CSSProperties } from "react";

import { BattleScene } from "../components/BattleScene";
import { Page } from "../components/Commons";
import Inventory from "../components/inventory/Inventory";
import SideBar from "../components/sideBar/SideBar";

export const Route = createFileRoute("/")({
  component: () => <RouteComponent />,
});

function RouteComponent() {
  return (
    <Page>
      <div style={divStyle}>
        {/* <SideBar /> */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: "20px", padding: "20px" }}>
          <BattleScene />
          {/* <Inventory /> */}
        </div>
        <Link to="/testpage/" style={linkStyle}>
          go to "/testpage/"
        </Link>
      </div>
    </Page>
  );
}

const linkStyle: CSSProperties = {
  position: "relative",
  top: "50px",
  left: "50px",
  color: "black",
  fontSize: "24px",
  fontWeight: "bold",
  zIndex: 1,
};

const divStyle: CSSProperties = {
  position: "relative",
  display: "flex",
  flexDirection: "row",
  height: "100%",
};
