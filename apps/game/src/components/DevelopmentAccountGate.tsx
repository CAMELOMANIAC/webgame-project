import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { getDefaultStore, useAtom, useAtomValue } from "jotai";
import type { ReactNode } from "react";
import styled from "styled-components";

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
        <StyledAccountBar>
          <span>
            개발용 계정 ·{" "}
            {users.data?.find((user) => user.id === userId)?.nickname ??
              userId.slice(0, 8)}
          </span>
          <button
            type="button"
            disabled={isCombat || isNavigating}
            onClick={() => void selectUser(null)}
          >
            계정 변경
          </button>
        </StyledAccountBar>
        {children}
      </>
    );

  return (
    <StyledAccountPanel>
      <h1>생존자 선택</h1>
      <p>플레이할 개발용 계정을 선택하세요.</p>
      {users.isPending && <p>계정을 불러오는 중입니다.</p>}
      {users.isError && <p role="alert">{users.error.message}</p>}
      {users.data?.length === 0 && (
        <p>준비된 계정이 없습니다. 개발용 데이터를 먼저 준비하세요.</p>
      )}
      {users.data?.map((user) => (
        <button
          key={user.id}
          type="button"
          onClick={() => void selectUser(user.id)}
        >
          {user.nickname} · {user.id.slice(0, 8)}
        </button>
      ))}
      {users.isError && (
        <button type="button" onClick={() => void users.refetch()}>
          다시 불러오기
        </button>
      )}
    </StyledAccountPanel>
  );
}

const StyledAccountBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 24px;
  color: #adaaaa;
  font-size: 11px;
  background: #131313;
  button {
    color: #85adff;
    background: transparent;
    border: 0;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.4;
    cursor: default;
  }
`;

const StyledAccountPanel = styled.section`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: min(100%, 480px);
  padding: 48px 24px;
  margin: auto;
  color: #ecf0f1;
  button {
    padding: 16px;
    border: 0;
    border-radius: 16px;
    background: #262626;
    color: #85adff;
    cursor: pointer;
  }
`;
