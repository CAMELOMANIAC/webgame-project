import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSetAtom } from "jotai";
import { motion } from "motion/react";
import { useState } from "react";

import { battleLogAtom } from "@/atoms/globalAtom";
import {
  currentNodeIdAtom,
  isCombatAtom,
  isNavigatingAtom,
  playerCoordsAtom,
  raidNoticeAtom,
  shortestPathAtom,
  targetNodeIdAtom,
} from "@/atoms/raidAtom";
import * as baseStyles from "@/components/lobby/BaseScreen.css";
import CharacterCollection from "@/components/lobby/CharacterCollection";
import { page } from "@/styles/theme.css";
import { useGearActions } from "@/utils/hooks/useGearActions";
import { useGetCharacter } from "@/utils/hooks/useGetCharacter";
import { useGetStash } from "@/utils/hooks/useGetStash";
import { useMoveStashItem } from "@/utils/hooks/useMoveStashItem";
import { useRaidSession } from "@/utils/hooks/useRaidSession";

import * as styles from "./staging.css";

export const Route = createFileRoute("/base/staging")({
  component: ExpeditionStagingScreen,
});

function ExpeditionStagingScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const characterQuery = useGetCharacter();
  const stashQuery = useGetStash();
  const { equip } = useGearActions();
  const moveItemMutation = useMoveStashItem();
  const { startRaid } = useRaidSession();

  const setNotice = useSetAtom(raidNoticeAtom);
  const setNode = useSetAtom(currentNodeIdAtom);
  const setIsCombat = useSetAtom(isCombatAtom);
  const setIsNavigating = useSetAtom(isNavigatingAtom);
  const setTarget = useSetAtom(targetNodeIdAtom);
  const setPath = useSetAtom(shortestPathAtom);
  const setCoords = useSetAtom(playerCoordsAtom);
  const setBattleLog = useSetAtom(battleLogAtom);

  const character = characterQuery.data?.raw;
  const stash = stashQuery.data ?? [];
  const backpack = character?.inventory ?? [];
  const filledBackpack = backpack.filter((slot) => Boolean(slot.weaponMaster));
  const gearLocked =
    !character || moveItemMutation.isPending || equip.isPending;

  const equippedWeapons =
    character?.equipment.filter((e) => e.weaponMaster) ?? [];
  const isArmed = equippedWeapons.length > 0;

  // 장비 장착 / 해제 / 이동 핸들러
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

  const handleMoveToBackpack = (weaponMasterId: string) => {
    if (!character || gearLocked) return;
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
    if (!character || gearLocked) return;
    moveItemMutation.mutate({
      characterId: character.id,
      direction: "to_stash",
      weaponMasterId,
      slotIndex,
    });
  };

  // 최종 출격 실행
  const handleConfirmDeploy = () => {
    if (!character || startRaid.isPending) return;
    startRaid.mutate(character.id, {
      onSuccess: ({ raid }) => {
        setNotice(null);
        setNode(raid.currentNodeId);
        setIsCombat(false);
        setIsNavigating(false);
        setTarget(null);
        setPath([]);
        setCoords(null);
        setBattleLog(null);
        void navigate({ to: "/field", replace: true });
      },
    });
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else {
      void navigate({ to: "/base" });
    }
  };

  const canProceedStep1 = Boolean(character && character.hp > 0);
  const canDeploy = Boolean(character && !startRaid.isPending);

  return (
    <div className={`${page} ${baseStyles.scrollPage}`}>
      <div className={styles.container}>
        {/* 텔레메트리 헤더 & 단계 숫자 인디케이터 */}
        <header className={styles.headerArea}>
          <div className={styles.headerTop}>
            <div className={styles.headerTitleGroup}>
              <button
                type="button"
                className={styles.backButton}
                onClick={handleBack}
                aria-label="이전 화면으로 이동"
              >
                <span className={styles.backArrow}>←</span>
              </button>
              <div>
                <span className={styles.telemetryCode}>
                  HL-LAB // EXPEDITION STAGING
                </span>
                <h1 className={styles.title}>원정 탐사 준비</h1>
              </div>
            </div>
            <div className={styles.stepBadge}>
              <span className={styles.stepNumber}>0{step}</span>
              <span className={styles.stepTotal}>/ 02</span>
            </div>
          </div>
          <p className={styles.stepDescription}>
            {step === 1
              ? "1단계: 이번 탐사에 투입할 대원을 선택하세요."
              : "2단계: 출격할 대원의 무기를 장착하고 공용 창고에서 물품을 보급하세요."}
          </p>
        </header>

        {/* STEP 1: 출격 대원 선택 (Character Selection) */}
        {step === 1 && (
          <div className={styles.contentArea}>
            <CharacterCollection readOnly={false} />

            {character ? (
              <div className={styles.summaryCard}>
                <div className={styles.summaryHeader}>
                  <h2 className={styles.summaryTitle}>선택된 출격 대원</h2>
                  <span className={styles.telemetryCode}>
                    OPERATOR // #{character.id.slice(0, 8)}
                  </span>
                </div>
                <div className={styles.operatorBanner}>
                  <span className={styles.operatorName}>
                    {character.displayName}
                  </span>
                  <span className={styles.operatorStatus}>
                    체력 {character.hp}/{character.maxHp} · 기력{" "}
                    {character.stamina}/{character.maxStamina} · 적재{" "}
                    {character.weight}/{character.maxWeight}kg
                  </span>
                </div>
              </div>
            ) : (
              <div className={styles.warningBox}>
                출격할 대원을 위 목록에서 선택해 주세요.
              </div>
            )}
          </div>
        )}

        {/* STEP 2: 장비창 및 장비 선택 (Loadout & Inventory) */}
        {step === 2 && character && (
          <div className={styles.contentArea}>
            {!isArmed && (
              <div className={styles.warningBox}>
                ⚠️ 주의: 현재 무기가 장착되어 있지 않습니다. 비무장 상태로 출격하면
                적대 개체와 조우 시 큰 피해를 입을 수 있습니다. 아래 창고에서 무기를
                장착하세요.
              </div>
            )}

            {startRaid.error && (
              <div className={styles.warningBox}>
                {startRaid.error.message}
              </div>
            )}

            <div className={baseStyles.inventoryStashArea}>
              {/* 1. 출격 장비 슬롯 */}
              <div className={baseStyles.sectionPanel}>
                <h2 className={baseStyles.sectionHeader}>
                  <span>출격 장비</span>
                  <span className={baseStyles.sectionCode}>
                    LOADOUT // {equippedWeapons.length}/
                    {character.equipment.length}
                  </span>
                </h2>
                <div className={baseStyles.itemGrid}>
                  {character.equipment.map((slot) =>
                    slot.weaponMaster ? (
                      <motion.button
                        key={slot.id}
                        disabled={gearLocked}
                        className={baseStyles.itemSlotButton({ equipped: true })}
                        onClick={() =>
                          equip.mutate({
                            characterId: character.id,
                            weaponMasterId: null,
                            slotIndex: slot.slotIndex,
                          })
                        }
                      >
                        <div className={baseStyles.slotTopMeta}>
                          <span>EQ-0{slot.slotIndex + 1}</span>
                          <span>해제</span>
                        </div>
                        <p className={baseStyles.itemName}>{slot.weaponMaster.name}</p>
                        <span className={baseStyles.itemDetails}>
                          DMG {slot.weaponMaster.damage} · {slot.weaponMaster.weight}kg
                        </span>
                      </motion.button>
                    ) : (
                      <div className={baseStyles.emptySlot} key={slot.id}>
                        <span className={baseStyles.emptySlotCode}>EMPTY</span>
                        <span className={baseStyles.emptySlotIndex}>
                          장비 {slot.slotIndex + 1}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>

              {/* 2. 공용 창고 */}
              <div className={baseStyles.sectionPanel}>
                <h2 className={baseStyles.sectionHeader}>
                  <span>거점 공용 창고</span>
                  <span className={baseStyles.sectionCode}>
                    STASH // {stash.length} ITEMS
                  </span>
                </h2>
                <div className={baseStyles.itemGrid}>
                  {stash.length === 0 ? (
                    <p className={baseStyles.emptyMessage}>보관 중인 물품이 없습니다.</p>
                  ) : (
                    stash.map((item) => (
                      <motion.button
                        disabled={gearLocked}
                        key={item.id}
                        className={baseStyles.itemSlotButton({ equipped: false })}
                        onClick={() => handleMoveToBackpack(item.weaponMasterId)}
                      >
                        <div className={baseStyles.slotTopMeta}>
                          <span>STASH</span>
                          <span className={baseStyles.quantityBadge}>
                            ×{item.quantity}
                          </span>
                        </div>
                        <p className={baseStyles.itemName}>{item.weaponMaster.name}</p>
                        <span className={baseStyles.itemDetails}>
                          DMG {item.weaponMaster.damage} · {item.weaponMaster.weight}kg
                        </span>
                      </motion.button>
                    ))
                  )}
                </div>
              </div>

              {/* 3. 출격 가방 */}
              <div className={baseStyles.sectionPanel}>
                <h2 className={baseStyles.sectionHeader}>
                  <span>출격 가방</span>
                  <span className={baseStyles.sectionCode}>
                    PACK // {filledBackpack.length} / 32
                  </span>
                </h2>
                <div className={baseStyles.itemGrid}>
                  {filledBackpack.length === 0 ? (
                    <p className={baseStyles.emptyMessage}>
                      가방에 보관 중인 물품이 없습니다.
                    </p>
                  ) : (
                    filledBackpack.map((slot) => (
                      <div className={baseStyles.slotActions} key={slot.id}>
                        <motion.button
                          disabled={gearLocked}
                          className={baseStyles.itemSlotButton({ equipped: false })}
                          onClick={() =>
                            handleMoveToStash(slot.weaponMaster!.id, slot.slotIndex)
                          }
                        >
                          <div className={baseStyles.slotTopMeta}>
                            <span>
                              #{String(slot.slotIndex + 1).padStart(2, "0")}
                            </span>
                            <span className={baseStyles.quantityBadge}>
                              ×{slot.quantity}
                            </span>
                          </div>
                          <p className={baseStyles.itemName}>
                            {slot.weaponMaster!.name}
                          </p>
                          <span className={baseStyles.itemDetails}>
                            DMG {slot.weaponMaster!.damage} · 창고 이관
                          </span>
                        </motion.button>
                        <button
                          type="button"
                          className={baseStyles.smallAction}
                          disabled={gearLocked}
                          onClick={() => handleEquip(slot.weaponMaster!.id)}
                        >
                          하나 장착
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 1 플로팅 하단 CTA 독 */}
        {step === 1 && canProceedStep1 && character && (
          <aside className={styles.floatingDock} aria-label="출격 대원 확정 독">
            <div className={styles.dockInfo}>
              <span className={styles.dockTag}>대원 선택 완료 // 01</span>
              <span className={styles.dockTitle}>
                {character.displayName} (체력 {character.hp}/{character.maxHp})
              </span>
            </div>
            <button
              type="button"
              className={styles.dockCtaButton()}
              onClick={() => setStep(2)}
            >
              <span>다음: 장비 선택</span>
              <span className={styles.buttonCode}>LOADOUT →</span>
            </button>
          </aside>
        )}

        {/* STEP 2 플로팅 하단 CTA 독 */}
        {step === 2 && canDeploy && character && (
          <aside className={styles.floatingDock} aria-label="원정 최종 출격 독">
            <div className={styles.dockInfo}>
              <span className={styles.dockTag}>원정 출격 준비 // 02</span>
              <span className={styles.dockTitle}>
                {character.displayName} · {equippedWeapons.length}개 무기 장착
              </span>
            </div>
            <button
              type="button"
              disabled={startRaid.isPending}
              className={styles.dockCtaButton()}
              onClick={handleConfirmDeploy}
            >
              <span>
                {startRaid.isPending ? "출격 인스턴스 전이 중…" : "최종 탐사 출격 승인"}
              </span>
              <span className={styles.buttonCode}>EMBARK → #00</span>
            </button>
          </aside>
        )}
      </div>
    </div>
  );
}