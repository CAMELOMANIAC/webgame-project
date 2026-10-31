import type { PrismaClient } from "@prisma/client";
import type { FastifyInstance } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    actorUserId: string | null;
  }
}

// 개발용 계정 선택이다. 운영 환경에서는 이 헤더를 인증 수단으로 허용하지 않는다.
export function registerDevelopmentIdentity(
  fastify: FastifyInstance,
  database: PrismaClient,
  enabled: boolean,
) {
  fastify.decorateRequest("actorUserId", null);
  fastify.get("/dev/users", async (_request, reply) => {
    if (!enabled) return reply.status(404).send({ error: "Not found" });
    return database.user.findMany({
      select: { id: true, nickname: true },
      orderBy: { createdAt: "asc" },
    });
  });
  fastify.addHook("preHandler", async (request, reply) => {
    const path = request.routeOptions.url ?? "";
    if (path.startsWith("/dev/") && !enabled)
      return reply.status(404).send({ error: "Development endpoint is disabled" });
    if (
      request.method === "OPTIONS" ||
      path === "/health" ||
      path === "/dev/users" ||
      path === "/weapons"
    )
      return;
    if (
      [
        "/battle/simulate",
        "/monster/match",
        "/users",
        "/ghost/snapshot",
      ].includes(path) &&
      !enabled
    ) {
      return reply
        .status(404)
        .send({ error: "Development endpoint is disabled" });
    }
    if (["/battle/simulate", "/monster/match", "/users"].includes(path)) return;
    if (!enabled)
      return reply
        .status(503)
        .send({ error: "Production authentication is not configured" });
    const userId = request.headers["x-dev-user-id"];
    if (typeof userId !== "string" || !userId || userId.length > 100) {
      return reply.status(401).send({ error: "Select a development account" });
    }
    const user = await database.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user)
      return reply.status(401).send({ error: "Development account not found" });
    request.actorUserId = user.id;
    const params = request.params as { userId?: string; characterId?: string };
    if (params.userId && params.userId !== user.id)
      return reply
        .status(403)
        .send({ error: "User does not own this resource" });
    const body = request.body as
      | { characterId?: string; userId?: string }
      | undefined;
    const characterId =
      params.characterId ??
      (path === "/battle/monster" ? body?.characterId : undefined);
    if (characterId) {
      const character = await database.character.findUnique({
        where: { id: characterId },
        select: { userId: true },
      });
      if (!character)
        return reply.status(404).send({ error: "Character not found" });
      if (character.userId !== user.id)
        return reply
          .status(403)
          .send({ error: "User does not own this character" });
    }
    if (path === "/ghost/snapshot" && body?.userId !== user.id)
      return reply.status(403).send({ error: "Snapshot owner mismatch" });
  });
}
