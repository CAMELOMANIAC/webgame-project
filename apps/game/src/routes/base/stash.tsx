import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";

import { BaseScreen } from "@/components/lobby/BaseScreen";
import * as styles from "@/components/lobby/BaseScreen.css";
import CharacterCollection from "@/components/lobby/CharacterCollection";
import { useGearActions } from "@/utils/hooks/useGearActions";
import { useGetCharacter } from "@/utils/hooks/useGetCharacter";
import { useGetStash } from "@/utils/hooks/useGetStash";
import { useMoveStashItem } from "@/utils/hooks/useMoveStashItem";

export const Route = createFileRoute("/base/stash")({ component: StashScreen });

function StashScreen() {
  const characterQuery = useGetCharacter();
  const stashQuery = useGetStash();
  const { equip } = useGearActions();
  const moveItemMutation = useMoveStashItem();
  const character = characterQuery.data?.raw;
  const stash = stashQuery.data ?? [];
  const backpack = character?.inventory ?? [];
  const filledBackpack = backpack.filter((slot) => Boolean(slot.weaponMaster));
  const gearLocked =
    !character || moveItemMutation.isPending || equip.isPending;
  const error = stashQuery.error ?? moveItemMutation.error ?? equip.error;

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

  return (
    <BaseScreen
      title="거점 정비소"
      description="출격할 개체를 선택하고 공용 창고에서 장비와 물품을 정비합니다."
    >
      <CharacterCollection readOnly={false} />
      {stashQuery.isLoading && <p>창고를 불러오는 중입니다.</p>}
      {error && (
        <p className={styles.banner({ tone: "negative" })} role="alert">
          {error.message}
        </p>
      )}
      {stashQuery.isError && (
        <button
          type="button"
          className={styles.smallAction}
          onClick={() => void stashQuery.refetch()}
        >
          다시 불러오기
        </button>
      )}
      <div className={styles.inventoryStashArea}>
        <div className={styles.sectionPanel}>
          <h3 className={styles.sectionHeader}>
            <span>출격 장비</span>
            <span className={styles.sectionCode}>
              LOADOUT //{" "}
              {character?.equipment.filter((e) => e.weaponMaster).length ?? 0}/
              {character?.equipment.length ?? 0}
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
                    DMG {slot.weaponMaster.damage} · {slot.weaponMaster.weight}
                    kg
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
                    <span className={styles.quantityBadge}>
                      ×{item.quantity}
                    </span>
                  </div>
                  <p className={styles.itemName}>{item.weaponMaster.name}</p>
                  <span className={styles.itemDetails}>
                    DMG {item.weaponMaster.damage} · {item.weaponMaster.weight}
                    kg
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
              PACK // {filledBackpack.length} / 32
            </span>
          </h3>
          <div className={styles.itemGrid}>
            {filledBackpack.length === 0 ? (
              <p className={styles.emptyMessage}>
                가방에 보관 중인 물품이 없습니다.
              </p>
            ) : (
              filledBackpack.map((slot) => (
                <div className={styles.slotActions} key={slot.id}>
                  <motion.button
                    disabled={gearLocked}
                    className={styles.itemSlotButton({ equipped: false })}
                    onClick={() =>
                      handleMoveToStash(slot.weaponMaster!.id, slot.slotIndex)
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
                      {slot.weaponMaster!.name}
                    </p>
                    <span className={styles.itemDetails}>
                      DMG {slot.weaponMaster!.damage} · 창고 이관
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
              ))
            )}
          </div>
        </div>
      </div>
    </BaseScreen>
  );
}
