import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Database } from "../db";
import {
  commitCharacterGeneReroll,
  ensureCharacterGeneProfile,
  rerollCharacterGeneSlot,
} from "../services/genes";
import { InventoryError, withInventoryTransaction } from "../services/inventory";

export function registerGeneRoutes(app: FastifyInstance, db: Database) {
  app.post<{ Params: { characterId: string } }>(
    "/character/:characterId/genes/init",
    async (request, reply) => {
      try {
        const geneProfile = await withInventoryTransaction(db, (tx) =>
          ensureCharacterGeneProfile(tx, request.params.characterId),
        );
        return { geneProfile };
      } catch (error) {
        if (error instanceof InventoryError) {
          return reply.status(error.statusCode).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.post<{ Params: { characterId: string } }>(
    "/character/:characterId/genes/reroll",
    async (request, reply) => {
      try {
        const userId = request.headers["x-dev-user-id"];
        if (typeof userId !== "string" || !userId) {
          return reply.status(401).send({ error: "User header required" });
        }
        const body = z
          .object({
            slotIndex: z.number().int().min(0).max(9),
            ampouleItemId: z.string().min(1).max(100).nullable().optional(),
          })
          .parse(request.body);
        return await rerollCharacterGeneSlot(
          db,
          userId,
          request.params.characterId,
          body.slotIndex,
          body.ampouleItemId ?? null,
        );
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: "Invalid gene reroll input" });
        }
        if (error instanceof InventoryError) {
          return reply.status(error.statusCode).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.post<{ Params: { characterId: string } }>(
    "/character/:characterId/genes/commit",
    async (request, reply) => {
      try {
        const userId = request.headers["x-dev-user-id"];
        if (typeof userId !== "string" || !userId) {
          return reply.status(401).send({ error: "User header required" });
        }
        const body = z
          .object({
            chosenGeneId: z.string().min(1).max(100).nullable(),
          })
          .parse(request.body);
        return await commitCharacterGeneReroll(
          db,
          userId,
          request.params.characterId,
          body.chosenGeneId,
        );
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: "Invalid gene commit input" });
        }
        if (error instanceof InventoryError) {
          return reply.status(error.statusCode).send({ error: error.message });
        }
        throw error;
      }
    },
  );
}
