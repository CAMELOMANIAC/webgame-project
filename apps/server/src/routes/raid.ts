import { seopoMapVersion } from "@webgame/types";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import type { Database } from "../db";
import { gameRules } from "../logic/rules";
import { InventoryError } from "../services/inventory";
import {
  extractionNodeIds,
  extractRaid,
  fightRaidMonster,
  NavigateSchema,
  navigateRaid,
  RaidActionSchema,
  resetRaidWithoutSession,
  startRaid,
} from "../services/raid";
import { claimBasicSupplies } from "../services/supplies";
import { sendInventoryError } from "./inventory";

function actor(request: FastifyRequest) {
  if (!request.actorUserId)
    throw new InventoryError("Select a development account", 401);
  return request.actorUserId;
}

export function registerRaidRoutes(
  fastify: FastifyInstance,
  database: Database,
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
  fastify.post<{ Params: { characterId: string } }>(
    "/character/:characterId/raid/recover",
    async (request, reply) => {
      try {
        await resetRaidWithoutSession(
          database,
          actor(request),
          request.params.characterId,
        );
        return reply.status(204).send();
      } catch (error) {
        fastify.log.error(error);
        return sendInventoryError(reply, error);
      }
    },
  );
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
