import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CancelMarketListingResponse,
  CreateMarketListingInput,
  CreateMarketListingResponse,
  InstantSellInput,
  InstantSellResponse,
  MarketStateResponse,
  PlaceMarketBidInput,
  PlaceMarketBidResponse,
} from "@webgame/types";
import { useAtomValue } from "jotai";

import { selectedUserIdAtom } from "@/atoms/authAtom";

import { API_BASE_URL, apiFetch } from "../api";
import { readApiResponse } from "../request";

export const marketQueryKey = (userId: string | null) =>
  ["market", userId] as const;

export function useMarket() {
  const userId = useAtomValue(selectedUserIdAtom);
  return useQuery<MarketStateResponse>({
    enabled: Boolean(userId),
    queryKey: marketQueryKey(userId),
    queryFn: async ({ signal }) => {
      const response = await apiFetch(`${API_BASE_URL}/market`, { signal });
      return readApiResponse<MarketStateResponse>(response);
    },
    refetchInterval: 15_000,
  });
}

export function useCreateMarketListing() {
  const userId = useAtomValue(selectedUserIdAtom);
  const queryClient = useQueryClient();

  return useMutation<
    CreateMarketListingResponse,
    Error,
    CreateMarketListingInput
  >({
    mutationFn: async (input) => {
      const response = await apiFetch(`${API_BASE_URL}/market/listings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      return readApiResponse<CreateMarketListingResponse>(response);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: marketQueryKey(userId) });
      void queryClient.invalidateQueries({ queryKey: ["stash", userId] });
    },
  });
}

export function usePlaceMarketBid() {
  const userId = useAtomValue(selectedUserIdAtom);
  const queryClient = useQueryClient();

  return useMutation<
    PlaceMarketBidResponse,
    Error,
    { listingId: string; input: PlaceMarketBidInput }
  >({
    mutationFn: async ({ listingId, input }) => {
      const response = await apiFetch(
        `${API_BASE_URL}/market/listings/${encodeURIComponent(listingId)}/bid`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      return readApiResponse<PlaceMarketBidResponse>(response);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: marketQueryKey(userId) });
    },
  });
}

export function useCancelMarketListing() {
  const userId = useAtomValue(selectedUserIdAtom);
  const queryClient = useQueryClient();

  return useMutation<CancelMarketListingResponse, Error, string>({
    mutationFn: async (listingId) => {
      const response = await apiFetch(
        `${API_BASE_URL}/market/listings/${encodeURIComponent(listingId)}/cancel`,
        {
          method: "POST",
        },
      );
      return readApiResponse<CancelMarketListingResponse>(response);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: marketQueryKey(userId) });
      void queryClient.invalidateQueries({ queryKey: ["stash", userId] });
    },
  });
}

export function useInstantSellMarketItem() {
  const userId = useAtomValue(selectedUserIdAtom);
  const queryClient = useQueryClient();

  return useMutation<InstantSellResponse, Error, InstantSellInput>({
    mutationFn: async (input) => {
      const response = await apiFetch(`${API_BASE_URL}/market/instant-sell`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      return readApiResponse<InstantSellResponse>(response);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: marketQueryKey(userId) });
      void queryClient.invalidateQueries({ queryKey: ["stash", userId] });
    },
  });
}
