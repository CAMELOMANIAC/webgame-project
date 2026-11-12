import { useAtomValue } from "jotai";

import { pendingNavigationAtom } from "@/atoms/pendingNavigationAtom";
import {
  useCharacterCollectionActions,
  useCharacterRoster,
} from "@/utils/hooks/useCharacterCollection";

import defaultSurvivorPortrait from "../../assets/survivor-portrait-tranparent.png";
import * as styles from "./CharacterCollection.css";

export default function CharacterCollection({
  readOnly = false,
  title = "보유 개체",
  commitMode = "immediate",
  disabled = false,
  selectedCharacterId,
  onSelectCharacter,
}: {
  readOnly?: boolean;
  title?: string;
  commitMode?: "immediate" | "deferred";
  disabled?: boolean;
  selectedCharacterId?: string | null;
  onSelectCharacter?: (characterId: string) => void;
}) {
  const roster = useCharacterRoster();
  const { select } = useCharacterCollectionActions();
  const pending = useAtomValue(pendingNavigationAtom);
  const characters = roster.data?.characters ?? [];
  const activeSelectedCharacterId =
    selectedCharacterId !== undefined
      ? selectedCharacterId
      : roster.data?.selectedCharacterId;
  const locked =
    disabled ||
    select.isPending ||
    characters.some(
      (character) =>
        character.isRaiding ||
        Object.values(pending).some(
          (entry) => entry.params.characterId === character.id,
        ),
    );
  const error = roster.error ?? (readOnly ? null : select.error);
  const Card = readOnly ? "div" : "button";
  return (
    <section className={styles.collection} aria-label={title}>
      <div className={styles.collectionHeader}>
        <h2 className={styles.title}>
          {title} · {characters.length}
        </h2>
      </div>
      {roster.isPending && (
        <p className={styles.description}>목록을 불러오는 중입니다.</p>
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
      <div
        className={styles.list}
        {...(!readOnly && {
          role: "radiogroup" as const,
          "aria-label": title,
        })}
      >
        {characters.map((character) => {
          const isSelected = activeSelectedCharacterId === character.id;
          const cardState = character.isRaiding
            ? "raiding"
            : isSelected
              ? "selected"
              : "idle";
          const isExpanded = cardState === "selected";
          return (
            <Card
              key={character.id}
              className={styles.characterButton({ state: cardState, readOnly })}
              {...(!readOnly && {
                type: "button" as const,
                role: "radio" as const,
                "aria-checked": isSelected,
                disabled: locked || isSelected,
                onClick: () => {
                  if (commitMode === "deferred") {
                    onSelectCharacter?.(character.id);
                    return;
                  }
                  select.mutate(character.id);
                },
              })}
            >
              <div className={styles.portraitLayer} aria-hidden="true">
                <div className={styles.portraitWrap({ expanded: isExpanded })}>
                  <img
                    src={defaultSurvivorPortrait}
                    alt=""
                    className={styles.portraitImage({ state: cardState })}
                  />
                </div>
              </div>
              <div
                className={styles.cardContent({
                  expanded: isExpanded,
                  readOnly,
                })}
              >
                {!readOnly && (
                  <span
                    className={styles.radioIndicator({
                      state: cardState,
                      expanded: isExpanded,
                    })}
                    aria-hidden="true"
                  />
                )}
                <strong className={styles.cardName}>
                  {character.displayName ??
                    character.variant?.definition?.name ??
                    "생존자"}
                </strong>
                <div className={styles.statBlock({ expanded: isExpanded })}>
                  <span>
                    HP {character.hp}/{character.maxHp}
                  </span>
                  <span
                    className={styles.statDivider({ expanded: isExpanded })}
                    aria-hidden="true"
                  >
                    ·
                  </span>
                  <span className={styles.statWeight}>
                    무게 {character.weight}kg
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
