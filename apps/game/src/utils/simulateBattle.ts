import { type BattleLog, type User } from "@webgame/types";

/**
 * 서버에 전투 시뮬레이션을 요청합니다.
 * 클라이언트 로직을 제거하고 서버의 권한(Authority)을 사용합니다.
 */
async function simulateBattle(players: User[]): Promise<BattleLog> {
  const response = await fetch("http://localhost:3001/battle/simulate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ players }),
  });

  if (!response.ok) {
    throw new Error("Failed to simulate battle on server");
  }

  return response.json();
}

export default simulateBattle;
