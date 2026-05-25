import type { BattleEvent, BattleLog } from "@webgame/types";
import { atom } from "jotai";
import { atomWithReset } from "jotai/utils";

export const globalAtom = atomWithReset({
  counter: 0,
});

export const battleLogAtom = atom<BattleLog | null>(null);
export const flattenedTimelineAtom = atom<BattleEvent[]>([]);
export const processedEventsAtom = atom<BattleEvent[]>([]);
export const currentTimeAtom = atom<number>(0);
export const battleStatusAtom = atom<"idle" | "playing" | "finished">("idle");
export const displayEventsAtom = atom<BattleEvent[]>([]);
