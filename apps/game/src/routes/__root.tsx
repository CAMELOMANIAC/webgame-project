import {
  createRootRouteWithContext,
  Navigate,
  Outlet,
  useBlocker,
  useLocation,
} from "@tanstack/react-router";
import { getDefaultStore, useAtomValue } from "jotai";

import { selectedUserIdAtom } from "@/atoms/authAtom";
import { pendingNavigationAtom } from "@/atoms/pendingNavigationAtom";
import {
  isCombatAtom,
  isNavigatingAtom,
  unacknowledgedRaidResultsAtom,
} from "@/atoms/raidAtom";
import DevelopmentAccountGate from "@/components/common/DevelopmentAccountGate";
import GlobalNav from "@/components/common/GlobalNav";
import { BaseScreen } from "@/components/lobby/BaseScreen";
import * as baseStyles from "@/components/lobby/BaseScreen.css";
import { useGetCharacter } from "@/utils/hooks/useGetCharacter";

import * as styles from "./__root.css";

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RouteComponent,
});

type RouterContext = {
  moveDirection: "left" | "right";
};

function RouteComponent() {
  return (
    <main className={styles.main}>
      <DevelopmentAccountGate>
        <GameLayout />
      </DevelopmentAccountGate>
    </main>
  );
}

function GameLayout() {
  const { pathname } = useLocation();
  const path = pathname.replace(/\/$/, "");
  const userId = useAtomValue(selectedUserIdAtom);
  const pending = useAtomValue(pendingNavigationAtom);
  const isCombat = useAtomValue(isCombatAtom);
  const isNavigating = useAtomValue(isNavigatingAtom);
  const raidResults = useAtomValue(unacknowledgedRaidResultsAtom);
  const result = userId ? raidResults[userId] : undefined;
  const character = useGetCharacter();
  const hasPendingResult = Object.values(pending).some(
    (entry) => entry.actorUserId === userId,
  );
  const activeRaid = character.data?.raw.activeRaid?.status === "ACTIVE";
  const inRaid =
    activeRaid || hasPendingResult || isCombat || isNavigating || !!result;
  const fieldRoute = path === "/field" || path.startsWith("/field/");

  useBlocker({
    enableBeforeUnload: false,
    shouldBlockFn: ({ current, next }) => {
      const store = getDefaultStore();
      const currentPath = current.pathname.replace(/\/$/, "");
      const nextPath = next.pathname.replace(/\/$/, "");
      const hasUnacknowledgedResult = !!(
        userId && store.get(unacknowledgedRaidResultsAtom)[userId]
      );

      if (hasUnacknowledgedResult) {
        return nextPath !== "/field/result";
      }

      return (
        currentPath === "/field" &&
        nextPath !== "/field" &&
        (store.get(isCombatAtom) || store.get(isNavigatingAtom))
      );
    },
  });

  if (!result && character.isLoading) {
    return (
      <BaseScreen
        title="데이터 동기화 중"
        description="선택한 개체의 탐사 상태를 확인합니다."
      />
    );
  }
  if (!result && character.error && !character.data) {
    return (
      <BaseScreen
        title="개체 정보를 불러오지 못했습니다"
        description={character.error.message}
      >
        <button
          type="button"
          className={baseStyles.smallAction}
          onClick={() => void character.refetch()}
        >
          다시 불러오기
        </button>
      </BaseScreen>
    );
  }

  if (result && path !== "/field/result") {
    return <Navigate to="/field/result" replace />;
  }
  if (
    inRaid &&
    !result &&
    (!fieldRoute || (!activeRaid && path !== "/field"))
  ) {
    return <Navigate to="/field" replace />;
  }
  if (!inRaid && fieldRoute) {
    return (
      <Navigate
        to={path === "/field/quest" ? "/base/quest" : "/base"}
        replace
      />
    );
  }

  return (
    <>
      <div className={`${styles.outletWrapper} content-container`}>
        <Outlet />
      </div>
      {!result && (
        <GlobalNav
          mode={inRaid ? "raid" : "base"}
          fieldBusy={isCombat || isNavigating}
        />
      )}
    </>
  );
}
