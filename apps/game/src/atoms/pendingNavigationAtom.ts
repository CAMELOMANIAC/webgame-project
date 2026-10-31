import { atomWithStorage, createJSONStorage } from "jotai/utils";

import type { NavigateRaidParams } from "@/utils/hooks/useNavigateRaid";

export interface PendingNavigation {
  actorUserId: string;
  params: NavigateRaidParams;
}

type PendingNavigations = Record<string, PendingNavigation>;

export const pendingNavigationAtom = atomWithStorage<PendingNavigations>(
  "webgame.pendingNavigations",
  {},
  createJSONStorage<PendingNavigations>(() => sessionStorage),
  { getOnInit: true },
);

export function pendingNavigationKey(
  userId: string | null | undefined,
  characterId: string | undefined,
) {
  return `${userId ?? ""}:${characterId ?? ""}`;
}
