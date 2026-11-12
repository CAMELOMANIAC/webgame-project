import type { BattleLog } from "@webgame/types";

export async function openBattleTimeline(
  retreat: NonNullable<BattleLog["retreat"]>,
  key: string,
): Promise<Pick<BattleLog, "timeline" | "finalState" | "result">> {
  const decode = (base64: string) =>
    Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
  const secret = await crypto.subtle.importKey("raw", decode(key), "AES-GCM", false, ["decrypt"]);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: decode(retreat.iv) },
    secret,
    decode(retreat.ciphertext),
  );
  return JSON.parse(new TextDecoder().decode(plaintext)) as Pick<BattleLog, "timeline" | "finalState" | "result">;
}
