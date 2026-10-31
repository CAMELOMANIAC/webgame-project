import { atomWithStorage } from "jotai/utils";

export const selectedUserIdAtom = atomWithStorage<string | null>(
  "webgame.devUserId",
  null,
  undefined,
  { getOnInit: true },
);
