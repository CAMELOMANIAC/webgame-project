import {
  type BattleEvent,
  getCatalogItemById,
  getCatalogItemByName,
} from "@webgame/types";
import { useAtom, useAtomValue } from "jotai";
import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";

import { selectedCombatantIdAtom } from "@/atoms/battleLayoutAtom";
import {
  battleLogAtom,
  type BattlePlaybackSpeed,
  battlePlaybackSpeedAtom,
  currentTimeAtom,
  displayEventsAtom,
  processedEventsAtom,
} from "@/atoms/globalAtom";
import { useGetCharacter } from "@/utils/hooks/useGetCharacter";
import { useSlotInteraction } from "@/utils/hooks/useSlotInteraction";

import * as styles from "./CombatLog.css";

const OVERLOAD_START_TICK = 40;

const PLAYBACK_SPEED_OPTIONS: readonly {
  value: BattlePlaybackSpeed;
  label: string;
  ariaLabel: string;
}[] = [
  { value: 0, label: "||", ariaLabel: "전투 일시정지" },
  { value: 0.5, label: "0.5x", ariaLabel: "0.5배속 재생" },
  { value: 1, label: "1x", ariaLabel: "1배속 재생" },
  { value: 2, label: "2x", ariaLabel: "2배속 재생" },
];

