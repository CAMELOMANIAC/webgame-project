import { atomWithReset } from "jotai/utils";

export const globalAtom = atomWithReset({
  counter: 0,
});
