import Fastify from "fastify";
import cors from "@fastify/cors";
import { z } from "zod";
import { simulateBattle } from "./logic/simulateBattle";
import { User } from "@webgame/types";
import { prisma } from "./db";

const fastify = Fastify({
  logger: true,
});

// CORS 설정 (클라이언트 접속 허용)
fastify.register(cors, {
  origin: true,
});

// 요청 데이터 스키마 정의
const SimulateSchema = z.object({
  players: z.array(z.any()), // 복잡한 User 타입을 일단 any로 받고 내부에서 캐스팅
});

const GhostSnapshotSchema = z.object({
  userId: z.string(),
  nodeId: z.string(),
  day: z.number(),
  hp: z.number(),
  maxHp: z.number(),
  stamina: z.number(),
  maxStamina: z.number(),
  staminaRegen: z.number(),
  weight: z.number(),
  maxWeight: z.number(),
  weapons: z.array(z.object({
    weaponMasterId: z.string(),
    slotIndex: z.number(),
  })),
});

fastify.post("/battle/simulate", async (request, reply) => {
  try {
    const body = SimulateSchema.parse(request.body);
    const players = body.players as User[];

    const result = simulateBattle(players);
    return result;
  } catch (error) {
    fastify.log.error(error);
    return reply.status(400).send({ error: "Invalid request data" });
  }
});

// 고스트 스냅샷 저장 API
fastify.post("/ghost/snapshot", async (request, reply) => {
  try {
    const data = GhostSnapshotSchema.parse(request.body);
    
    const snapshot = await prisma.ghostSnapshot.create({
      data: {
        userId: data.userId,
        nodeId: data.nodeId,
        day: data.day,
        hp: data.hp,
        maxHp: data.maxHp,
        stamina: data.stamina,
        maxStamina: data.maxStamina,
        staminaRegen: data.staminaRegen,
        weight: data.weight,
        maxWeight: data.maxWeight,
        weapons: {
          create: data.weapons.map(w => ({
            weaponMasterId: w.weaponMasterId,
            slotIndex: w.slotIndex,
          })),
        },
      },
      include: {
        weapons: true,
      },
    });

    return snapshot;
  } catch (error) {
    fastify.log.error(error);
    return reply.status(400).send({ error: "Invalid snapshot data" });
  }
});

// 마스터 데이터 조회 API
fastify.get("/weapons", async () => {
  return await prisma.weaponMaster.findMany();
});

// DB 연결 테스트용 유저 목록 API
fastify.get("/users", async () => {
  try {
    const users = await prisma.user.findMany();
    return users;
  } catch (error) {
    fastify.log.error(error);
    return { error: "DB Connection Failed" };
  }
});

// 고스트 매칭 API
fastify.get("/ghost/match", async (request, reply) => {
  try {
    const querySchema = z.object({
      nodeId: z.string(),
      day: z.union([z.string(), z.number()]).transform(Number),
    });

    const query = querySchema.parse(request.query);

    // 해당 노드에서 가장 최근 혹은 날짜가 비슷한 고스트 조회
    const snapshots = await prisma.ghostSnapshot.findMany({
      where: {
        nodeId: query.nodeId,
      },
      include: {
        weapons: {
          include: {
            weaponMaster: true,
          },
        },
        user: true,
      },
    });

    if (snapshots.length === 0) {
      return reply.status(404).send({ error: "No ghost found for this node" });
    }

    // 간단한 매칭 logic: 요청한 날짜와 가장 가까운 고스트 선택
    const sorted = snapshots.sort((a, b) => Math.abs(a.day - query.day) - Math.abs(b.day - query.day));
    const match = sorted[0];

    return match;
  } catch (error) {
    if (error instanceof z.ZodError) {
      fastify.log.error(error.errors);
      return reply.status(400).send({ error: "Invalid matching request", details: error.errors });
    }
    fastify.log.error(error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
});

fastify.get("/health", async () => {
  return { status: "ok" };
});

const start = async () => {
  try {
    await fastify.listen({ port: 3001, host: "0.0.0.0" });
    console.log("Server is running on http://localhost:3001");
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
