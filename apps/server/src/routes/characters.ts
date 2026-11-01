import { and, asc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { characters, characterVariants, type Database } from "../db";
import {
  characterDetails,
  recruitDevelopmentCharacter,
  selectCharacter,
  selectedCharacterId,
} from "../services/characters";
import { InventoryError } from "../services/inventory";

export function registerCharacterRoutes(
  app: FastifyInstance,
  db: Database,
) {
  app.get<{ Params: { userId: string } }>(
    "/user/:userId/characters",
    async (request) => ({
      selectedCharacterId: await selectedCharacterId(db, request.params.userId),
      characters: await db.query.characters.findMany({
        where: eq(characters.userId, request.params.userId),
        with: { variant: { with: { definition: true } } },
        orderBy: [asc(characters.createdAt), asc(characters.id)],
      }),
    }),
  );
  app.get<{ Params: { userId: string } }>(
    "/user/:userId/character",
    async (request, reply) => {
      const id = await selectedCharacterId(db, request.params.userId);
      const character = id
        ? await db.query.characters.findFirst({
            where: and(
              eq(characters.id, id),
              eq(characters.userId, request.params.userId),
            ),
            with: characterDetails,
          })
        : null;
      if (!character)
        return reply.status(404).send({ error: "Character not found" });
      const { weapons, ...rest } = character;
      return {
        ...rest,
        displayName:
          rest.displayName ?? rest.variant?.definition?.name ?? "생존자",
        equipment: weapons,
      };
    },
  );
  app.get<{ Params: { characterId: string } }>(
    "/character/:characterId",
    async (request, reply) => {
      const character = await db.query.characters.findFirst({
        where: eq(characters.id, request.params.characterId),
        with: characterDetails,
      });
      if (!character)
        return reply.status(404).send({ error: "Character not found" });
      const { weapons, ...rest } = character;
      return {
        ...rest,
        displayName:
          rest.displayName ?? rest.variant?.definition?.name ?? "생존자",
        equipment: weapons,
      };
    },
  );
  app.get("/dev/character-variants", async () =>
    db.query.characterVariants.findMany({
      with: { definition: true },
      orderBy: [asc(characterVariants.id)],
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
