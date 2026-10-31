import type { PrismaClient } from "@prisma/client";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { gameRules } from "../logic/rules";
import { seopoMapVersion } from "@webgame/types";
import { claimBasicSupplies } from "../services/supplies";
import { InventoryError } from "../services/inventory";
import {
  extractionNodeIds,
  extractRaid,
  fightRaidMonster,
  NavigateSchema,
  navigateRaid,
  RaidActionSchema,
  startRaid,
} from "../services/raid";
import { sendInventoryError } from "./inventory";

function actor(request: FastifyRequest) {
  if (!request.actorUserId)
    throw new InventoryError("Select a development account", 401);
  return request.actorUserId;
}

export function registerRaidRoutes(
  fastify: FastifyInstance,
  database: PrismaClient,
) {
  fastify.get("/raid/rules", async () => ({
    extractionNodeIds,
    startNodeId: gameRules.startNodeId,
    basicSuppliesEnabled: gameRules.basicSuppliesEnabled,
    mapVersion: seopoMapVersion,
  }));
  fastify.post("/character/:characterId/supplies", async (request, reply) => {
    try {
      const { characterId } = request.params as { characterId: string };
      return await claimBasicSupplies(database, actor(request), characterId);
    } catch (error) {
      fastify.log.error(error);
      return sendInventoryError(reply, error);
    }
  });
  fastify.post("/character/:characterId/raid/start", async (request, reply) => {
    try {
      const { characterId } = request.params as { characterId: string };
      return await startRaid(database, actor(request), characterId);
    } catch (error) {
      fastify.log.error(error);
      return sendInventoryError(reply, error);
    }
  });
  fastify.post(
    "/character/:characterId/raid/navigate",
    async (request, reply) => {
      try {
        const { characterId } = request.params as { characterId: string };
        return await navigateRaid(
          database,
          actor(request),
          characterId,
          NavigateSchema.parse(request.body),
        );
      } catch (error) {
        fastify.log.error(error);
        return sendInventoryError(reply, error);
      }
    },
  );
  fastify.post(
    "/character/:characterId/raid/extract",
    async (request, reply) => {
      try {
        const { characterId } = request.params as { characterId: string };
        return await extractRaid(
          database,
          actor(request),
          characterId,
          RaidActionSchema.parse(request.body),
        );
      } catch (error) {
        fastify.log.error(error);
        return sendInventoryError(reply, error);
      }
    },
  );
  fastify.post("/battle/monster", async (request, reply) => {
    try {
      const input = RaidActionSchema.extend({
        characterId: z.string(),
        level: z.number().int().positive().optional(),
      }).parse(request.body);
      return await fightRaidMonster(
        database,
        actor(request),
        input.characterId,
        input,
        input.level,
      );
    } catch (error) {
      fastify.log.error(error);
      return sendInventoryError(reply, error);
    }
  });
  fastify.patch(
    "/character/:characterId/raid/status",
    async (_request, reply) => {
      return reply.status(405).send({
        error:
          "Use raid start or extraction; direct state changes are disabled",
      });
    },
  );
  fastify.post("/character/:characterId/raid/die", async (_request, reply) => {
    return reply
      .status(405)
      .send({ error: "Death is resolved by server combat results" });
  });
}
