import type { PrismaClient } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  characterDetails,
  recruitDevelopmentCharacter,
  selectCharacter,
  selectedCharacterId,
} from "../services/characters";
import { InventoryError } from "../services/inventory";

export function registerCharacterRoutes(
  app: FastifyInstance,
  db: PrismaClient,
) {
  app.get<{ Params: { userId: string } }>(
    "/user/:userId/characters",
    async (request) => ({
      selectedCharacterId: await selectedCharacterId(db, request.params.userId),
      characters: await db.character.findMany({
        where: { userId: request.params.userId },
        include: { variant: { include: { definition: true } } },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      }),
    }),
  );
  app.get<{ Params: { userId: string } }>(
    "/user/:userId/character",
    async (request, reply) => {
      const id = await selectedCharacterId(db, request.params.userId);
      const character = id
        ? await db.character.findFirst({
            where: { id, userId: request.params.userId },
            include: characterDetails,
          })
        : null;
      if (!character)
        return reply.status(404).send({ error: "Character not found" });
      const { weapons, ...rest } = character;
      return {
        ...rest,
      displayName: rest.displayName ?? rest.variant.definition.name,
        equipment: weapons,
      };
    },
  );
  app.get<{ Params: { characterId: string } }>(
    "/character/:characterId",
    async (request, reply) => {
      const character = await db.character.findUnique({
        where: { id: request.params.characterId },
        include: characterDetails,
      });
      if (!character)
        return reply.status(404).send({ error: "Character not found" });
      const { weapons, ...rest } = character;
      return {
        ...rest,
      displayName: rest.displayName ?? rest.variant.definition.name,
        equipment: weapons,
      };
    },
  );
  app.get("/dev/character-variants", async () =>
    db.characterVariant.findMany({
      include: { definition: true },
      orderBy: { id: "asc" },
    }),
  );
  app.post<{ Params: { userId: string; characterId: string } }>(
    "/user/:userId/characters/:characterId/select",
    async (request, reply) => {
      try {
        return await selectCharacter(
          db,
          request.params.userId,
          request.params.characterId,
        );
      } catch (error) {
        if (error instanceof InventoryError)
          return reply.status(error.statusCode).send({ error: error.message });
        throw error;
      }
    },
  );
  app.post<{ Params: { userId: string } }>(
    "/dev/user/:userId/characters",
    async (request, reply) => {
      try {
        const { variantId } = z
          .object({ variantId: z.string().min(1).max(100) })
          .parse(request.body);
        return await recruitDevelopmentCharacter(
          db,
          request.params.userId,
          variantId,
        );
      } catch (error) {
        if (error instanceof z.ZodError)
          return reply
            .status(400)
            .send({ error: "Select a valid character variant" });
        if (error instanceof InventoryError)
          return reply.status(error.statusCode).send({ error: error.message });
        throw error;
      }
    },
  );
}
