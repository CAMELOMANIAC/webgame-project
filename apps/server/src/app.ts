import cors from "@fastify/cors";
import Fastify, { type FastifyServerOptions } from "fastify";
import { type Database, db as defaultDatabase } from "./db";
import { registerDevelopmentIdentity } from "./auth";
import { registerGameRoutes } from "./routes/game";
import { registerGhostRoutes } from "./routes/ghosts";
import { registerCharacterRoutes } from "./routes/characters";
import { registerInventoryRoutes } from "./routes/inventory";
import { registerRaidRoutes } from "./routes/raid";
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

  registerDevelopmentIdentity(
    fastify,
    database,
    developmentAuth && process.env.NODE_ENV !== "production",
  );
  registerSimulationRoutes(fastify);
  registerGameRoutes(fastify, database);
  registerGhostRoutes(fastify, database);
  registerCharacterRoutes(fastify, database);
  registerInventoryRoutes(fastify, database);
  registerRaidRoutes(fastify, database);
  registerQuestRoutes(fastify, database);
  fastify.get("/health", async () => ({ status: "ok" }));
  fastify.addHook("onClose", async () => database.$disconnect());

  return fastify;
}
