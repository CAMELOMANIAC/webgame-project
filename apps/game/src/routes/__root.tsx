import {
  createRootRouteWithContext,
  Navigate,
  Outlet,
  useBlocker,
  useLocation,
} from "@tanstack/react-router";
import { getDefaultStore, useAtomValue } from "jotai";
import { motion, useReducedMotion } from "motion/react";

import { selectedUserIdAtom } from "@/atoms/authAtom";
import { pendingNavigationAtom } from "@/atoms/pendingNavigationAtom";
import {
  isCombatAtom,
  isNavigatingAtom,
  raidOutroAtom,
  unacknowledgedRaidResultsAtom,
} from "@/atoms/raidAtom";
import DevelopmentAccountGate from "@/components/common/DevelopmentAccountGate";
import GlobalNav from "@/components/common/GlobalNav";
import { QuestMessageNotifier } from "@/components/common/QuestMessageNotifier";
import { ToastViewport } from "@/components/common/toast/ToastViewport";
import { BaseScreen } from "@/components/lobby/BaseScreen";
import * as baseStyles from "@/components/lobby/BaseScreen.css";
import { useGetCharacter } from "@/utils/hooks/useGetCharacter";
import { OUTRO_HUD_FADE_SECONDS } from "@/utils/raidOutro";

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
      <ToastViewport />
    </main>
  );
}

function GameLayout() {
  const { pathname } = useLocation();
  const reduceMotion = useReducedMotion();
  const path = pathname.replace(/\/$/, "");
  const userId = useAtomValue(selectedUserIdAtom);
  const pending = useAtomValue(pendingNavigationAtom);
  const isCombat = useAtomValue(isCombatAtom);
  const isNavigating = useAtomValue(isNavigatingAtom);
  const outro = useAtomValue(raidOutroAtom);
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

  const isFadingOutroHud = outro?.phase === "fadeHud";

  if (result && !isFadingOutroHud && path !== "/field/result") {
    return <Navigate to="/field/result" replace />;
  }
  if (
    inRaid &&
    !result &&
    (!fieldRoute ||
      path === "/field/result" ||
      (!activeRaid && path !== "/field"))
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

  const animateRouteTransition = !reduceMotion && !fieldRoute;

  return (
    <>
      <QuestMessageNotifier inRaid={inRaid} />
      <div className={`${styles.outletWrapper} content-container`}>
        <motion.div
          key={fieldRoute ? "field" : path}
          initial={animateRouteTransition ? { opacity: 0, y: 8 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: animateRouteTransition ? 0.2 : 0,
            ease: [0.22, 1, 0.36, 1],
          }}
          style={{ width: "100%", height: "100%" }}
        >
          <Outlet />
        </motion.div>
      </div>
      {(!result || isFadingOutroHud) && (() => {
        const hideGlobalNav = isFadingOutroHud || (fieldRoute && isCombat);
        return (
          <motion.div
            animate={{
              opacity: hideGlobalNav ? 0 : 1,
              y: hideGlobalNav && !reduceMotion ? 20 : 0,
            }}
            transition={{
              duration: reduceMotion
                ? 0
                : isFadingOutroHud
                  ? OUTRO_HUD_FADE_SECONDS
                  : 0.25,
              ease: "easeOut",
            }}
            style={hideGlobalNav ? { pointerEvents: "none" } : undefined}
            aria-hidden={hideGlobalNav}
          >
            <GlobalNav
              mode={inRaid ? "raid" : "base"}
              fieldBusy={isCombat || isNavigating}
            />
          </motion.div>
        );
      })()}
    </>
  );
}
