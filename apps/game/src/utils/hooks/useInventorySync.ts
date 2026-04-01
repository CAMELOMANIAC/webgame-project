import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { type CharacterData, useGetCharacter } from "./useGetCharacter";
import { useSyncItemsMutation } from "./useSyncItemsMutation";

export type SlotType = "EQUIPMENT" | "BACKPACK";

interface SlotInfo {
  type: SlotType;
  index: number;
}

/**
 * 인벤토리의 로컬 상태 관리(캐시 수정) 및 서버 동기화를 담당하는 훅
 */
export const useInventorySync = (currentTab: string | undefined) => {
  const queryClient = useQueryClient();
  const { data: characterData } = useGetCharacter();
  const syncMutation = useSyncItemsMutation();
  const prevTabRef = useRef<string | undefined>(currentTab);

  // 1. 백팩 닫힘 감지 및 서버 동기화
  useEffect(() => {
    if (prevTabRef.current === "backpack" && currentTab !== "backpack") {
      if (characterData) {
        console.log("Backpack closed. Syncing with server...");
        syncMutation.mutate({
          characterId: characterData.raw.id,
          data: characterData,
        });
      }
    }
    prevTabRef.current = currentTab;
  }, [currentTab, characterData, syncMutation]);

  /**
   * 두 슬롯 간의 아이템을 교체(Swap)하고 로컬 캐시를 업데이트합니다.
   */
  const moveItem = (from: SlotInfo, to: SlotInfo) => {
    if (!characterData) return;

    // 캐시 데이터 깊은 복사 (정규화된 구조 유지)
    const newData: CharacterData = JSON.parse(JSON.stringify(characterData));
    const { equipment, inventory } = newData.raw;

    // 1. 소스 및 타겟 아이템 추출
    const sourceList = from.type === "EQUIPMENT" ? equipment : inventory;
    const targetList = to.type === "EQUIPMENT" ? equipment : inventory;

    const sourceItem = sourceList[from.index];
    const targetItem = targetList[to.index];

    if (!sourceItem || !targetItem) return;

    // 2. 위치 교체 및 slotIndex 보정
    // 원본 위치에 대상 위치의 아이템(혹은 빈 슬롯)을 넣음
    sourceList[from.index] = {
      ...targetItem,
      slotIndex: from.index,
    };

    // 대상 위치에 원본 위치의 아이템을 넣음
    targetList[to.index] = {
      ...sourceItem,
      slotIndex: to.index,
    };

    // 3. React Query 캐시 강제 업데이트 (UI 즉시 반영)
    queryClient.setQueryData(["character", characterData.raw.userId], newData);
  };

  return {
    moveItem,
    isSyncing: syncMutation.isPending,
  };
};