const CombatLog = () => {
  const processedEvents = useAtomValue(processedEventsAtom);
  const displayEvents = useAtomValue(displayEventsAtom);
  const currentTime = useAtomValue(currentTimeAtom);
  const [playbackSpeed, setPlaybackSpeed] = useAtom(battlePlaybackSpeedAtom);
  const battle = useAtomValue(battleLogAtom);
  const selectedCombatantId = useAtomValue(selectedCombatantIdAtom);
  const { onInspectSlot } = useSlotInteraction();
  const { data: characterData } = useGetCharacter();
  const characterId = characterData?.raw.id;
  const selfPlayer = battle?.initialState.players.find(
    (player) => player.id === characterId,
  );

  const summonedPlayers = useMemo(
    () =>
      processedEvents
        .filter(
          (e): e is (typeof processedEvents)[number] & { type: "SUMMON" } =>
            e.type === "SUMMON",
        )
        .map((e) => e.combatant),
    [processedEvents],
  );

  const unitTelemetryList = useMemo(() => {
    if (!battle) return [];
    const allUnits = [...battle.initialState.players, ...summonedPlayers].filter(
      (player) => player.id !== characterId,
    );
    const seen = new Set<string>();
    const uniqueUnits = allUnits.filter((combatant) => {
      if (seen.has(combatant.id)) return false;
      seen.add(combatant.id);
      return true;
    });

    return uniqueUnits.map((combatant) => {
      let hp = combatant.hp;
      let shield = combatant.shield ?? 0;
      let isDead = combatant.hp <= 0;
      const castingSlots = new Set<number>();

      for (const event of processedEvents) {
        if (event.type === "SHIELD" && event.targetId === combatant.id) {
          shield = event.currentShield;
        }
        if (event.type === "DAMAGE" && event.targetId === combatant.id) {
          hp = event.remainingHp;
          shield = event.remainingShield ?? 0;
        }
        if (event.type === "HEAL" && event.targetId === combatant.id) {
          hp = event.remainingHp;
        }
        if (event.type === "DEATH" && event.playerId === combatant.id) {
          hp = 0;
          isDead = true;
        }
        if (event.type === "CAST_START" && event.actorId === combatant.id) {
          castingSlots.add(event.weaponIndex);
        }
        if (
          (event.type === "CAST_COMPLETE" || event.type === "CAST_CANCEL") &&
          event.actorId === combatant.id
        ) {
          castingSlots.delete(event.weaponIndex);
        }
      }

      const activeAttackSlot = displayEvents.find(
        (e): e is BattleEvent & { type: "ATTACK" } =>
          e.type === "ATTACK" && e.actorId === combatant.id,
      )?.weaponIndex;

      const equippedWeapons = combatant.weapons
        .map((weapon, slotIndex) => (weapon ? { slotIndex, weapon } : null))
        .filter(
          (
            entry,
          ): entry is {
            slotIndex: number;
            weapon: NonNullable<(typeof combatant.weapons)[number]>;
          } => entry !== null,
        );

      const isAlly = Boolean(selfPlayer && combatant.teamId === selfPlayer.teamId);

      return {
        id: combatant.id,
        name: combatant.name,
        hp,
        maxHp: combatant.maxHp,
        shield,
        isDead,
        isAlly,
        equippedWeapons,
        activeAttackSlot,
        castingSlots,
      };
    });
  }, [
    battle,
    characterId,
    selfPlayer,
    summonedPlayers,
    processedEvents,
    displayEvents,
  ]);

  const autoFocusedUnitId = useMemo(() => {
    if (unitTelemetryList.length === 0) return null;
    const aliveIds = new Set(
      unitTelemetryList.filter((u) => !u.isDead).map((u) => u.id),
    );
    const recentEvents = [...displayEvents, ...processedEvents].reverse();
    for (const event of recentEvents) {
      if ("actorId" in event && aliveIds.has(event.actorId)) {
        return event.actorId;
      }
      if ("targetId" in event && aliveIds.has(event.targetId)) {
        return event.targetId;
      }
    }
    return (
      unitTelemetryList.find((u) => !u.isDead && !u.isAlly)?.id ??
      unitTelemetryList.find((u) => !u.isDead)?.id ??
      unitTelemetryList[0]?.id ??
      null
    );
  }, [unitTelemetryList, displayEvents, processedEvents]);

  const activeUnit = useMemo(() => {
    if (unitTelemetryList.length === 0) return null;
    if (selectedCombatantId) {
      const pinned = unitTelemetryList.find(
        (u) => u.id === selectedCombatantId && !u.isDead,
      );
      if (pinned) return pinned;
    }
    return (
      unitTelemetryList.find((u) => u.id === autoFocusedUnitId) ??
      unitTelemetryList[0] ??
      null
    );
  }, [unitTelemetryList, selectedCombatantId, autoFocusedUnitId]);

  const isOverload = currentTime >= OVERLOAD_START_TICK;

  const logEntries = processedEvents
    .flatMap((event, index) => {
      if (
        event.type !== "ATTACK" &&
        event.type !== "SHIELD" &&
        event.type !== "HEAL" &&
        event.type !== "SUMMON" &&
        event.type !== "SYNERGY"
      ) {
        return [];
      }

      let damageAmount: number | null = null;
      if (event.type === "ATTACK") {
        for (let i = index + 1; i < processedEvents.length; i++) {
          const next = processedEvents[i]!;
          if (next.timestamp !== event.timestamp) break;
          if (next.type === "ATTACK") break;
          if (next.type === "DAMAGE" && next.targetId === event.targetId) {
            damageAmount = next.amount;
            break;
          }
        }
      }

      return [{ event, damageAmount }];
    })
    .slice(-10);

  return (
    <div className={styles.combatWidget}>
      <div className={styles.headerRow}>
        <div className={styles.headerLeft}>
          <h3 className={styles.subTitle}>전투 로그</h3>
        </div>
        <div className={styles.headerRight}>
          <div
            className={styles.speedControlGroup}
            role="group"
            aria-label="전투 재생 속도"
          >
            {PLAYBACK_SPEED_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={styles.speedButton({
                  active: playbackSpeed === option.value,
                })}
                aria-label={option.ariaLabel}
                aria-pressed={playbackSpeed === option.value}
                onClick={() => setPlaybackSpeed(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <span className={styles.tickBadge({ overload: isOverload })}>
            {isOverload
              ? `OVERLOAD · T${String(currentTime).padStart(2, "0")}`
              : `T${String(currentTime).padStart(2, "0")}`}
          </span>
        </div>
      </div>

      {activeUnit && (
        <div className={styles.enemyTelemetry}>
          <div className={styles.enemyMetaRow}>
            <div className={styles.enemyIdentity}>
              <span className={styles.enemyName}>{activeUnit.name}</span>
            </div>
            <div className={styles.enemyVitals}>
              {activeUnit.shield > 0 && (
                <span className={styles.enemyShieldText}>
                  SHD +{activeUnit.shield}
                </span>
              )}
              <span
                className={styles.enemyHpText({
                  tone: activeUnit.isAlly ? "ally" : "enemy",
                })}
              >
                HP {activeUnit.hp}/{activeUnit.maxHp}
              </span>
            </div>
          </div>

          {activeUnit.equippedWeapons.length > 0 && (
            <div className={styles.enemyLoadoutRow}>
              {activeUnit.equippedWeapons.map(({ slotIndex, weapon }) => {
                const state =
                  activeUnit.activeAttackSlot === slotIndex
                    ? "attacking"
                    : activeUnit.castingSlots.has(slotIndex)
                      ? "casting"
                      : "idle";
                const catalogItem =
                  getCatalogItemById(weapon.id) ??
                  getCatalogItemByName(weapon.name);
                return (
                  <button
                    key={`${activeUnit.id}-slot-${slotIndex}`}
                    type="button"
                    className={styles.enemyWeaponChip({ state })}
                    onClick={() =>
                      onInspectSlot?.({
                        source: "combatant",
                        index: slotIndex,
                        ownerName: activeUnit.name,
                        weaponData: weapon,
                        item: {
                          id: `${activeUnit.id}-slot-${slotIndex}`,
                          masterId: catalogItem?.id ?? weapon.id,
                          name: weapon.name,
                          iconKey: catalogItem?.iconKey,
                          weight: weapon.weight ?? catalogItem?.weight ?? 0,
                          value: catalogItem?.value ?? 0,
                        },
                      })
                    }
                  >
                    <span className={styles.enemyWeaponSlotIndex}>
                      0{slotIndex + 1}
                    </span>
                    <span>{weapon.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <ul className={styles.actionLogList}>
        <AnimatePresence initial={false} mode="popLayout">
          {[...logEntries].reverse().map(({ event, damageAmount }) => {
            const participantId =
              "actorId" in event
                ? event.actorId
                : event.type === "SUMMON"
                  ? event.summonerId
                  : event.type === "SHIELD" || event.type === "HEAL"
                    ? event.targetId
                    : null;
            const actorPlayer = participantId
              ? (battle?.initialState.players.find(
                  (player) => player.id === participantId,
                ) ??
                summonedPlayers.find((player) => player.id === participantId))
              : undefined;
            const actorName = actorPlayer?.name ?? participantId ?? "SYSTEM";
            const role: "self" | "ally" | "enemy" =
              actorPlayer && actorPlayer.id === characterId
                ? "self"
                : actorPlayer &&
                    selfPlayer &&
                    actorPlayer.teamId === selfPlayer.teamId
                  ? "ally"
                  : "enemy";

            const title =
              event.type === "ATTACK"
                ? (actorPlayer?.weapons?.[event.weaponIndex]?.name ?? "공격")
                : event.type === "SYNERGY"
                  ? (actorPlayer?.weapons?.[event.sourceSlotIndex]?.name ??
                    "장비 발동")
                  : event.type === "SHIELD"
                    ? (event.weaponIndex !== undefined
                        ? (actorPlayer?.weapons?.[event.weaponIndex]?.name ??
                          "보호막")
                        : "보호막")
                    : event.type === "HEAL"
                      ? "회복"
                      : `소환 · ${event.combatant.name}`;

            const amountText =
              event.type === "ATTACK"
                ? damageAmount !== null
                  ? `-${damageAmount}`
                  : ""
                : event.type === "SYNERGY" || event.type === "SUMMON"
                  ? ""
                  : `+${event.amount}`;

            const amountTone:
              | "damage"
              | "heal"
              | "shield"
              | "neutral" =
              event.type === "ATTACK"
                ? damageAmount !== null && damageAmount > 0
                  ? "damage"
                  : "neutral"
                : event.type === "HEAL"
                  ? "heal"
                  : event.type === "SHIELD"
                    ? "shield"
                    : "neutral";

            return (
              <motion.li
                key={`${event.id}-${event.timestamp}`}
                className={styles.actionLogItem({ role })}
                layout
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
              >
                <div
                  className={styles.actionLogPortrait}
                  aria-hidden="true"
                />
                <div className={styles.actionLogText}>
                  <div className={styles.actionLogHeader}>
                    <span className={styles.actionLogTitle}>{title}</span>
                  </div>
                  <div className={styles.actionLogFooter}>
                    {amountText && (
                      <span
                        className={styles.actionLogAmount({ tone: amountTone })}
                      >
                        {amountText}
                      </span>
                    )}
                    <p className={styles.actionLogActor}>{actorName}</p>
                  </div>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </div>
  );
};

export default CombatLog;
