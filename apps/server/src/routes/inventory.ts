import type { PrismaClient } from "@prisma/client";
import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import {
  equipItem,
  EquipItemSchema,
  InventoryError,
  moveStashItem,
  MoveItemSchema,
  SlotsSchema,
  syncSlots,
} from "../services/inventory";

export function sendInventoryError(reply: FastifyReply, error: unknown) {
  if (error instanceof z.ZodError)
    return reply
      .status(400)
      .send({ error: "Invalid inventory request", details: error.issues });
  if (error instanceof InventoryError)
    return reply.status(error.statusCode).send({ error: error.message });
  return reply.status(500).send({ error: "Failed to update inventory" });
}

export function registerInventoryRoutes(
  fastify: FastifyInstance,
  database: PrismaClient,
) {
  fastify.post("/character/:characterId/slots/sync", async (request, reply) => {
    try {
      const { characterId } = request.params as { characterId: string };
      return await syncSlots(
        database,
        characterId,
        SlotsSchema.parse(request.body),
      );
    } catch (error) {
      fastify.log.error(error);
      return sendInventoryError(reply, error);
    }
  });
  fastify.patch("/character/:characterId/equipment", async (request, reply) => {
    try {
      const { characterId } = request.params as { characterId: string };
      return await equipItem(
        database,
        characterId,
        EquipItemSchema.parse(request.body),
      );
    } catch (error) {
      fastify.log.error(error);
      return sendInventoryError(reply, error);
    }
  });
  fastify.post(
    "/character/:characterId/inventory/move",
    async (request, reply) => {
      try {
        const { characterId } = request.params as { characterId: string };
        return await moveStashItem(
          database,
          characterId,
          MoveItemSchema.parse(request.body),
        );
      } catch (error) {
        fastify.log.error(error);
        return sendInventoryError(reply, error);
      }
    },
  );
}
