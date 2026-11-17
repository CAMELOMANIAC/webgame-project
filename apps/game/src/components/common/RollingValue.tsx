import { useState } from "react";

import * as styles from "./RollingValue.css";

export type RollDirection = "up" | "down";

function RollingDigit({
  digit,
  direction,
}: {
  digit: string;
  direction: RollDirection;
}) {
  const [digits, setDigits] = useState({ current: digit, previous: digit });
  if (digits.current !== digit) {
    setDigits({ current: digit, previous: digits.current });
  }

  return (
    <span className={styles.digitWindow}>
      {digits.previous === digit ? (
        digit
      ) : (
        <span key={digit} className={styles.digitRoll({ direction })}>
          <span>{direction === "up" ? digits.previous : digit}</span>
          <span>{direction === "up" ? digit : digits.previous}</span>
        </span>
      )}
    </span>
  );
}

export function RollingText({
  value,
  direction,
  className,
}: {
  value: string;
  direction?: RollDirection;
  className?: string;
}) {
  return (
    <span
      className={
        className ? `${styles.rollingRoot} ${className}` : styles.rollingRoot
      }
    >
      {direction ? (
        <>
          <span className={styles.accessibleValue}>{value}</span>
          <span aria-hidden="true" className={styles.digitRow}>
            {Array.from(value, (character, index) => {
              const place = value.length - index;
              return /[0-9]/.test(character) ? (
                <RollingDigit
                  key={place}
                  digit={character}
                  direction={direction}
                />
              ) : (
                <span key={place}>{character}</span>
              );
            })}
          </span>
        </>
      ) : (
        value
      )}
    </span>
  );
}

export function RollingNumber({
  value,
  fallback = "—",
  className,
}: {
  value: number | undefined;
  fallback?: string;
  className?: string;
}) {
  const [tracked, setTracked] = useState<{
    current: number | undefined;
    prev: number | undefined;
  }>({
    current: value,
    prev: value,
  });

  if (value !== tracked.current) {
    setTracked({ current: value, prev: tracked.current });
  }

  if (value === undefined) {
    return (
      <span
        className={
          className ? `${styles.rollingRoot} ${className}` : styles.rollingRoot
        }
      >
        {fallback}
      </span>
    );
  }

  const direction: RollDirection =
    tracked.prev !== undefined && value < tracked.prev ? "down" : "up";

  return (
    <RollingText
      value={String(value)}
      direction={direction}
      className={className}
    />
  );
}
