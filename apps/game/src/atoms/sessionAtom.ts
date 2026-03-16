import { atom } from "jotai";
import { fieldMap } from "../utils/field";

export interface SessionState {
  currentRoomId: string;
  day: number;
  isExtracted: boolean;
  isDead: boolean;
  collectedItems: string[];
}

const initialSession: SessionState = {
  currentRoomId: "room_01",
  day: 1,
  isExtracted: false,
  isDead: false,
  collectedItems: [],
};

export const sessionAtom = atom<SessionState>(initialSession);

// Derived atom for current room info
export const currentRoomAtom = atom((get) => {
  const session = get(sessionAtom);
  return fieldMap[session.currentRoomId];
});

// Action to move between rooms
export const moveRoomAtom = atom(
  null,
  (get, set, targetRoomId: string) => {
    const session = get(sessionAtom);
    const currentRoom = fieldMap[session.currentRoomId];
    
    if (currentRoom.connectedRoomIds.includes(targetRoomId)) {
      set(sessionAtom, {
        ...session,
        currentRoomId: targetRoomId,
        day: session.day + 1,
      });
    }
  }
);
