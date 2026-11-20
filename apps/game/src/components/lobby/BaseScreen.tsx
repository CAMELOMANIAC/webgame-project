import type { ReactNode } from "react";

import { page } from "@/styles/theme.css";

import * as styles from "./BaseScreen.css";

export function BaseScreen({
  title,
  description,
  portraitSrc,
  children,
}: {
  title: string;
  description: string;
  portraitSrc?: string;
  children?: ReactNode;
}) {
  return (
    <div className={`${page} ${styles.scrollPage}`}>
      <div className={styles.lobbyContainer}>
        <header className={styles.headerArea}>
          {portraitSrc && (
            <div className={styles.headerPortraitWrap} aria-hidden="true">
              <img
                src={portraitSrc}
                alt=""
                className={styles.headerPortraitImage}
              />
            </div>
          )}
          <div className={styles.headerContent({ withPortrait: Boolean(portraitSrc) })}>
            <span className={styles.subTitle}>SHELTER // SEC-00</span>
            <h1 className={styles.mainTitle}>{title}</h1>
            <p className={styles.leadText}>{description}</p>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
