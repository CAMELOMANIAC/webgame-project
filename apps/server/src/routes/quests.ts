import type { FastifyInstance } from "fastify";
import type { Database } from "../db";
import {
  acceptFirstMission,
  journalView,
  reportFirstMission,
} from "../services/quests";
import { sendInventoryError } from "./inventory";

export function registerQuestRoutes(app: FastifyInstance, db: Database) {
  app.get<{ Params: { userId: string } }>(
    "/user/:userId/journal",
    async (request) => journalView(db, request.params.userId),
  );
  for (const [action, handler] of [
    ["accept", acceptFirstMission],
    ["report", reportFirstMission],
  ] as const) {
    app.post<{ Params: { userId: string } }>(
      `/user/:userId/mission/${action}`,
      async (request, reply) => {
        try {
          return await handler(db, request.params.userId);
        } catch (error) {
          app.log.error(error);
          return sendInventoryError(reply, error);
        }
      },
    );
  }
}
