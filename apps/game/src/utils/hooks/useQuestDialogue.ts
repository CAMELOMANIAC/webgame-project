import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { JournalView, QuestDialogueView } from "@webgame/types";
import { useAtomValue } from "jotai";

import { selectedUserIdAtom } from "@/atoms/authAtom";

import { API_BASE_URL, apiFetch } from "../api";
import { ApiError, readApiResponse } from "../request";
import { useToast } from "./useToast";

export const questDialogueKey = (userId: string | null, questId: string | null) =>
  ["questDialogue", userId, questId] as const;

export function useQuestDialogue(questId: string | null) {
  const userId = useAtomValue(selectedUserIdAtom);
  return useQuery<QuestDialogueView>({
    queryKey: questDialogueKey(userId, questId),
    enabled: !!userId && !!questId,
    queryFn: async () =>
      readApiResponse(
        await apiFetch(`${API_BASE_URL}/user/${userId}/quests/${questId}/dialogue`),
      ),
  });
}

interface AdvanceResponse {
  dialogue: QuestDialogueView;
  journal: JournalView;
  error?: string;
}

/**
 * 선택지를 서버로 보낸다. 서버가 확정한 선택지와 어긋나면 409와 함께 최신 대화가 오며,
 * 그 대화로 화면을 바꾸고 안내만 띄운다.
 */
export function useAdvanceQuestDialogue(questId: string | null) {
  const userId = useAtomValue(selectedUserIdAtom);
  const client = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: async ({ choiceId, expectedSeq }: { choiceId: string; expectedSeq: number }) => {
      const response = await apiFetch(
        `${API_BASE_URL}/user/${userId}/quests/${questId}/dialogue/advance`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId: crypto.randomUUID(), expectedSeq, choiceId }),
        },
      );
      if (response.status === 409) {
        const data: Partial<AdvanceResponse> = await response.json().catch(() => ({}));
        if (data.dialogue && data.journal) return { ...data, stale: true } as AdvanceResponse & { stale: true };
        throw new ApiError(data.error ?? "임무 대화를 진행하지 못했습니다.", 409);
      }
      const data = await readApiResponse<AdvanceResponse>(response);
      return { ...data, stale: false as const };
    },
    onSuccess: async (result) => {
      client.setQueryData(questDialogueKey(userId, questId), result.dialogue);
      client.setQueryData(["journal", userId], result.journal);
      if (result.stale) toast.neutral(result.error ?? "대화가 갱신되었습니다.");
      await Promise.all([
        client.invalidateQueries({ queryKey: ["stash", userId] }),
        client.invalidateQueries({ queryKey: ["market"] }),
      ]);
    },
    onError: (error) => toast.negative(error.message),
  });
}

export function useMarkQuestDialogueRead(questId: string | null) {
  const userId = useAtomValue(selectedUserIdAtom);
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (seq: number) =>
      readApiResponse<JournalView>(
        await apiFetch(`${API_BASE_URL}/user/${userId}/quests/${questId}/dialogue/read`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seq }),
        }),
      ),
    onSuccess: (journal) => client.setQueryData(["journal", userId], journal),
  });
}
