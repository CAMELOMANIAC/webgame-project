import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { Page } from "../../components/Commons";
import Inventory from "../../components/inventory/Inventory";

export const Route = createFileRoute("/testpage/")({
  component: RouteComponent,
});
function RouteComponent() {
  const [isShow, setIsShow] = useState<boolean>(false);
  const xOffset = "20%";
  return (
    <Page>
      <button onClick={() => window.history.back()}>back</button>
      <button onClick={() => setIsShow((prev) => !prev)}>toggle</button>

      <Inventory />
      <AnimatePresence initial={false}>
        {isShow && (
          <motion.div
            key="contentA"
            initial={{ opacity: 0, x: xOffset }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: xOffset }}
            transition={{ duration: 2 }}
            style={{ position: "absolute" }}
          >
            <div>123123</div>
          </motion.div>
        )}
        {!isShow && (
          <motion.div
            key="contentB"
            initial={{ opacity: 0, x: xOffset }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: xOffset }}
            transition={{ duration: 2 }}
            style={{ position: "absolute" }}
          >
            <div>가나다라</div>
          </motion.div>
        )}
      </AnimatePresence>
    </Page>
  );
}
