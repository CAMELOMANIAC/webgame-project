import type { PrismaClient } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import mapData from "../../../../packages/types/src/assets/map_graph.json";
import { matchGhost } from "../services/ghosts";

export function registerGhostRoutes(app: FastifyInstance, db: PrismaClient) {
  app.post("/ghost/snapshot", async (_request, reply) =>
    reply
      .status(405)
      .send({ error: "Snapshots are recorded by the server during raids" }),
  );
  app.get("/ghost/match", async (request, reply) => {
    const query = z
      .object({
        nodeId: z.coerce
          .number()
          .int()
          .min(0)
          .max(mapData.nodes.length - 1),
        round: z.coerce.number().int().nonnegative(),
      })
      .safeParse(request.query);
    if (!query.success)
      return reply
        .status(400)
        .send({ error: "Provide a valid nodeId and round" });
    const match = await matchGhost(
      db,
      request.actorUserId!,
      query.data.nodeId,
      query.data.round,
    );
    if (!match)
      return reply.status(404).send({ error: "No compatible ghost record" });
    return match;
  });
}
