import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAtomValue, useSetAtom } from "jotai";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { selectedUserIdAtom } from "@/atoms/authAtom";
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
import { LoadoutEditor } from "@/components/lobby/LoadoutEditor";
import { page } from "@/styles/theme.css";
import { characterKey } from "@/utils/hooks/useCharacterCollection";
import {
  type CharacterData,
  useGetCharacter,
} from "@/utils/hooks/useGetCharacter";
import {
  type StashItemResponse,
  useGetStash,
} from "@/utils/hooks/useGetStash";
import { useRaidSession } from "@/utils/hooks/useRaidSession";

import * as styles from "./staging.css";

interface StagingLoadoutDraft {
  characterId: string;
  characterData: CharacterData;
  stash: StashItemResponse[];
}

export const Route = createFileRoute("/base/staging")({
  component: ExpeditionStagingScreen,
});

function ExpeditionStagingScreen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const selectedUserId = useAtomValue(selectedUserIdAtom);
  const [step, setStep] = useState<1 | 2>(1);
  const [draft, setDraft] = useState<StagingLoadoutDraft | null>(null);
  const characterQuery = useGetCharacter();
  const stashQuery = useGetStash();
  const { startRaid } = useRaidSession();

  const setNotice = useSetAtom(raidNoticeAtom);
  const setNode = useSetAtom(currentNodeIdAtom);
  const setIsCombat = useSetAtom(isCombatAtom);
  const setIsNavigating = useSetAtom(isNavigatingAtom);
  const setTarget = useSetAtom(targetNodeIdAtom);
  const setPath = useSetAtom(shortestPathAtom);
  const setCoords = useSetAtom(playerCoordsAtom);
  const setBattleLog = useSetAtom(battleLogAtom);

  const serverCharacterData = characterQuery.data;
  const serverStash = stashQuery.data ?? [];
  const activeDraft =
    draft &&
    serverCharacterData &&
    draft.characterId === serverCharacterData.raw.id
      ? draft
      : null;
  const effectiveCharacterData = activeDraft
    ? activeDraft.characterData
    : serverCharacterData;
  const effectiveStash = activeDraft ? activeDraft.stash : serverStash;
  const character = effectiveCharacterData?.raw;

  const equippedWeapons =
    character?.equipment.filter((e) => e.weaponMaster) ?? [];
  const isArmed = equippedWeapons.length > 0;

  // 최종 배치 실행 (이동/장착 변경사항을 배치 시작 요청과 함께 한 번에 전송)
  const handleConfirmDeploy = () => {
    if (!character || !effectiveCharacterData || startRaid.isPending) return;
    const equipment = effectiveCharacterData.raw.equipment
      .filter((w) => w.weaponMaster !== null)
      .map((w) => ({
        weaponMasterId: w.weaponMaster!.id,
        slotIndex: w.slotIndex,
      }));
    const inventory = effectiveCharacterData.raw.inventory
      .filter((i) => i.weaponMaster !== null && i.quantity > 0)
      .map((i) => ({
        weaponMasterId: i.weaponMaster!.id,
        slotIndex: i.slotIndex,
        quantity: i.quantity,
      }));

    startRaid.mutate(
      {
        characterId: character.id,
        loadout: { equipment, inventory },
      },
      {
        onSuccess: ({ raid }) => {
          queryClient.setQueryData<CharacterData>(
            characterKey(selectedUserId, character.id),
            {
              ...effectiveCharacterData,
              raw: {
                ...effectiveCharacterData.raw,
                isRaiding: true,
                activeRaid: raid,
                activeRaidId: raid.id,
                currentNodeId: raid.currentNodeId,
              },
            },
          );
          setDraft(null);
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
      },
    );
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
              : "2단계: 배치할 대원의 무기를 장착하고 공용 창고에서 물품을 보급하세요."}
          </p>
        </header>

        {/* STEP 1: 배치 대원 선택 (Character Selection) */}
        {step === 1 && (
          <div className={styles.contentArea}>
            <CharacterCollection readOnly={false} />

            {character ? (
              <div className={styles.summaryCard}>
                <div className={styles.summaryHeader}>
                  <h2 className={styles.summaryTitle}>선택된 배치 대원</h2>
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
                배치할 대원을 위 목록에서 선택해 주세요.
              </div>
            )}
          </div>
        )}

        {/* STEP 2: 장비창 및 장비 선택 (Loadout & Inventory) */}
        {step === 2 && character && (
          <div className={styles.contentArea}>
            {!isArmed && (
              <div className={styles.warningBox}>
                ⚠️ 주의: 현재 무기가 장착되어 있지 않습니다. 비무장 상태로 배치하면
                적대 개체와 조우 시 큰 피해를 입을 수 있습니다. 아래 창고에서 무기를
                장착하세요.
              </div>
            )}

            {startRaid.error && (
              <div className={styles.warningBox}>
                {startRaid.error.message}
              </div>
            )}

            <LoadoutEditor
              characterData={effectiveCharacterData}
              isLoading={characterQuery.isLoading}
              stash={effectiveStash}
              disabled={startRaid.isPending}
              commitMode="deferred"
              onDraftChange={(nextCharacterData, nextStash) => {
                setDraft({
                  characterId: nextCharacterData.raw.id,
                  characterData: nextCharacterData,
                  stash: nextStash,
                });
              }}
            />
          </div>
        )}

        {/* 플로팅 하단 CTA 버튼 */}
        <AnimatePresence mode="wait">
          {step === 1 && canProceedStep1 && character && (
            <motion.div
              key="staging-cta-step1"
              className={styles.floatingCtaContainer}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 420, damping: 32, mass: 0.8 }}
            >
              <button
                type="button"
                className={styles.floatingCtaButton}
                onClick={() => setStep(2)}
              >
                장비 선택 →
              </button>
            </motion.div>
          )}
          {step === 2 && canDeploy && character && (
            <motion.div
              key="staging-cta-step2"
              className={styles.floatingCtaContainer}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 420, damping: 32, mass: 0.8 }}
            >
              <button
                type="button"
                disabled={startRaid.isPending}
                className={styles.floatingCtaButton}
                onClick={handleConfirmDeploy}
              >
                {startRaid.isPending ? "배치 중…" : "탐사 배치"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}