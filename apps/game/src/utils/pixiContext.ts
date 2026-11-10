import type { Container } from "pixi.js";
import { createContext, useContext } from "react";

export const PixiParentContext = createContext<Container | null>(null);

export function usePixiParent(): Container | null {
  return useContext(PixiParentContext);
}
