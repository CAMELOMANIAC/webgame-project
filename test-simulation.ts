import { User } from "./packages/types/src/index.ts";

async function testSim() {
  const players: User[] = [
    {
      id: "TestHero",
      teamId: "A",
      hp: 100,
      maxHp: 100,
      stamina: 100,
      maxStamina: 100,
      staminaRegen: 2,
      weight: 30,
      maxWeight: 100,
      day: 1,
      currentWeaponIndex: 0,
      weapons: [
        { id: "w1", name: "Sword", damage: 10, staminaCost: 20, cooldownTicks: 10, castTicks: 5, currentCooldown: 0, weight: 5, value: 100 },
        null, null, null, null, null
      ],
    },
    {
      id: "TestGhost",
      teamId: "B",
      hp: 100,
      maxHp: 100,
      stamina: 100,
      maxStamina: 100,
      staminaRegen: 1.5,
      weight: 40,
      maxWeight: 100,
      day: 10,
      currentWeaponIndex: 0,
      weapons: [
        { id: "w2", name: "Axe", damage: 15, staminaCost: 30, cooldownTicks: 20, castTicks: 0, currentCooldown: 0, weight: 8, value: 150 },
        null, null, null, null, null
      ],
    }
  ];

  console.log("Sending simulation request to server...");
  try {
    const response = await fetch("http://localhost:3001/battle/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ players }),
    });

    if (!response.ok) {
      console.error("Server returned error:", response.status, await response.text());
      return;
    }

    const data = await response.json();
    console.log("Success! Received BattleLog.");
    console.log("Initial State Players:", data.initialState.players.map((p: any) => p.id));
    console.log("Timeline Length:", data.timeline.length);
    console.log("Last Event Type:", data.timeline[data.timeline.length - 1].events[0].type);
  } catch (err) {
    console.error("Connection failed:", err);
  }
}

testSim();
