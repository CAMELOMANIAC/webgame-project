import { useSetAtom } from "jotai";
import { useMemo } from "react";

import {
  MAX_VISIBLE_TOASTS,
  type MessageToast,
  type StatusToast,
  type ToastItem,
  toastsAtom,
  type ToastTone,
} from "@/atoms/toastAtom";

interface StatusOptions {
  key?: string;
  durationMs?: number;
  action?: StatusToast["action"];
}

interface MessageOptions {
  key: string;
  speakerName: string;
  preview: string;
  onOpen: () => void;
  durationMs?: number;
}

let sequence = 0;
const nextId = () => `toast-${Date.now()}-${++sequence}`;

export function upsertToast(list: ToastItem[], toast: ToastItem): ToastItem[] {
  const existing = list.findIndex((item) => item.key === toast.key);
  if (existing >= 0) {
    const next = [...list];
    next[existing] = toast;
    return next;
  }
  const next = [...list, toast];
  return next.length > MAX_VISIBLE_TOASTS
    ? next.slice(next.length - MAX_VISIBLE_TOASTS)
    : next;
}

export function useToast() {
  const setToasts = useSetAtom(toastsAtom);
  return useMemo(() => {
    const status = (tone: ToastTone, message: string, options?: StatusOptions) => {
      const id = nextId();
      const toast: StatusToast = {
        kind: "status",
        id,
        key: options?.key ?? `${tone}:${message}`,
        tone,
        message,
        action: options?.action,
        durationMs: options?.durationMs ?? (tone === "negative" ? 5000 : 3500),
        createdAt: Date.now(),
      };
      setToasts((list) => upsertToast(list, toast));
      return id;
    };
    return {
      positive: (message: string, options?: StatusOptions) =>
        status("positive", message, options),
      negative: (message: string, options?: StatusOptions) =>
        status("negative", message, options),
      neutral: (message: string, options?: StatusOptions) =>
        status("neutral", message, options),
      message: (options: MessageOptions) => {
        const id = nextId();
        const toast: MessageToast = {
          kind: "message",
          id,
          key: options.key,
          speakerName: options.speakerName,
          preview: options.preview,
          onOpen: options.onOpen,
          durationMs: options.durationMs ?? 6000,
          createdAt: Date.now(),
        };
        setToasts((list) => upsertToast(list, toast));
        return id;
      },
      dismiss: (id: string) =>
        setToasts((list) => list.filter((item) => item.id !== id)),
    };
  }, [setToasts]);
}
