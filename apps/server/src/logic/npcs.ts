import {
  type EnemyArchetype,
  getEnemyArchetypeById,
} from "@webgame/types";

const controlArchetype: EnemyArchetype =
  getEnemyArchetypeById("npc-hanlim-control")!;

export const hanlimNpcs = {
  control: {
    ...controlArchetype,
    id: "hanlim-control-a",
    weaponId: "hanlim-relief-carbine",
  },
} as const;
