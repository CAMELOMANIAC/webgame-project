import { useAtomValue, useSetAtom } from "jotai";
import { useEffect, useRef, useState } from "react";

import { type ToastItem, toastsAtom } from "@/atoms/toastAtom";

import * as styles from "./ToastViewport.css";

export function ToastViewport() {
  const toasts = useAtomValue(toastsAtom);
  return (
    <section className={styles.viewport} aria-label="알림">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </section>
  );
}

function ToastCard({ toast }: { toast: ToastItem }) {
  const setToasts = useSetAtom(toastsAtom);
  const [paused, setPaused] = useState(false);
  const dismissRef = useRef(() =>
    setToasts((list) => list.filter((item) => item.id !== toast.id)),
  );

  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(() => dismissRef.current(), toast.durationMs);
    return () => window.clearTimeout(timer);
  }, [paused, toast.durationMs]);

  const pauseHandlers = {
    onMouseEnter: () => setPaused(true),
    onMouseLeave: () => setPaused(false),
    onFocus: () => setPaused(true),
    onBlur: () => setPaused(false),
  };

  if (toast.kind === "message") {
    return (
      <div className={styles.card} role="status" {...pauseHandlers}>
        <button
          type="button"
          className={styles.messageButton}
          onClick={() => {
            dismissRef.current();
            toast.onOpen();
          }}
        >
          <span className={styles.speaker}>{toast.speakerName}</span>
          <span className={styles.preview}>{toast.preview}</span>
        </button>
        <CloseButton onClick={() => dismissRef.current()} />
      </div>
    );
  }

  return (
    <div
      className={styles.card}
      role={toast.tone === "negative" ? "alert" : "status"}
      {...pauseHandlers}
    >
      <span className={styles.dot({ tone: toast.tone })} aria-hidden />
      <p className={styles.message({ tone: toast.tone })}>{toast.message}</p>
      {toast.action && (
        <button
          type="button"
          className={styles.actionButton}
          onClick={() => {
            dismissRef.current();
            toast.action?.onClick();
          }}
        >
          {toast.action.label}
        </button>
      )}
      <CloseButton onClick={() => dismissRef.current()} />
    </div>
  );
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className={styles.closeButton}
      aria-label="알림 닫기"
      onClick={onClick}
    >
      ×
    </button>
  );
}
