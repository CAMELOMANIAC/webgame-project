import type { FastifyInstance } from "fastify";
import { z } from "zod";

import type { Database } from "../db";
import {
  acceptMission,
  advanceQuestDialogue,
  getQuestDialogue,
  journalView,
  markQuestDialogueRead,
  reportMission,
} from "../services/quests";
import { sendInventoryError } from "./inventory";

interface MissionActionBody {
  questId?: string;
}

type QuestParams = { userId: string; questId: string };

const AdvanceSchema = z.object({
  requestId: z.string().uuid(),
  expectedSeq: z.number().int().nonnegative(),
  choiceId: z.string().min(1).max(100).optional(),
});

const ReadSchema = z.object({
  seq: z.number().int().nonnegative(),
});

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

  app.get<{ Params: QuestParams }>(
    "/user/:userId/quests/:questId/dialogue",
    async (request, reply) => {
      try {
        reply.header("Cache-Control", "no-store");
        return await getQuestDialogue(db, request.params.userId, request.params.questId);
      } catch (error) {
        return sendInventoryError(reply, error);
      }
    },
  );

  app.post<{ Params: QuestParams }>(
    "/user/:userId/quests/:questId/dialogue/advance",
    async (request, reply) => {
      try {
        const input = AdvanceSchema.parse(request.body);
        const result = await advanceQuestDialogue(
          db,
          request.params.userId,
          request.params.questId,
          input,
        );
        // 확정된 선택지와 요청이 어긋나면 409와 함께 서버의 최신 대화를 돌려준다.
        if (!result.ok)
          return reply.status(409).send({
            error: result.message,
            dialogue: result.dialogue,
            journal: result.journal,
          });
        return { dialogue: result.dialogue, journal: result.journal };
      } catch (error) {
        app.log.error(error);
        return sendInventoryError(reply, error);
      }
    },
  );

  app.post<{ Params: QuestParams }>(
    "/user/:userId/quests/:questId/dialogue/read",
    async (request, reply) => {
      try {
        const { seq } = ReadSchema.parse(request.body);
        return await markQuestDialogueRead(
          db,
          request.params.userId,
          request.params.questId,
          seq,
        );
      } catch (error) {
        return sendInventoryError(reply, error);
      }
    },
  );
}
