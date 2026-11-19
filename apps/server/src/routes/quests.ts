import type { FastifyInstance } from "fastify";
import type { Database } from "../db";
import {
  acceptMission,
  journalView,
  reportMission,
} from "../services/quests";
import { sendInventoryError } from "./inventory";

interface MissionActionBody {
  questId?: string;
}

export function registerQuestRoutes(app: FastifyInstance, db: Database) {
  app.get<{ Params: { userId: string } }>(
    "/user/:userId/journal",
    async (request) => journalView(db, request.params.userId),
  );
  for (const [action, handler] of [
    ["accept", acceptMission],
    ["report", reportMission],
  ] as const) {
    app.post<{ Params: { userId: string }; Body?: MissionActionBody }>(
      `/user/:userId/mission/${action}`,
      async (request, reply) => {
        try {
          const questId =
            typeof request.body?.questId === "string"
              ? request.body.questId
              : undefined;
          return await handler(db, request.params.userId, questId);
        } catch (error) {
          app.log.error(error);
          return sendInventoryError(reply, error);
        }
      },
    );
  }
}
