import { createFileRoute } from "@tanstack/react-router";

import { BaseScreen } from "@/components/lobby/BaseScreen";
import * as styles from "@/components/lobby/BaseScreen.css";
import CharacterCollection from "@/components/lobby/CharacterCollection";
import { LoadoutEditor } from "@/components/lobby/LoadoutEditor";
import { useGetCharacter } from "@/utils/hooks/useGetCharacter";
import { useGetStash } from "@/utils/hooks/useGetStash";

export const Route = createFileRoute("/base/stash")({ component: StashScreen });

function StashScreen() {
  const characterQuery = useGetCharacter();
  const stashQuery = useGetStash();
  const stash = stashQuery.data ?? [];
  const error = stashQuery.error ?? characterQuery.error;

  return (
    <BaseScreen
      title="거점 정비소"
      description="배치할 개체를 선택하고 공용 창고에서 장비와 물품을 정비합니다."
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
      <LoadoutEditor
        characterData={characterQuery.data}
        isLoading={characterQuery.isLoading}
        stash={stash}
      />
    </BaseScreen>
  );
}
