import { atom } from "jotai";

export type ToastTone = "positive" | "negative" | "neutral";

interface ToastBase {
  id: string;
  /** 같은 key의 토스트는 새로 쌓지 않고 내용을 갱신합니다. */
  key: string;
  durationMs: number;
  createdAt: number;
}

export interface StatusToast extends ToastBase {
  kind: "status";
  tone: ToastTone;
  message: string;
  action?: { label: string; onClick: () => void };
}

export interface MessageToast extends ToastBase {
  kind: "message";
  speakerName: string;
  preview: string;
  onOpen: () => void;
}

export type ToastItem = StatusToast | MessageToast;

export const MAX_VISIBLE_TOASTS = 3;

export const toastsAtom = atom<ToastItem[]>([]);
