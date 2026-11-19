import type { IncomingMessage, ServerResponse } from "node:http";
import cors from "@fastify/cors";
import Fastify, { type FastifyServerOptions } from "fastify";
import { type Database, db as defaultDatabase } from "./db";
import { registerDevelopmentIdentity } from "./auth";
import { registerGameRoutes } from "./routes/game";
import { registerGhostRoutes } from "./routes/ghosts";
import { registerCharacterRoutes } from "./routes/characters";
import { registerGeneRoutes } from "./routes/genes";
import { registerInventoryRoutes } from "./routes/inventory";
import { registerMarketRoutes } from "./routes/market";
import { registerRaidRoutes } from "./routes/raid";
import { settleExpiredAuctions } from "./services/market";
import { expireRaidBattles } from "./services/raid";
import { registerQuestRoutes } from "./routes/quests";
import { registerSimulationRoutes } from "./routes/simulation";

interface AppOptions {
  database?: Database;
  logger?: FastifyServerOptions["logger"];
  developmentAuth?: boolean;
}

export function buildApp({
  database = defaultDatabase,
  logger = true,
  developmentAuth = true,
}: AppOptions = {}) {
  const fastify = Fastify({ logger });

  fastify.register(cors, {
    origin: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Dev-User-Id"],
    credentials: false,
  });

  // TODO: 운영 인증 구현 후 NODE_ENV !== "production" 조건을 복원한다.
  registerDevelopmentIdentity(fastify, database, developmentAuth);
  registerSimulationRoutes(fastify);
  registerGameRoutes(fastify, database);
  registerGhostRoutes(fastify, database);
  registerCharacterRoutes(fastify, database);
  registerGeneRoutes(fastify, database);
  registerInventoryRoutes(fastify, database);
  registerMarketRoutes(fastify, database);
  registerRaidRoutes(fastify, database);
  registerQuestRoutes(fastify, database);
  fastify.get("/health", async () => ({ status: "ok" }));
  let expiryTimer: ReturnType<typeof setInterval> | undefined;
  let expiryCheck: Promise<void> | undefined;
  let marketTick = 0;
  fastify.addHook("onListen", async () => {
    expiryTimer = setInterval(() => {
      if (expiryCheck) return;
      marketTick = (marketTick + 1) % 5;
      const runAuctionSettlement = marketTick === 0;
      expiryCheck = Promise.all([
        expireRaidBattles(database),
        runAuctionSettlement ? settleExpiredAuctions(database) : Promise.resolve(0),
      ])
        .then(() => undefined)
        .catch((error: unknown) => fastify.log.error(error))
        .finally(() => { expiryCheck = undefined; });
    }, 1_000);
    expiryTimer.unref();
  });
  fastify.addHook("onClose", async () => {
    clearInterval(expiryTimer);
    await expiryCheck;
    await database.$disconnect();
  });

  return fastify;
}

let cachedApp: ReturnType<typeof buildApp> | undefined;

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  const app = (cachedApp ??= buildApp());
  await app.ready();
  await new Promise<void>((resolve) => {
    const done = () => {
      res.off("finish", done);
      res.off("close", done);
      resolve();
    };
    res.once("finish", done);
    res.once("close", done);
    app.server.emit("request", req, res);
  });
}
