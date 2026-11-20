import { createFileRoute } from "@tanstack/react-router";
import {
  countGeneGrades,
  GENE_GRADE_CAPS,
  GENE_GRADE_LABELS,
  GENE_REROLL_CREDIT_COST,
  GENE_REROLL_MATERIAL_ID,
  GENE_REROLL_MATERIAL_QTY,
  getGeneAmpouleOwnerDefinitionId,
  getGeneById,
} from "@webgame/types";
import { useEffect, useMemo, useState } from "react";

import yoonPortrait from "@/assets/yoon-portrait.png";
import { BaseScreen } from "@/components/lobby/BaseScreen";
import * as baseStyles from "@/components/lobby/BaseScreen.css";
import { useGeneLab } from "@/utils/hooks/useGeneLab";
import { useGetCharacter } from "@/utils/hooks/useGetCharacter";
import { useGetStash } from "@/utils/hooks/useGetStash";
import { useMarket } from "@/utils/hooks/useMarket";

import * as styles from "./lab.css";

export const Route = createFileRoute("/base/lab")({ component: GeneLabScreen });

function GeneLabScreen() {
  const characterQuery = useGetCharacter();
  const stashQuery = useGetStash();
  const marketQuery = useMarket();
  const character = characterQuery.data?.raw;
  const stash = useMemo(() => stashQuery.data ?? [], [stashQuery.data]);
  const credits = marketQuery.data?.credits ?? 0;

  const { initGenes, rerollGene, commitGene } = useGeneLab(character?.id);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(0);
  const [selectedAmpouleId, setSelectedAmpouleId] = useState<string>("");

  const geneProfile = character?.geneProfile ?? null;
  const slots = useMemo(() => geneProfile?.slots ?? [], [geneProfile?.slots]);
  const pendingReroll = geneProfile?.pendingReroll ?? null;

  useEffect(() => {
    if (
      character &&
      !character.isRaiding &&
      !character.geneProfile &&
      !initGenes.isPending &&
      !initGenes.isError
    ) {
      initGenes.mutate(character.id);
    }
  }, [character, initGenes]);

  useEffect(() => {
    if (pendingReroll) {
      setSelectedSlotIndex(pendingReroll.slotIndex);
    }
  }, [pendingReroll]);

  const gradeCounts = useMemo(() => countGeneGrades(slots), [slots]);

  const biogelQty = useMemo(
    () =>
      stash.find((item) => item.weaponMaster.id === GENE_REROLL_MATERIAL_ID)
        ?.quantity ?? 0,
    [stash],
  );

  const ownedAmpoules = useMemo(
    () =>
      stash.filter(
        (item) =>
          item.quantity > 0 &&
          getGeneAmpouleOwnerDefinitionId(item.weaponMaster.id) !== null,
      ),
    [stash],
  );

  useEffect(() => {
    if (
      selectedAmpouleId &&
      !ownedAmpoules.some((a) => a.weaponMaster.id === selectedAmpouleId)
    ) {
      setSelectedAmpouleId("");
    }
  }, [ownedAmpoules, selectedAmpouleId]);

  const activeSlotGeneId = slots[selectedSlotIndex];
  const activeSlotGene = activeSlotGeneId
    ? getGeneById(activeSlotGeneId)
    : undefined;

  const canReroll =
    Boolean(character) &&
    !character?.isRaiding &&
    slots.length > 0 &&
    !pendingReroll &&
    credits >= GENE_REROLL_CREDIT_COST &&
    biogelQty >= GENE_REROLL_MATERIAL_QTY &&
    !rerollGene.isPending &&
    !commitGene.isPending;

  const errorMessage =
    rerollGene.error?.message ??
    commitGene.error?.message ??
    initGenes.error?.message ??
    null;

  return (
    <BaseScreen
      title="유전자 연구실"
      description={'윤 책임연구원 · "위쪽 보고용 기록은 알아서 걸러둘 테니, 지금은 개체 유전자 안정화에만 집중하세요."'}
      portraitSrc={yoonPortrait}
    >
      {errorMessage && (
        <p className={baseStyles.banner({ tone: "negative" })} role="alert">
          {errorMessage}
        </p>
      )}

      <div className={styles.topBar}>
        <div className={styles.npcMeta}>
          <strong className={styles.npcName}>
            윤 책임연구원 · {character?.displayName ?? "개체 미선택"}
          </strong>
          {character && (
            <div className={styles.statsSummary}>
              <span>HP {character.maxHp}</span>
              <span>STA {character.maxStamina}(+{character.staminaRegen})</span>
              <span>ENG {character.maxFatigue}</span>
              <span>적재 {character.maxWeight}kg</span>
            </div>
          )}
        </div>
        <div className={styles.resourceRow}>
          <span className={styles.resourceChip}>
            <span className={styles.resourceMuted}>CR</span>
            {credits.toLocaleString()}
          </span>
          <span className={styles.resourceChip}>
            <span className={styles.resourceMuted}>생체 젤</span>
            {biogelQty}
          </span>
          <span className={styles.resourceChip}>
            <span className={styles.resourceMuted}>앰플</span>
            {ownedAmpoules.reduce((acc, item) => acc + item.quantity, 0)}
          </span>
        </div>
      </div>

      {!character ? (
        <p className={styles.npcSubtitle}>선택된 개체가 없습니다.</p>
      ) : slots.length === 0 ? (
        <div className={styles.panel}>
          <p className={styles.npcSubtitle}>
            {initGenes.isPending
              ? "유전자 서열을 분석하는 중입니다..."
              : "개체 유전자 서열이 아직 초기화되지 않았습니다."}
          </p>
          <button
            type="button"
            className={styles.primaryCta}
            disabled={initGenes.isPending || character.isRaiding}
            onClick={() => initGenes.mutate(character.id)}
          >
            유전자 서열 분석
          </button>
        </div>
      ) : (
        <div className={styles.workspace}>
          <section className={styles.panel} aria-label="유전자 슬롯 10개">
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>유전자 슬롯 ({slots.length})</h2>
              <span className={styles.capCounters}>
                희귀 {gradeCounts.RARE}/{GENE_GRADE_CAPS.RARE} · 특급{" "}
                {gradeCounts.EPIC}/{GENE_GRADE_CAPS.EPIC}
              </span>
            </div>
            <div className={styles.slotGrid}>
              {slots.map((geneId, idx) => {
                const gene = getGeneById(geneId);
                const isSelected = selectedSlotIndex === idx;
                return (
                  <button
                    key={`${idx}-${geneId}`}
                    type="button"
                    className={styles.slotCard({ selected: isSelected })}
                    disabled={Boolean(pendingReroll) && pendingReroll?.slotIndex !== idx}
                    onClick={() => setSelectedSlotIndex(idx)}
                  >
                    <div className={styles.slotHeader}>
                      <span className={styles.slotIndex}>
                        #{String(idx + 1).padStart(2, "0")}
                      </span>
                      <div className={styles.badgeRow}>
                        {gene?.pool === "UNIQUE" && (
                          <span className={styles.uniqueBadge}>고유</span>
                        )}
                        {gene && (
                          <span className={styles.gradeBadge({ grade: gene.grade })}>
                            {GENE_GRADE_LABELS[gene.grade]}
                          </span>
                        )}
                      </div>
                    </div>
                    <strong className={styles.geneName}>
                      {gene?.name ?? geneId}
                    </strong>
                    <p className={styles.geneSummary}>
                      {gene?.summary ?? ""}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className={styles.panel} aria-label="유전자 재조합 제어">
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>
                슬롯 #{String(selectedSlotIndex + 1).padStart(2, "0")} 재조합
              </h2>
            </div>

            {activeSlotGene && (
              <div className={styles.inspectorBox}>
                <div className={styles.slotHeader}>
                  <strong className={styles.geneName}>
                    {activeSlotGene.name}
                  </strong>
                  <div className={styles.badgeRow}>
                    {activeSlotGene.pool === "UNIQUE" && (
                      <span className={styles.uniqueBadge}>고유</span>
                    )}
                    <span
                      className={styles.gradeBadge({
                        grade: activeSlotGene.grade,
                      })}
                    >
                      {GENE_GRADE_LABELS[activeSlotGene.grade]}
                    </span>
                  </div>
                </div>
                <p className={styles.geneSummary}>{activeSlotGene.summary}</p>
              </div>
            )}

            {pendingReroll ? (
              <>
                <p className={styles.npcSubtitle}>
                  추출된 후보 3종 중 적용할 유전자를 선택하세요.
                </p>
                <div className={styles.candidateList}>
                  {pendingReroll.candidateGeneIds.map((candidateId) => {
                    const candidate = getGeneById(candidateId);
                    if (!candidate) return null;
                    return (
                      <div key={candidateId} className={styles.candidateCard}>
                        <div className={styles.slotHeader}>
                          <strong className={styles.geneName}>
                            {candidate.name}
                          </strong>
                          <div className={styles.badgeRow}>
                            {candidate.pool === "UNIQUE" && (
                              <span className={styles.uniqueBadge}>고유</span>
                            )}
                            <span
                              className={styles.gradeBadge({
                                grade: candidate.grade,
                              })}
                            >
                              {GENE_GRADE_LABELS[candidate.grade]}
                            </span>
                          </div>
                        </div>
                        <p className={styles.geneSummary}>
                          {candidate.summary}
                        </p>
                        <button
                          type="button"
                          className={styles.primaryCta}
                          disabled={commitGene.isPending}
                          onClick={() =>
                            commitGene.mutate({
                              characterId: character.id,
                              chosenGeneId: candidateId,
                            })
                          }
                        >
                          이 유전자 적용
                        </button>
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  disabled={commitGene.isPending}
                  onClick={() =>
                    commitGene.mutate({
                      characterId: character.id,
                      chosenGeneId: null,
                    })
                  }
                >
                  기존 유전자 유지
                </button>
              </>
            ) : (
              <>
                <div>
                  <label htmlFor="gene-ampoule-select" className={styles.fieldLabel}>
                    유전자 앰플 이식 (선택)
                  </label>
                  <select
                    id="gene-ampoule-select"
                    className={styles.ampouleSelect}
                    value={selectedAmpouleId}
                    onChange={(e) => setSelectedAmpouleId(e.target.value)}
                  >
                    <option value="">미사용 (현재 개체 고유 + 공통 풀)</option>
                    {ownedAmpoules.map((item) => (
                      <option
                        key={item.weaponMaster.id}
                        value={item.weaponMaster.id}
                      >
                        {item.weaponMaster.name} (보유 {item.quantity})
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.costRow}>
                  <span>비용: {GENE_REROLL_CREDIT_COST} CR</span>
                  <span>·</span>
                  <span>멸균 생체 젤 {GENE_REROLL_MATERIAL_QTY}개</span>
                  {selectedAmpouleId && (
                    <>
                      <span>·</span>
                      <span>앰플 1개</span>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  className={styles.primaryCta}
                  disabled={!canReroll}
                  onClick={() =>
                    rerollGene.mutate({
                      characterId: character.id,
                      slotIndex: selectedSlotIndex,
                      ampouleItemId: selectedAmpouleId || null,
                    })
                  }
                >
                  {rerollGene.isPending
                    ? "유전자 추출 중..."
                    : "유전자 재조합 (후보 3종)"}
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </BaseScreen>
  );
}
