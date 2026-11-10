import type { ReactNode } from "react";

import { page } from "@/styles/theme.css";

import * as styles from "./BaseScreen.css";

export function BaseScreen({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className={`${page} ${styles.scrollPage}`}>
      <div className={styles.lobbyContainer}>
        <header className={styles.headerArea}>
          <span className={styles.subTitle}>HL-LAB // SEC-00</span>
          <h1 className={styles.mainTitle}>{title}</h1>
          <p className={styles.leadText}>{description}</p>
        </header>
        {children}
      </div>
    </div>
  );
}
