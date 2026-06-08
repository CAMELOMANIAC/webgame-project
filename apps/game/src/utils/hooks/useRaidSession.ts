import { useMutation, useQueryClient } from "@tanstack/react-query";

import { API_BASE_URL } from "../api";
const TEMP_USER_ID = "da30ac6b-e93c-44d9-b344-ab67f99d2f80";

export const useRaidSession = () => {
  const queryClient = useQueryClient();

  const startRaidMutation = useMutation({
    mutationFn: async (characterId: string) => {
      const response = await fetch(`${API_BASE_URL}/character/${characterId}/raid/start`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to start raid");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["character", TEMP_USER_ID] });
    },
  });

  const extractRaidMutation = useMutation({
    mutationFn: async (characterId: string) => {
      const response = await fetch(`${API_BASE_URL}/character/${characterId}/raid/extract`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to extract from raid");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["character", TEMP_USER_ID] });
      queryClient.invalidateQueries({ queryKey: ["stash", TEMP_USER_ID] });
    },
  });

  const dieRaidMutation = useMutation({
    mutationFn: async (characterId: string) => {
      const response = await fetch(`${API_BASE_URL}/character/${characterId}/raid/die`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to process death");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["character", TEMP_USER_ID] });
      queryClient.invalidateQueries({ queryKey: ["stash", TEMP_USER_ID] });
    },
  });

  return {
    startRaid: startRaidMutation,
    extractRaid: extractRaidMutation,
    dieRaid: dieRaidMutation,
  };
};
