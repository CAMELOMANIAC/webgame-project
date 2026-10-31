import type { IncomingMessage, ServerResponse } from "node:http";
import { buildApp } from "./app";

const fastify = buildApp();

// 기존 서버리스 진입점은 유지하되, import만으로 포트를 열지 않는다.
export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  await fastify.ready();
  fastify.server.emit("request", req, res);
}

async function start() {
  try {
    await fastify.listen({ port: 3001, host: "0.0.0.0" });
  } catch (error) {
    fastify.log.error(error);
    await fastify.close();
    process.exitCode = 1;
  }
}

if (require.main === module) {
  const shutdown = async () => {
    await fastify.close();
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
  void start();
}
