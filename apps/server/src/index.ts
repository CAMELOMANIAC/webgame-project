import Fastify from "fastify";
import cors from "@fastify/cors";
import { z } from "zod";
import { simulateBattle } from "./logic/simulateBattle";
import { User } from "@webgame/types";

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
