import { getDefaultStore } from "jotai";

import { selectedUserIdAtom } from "@/atoms/authAtom";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

export function apiFetch(url: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const userId = getDefaultStore().get(selectedUserIdAtom);
  if (userId) headers.set("X-Dev-User-Id", userId);
  return fetch(url, { ...init, headers });
}
