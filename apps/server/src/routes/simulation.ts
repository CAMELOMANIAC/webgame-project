import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { simulateBattle } from "../logic/simulateBattle";

// 요청 데이터 스키마 정의
const WeaponSchema = z.object({
  id: z.string(),
  name: z.string(),
  damage: z.number().int().nonnegative(),
  staminaCost: z.number().int().nonnegative(),
  cooldownTicks: z.number().int().nonnegative(),
  castTicks: z.number().int().nonnegative(),
  weight: z.number().nonnegative(),
  value: z.number().nonnegative(),
  strategy: z.enum(["WEAKEST", "STRONGEST", "RANDOM"]).optional(),
  attackType: z.enum(["MELEE", "RANGED"]).optional(),
  effect: z
    .object({
      type: z.literal("HEAL"),
      amount: z.number().int().positive(),
      hpThreshold: z.number().positive().max(1),
      oncePerBattle: z.boolean(),
    })
    .optional(),
});

const UserSchema = z
  .object({
    id: z.string(),
    teamId: z.string(),
    displayName: z.string().max(100).optional(),
    hp: z.number().int().nonnegative(),
    maxHp: z.number().int().positive(),
    stamina: z.number().int().nonnegative(),
    maxStamina: z.number().int().positive(),
    staminaRegen: z.number().int().nonnegative(),
    weight: z.number().nonnegative(),
    maxWeight: z.number().positive(),
    time: z.number().int().nonnegative(),
    currentWeaponIndex: z.number().int().min(0).max(5),
    weapons: z.tuple([
      WeaponSchema.nullable(),
      WeaponSchema.nullable(),
      WeaponSchema.nullable(),
      WeaponSchema.nullable(),
      WeaponSchema.nullable(),
      WeaponSchema.nullable(),
    ]),
  })
  .refine(
    (player) =>
      player.hp <= player.maxHp && player.stamina <= player.maxStamina,
    {
      message: "Current stats exceed maximum",
    },
  );

const SimulateSchema = z.object({
  players: z
    .array(UserSchema)
    .max(32)
    .refine(
      (players) =>
        new Set(players.map((player) => player.id)).size === players.length,
      { message: "Duplicate combatant id" },
    ),
});

export function registerSimulationRoutes(fastify: FastifyInstance) {
  fastify.post("/battle/simulate", async (request, reply) => {
    try {
      const body = SimulateSchema.parse(request.body);
      const result = simulateBattle(body.players);
      return result;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(400).send({ error: "Invalid request data" });
    }
  });
}
