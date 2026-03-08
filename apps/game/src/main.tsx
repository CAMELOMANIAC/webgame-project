import "./main.css";

import { createHashHistory, createRouter } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./app";
import { routeTree } from "./routeTree.gen";

const router = createRouter({
  routeTree,
  history: createHashHistory(),
  defaultNotFoundComponent: () => <div>Not Found</div>,
  context: { moveDirection: "right" },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App router={router} />
  </StrictMode>
);
