import { createFileRoute, Link } from "@tanstack/react-router";

import { BaseScreen } from "@/components/lobby/BaseScreen";
import * as styles from "@/components/lobby/BaseScreen.css";
import CharacterCollection from "@/components/lobby/CharacterCollection";
import { useGetStash } from "@/utils/hooks/useGetStash";

export const Route = createFileRoute("/field/user/")({
  component: BasePreview,
});

function BasePreview() {
  const stash = useGetStash();

  return (
    <BaseScreen
      title="거점 미리보기"
      description="거점의 보유 개체와 창고를 확인합니다. 정비는 탐사 복귀 후 가능합니다."
    >
      <Link to="/field" className={styles.missionLink}>
        탐사로 돌아가기 →
      </Link>
      <CharacterCollection readOnly />
      <section className={styles.sectionPanel}>
        <h2 className={styles.sectionHeader}>거점 공용 창고</h2>
        {stash.isLoading && <p>창고를 불러오는 중입니다.</p>}
        {stash.error && <p role="alert">{stash.error.message}</p>}
        {stash.isError && (
          <button
            type="button"
            className={styles.smallAction}
            onClick={() => void stash.refetch()}
          >
            다시 불러오기
          </button>
        )}
        {stash.isSuccess &&
          (stash.data.length ? (
            <ul className={styles.itemGrid}>
              {stash.data.map((item) => (
                <li key={item.id} className={styles.previewItem}>
                  <span className={styles.itemName}>
                    {item.weaponMaster.name}
                  </span>
                  <span className={styles.quantityBadge}>×{item.quantity}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyMessage}>보관 중인 물품이 없습니다.</p>
          ))}
      </section>
    </BaseScreen>
  );
}
