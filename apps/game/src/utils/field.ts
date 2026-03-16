export type RoomType = "BATTLE" | "EXTRACTION" | "STORY" | "REST";

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  description: string;
  connectedRoomIds: string[];
}

export const fieldMap: Record<string, Room> = {
  "room_01": {
    id: "room_01",
    name: "Entry Point",
    type: "REST",
    description: "A safe place to prepare your journey.",
    connectedRoomIds: ["room_02", "room_03"]
  },
  "room_02": {
    id: "room_02",
    name: "Dark Corridor",
    type: "BATTLE",
    description: "You hear faint noises from the shadows.",
    connectedRoomIds: ["room_01", "room_04"]
  },
  "room_03": {
    id: "room_03",
    name: "Abandoned Store",
    type: "STORY",
    description: "Old data fragments are scattered everywhere.",
    connectedRoomIds: ["room_01", "room_05"]
  },
  "room_04": {
    id: "room_04",
    name: "Extraction Point A",
    type: "EXTRACTION",
    description: "Signal is strong here. You can escape.",
    connectedRoomIds: ["room_02"]
  },
  "room_05": {
    id: "room_05",
    name: "Deep Field",
    type: "BATTLE",
    description: "The air is heavy with ghost data.",
    connectedRoomIds: ["room_03", "room_04"]
  }
};
