import { seopoMapVersion } from "@webgame/types";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import type { Database } from "../db";
import { gameRules } from "../logic/rules";
import { InventoryError, SlotsSchema } from "../services/inventory";
import {
  decideRaidBattle,
  getPendingRaidBattle,
  extractionNodeIds,
  extractRaid,
  fightRaidMonster,
  getRaidNavigationResult,
  getRaidNoiseSignals,
  NavigateSchema,
  navigateRaid,
  RaidActionSchema,
  resetRaidWithoutSession,
  startRaid,
} from "../services/raid";
import { sendInventoryError } from "./inventory";

const startRaidSchema = SlotsSchema.partial()
  .extend({ entryNodeId: z.number().int().nonnegative().optional() })
  .refine((data) => (data.equipment === undefined) === (data.inventory === undefined), {
    message: "Equipment and inventory must be sent together",
  });

function actor(request: FastifyRequest) {
  if (!request.actorUserId)
    throw new InventoryError("Select a development account", 401);
  return request.actorUserId;
}

export function registerRaidRoutes(
  fastify: FastifyInstance,
  database: Database,
) {
  fastify.get<{ Params: { characterId: string } }>(
    "/character/:characterId/raid/battle",
    async (request, reply) => {
      try {
        reply.header("Cache-Control", "no-store");
        return await getPendingRaidBattle(database, actor(request), request.params.characterId);
      } catch (error) {
        return sendInventoryError(reply, error);
      }
    },
  );
  fastify.post<{ Params: { characterId: string } }>(
    "/character/:characterId/raid/battle/decision",
    async (request, reply) => {
      try {
        const { raidId, battleId, action } = z.object({
          raidId: z.string().uuid(),
          battleId: z.string().uuid(),
          action: z.enum(["OPEN", "RETREAT", "CONTINUE"]),
        }).parse(request.body);
        reply.header("Cache-Control", "no-store");
        return await decideRaidBattle(database, actor(request), request.params.characterId, raidId, battleId, action);
      } catch (error) {
        return sendInventoryError(reply, error);
      }
    },
  );
  fastify.get("/raid/rules", async () => ({
    extractionNodeIds,
    entryNodeIds: gameRules.entryNodeIds,
    startNodeId: gameRules.startNodeId,
    mapVersion: seopoMapVersion,
  }));
  fastify.post("/character/:characterId/raid/start", async (request, reply) => {
    try {
      const { characterId } = request.params as { characterId: string };
      const { entryNodeId, equipment, inventory } = startRaidSchema.parse(
        request.body ?? {},
      );
      const loadout = equipment && inventory ? { equipment, inventory } : undefined;
      return await startRaid(database, actor(request), characterId, loadout, entryNodeId);
    } catch (error) {
      fastify.log.error(error);
      return sendInventoryError(reply, error);
    }
  });
  fastify.get<{ Params: { characterId: string } }>(
    "/character/:characterId/raid/noise",
    async (request, reply) => {
      try {
        const { characterId } = request.params;
        return await getRaidNoiseSignals(database, actor(request), characterId);
      } catch (error) {
        fastify.log.error(error);
        return sendInventoryError(reply, error);
      }
    },
  );
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
  fastify.get<{ Params: { characterId: string } }>(
    "/character/:characterId/raid/navigate/result",
    async (request, reply) => {
      try {
        const input = RaidActionSchema.extend({
          expectedVersion: z.coerce.number().int().nonnegative(),
        }).parse(request.query);
        reply.header("Cache-Control", "no-store");
        const result = await getRaidNavigationResult(
          database,
          actor(request),
          request.params.characterId,
          input,
        );
        return reply.send({ result });
      } catch (error) {
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
