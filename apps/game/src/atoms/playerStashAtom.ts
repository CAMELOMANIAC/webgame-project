import { type Item } from "@webgame/types";
import { atom } from "jotai";

/**
 * 플레이어가 현재 보유하고 있는 아이템 (창고)
 */
export const playerStashAtom = atom<Item[]>([]);
