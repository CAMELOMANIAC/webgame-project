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

// 캐릭터 정보 및 인벤토리/장착 정보 조회 API
fastify.get("/user/:userId/character", async (request, reply) => {
  try {
    const { userId } = request.params as { userId: string };
    
    const character = await prisma.character.findUnique({
      where: { userId },
      include: {
        weapons: { include: { weaponMaster: true } },
        inventory: { include: { weaponMaster: true } },
      },
    });

    if (!character) {
      return reply.status(404).send({ error: "Character not found" });
    }
    return character;
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: "Failed to fetch character data" });
  }
});

// 장착 슬롯 무기 변경 API (인벤토리 검증 포함)
fastify.patch("/character/:characterId/equipment", async (request, reply) => {
  try {
    const { characterId } = request.params as { characterId: string };
    const { slotIndex, weaponMasterId } = request.body as { 
      slotIndex: number; 
      weaponMasterId: string | null; 
    };

    // 1) 인벤토리 확인 (해당 무기가 인벤토리에 있는지)
    if (weaponMasterId) {
      const hasItem = await prisma.raidInventoryItem.findFirst({
        where: { characterId, weaponMasterId },
      });
      if (!hasItem) {
        return reply.status(400).send({ error: "Item not in inventory" });
      }
    }

    // 2) 장착 로직
    if (weaponMasterId === null) {
      await prisma.characterWeapon.deleteMany({
        where: { characterId, slotIndex },
      });
    } else {
      await prisma.characterWeapon.upsert({
        where: { characterId_slotIndex: { characterId, slotIndex } },
        update: { weaponMasterId },
        create: { characterId, slotIndex, weaponMasterId },
      });
    }
    
    return { status: "success" };
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: "Failed to update equipment" });
  }
});

// 탐사 상태 변경 API (시작/종료)
fastify.patch("/character/:characterId/raid/status", async (request, reply) => {
  try {
    const { characterId } = request.params as { characterId: string };
    const { isRaiding } = request.body as { isRaiding: boolean };

    const character = await prisma.character.update({
      where: { id: characterId },
      data: { isRaiding },
    });

    return { status: "success", isRaiding: character.isRaiding };
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: "Failed to update raid status" });
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

// 몬스터 매칭 API (특정 레벨 범위 혹은 랜덤하게 몬스터 반환)
fastify.get("/monster/match", async (request, reply) => {
  try {
    const querySchema = z.object({
      level: z.union([z.string(), z.number()]).transform(Number).optional(),
    });

    const query = querySchema.parse(request.query);
    const level = query.level || 1;

    // 레벨이 가장 가까운 몬스터들 조회
    const monsters = await prisma.monsterMaster.findMany({
      include: {
        weapons: {
          include: {
            weaponMaster: true,
          },
        },
      },
    });

    if (monsters.length === 0) {
      return reply.status(404).send({ error: "No monsters found in database" });
    }

    // 간단한 로직: 레벨 차이가 가장 적은 몬스터들 중 하나 랜덤 선택
    const sorted = monsters.sort((a, b) => Math.abs(a.level - level) - Math.abs(b.level - level));
    const firstMonster = sorted[0];
    
    if (!firstMonster) {
      return reply.status(404).send({ error: "No monsters found after sorting" });
    }

    const minDiff = Math.abs(firstMonster.level - level);
    const closestMonsters = sorted.filter(m => Math.abs(m.level - level) === minDiff);
    const match = closestMonsters[Math.floor(Math.random() * closestMonsters.length)];

    if (!match) {
      return reply.status(404).send({ error: "Failed to pick a monster" });
    }

    return match;
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
});

// 몬스터와 전투 시뮬레이션 API
fastify.post("/battle/monster", async (request, reply) => {
  try {
    const bodySchema = z.object({
      characterId: z.string(),
      level: z.number().optional(),
    });
    const { characterId, level = 1 } = bodySchema.parse(request.body);

    // 1) 캐릭터 데이터 조회 (장착 무기 포함)
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      include: {
        weapons: { include: { weaponMaster: true } },
        user: true,
      },
    });

    if (!character) return reply.status(404).send({ error: "Character not found" });

    // 2) 적합한 몬스터 매칭
    const monsters = await prisma.monsterMaster.findMany({
      include: { weapons: { include: { weaponMaster: true } } },
    });
    const sorted = monsters.sort((a, b) => Math.abs(a.level - level) - Math.abs(b.level - level));
    const match = sorted[0];
    if (!match) return reply.status(404).send({ error: "No monsters found" });

    // 3) DB 데이터를 시뮬레이션용 User 타입으로 변환 (브릿지 로직)
    const playerUser: User = {
      id: character.user.nickname,
      teamId: "TeamA",
      hp: character.hp,
      maxHp: character.maxHp,
      stamina: character.stamina,
      maxStamina: character.maxStamina,
      staminaRegen: character.staminaRegen,
      weight: character.weight,
      maxWeight: character.maxWeight,
      day: character.day,
      currentWeaponIndex: 0,
      weapons: [null, null, null, null, null, null],
    };

    character.weapons.forEach(w => {
      if (w.slotIndex < 6) playerUser.weapons[w.slotIndex] = { ...w.weaponMaster, currentCooldown: 0, use: () => [] };
    });

    const monsterUser: User = {
      id: `${match.name} (Lv.${match.level})`,
      teamId: "TeamB",
      hp: match.hp,
      maxHp: match.maxHp,
      stamina: match.stamina,
      maxStamina: match.maxStamina,
      staminaRegen: match.staminaRegen,
      weight: 0,
      maxWeight: 100,
      day: 0,
      currentWeaponIndex: 0,
      weapons: [null, null, null, null, null, null],
    };

    match.weapons.forEach(w => {
      if (w.slotIndex < 6) monsterUser.weapons[w.slotIndex] = { ...w.weaponMaster, currentCooldown: 0, use: () => [] };
    });

    // 4) 시뮬레이션 실행 및 결과 반환
    const result = simulateBattle([playerUser, monsterUser]);
    return result;
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: "Failed to process monster battle" });
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
