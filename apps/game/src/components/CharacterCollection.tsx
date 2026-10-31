import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import styled from "styled-components";

import { pendingNavigationAtom } from "@/atoms/pendingNavigationAtom";
import { API_BASE_URL, apiFetch } from "@/utils/api";
import {
  type CharacterVariant,
  useCharacterCollectionActions,
  useCharacterRoster,
} from "@/utils/hooks/useCharacterCollection";
import { readApiResponse } from "@/utils/request";

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
    <StyledCollection aria-label="보유 개체">
      <h2>보유 개체 · {characters.length}</h2>
      <p>한 번에 한 개체로 출격합니다. 같은 인물도 개체별 상태가 유지됩니다.</p>
      {roster.isPending && <p>개체를 불러오는 중입니다.</p>}
      {error && <p role="alert">{error.message}</p>}
      {roster.isError && (
        <button type="button" onClick={() => void roster.refetch()}>
          다시 불러오기
        </button>
      )}
      <StyledList>
        {characters.map((character) => (
          <button
            key={character.id}
            type="button"
            disabled={
              locked || roster.data?.selectedCharacterId === character.id
            }
            aria-pressed={roster.data?.selectedCharacterId === character.id}
            onClick={() => select.mutate(character.id)}
          >
            <strong>
              {character.displayName ?? character.variant.definition.name}
            </strong>
            <span>
              {character.variant.worldlineCode} · 개체{" "}
              {character.id.slice(0, 8)}
            </span>
            <span>
              HP {character.hp}/{character.maxHp} · 무게 {character.weight}kg
            </span>
            <span>
              {character.isRaiding
                ? "탐사 중"
                : roster.data?.selectedCharacterId === character.id
                  ? "선택됨"
                  : "선택"}
            </span>
          </button>
        ))}
      </StyledList>
      <details>
        <summary>개발용 개체 추가</summary>
        <p>
          수집 기능 검증용입니다. 인물·세계선 명칭과 획득 방식은 기획
          제안입니다.
        </p>
        {variants.data?.map((variant) => (
          <button
            key={variant.id}
            type="button"
            disabled={locked}
            onClick={() => recruit.mutate(variant.id)}
          >
            {variant.definition.name} · {variant.worldlineCode} 추가
          </button>
        ))}
      </details>
    </StyledCollection>
  );
}

const StyledCollection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
  h2 {
    margin: 0;
    font-size: 18px;
  }
  p {
    margin: 0;
    color: #adaaaa;
    font-size: 12px;
    line-height: 1.6;
  }
  button {
    padding: 12px;
    border: 1px solid #38404d;
    border-radius: 12px;
    color: #ecf0f1;
    background: #222830;
    cursor: pointer;
    text-align: left;
  }
  button:disabled {
    cursor: default;
    opacity: 0.65;
  }
  button[aria-pressed="true"] {
    border-color: #85adff;
    opacity: 1;
  }
  details {
    display: flex;
    gap: 8px;
  }
  details button {
    margin: 8px 8px 0 0;
  }
  summary {
    cursor: pointer;
    font-size: 12px;
    color: #85adff;
  }
`;
const StyledList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 8px;
  button {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  span {
    font-size: 11px;
  }
`;
