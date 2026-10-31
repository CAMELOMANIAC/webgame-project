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
import { cornerBracketsMixin } from "@/components/Commons";
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
          <StyledAccountIdentity>
            <StyledStatusDot />
            <span>
              개발용 계정 ·{" "}
              <StyledMonoCode>
                {users.data?.find((user) => user.id === userId)?.nickname ??
                  userId.slice(0, 8)}
              </StyledMonoCode>
            </span>
          </StyledAccountIdentity>
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
      <StyledHeaderBlock>
        <StyledTelemetryLabel>HL-LAB // AUTH-GATE</StyledTelemetryLabel>
        <h1>생존자 선택</h1>
        <p>플레이할 개발용 계정을 선택하세요.</p>
      </StyledHeaderBlock>
      {users.isPending && <p>계정을 불러오는 중입니다.</p>}
      {users.isError && <StyledErrorText role="alert">{users.error.message}</StyledErrorText>}
      {users.data?.length === 0 && (
        <p>준비된 계정이 없습니다. 개발용 데이터를 먼저 준비하세요.</p>
      )}
      <StyledUserList>
        {users.data?.map((user) => (
          <StyledUserButton
            key={user.id}
            type="button"
            $bracketTone="positive"
            onClick={() => void selectUser(user.id)}
          >
            <span>{user.nickname}</span>
            <StyledMonoCode>#{user.id.slice(0, 8)}</StyledMonoCode>
          </StyledUserButton>
        ))}
      </StyledUserList>
      {users.isError && (
        <StyledRetryButton type="button" onClick={() => void users.refetch()}>
          다시 불러오기
        </StyledRetryButton>
      )}
    </StyledAccountPanel>
  );
}

const StyledAccountBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 16px;
  color: #a1a1aa;
  font-size: 12px;
  background: #0c0c0f;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  font-variant-numeric: tabular-nums;

  button {
    color: #85adff;
    background: transparent;
    border: 0;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
  }

  button:disabled {
    opacity: 0.4;
    cursor: default;
  }
`;

const StyledAccountIdentity = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const StyledStatusDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #85adff;
`;

const StyledMonoCode = styled.span`
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  color: #fafafa;
`;

const StyledAccountPanel = styled.section`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: min(100%, 480px);
  padding: 40px 20px;
  margin: auto;
  color: #fafafa;

  h1 {
    margin: 4px 0 6px;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  p {
    font-size: 13px;
    color: #a1a1aa;
    line-height: 1.5;
  }
`;

const StyledHeaderBlock = styled.div`
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
`;

const StyledTelemetryLabel = styled.span`
  font-family: var(--font-mono);
  font-size: 11px;
  color: #71717a;
  letter-spacing: 0.05em;
`;

const StyledUserList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const StyledUserButton = styled.button<{ $bracketTone?: "default" | "positive" | "negative" }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 14px 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  background: #101013;
  color: #fafafa;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;
  ${cornerBracketsMixin}

  &:hover {
    background: #141418;
    border-color: rgba(133, 173, 255, 0.35);
  }
`;

const StyledErrorText = styled.p`
  padding: 12px;
  border-radius: 6px;
  border: 1px solid rgba(255, 113, 98, 0.3);
  background: rgba(255, 113, 98, 0.1);
  color: #ff7162 !important;
  font-size: 12px;
`;

const StyledRetryButton = styled.button`
  padding: 12px 16px;
  border-radius: 6px;
  background: #fafafa;
  color: #09090b;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
`;
