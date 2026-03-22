import { type Item, type User, type Weapon } from "@webgame/types";

// From weapon.ts - needed for mock data
const giantSlayer: Weapon = {
  id: "wpn_giant_slayer",
  name: "Giant Slayer",
  damage: 15,
  cooldownTicks: 12,
  currentCooldown: 0,
  staminaCost: 15,
  castTicks: 5,
  weight: 10,
  value: 200,
  strategy: "STRONGEST",
  use: () => [], // `use` function is server-side, not needed in client mock
};

const defaultWeapon2: Weapon = {
  id: "wpn_secondary",
  name: "secondary",
  damage: 5,
  cooldownTicks: 8,
  currentCooldown: 0,
  staminaCost: 5,
  castTicks: 0,
  weight: 3,
  value: 50,
  use: () => [],
};

const defaultWeapon: Weapon = {
  id: "wpn_primary",
  name: "primary",
  damage: 10,
  cooldownTicks: 10,
  currentCooldown: 0,
  staminaCost: 10,
  castTicks: 0,
  weight: 5,
  value: 100,
  use: () => [],
};

// Mock items to be dropped
const smallHealthPotion: Item = { id: "item_hp_small", name: "Small Health Potion", weight: 0.1, value: 20 };
const ironScraps: Item = { id: "item_iron_scraps", name: "Iron Scraps", weight: 0.5, value: 5 };
const rareGem: Item = { id: "item_rare_gem", name: "Rare Gem", weight: 0.05, value: 500 };
// ---

const getMockPlayers = (): User[] => [
  {
    id: "Hero (You)",
    teamId: "TeamA",
    hp: 100,
    maxHp: 100,
    stamina: 100,
    maxStamina: 100,
    staminaRegen: 2,
    weight: 30,
    maxWeight: 100,
    day: 1,
    currentWeaponIndex: 0,
    weapons: [defaultWeapon, defaultWeapon2, null, null, null, null],
  },
  {
    id: "Ghost (Veteran)",
    teamId: "TeamB",
    hp: 120,
    maxHp: 120,
    stamina: 100,
    maxStamina: 100,
    staminaRegen: 1.5,
    weight: 50,
    maxWeight: 120,
    day: 15,
    currentWeaponIndex: 0,
    weapons: [giantSlayer, null, null, null, null, null],
    droppedItems: [smallHealthPotion, ironScraps], // Added dropped items
  },
  {
    id: "Scavenger NPC",
    teamId: "TeamB",
    hp: 40,
    maxHp: 40,
    stamina: 50,
    maxStamina: 50,
    staminaRegen: 1,
    weight: 10,
    maxWeight: 60,
    day: 5,
    currentWeaponIndex: 0,
    weapons: [defaultWeapon2, null, null, null, null, null],
    droppedItems: [ironScraps, rareGem], // Added dropped items
  },
];

/**
 * Mocks a server call to find a match.
 * In the future, this will make an actual API call.
 */
export async function findMatch(): Promise<User[]> {
  console.log("Finding match... (mocked)");
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 750));

  const players = getMockPlayers();
  console.log("Match found:", players);
  return players;
}
