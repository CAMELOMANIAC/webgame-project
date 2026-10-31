import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { JournalView } from "@webgame/types";
import { useAtomValue } from "jotai";

import { selectedUserIdAtom } from "@/atoms/authAtom";

import { API_BASE_URL, apiFetch } from "../api";
import { readApiResponse } from "../request";

export function useJournal() {
  const userId = useAtomValue(selectedUserIdAtom);
  return useQuery<JournalView>({
    queryKey: ["journal", userId],
    enabled: !!userId,
    queryFn: async () =>
      readApiResponse(await apiFetch(`${API_BASE_URL}/user/${userId}/journal`)),
  });
}

export function useMissionAction(action: "accept" | "report") {
  const userId = useAtomValue(selectedUserIdAtom);
  const client = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      readApiResponse<JournalView>(
        await apiFetch(`${API_BASE_URL}/user/${userId}/mission/${action}`, {
          method: "POST",
        }),
      ),
    onSuccess: async (result) => {
      client.setQueryData(["journal", userId], result);
      await client.invalidateQueries({ queryKey: ["stash", userId] });
    },
  });
}
