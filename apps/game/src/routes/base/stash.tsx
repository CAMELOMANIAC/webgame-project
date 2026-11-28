import { useIsMutating } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useAtomValue } from "jotai";

import choPortrait from "@/assets/cho-portrait.png";
import { selectedUserIdAtom } from "@/atoms/authAtom";
import { BaseScreen } from "@/components/lobby/BaseScreen";
import * as styles from "@/components/lobby/BaseScreen.css";
import CharacterCollection from "@/components/lobby/CharacterCollection";
import { LoadoutEditor } from "@/components/lobby/LoadoutEditor";
import { characterSelectionKey } from "@/utils/hooks/useCharacterCollection";
import { useGetCharacter } from "@/utils/hooks/useGetCharacter";
import { useGetStash } from "@/utils/hooks/useGetStash";
import { inventoryMutationKey } from "@/utils/inventoryCache";

export const Route = createFileRoute("/base/stash")({ component: StashScreen });

function StashScreen() {
  const userId = useAtomValue(selectedUserIdAtom);
  const isSelecting =
    useIsMutating({ mutationKey: characterSelectionKey(userId) }) > 0;
  const isSavingInventory =
    useIsMutating({ mutationKey: inventoryMutationKey(userId) }) > 0;
  const characterQuery = useGetCharacter();
  const stashQuery = useGetStash();
  const stash = stashQuery.data ?? [];
  const error = stashQuery.error ?? characterQuery.error;

  return (
    <BaseScreen
      title="거점"
      description="조 시설과장이 서류철을 덮고 다가와 출격 전 정비 사항부터 짚어주려 한다."
      portraitSrc={choPortrait}
    >
      <CharacterCollection disabled={isSavingInventory || isSelecting} />
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
      <LoadoutEditor
        characterData={characterQuery.data}
        isLoading={characterQuery.isLoading}
        stash={stash}
        disabled={
          isSelecting || isSavingInventory || stashQuery.data === undefined
        }
      />
    </BaseScreen>
  );
}
