import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";

import { pendingNavigationAtom } from "@/atoms/pendingNavigationAtom";
import { API_BASE_URL, apiFetch } from "@/utils/api";
import {
  type CharacterVariant,
  useCharacterCollectionActions,
  useCharacterRoster,
} from "@/utils/hooks/useCharacterCollection";
import { readApiResponse } from "@/utils/request";

import * as styles from "./CharacterCollection.css";

export default function CharacterCollection({
  disabled,
}: {
  disabled: boolean;
}) {
  const roster = useCharacterRoster();
  const { select, recruit } = useCharacterCollectionActions();
  const pending = useAtomValue(pendingNavigationAtom);
  const variants = useQuery<CharacterVariant[]>({
    queryKey: ["character-variants"],
    queryFn: async () =>
      readApiResponse(await apiFetch(`${API_BASE_URL}/dev/character-variants`)),
  });
  const characters = roster.data?.characters ?? [];
  const locked =
    disabled ||
    select.isPending ||
    recruit.isPending ||
    characters.some(
      (character) =>
        character.isRaiding ||
        Object.values(pending).some(
          (entry) => entry.params.characterId === character.id,
        ),
    );
  const error = roster.error ?? variants.error ?? select.error ?? recruit.error;
  return (
    <section className={styles.collection} aria-label="보유 개체">
      <div className={styles.collectionHeader}>
        <h2 className={styles.title}>보유 개체 · {characters.length}</h2>
        <span className={styles.rosterCode}>ROSTER // ACTIVE-01</span>
      </div>
      <p className={styles.description}>
        한 번에 한 개체로 출격합니다. 같은 인물도 개체별 상태가 유지됩니다.
      </p>
      {roster.isPending && (
        <p className={styles.description}>개체를 불러오는 중입니다.</p>
      )}
      {error && (
        <p className={styles.alert} role="alert">
          {error.message}
        </p>
      )}
      {roster.isError && (
        <button
          type="button"
          className={styles.variantButton}
          onClick={() => void roster.refetch()}
        >
          다시 불러오기
        </button>
      )}
      <div className={styles.list}>
        {characters.map((character) => {
          const isSelected = roster.data?.selectedCharacterId === character.id;
          const cardState = character.isRaiding
            ? "raiding"
            : isSelected
              ? "selected"
              : "idle";
          return (
            <button
              key={character.id}
              type="button"
              className={styles.characterButton({ state: cardState })}
              disabled={locked || isSelected}
              aria-pressed={isSelected}
              onClick={() => select.mutate(character.id)}
            >
              <div className={styles.cardTopRow}>
                <strong className={styles.cardName}>
                  {character.displayName ?? character.variant.definition.name}
                </strong>
                <span className={styles.stateTag({ state: cardState })}>
                  {character.isRaiding
                    ? "탐사 중"
                    : isSelected
                      ? "선택됨"
                      : "선택"}
                </span>
              </div>
              <span className={styles.metaRow}>
                {character.variant.worldlineCode} · 개체{" "}
                {character.id.slice(0, 8)}
              </span>
              <span className={styles.statRow}>
                HP {character.hp}/{character.maxHp} · 무게 {character.weight}kg
              </span>
            </button>
          );
        })}
      </div>
      <details className={styles.details}>
        <summary className={styles.summary}>개발용 개체 추가</summary>
        <p className={styles.description}>
          수집 기능 검증용입니다. 인물·세계선 명칭과 획득 방식은 기획
          제안입니다.
        </p>
        <div className={styles.variantActions}>
          {variants.data?.map((variant) => (
            <button
              key={variant.id}
              type="button"
              className={styles.variantButton}
              disabled={locked}
              onClick={() => recruit.mutate(variant.id)}
            >
              {variant.definition.name} · {variant.worldlineCode} 추가
            </button>
          ))}
        </div>
      </details>
    </section>
  );
}
