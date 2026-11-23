import { useEffect, useRef } from "react";

import type { ToastTone } from "@/atoms/toastAtom";

import { useToast } from "./useToast";

/**
 * 화면 상태에 담긴 결과 문구를 공용 토스트로 한 번 띄우고, 원래 상태는 비웁니다.
 * 상태를 비우므로 같은 문구가 다시 발생해도 토스트가 다시 표시됩니다.
 */
export function useResultToast(
  message: string | null | undefined,
  clear: () => void,
  tone: ToastTone = "negative",
) {
  const toast = useToast();
  const clearRef = useRef(clear);
  clearRef.current = clear;

  useEffect(() => {
    if (!message) return;
    if (tone === "negative") toast.negative(message);
    else if (tone === "positive") toast.positive(message);
    else toast.neutral(message);
    clearRef.current();
  }, [message, tone, toast]);
}
