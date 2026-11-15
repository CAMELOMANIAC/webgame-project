import type { ReactNode } from "react";

import {
  SlotInteractionContext,
  type SlotInteractionContextValue,
} from "@/utils/hooks/useSlotInteraction";

export function SlotInteractionProvider({
  onInspectSlot,
  isClickSuppressed,
  children,
}: SlotInteractionContextValue & { children: ReactNode }) {
  return (
    <SlotInteractionContext.Provider
      value={{ onInspectSlot, isClickSuppressed }}
    >
      {children}
    </SlotInteractionContext.Provider>
  );
}
