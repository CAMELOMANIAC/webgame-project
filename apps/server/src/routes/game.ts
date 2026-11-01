import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { type Database, stashItems } from "../db";

export function registerGameRoutes(
  fastify: FastifyInstance,
  database: Database,
) {
  // 마스터 데이터 조회 API
  fastify.get("/weapons", async () => {
    return await database.query.weaponMasters.findMany();
  });

  // DB 연결 테스트용 유저 목록 API
  fastify.get("/users", async () => {
    try {
      const users = await database.query.users.findMany({
        columns: { id: true, nickname: true },
      });
      return users;
    } catch (error) {
      fastify.log.error(error);
      return { error: "DB Connection Failed" };
    }
  });

  // 몬스터 매칭 API (특정 레벨 범위 혹은 랜덤하게 몬스터 반환)
  fastify.get("/monster/match", async (request, reply) => {
    try {
      const querySchema = z.object({
        level: z.union([z.string(), z.number()]).transform(Number).optional(),
      });

      const query = querySchema.parse(request.query);
      const level = query.level || 1;

      // 레벨이 가장 가까운 몬스터들 조회
      const monsters = await database.query.monsterMasters.findMany({
        with: {
          weapons: {
            with: {
              weaponMaster: true,
            },
          },
        },
      });

      if (monsters.length === 0) {
        return reply
          .status(404)
          .send({ error: "No monsters found in database" });
      }

      // 간단한 로직: 레벨 차이가 가장 적은 몬스터들 중 하나 랜덤 선택
      const sorted = monsters.sort(
        (a, b) => Math.abs(a.level - level) - Math.abs(b.level - level),
      );
      const firstMonster = sorted[0];

      if (!firstMonster) {
        return reply
          .status(404)
          .send({ error: "No monsters found after sorting" });
      }

      const minDiff = Math.abs(firstMonster.level - level);
      const closestMonsters = sorted.filter(
        (m) => Math.abs(m.level - level) === minDiff,
      );
      const match =
        closestMonsters[Math.floor(Math.random() * closestMonsters.length)];

      if (!match) {
        return reply.status(404).send({ error: "Failed to pick a monster" });
      }

      return match;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: "Internal Server Error" });
    }
  });

  // 유저 창고 조회 API
  fastify.get("/user/:userId/stash", async (request, reply) => {
    try {
      const { userId } = request.params as { userId: string };
      const stash = await database.query.stashItems.findMany({
        where: eq(stashItems.userId, userId),
        with: { weaponMaster: true },
      });
      return stash;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: "Failed to fetch stash data" });
    }
  });
}
