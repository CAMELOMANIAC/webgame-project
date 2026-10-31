import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { getDefaultStore, useAtom, useAtomValue } from "jotai";
import type { ReactNode } from "react";

import { selectedUserIdAtom } from "@/atoms/authAtom";
import {
  battleLogAtom,
  currentTimeAtom,
  displayEventsAtom,
  flattenedTimelineAtom,
  processedEventsAtom,
} from "@/atoms/globalAtom";
import {
  activeDragIdAtom,
  currentNodeIdAtom,
  isCombatAtom,
  isInventoryDirtyAtom,
  isNavigatingAtom,
  playerCoordsAtom,
  raidNoticeAtom,
  requestedNodeIdAtom,
  shortestPathAtom,
  targetNodeIdAtom,
} from "@/atoms/raidAtom";
import { API_BASE_URL, apiFetch } from "@/utils/api";

import * as styles from "./DevelopmentAccountGate.css";

interface DevelopmentUser {
  id: string;
  nickname: string;
}

export default function DevelopmentAccountGate({
  children,
}: {
  children: ReactNode;
}) {
  const [userId, setUserId] = useAtom(selectedUserIdAtom);
  const isCombat = useAtomValue(isCombatAtom);
  const isNavigating = useAtomValue(isNavigatingAtom);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const users = useQuery<DevelopmentUser[]>({
    queryKey: ["development-users"],
    enabled: !userId,
    retry: false,
    queryFn: async () => {
      const response = await apiFetch(`${API_BASE_URL}/dev/users`);
      if (!response.ok)
        throw new Error(
          "개발용 계정을 불러올 수 없습니다. 서버 실행과 연결 설정을 확인하세요.",
        );
      return response.json();
    },
  });

  const selectUser = async (nextUserId: string | null) => {
    await queryClient.cancelQueries();
    queryClient.clear();
    const store = getDefaultStore();
    store.set(isCombatAtom, false);
    store.set(isNavigatingAtom, false);
    store.set(currentNodeIdAtom, 0);
    store.set(targetNodeIdAtom, null);
    store.set(requestedNodeIdAtom, null);
    store.set(raidNoticeAtom, null);
    store.set(shortestPathAtom, []);
    store.set(playerCoordsAtom, null);
    store.set(isInventoryDirtyAtom, false);
    store.set(activeDragIdAtom, null);
    store.set(battleLogAtom, null);
    store.set(currentTimeAtom, 0);
    store.set(flattenedTimelineAtom, []);
    store.set(displayEventsAtom, []);
    store.set(processedEventsAtom, []);
    setUserId(nextUserId);
    await navigate({ to: nextUserId ? "/field/user" : "/" });
  };

  if (userId)
    return (
      <>
        <div className={styles.accountBar}>
          <div className={styles.accountIdentity}>
            <span className={styles.statusDot} />
            <span>
              개발용 계정 ·{" "}
              <span className={styles.monoCode}>
                {users.data?.find((user) => user.id === userId)?.nickname ??
                  userId.slice(0, 8)}
              </span>
            </span>
          </div>
          <button
            type="button"
            className={styles.accountSwitchButton}
            disabled={isCombat || isNavigating}
            onClick={() => void selectUser(null)}
          >
            계정 변경
          </button>
        </div>
        {children}
      </>
    );

  return (
    <section className={styles.accountPanel}>
      <div className={styles.headerBlock}>
        <span className={styles.telemetryLabel}>HL-LAB // AUTH-GATE</span>
        <h1 className={styles.panelTitle}>생존자 선택</h1>
        <p className={styles.panelText}>플레이할 개발용 계정을 선택하세요.</p>
      </div>
      {users.isPending && (
        <p className={styles.panelText}>계정을 불러오는 중입니다.</p>
      )}
      {users.isError && (
        <p className={styles.errorText} role="alert">
          {users.error.message}
        </p>
      )}
      {users.data?.length === 0 && (
        <p className={styles.panelText}>
          준비된 계정이 없습니다. 개발용 데이터를 먼저 준비하세요.
        </p>
      )}
      <div className={styles.userList}>
        {users.data?.map((user) => (
          <button
            key={user.id}
            type="button"
            className={styles.userButton}
            onClick={() => void selectUser(user.id)}
          >
            <span>{user.nickname}</span>
            <span className={styles.monoCode}>#{user.id.slice(0, 8)}</span>
          </button>
        ))}
      </div>
      {users.isError && (
        <button
          type="button"
          className={styles.retryButton}
          onClick={() => void users.refetch()}
        >
          다시 불러오기
        </button>
      )}
    </section>
  );
}
