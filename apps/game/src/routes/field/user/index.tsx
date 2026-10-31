import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAtom, useAtomValue } from "jotai";
import { motion } from "motion/react";

import { battleLogAtom } from "@/atoms/globalAtom";
import {
  pendingNavigationAtom,
  pendingNavigationKey,
} from "@/atoms/pendingNavigationAtom";
import {
  currentNodeIdAtom,
  isCombatAtom,
  isNavigatingAtom,
  playerCoordsAtom,
  raidNoticeAtom,
  shortestPathAtom,
  targetNodeIdAtom,
} from "@/atoms/raidAtom";
import { CharacterCard } from "@/components/lobby/CharacterCard";
import CharacterCollection from "@/components/lobby/CharacterCollection";
import { page } from "@/styles/theme.css";
import { useGearActions } from "@/utils/hooks/useGearActions";
import { useGetCharacter } from "@/utils/hooks/useGetCharacter";
import { useGetStash } from "@/utils/hooks/useGetStash";
import { useMoveStashItem } from "@/utils/hooks/useMoveStashItem";
import { useRaidRules } from "@/utils/hooks/useRaidRules";
import { useRaidSession } from "@/utils/hooks/useRaidSession";

import * as styles from "./index.css";

export const Route = createFileRoute("/field/user/")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const {
    data: characterData,
    isLoading: charLoading,
    error: characterError,
    refetch: refetchCharacter,
  } = useGetCharacter();
  const {
    data: stashData,
    isLoading: stashLoading,
    error: stashError,
    refetch: refetchStash,
  } = useGetStash();
  const { equip, supplies } = useGearActions();
  const { data: rules } = useRaidRules();

  const moveItemMutation = useMoveStashItem();
  const { startRaid } = useRaidSession();

  const [, setCurrentNodeId] = useAtom(currentNodeIdAtom);
  const [, setIsCombat] = useAtom(isCombatAtom);
  const [, setIsNavigating] = useAtom(isNavigatingAtom);
  const [, setTargetNodeId] = useAtom(targetNodeIdAtom);
  const [, setShortestPath] = useAtom(shortestPathAtom);
  const [, setPlayerCoords] = useAtom(playerCoordsAtom);
  const [, setBattleLog] = useAtom(battleLogAtom);
  const [notice, setNotice] = useAtom(raidNoticeAtom);
  const pendingResults = useAtomValue(pendingNavigationAtom);

  if (charLoading || stashLoading) {
    return (
      <div className={page}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner} />
          <p className={styles.loadingText}>HL-LAB // 데이터 동기화 중...</p>
        </div>
      </div>
    );
  }

  const character = characterData?.raw;
  const stash = stashData || [];
  const backpack = character?.inventory || [];
  const busy =
    startRaid.isPending ||
    moveItemMutation.isPending ||
    equip.isPending ||
    supplies.isPending;
  const hasPendingResult =
    !!pendingResults[pendingNavigationKey(character?.userId, character?.id)];
  const gearLocked = busy || !!character?.isRaiding || hasPendingResult;
  const error =
    characterError ??
    stashError ??
    startRaid.error ??
    moveItemMutation.error ??
    equip.error ??
    supplies.error;

  if (characterError || stashError)
    return (
      <div className={page}>
        <div className={styles.lobbyContainer}>
          <p className={styles.banner({ tone: "negative" })} role="alert">
            생존자 정보를 불러오지 못했습니다.
          </p>
          <button
            type="button"
            className={styles.smallAction}
            onClick={() => {
              void refetchCharacter();
              void refetchStash();
            }}
          >
            다시 불러오기
          </button>
        </div>
      </div>
    );

  const handleEquip = (weaponMasterId: string) => {
    if (!character || gearLocked) return;
    const slot = character.equipment.find((item) => !item.weaponMaster);
    if (!slot) {
      alert("출격 장비 슬롯이 가득 찼습니다.");
      return;
    }
    equip.mutate({
      characterId: character.id,
      weaponMasterId,
      slotIndex: slot.slotIndex,
    });
  };

  const handleRaidAction = () => {
    if (!character) return;
    if (character.isRaiding || hasPendingResult) {
      navigate({ to: "/field" });
    } else {
      startRaid.mutate(character.id, {
        onSuccess: () => {
          setNotice(null);
          setCurrentNodeId(0);
          setIsCombat(false);
          setIsNavigating(false);
          setTargetNodeId(null);
          setShortestPath([]);
          setPlayerCoords(null);
          setBattleLog(null);
          navigate({ to: "/field" });
        },
      });
    }
  };

  const handleMoveToBackpack = (weaponMasterId: string) => {
    if (!character) return;
    const emptySlot = backpack.find((slot) => !slot.weaponMaster);
    if (!emptySlot) {
      alert("가방 슬롯이 가득 찼습니다.");
      return;
    }

    moveItemMutation.mutate({
      characterId: character.id,
      direction: "to_backpack",
      weaponMasterId,
      slotIndex: emptySlot.slotIndex,
    });
  };

  const handleMoveToStash = (weaponMasterId: string, slotIndex: number) => {
    if (!character) return;

    moveItemMutation.mutate({
      characterId: character.id,
      direction: "to_stash",
      weaponMasterId,
      slotIndex,
    });
  };

  return (
    <div className={page} style={{ overflowY: "auto", paddingBottom: "96px" }}>
      <div className={styles.lobbyContainer}>
        {/* 상단 텔레메트리 헤더 */}
        <div className={styles.headerArea}>
          <div className={styles.headerTop}>
            <span className={styles.subTitle}>HL-LAB // SEC-00</span>
            <span className={styles.subTitle}>STANDBY BAY</span>
          </div>
          <h1 className={styles.mainTitle}>거점 출격 편성</h1>
          <p className={styles.leadText}>
            한림 복귀 실험실 · 정비와 신체 검사를 마치고 서포시로 출격합니다.
          </p>
          <Link to="/field/quest" className={styles.missionLink}>
            <span>한림그룹 임무 통신 확인</span>
            <span className={styles.linkCode}>COMM →</span>
          </Link>
        </div>

        {error && (
          <p className={styles.banner({ tone: "negative" })} role="alert">
            {error.message}
          </p>
        )}
        {notice && (
          <p className={styles.banner({ tone: "positive" })} role="status">
            {notice}
          </p>
        )}

        <CharacterCollection disabled={gearLocked} />

        {character?.isRaiding && (
          <p className={styles.banner({ tone: "negative" })}>
            탐사 중에는 창고와 장비를 변경할 수 없습니다. 탐사를 마치고
            복귀하세요.
          </p>
        )}

        {character &&
          !gearLocked &&
          rules?.basicSuppliesEnabled &&
          stash.length === 0 &&
          !backpack.some((item) => item.weaponMaster) &&
          !character.equipment.some((item) => item.weaponMaster) && (
            <button
              type="button"
              className={styles.supplyButton}
              onClick={() => supplies.mutate(character.id)}
            >
              한림그룹 기본 장비 지원 받기
            </button>
          )}

        {/* 메인 정보 레이아웃 */}
        <div className={styles.mainGrid}>
          <CharacterCard
            character={character}
            onRaidAction={handleRaidAction}
            disabled={busy || !character}
            pendingResult={hasPendingResult}
          />

          {/* 창고 <-> 가방 아이템 정비 영역 */}
          <div className={styles.inventoryStashArea}>
            <div className={styles.sectionPanel}>
              <h3 className={styles.sectionHeader}>
                <span>출격 장비</span>
                <span className={styles.sectionCode}>
                  LOADOUT //{" "}
                  {character?.equipment.filter((e) => e.weaponMaster).length ??
                    0}
                  /{character?.equipment.length ?? 0}
                </span>
              </h3>
              <div className={styles.itemGrid}>
                {character?.equipment.map((slot) =>
                  slot.weaponMaster ? (
                    <motion.button
                      key={slot.id}
                      disabled={gearLocked}
                      className={styles.itemSlotButton({ equipped: true })}
                      onClick={() =>
                        character &&
                        equip.mutate({
                          characterId: character.id,
                          weaponMasterId: null,
                          slotIndex: slot.slotIndex,
                        })
                      }
                    >
                      <div className={styles.slotTopMeta}>
                        <span>EQ-0{slot.slotIndex + 1}</span>
                        <span>해제</span>
                      </div>
                      <p className={styles.itemName}>{slot.weaponMaster.name}</p>
                      <span className={styles.itemDetails}>
                        DMG {slot.weaponMaster.damage} ·{" "}
                        {slot.weaponMaster.weight}kg
                      </span>
                    </motion.button>
                  ) : (
                    <div className={styles.emptySlot} key={slot.id}>
                      <span className={styles.emptySlotCode}>EMPTY</span>
                      <span className={styles.emptySlotIndex}>
                        장비 {slot.slotIndex + 1}
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>

            {/* 1. 창고 (Stash) */}
            <div className={styles.sectionPanel}>
              <h3 className={styles.sectionHeader}>
                <span>거점 공용 창고</span>
                <span className={styles.sectionCode}>
                  STASH // {stash.length} ITEMS
                </span>
              </h3>
              <div className={styles.itemGrid}>
                {stash.length === 0 ? (
                  <p className={styles.emptyMessage}>보관 중인 물품이 없습니다.</p>
                ) : (
                  stash.map((item) => (
                    <motion.button
                      disabled={gearLocked}
                      key={item.id}
                      className={styles.itemSlotButton({ equipped: false })}
                      onClick={() => handleMoveToBackpack(item.weaponMasterId)}
                    >
                      <div className={styles.slotTopMeta}>
                        <span>STASH</span>
                        <span className={styles.quantityBadge}>×{item.quantity}</span>
                      </div>
                      <p className={styles.itemName}>{item.weaponMaster.name}</p>
                      <span className={styles.itemDetails}>
                        DMG {item.weaponMaster.damage} ·{" "}
                        {item.weaponMaster.weight}kg
                      </span>
                    </motion.button>
                  ))
                )}
              </div>
            </div>

            {/* 2. 가방 (Backpack) */}
            <div className={styles.sectionPanel}>
              <h3 className={styles.sectionHeader}>
                <span>출격 가방</span>
                <span className={styles.sectionCode}>
                  PACK // {backpack.filter((b) => b.weaponMaster).length} / 32
                </span>
              </h3>
              <div className={styles.itemGrid}>
                {backpack.map((slot, index) => {
                  if (slot.weaponMaster) {
                    return (
                      <div className={styles.slotActions} key={slot.id}>
                        <motion.button
                          disabled={gearLocked}
                          key={slot.id}
                          className={styles.itemSlotButton({ equipped: false })}
                          onClick={() =>
                            handleMoveToStash(
                              slot.weaponMaster!.id,
                              slot.slotIndex,
                            )
                          }
                        >
                          <div className={styles.slotTopMeta}>
                            <span>
                              #{String(slot.slotIndex + 1).padStart(2, "0")}
                            </span>
                            <span className={styles.quantityBadge}>
                              ×{slot.quantity}
                            </span>
                          </div>
                          <p className={styles.itemName}>
                            {slot.weaponMaster.name}
                          </p>
                          <span className={styles.itemDetails}>
                            DMG {slot.weaponMaster.damage} · 창고 이관
                          </span>
                        </motion.button>
                        <button
                          type="button"
                          className={styles.smallAction}
                          disabled={gearLocked}
                          onClick={() => handleEquip(slot.weaponMaster!.id)}
                        >
                          하나 장착
                        </button>
                      </div>
                    );
                  } else {
                    return (
                      <div className={styles.emptySlot} key={`empty-${index}`}>
                        <span className={styles.emptySlotCode}>SLOT</span>
                        <span className={styles.emptySlotIndex}>
                          {String(index + 1).padStart(2, "0")}
                        </span>
                      </div>
                    );
                  }
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
