import { type User } from "@webgame/types";
import { atom } from "jotai";

/**
 * 전투에 참여할 플레이어 목록 (아군 및 적군)
 */
export const battleUsersAtom = atom<User[] | null>(null);
