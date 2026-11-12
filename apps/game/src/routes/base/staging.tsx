import {
  skipToken,
  useIsMutating,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  calculateEntryDelayMinutes,
  calculateLoadoutTotalValue,
  formatRaidTime,
} from "@webgame/types";
import { useAtomValue, useSetAtom } from "jotai";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";

import { selectedUserIdAtom } from "@/atoms/authAtom";
import { battleLogAtom } from "@/atoms/globalAtom";
import {
  currentNodeIdAtom,
  isCombatAtom,
  isNavigatingAtom,
  playerCoordsAtom,
  shortestPathAtom,
  targetNodeIdAtom,
} from "@/atoms/raidAtom";
import * as baseStyles from "@/components/lobby/BaseScreen.css";
import CharacterCollection from "@/components/lobby/CharacterCollection";
import { LoadoutEditor } from "@/components/lobby/LoadoutEditor";
import { page } from "@/styles/theme.css";
import {
  characterKey,
  useCharacterCollectionActions,
  useCharacterRoster,
} from "@/utils/hooks/useCharacterCollection";
import {
  type CharacterData,
  createCharacterQueryOptions,
  useGetCharacter,
} from "@/utils/hooks/useGetCharacter";
import { type StashItemResponse, useGetStash } from "@/utils/hooks/useGetStash";
import { useRaidRules } from "@/utils/hooks/useRaidRules";
import { useRaidSession } from "@/utils/hooks/useRaidSession";
import { inventoryMutationKey } from "@/utils/inventoryCache";
import { mergeRecoveredIntoStash } from "@/utils/loadoutDraft";

import * as styles from "./staging.css";

