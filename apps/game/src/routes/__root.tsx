import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";

import DevelopmentAccountGate from "@/components/common/DevelopmentAccountGate";
import GlobalNav from "@/components/common/GlobalNav";

import * as styles from "./__root.css";

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RouteComponent,
});

type RouterContext = {
  moveDirection: "left" | "right";
};

function RouteComponent() {
  return (
    <main className={styles.main}>
      <DevelopmentAccountGate>
        <div className={`${styles.outletWrapper} content-container`}>
          <Outlet />
        </div>
        <GlobalNav />
      </DevelopmentAccountGate>
    </main>
  );
}
