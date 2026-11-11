import { useEffect, useId, useRef } from "react";

import type { RaidEndStatus } from "@/atoms/raidAtom";

import * as styles from "./RaidResultDialog.css";

const results = {
  EXTRACTED: {
    title: "탈출 성공",
    description: "가방의 물품을 거점 창고로 옮겼습니다.",
  },
  DEAD: {
    title: "사망",
    description: "탐사 중 쓰러져 장착 장비와 가방의 물품을 잃었습니다.",
  },
} satisfies Record<RaidEndStatus, { title: string; description: string }>;

export function RaidResultDialog({
  result,
  onReturn,
}: {
  result: RaidEndStatus;
  onReturn: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const { title, description } = results[result];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className={styles.dialog}
      onCancel={(event) => event.preventDefault()}
    >
      <p className={styles.eyebrow}>SHELTER // RAID RESULT</p>
      <h2
        id={titleId}
        className={styles.title({
          tone: result === "DEAD" ? "negative" : "positive",
        })}
      >
        {title}
      </h2>
      <p id={descriptionId} className={styles.description}>
        {description}
      </p>
      <button type="button" className={styles.returnButton} onClick={onReturn}>
        거점으로 돌아가기
      </button>
    </dialog>
  );
}
