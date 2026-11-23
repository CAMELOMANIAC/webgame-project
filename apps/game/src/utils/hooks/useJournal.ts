import { useQuery } from "@tanstack/react-query";
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