interface StagingLoadoutDraft {
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
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedStartNodeId, setSelectedStartNodeId] = useState<number | null>(
    null,
  );
  const [isPreparingStep2, setIsPreparingStep2] = useState(false);
  const [step1Error, setStep1Error] = useState<string | null>(null);
  const rosterQuery = useCharacterRoster();
  const { select } = useCharacterCollectionActions();
  const stagingSelectionKey = [
    "staging-selected-character",
    selectedUserId,
  ] as const;
  const { data: draftSelectedCharacterId } = useQuery<string>({
    queryKey: stagingSelectionKey,
    queryFn: skipToken,
    gcTime: 0,
  });
  const effectiveSelectedId =
    draftSelectedCharacterId ?? rosterQuery.data?.selectedCharacterId ?? null;
  const characterQuery = useGetCharacter(undefined, effectiveSelectedId, {
    enabled: step >= 2,
  });
  const stashQuery = useGetStash();
  const rulesQuery = useRaidRules();
  const { startRaid } = useRaidSession();

  const setNode = useSetAtom(currentNodeIdAtom);
  const setIsCombat = useSetAtom(isCombatAtom);
  const setIsNavigating = useSetAtom(isNavigatingAtom);
  const setTarget = useSetAtom(targetNodeIdAtom);
  const setPath = useSetAtom(shortestPathAtom);
  const setCoords = useSetAtom(playerCoordsAtom);
  const setBattleLog = useSetAtom(battleLogAtom);

  const serverCharacterData = characterQuery.data;
  const draftKey = [
    "staging-loadout",
    selectedUserId,
    serverCharacterData?.raw.id,
  ];
  const { data: draft } = useQuery<StagingLoadoutDraft>({
    queryKey: draftKey,
    queryFn: skipToken,
    gcTime: 0,
  });
  const effectiveCharacterData = draft?.characterData ?? serverCharacterData;
  const effectiveStash = draft?.stash ?? stashQuery.data ?? [];
  const canEditLoadout = stashQuery.data !== undefined;
  const character = effectiveCharacterData?.raw;

  const totalLoadoutValue = useMemo(() => {
    if (!effectiveCharacterData) return 0;
    return calculateLoadoutTotalValue(
      effectiveCharacterData.raw.equipment,
      effectiveCharacterData.raw.inventory,
    );
  }, [effectiveCharacterData]);

  const entryDelayMinutes = useMemo(
    () => calculateEntryDelayMinutes(totalLoadoutValue),
    [totalLoadoutValue],
  );

  const formattedEntryTime = formatRaidTime(entryDelayMinutes);

  // 최종 배치 실행 (이동/장착 변경사항을 배치 시작 요청과 함께 한 번에 전송)
  const handleConfirmDeploy = () => {
    if (
      !character ||
      !effectiveCharacterData ||
      !canEditLoadout ||
      !rulesQuery.data ||
      startRaid.isPending
    )
      return;
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
        entryNodeId: effectiveStartNodeId,
        loadout: draft ? { equipment, inventory } : undefined,
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
          queryClient.removeQueries({ queryKey: draftKey, exact: true });
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

  const isMutatingInventory =
    useIsMutating({ mutationKey: inventoryMutationKey(selectedUserId) }) > 0;
  const isStep1Pending = select.isPending || isPreparingStep2;

  const handleBack = () => {
    if (startRaid.isPending || isStep1Pending || isMutatingInventory) return;
    if (step === 3) {
      setStep(2);
    } else if (step === 2) {
      setStep(1);
    } else {
      queryClient.removeQueries({ queryKey: stagingSelectionKey, exact: true });
      void navigate({ to: "/base" });
    }
  };

  const handleProceedToStep2 = async () => {
    if (!selectedUserId || !effectiveSelectedId || isStep1Pending) return;
    setStep1Error(null);
    select.reset();
    setIsPreparingStep2(true);
    try {
      await queryClient.ensureQueryData(
        createCharacterQueryOptions(
          queryClient,
          selectedUserId,
          effectiveSelectedId,
        ),
      );
      if (effectiveSelectedId !== rosterQuery.data?.selectedCharacterId) {
        await select.mutateAsync(effectiveSelectedId);
      }
      queryClient.removeQueries({ queryKey: stagingSelectionKey, exact: true });
      setStep(2);
    } catch (error) {
      setStep1Error(
        error instanceof Error
          ? error.message
          : "생존자 정보를 불러오지 못했습니다.",
      );
    } finally {
      setIsPreparingStep2(false);
    }
  };

  const selectedRosterCharacter = rosterQuery.data?.characters.find(
    (entry) => entry.id === effectiveSelectedId,
  );
  const canProceedStep1 = Boolean(
    effectiveSelectedId &&
      ((character && character.hp > 0) ||
        (selectedRosterCharacter && selectedRosterCharacter.hp > 0)),
  );
  const defaultStartNodeId = rulesQuery.data?.startNodeId ?? 0;
  const startNodeCandidates = rulesQuery.data?.entryNodeIds ?? [];
  const effectiveStartNodeId =
    selectedStartNodeId !== null &&
    startNodeCandidates.includes(selectedStartNodeId)
      ? selectedStartNodeId
      : defaultStartNodeId;

  const canDeploy = Boolean(character && canEditLoadout);
  const step1ErrorMessage = step1Error ?? select.error?.message;

  return (
    <div className={`${page} ${baseStyles.scrollPage}`}>
      <div className={styles.container}>
        {/* 상단 고정 텔레메트리 헤더 */}
        <header className={styles.headerTop}>
          <div className={styles.headerTitleGroup}>
            <button
              type="button"
              className={styles.backButton}
              onClick={handleBack}
              disabled={
                startRaid.isPending || isStep1Pending || isMutatingInventory
              }
              aria-label="이전 화면으로 이동"
            >
              <span className={styles.backArrow}>←</span>
            </button>
            <div>
              <span className={styles.telemetryCode}>
                SHELTER // EXPEDITION STAGING
              </span>
              <h1 className={styles.title}>원정 탐사 준비</h1>
            </div>
          </div>
          <div className={styles.stepBadge}>
            <span className={styles.stepNumber}>0{step}</span>
            <span className={styles.stepTotal}>/ 03</span>
          </div>
        </header>

        <div className={styles.headerArea}>
          <p className={styles.stepDescription}>
            {step === 1
              ? "1단계: 이번 탐사에 투입할 생존자를 선택하세요."
              : step === 2
                ? "2단계: 배치할 생존자의 무기를 장착하고 공용 창고에서 물품을 보급하세요."
                : "3단계: 서포시 진입 지점을 선택하세요."}
          </p>
        </div>

        {/* STEP 1: 배치 생존자 선택 (Character Selection) */}
        {step === 1 && (
          <div className={styles.contentArea}>
            {step1ErrorMessage && (
              <p className={baseStyles.banner({ tone: "negative" })} role="alert">
                {step1ErrorMessage}
              </p>
            )}
            <CharacterCollection
              readOnly={false}
              title="준비된 생존자"
              commitMode="deferred"
              disabled={isStep1Pending}
              selectedCharacterId={effectiveSelectedId}
              onSelectCharacter={(characterId) => {
                setStep1Error(null);
                select.reset();
                queryClient.setQueryData<string>(
                  stagingSelectionKey,
                  characterId,
                );
              }}
            />
          </div>
        )}

        {/* STEP 2: 장비창 및 장비 선택 (Loadout & Inventory) */}
        {step === 2 && character && (
          <div className={styles.contentArea}>
            {startRaid.error && (
              <p className={baseStyles.banner({ tone: "negative" })} role="alert">
                {startRaid.error.message}
              </p>
            )}
            {stashQuery.isLoading && <p>창고를 불러오는 중입니다.</p>}
            {stashQuery.isError && !canEditLoadout && (
              <div className={baseStyles.banner({ tone: "negative" })} role="alert">
                창고를 불러오지 못했습니다.
                <button
                  type="button"
                  className={baseStyles.smallAction}
                  onClick={() => void stashQuery.refetch()}
                >
                  다시 불러오기
                </button>
              </div>
            )}

            <LoadoutEditor
              characterData={effectiveCharacterData}
              isLoading={characterQuery.isLoading}
              stash={effectiveStash}
              disabled={
                !canEditLoadout || startRaid.isPending || isMutatingInventory
              }
              commitMode="deferred"
              onDraftChange={(nextCharacterData, nextStash) => {
                queryClient.setQueryData<StagingLoadoutDraft>(draftKey, {
                  characterData: nextCharacterData,
                  stash: nextStash,
                });
              }}
              onRecoveredToStash={(recoveredItems) => {
                queryClient.setQueryData<StagingLoadoutDraft>(
                  draftKey,
                  (current) =>
                    current && {
                      ...current,
                      stash: mergeRecoveredIntoStash(
                        current.stash,
                        current.characterData.raw.userId,
                        recoveredItems,
                      ),
                    },
                );
              }}
            />
          </div>
        )}

        {/* STEP 3: 진입 지점 선택 (Entry Point Selection) */}
        {step === 3 && character && (
          <div className={styles.contentArea}>
            {rulesQuery.isPending && <p>진입 지점을 불러오는 중입니다.</p>}
            {rulesQuery.isError && (
              <button
                type="button"
                className={baseStyles.smallAction}
                onClick={() => void rulesQuery.refetch()}
              >
                진입 지점 다시 불러오기
              </button>
            )}
            {startRaid.error && (
              <p className={baseStyles.banner({ tone: "negative" })} role="alert">
                {startRaid.error.message}
              </p>
            )}
            <div className={styles.entryGrid} role="radiogroup" aria-label="진입 지점 선택">
              {startNodeCandidates.map((nodeId) => {
                const isSelected = effectiveStartNodeId === nodeId;
                return (
                  <button
                    key={nodeId}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    disabled={startRaid.isPending}
                    className={styles.entryCard({ selected: isSelected })}
                    onClick={() => setSelectedStartNodeId(nodeId)}
                  >
                    <div className={styles.entryHeader}>
                      <span className={styles.entryCode}>NODE #{nodeId}</span>
                      {nodeId === defaultStartNodeId && (
                        <span className={styles.entryBadge}>기본 진입</span>
                      )}
                    </div>
                    <span className={styles.entryName}>
                      {nodeId === defaultStartNodeId
                        ? `기본 진입 지점 #${nodeId}`
                        : `진입 지점 #${nodeId}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 플로팅 하단 CTA 버튼 */}
        <AnimatePresence mode="wait">
          {step === 1 && canProceedStep1 && (
            <motion.div
              key="staging-cta-step1"
              className={styles.floatingCtaContainer}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{
                type: "spring",
                stiffness: 420,
                damping: 32,
                mass: 0.8,
              }}
            >
              <button
                type="button"
                disabled={isStep1Pending}
                className={styles.floatingCtaButton}
                onClick={() => void handleProceedToStep2()}
              >
                {isStep1Pending ? "선택 반영 중…" : "장비 선택 →"}
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
              transition={{
                type: "spring",
                stiffness: 420,
                damping: 32,
                mass: 0.8,
              }}
            >
              <button
                type="button"
                disabled={isMutatingInventory}
                className={styles.floatingCtaButton}
                onClick={() => setStep(3)}
              >
                {isMutatingInventory
                  ? "저장 중…"
                  : `진입 지점 선택 → · ${formattedEntryTime} 투입`}
              </button>
            </motion.div>
          )}
          {step === 3 && canDeploy && character && (
            <motion.div
              key="staging-cta-step3"
              className={styles.floatingCtaContainer}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{
                type: "spring",
                stiffness: 420,
                damping: 32,
                mass: 0.8,
              }}
            >
              <button
                type="button"
                disabled={!rulesQuery.data || startRaid.isPending || isMutatingInventory}
                className={styles.floatingCtaButton}
                onClick={handleConfirmDeploy}
              >
                {startRaid.isPending
                  ? "배치 중…"
                  : `탐사 배치 · ${formattedEntryTime} 투입`}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
