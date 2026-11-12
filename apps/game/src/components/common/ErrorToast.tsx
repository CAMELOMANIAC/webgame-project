import { type FocusEvent, useEffect, useId, useRef, useState } from "react";

import * as styles from "./ErrorToast.css";

interface ErrorToastProps {
  message: string | null;
  onDismiss: () => void;
  durationMs?: number;
}

type AriaNotifyTarget = HTMLDivElement & {
  ariaNotify?: (announcement: string) => void;
};

export function ErrorToast({
  message,
  onDismiss,
  durationMs = 3500,
}: ErrorToastProps) {
  const popoverId = useId();
  const regionRef = useRef<AriaNotifyTarget | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onDismissRef = useRef(onDismiss);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  onDismissRef.current = onDismiss;

  const supportsPopover =
    typeof HTMLElement !== "undefined" &&
    Object.prototype.hasOwnProperty.call(HTMLElement.prototype, "popover");
  const supportsAriaNotify =
    typeof Element !== "undefined" &&
    "ariaNotify" in Element.prototype;

  useEffect(() => {
    const popoverEl = popoverRef.current;
    if (!popoverEl) return;

    if (message) {
      if (document.activeElement instanceof HTMLElement) {
        previousFocusRef.current = document.activeElement;
      }
      if (supportsPopover && !popoverEl.matches(":popover-open")) {
        popoverEl.showPopover();
      }
      regionRef.current?.ariaNotify?.(message);
    } else if (supportsPopover && popoverEl.matches(":popover-open")) {
      popoverEl.hidePopover();
    }
  }, [message, supportsPopover]);

  useEffect(() => {
    if (!message || isHovered || isFocused) return;
    const timer = window.setTimeout(() => {
      onDismissRef.current();
    }, durationMs);
    return () => window.clearTimeout(timer);
  }, [message, isHovered, isFocused, durationMs]);

  const handleManualDismiss = () => {
    const hadFocusInside = Boolean(
      popoverRef.current?.contains(document.activeElement),
    );
    setIsHovered(false);
    setIsFocused(false);
    onDismiss();
    if (hadFocusInside) {
      previousFocusRef.current?.focus();
    }
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsFocused(false);
    }
  };

  return (
    <div ref={regionRef} role="region" aria-label="오류 알림" className={styles.region}>
      <span aria-live="assertive" className={styles.srOnly}>
        {!supportsAriaNotify && message ? message : ""}
      </span>
      <div
        ref={popoverRef}
        id={popoverId}
        popover="manual"
        data-open={message ? "true" : "false"}
        className={styles.toastPopover}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocusCapture={() => setIsFocused(true)}
        onBlurCapture={handleBlur}
      >
        {message && (
          <div className={styles.toastCard}>
            <p className={styles.messageText}>{message}</p>
            <button
              type="button"
              className={styles.closeButton}
              popoverTarget={popoverId}
              popoverTargetAction="hide"
              aria-label="오류 알림 닫기"
              onClick={handleManualDismiss}
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
