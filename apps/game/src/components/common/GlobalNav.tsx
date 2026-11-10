import { Link, useLocation, useSearch } from "@tanstack/react-router";
import { BiHome, BiRadio, BiSolidHome, BiSolidRadio } from "react-icons/bi";
import { FaBed, FaCircleUser, FaRegCircleUser } from "react-icons/fa6";
import {
  MdBackpack,
  MdOutlineBackpack,
  MdOutlineStorefront,
  MdStorefront,
} from "react-icons/md";
import {
  RiArchiveDrawerFill,
  RiArchiveDrawerLine,
  RiMap2Fill,
  RiMap2Line,
} from "react-icons/ri";

import * as styles from "./GlobalNav.css";

const raidTabs = [
  {
    link: { to: "/field", search: {} },
    label: "전술지도",
    icon: RiMap2Line,
    activeIcon: RiMap2Fill,
  },
  {
    link: { to: "/field", search: { tab: "backpack" } },
    label: "가방",
    icon: MdOutlineBackpack,
    activeIcon: MdBackpack,
  },
  {
    link: { to: "/field/quest" },
    label: "임무통신",
    icon: BiRadio,
    activeIcon: BiSolidRadio,
  },
  {
    link: { to: "/field/user" },
    label: "거점",
    icon: FaRegCircleUser,
    activeIcon: FaCircleUser,
  },
] as const;

const baseTabs = [
  { link: { to: "/base" }, label: "홈", icon: BiHome, activeIcon: BiSolidHome },
  {
    link: { to: "/base/stash" },
    label: "창고",
    icon: RiArchiveDrawerLine,
    activeIcon: RiArchiveDrawerFill,
  },
  {
    link: { to: "/base/quarters" },
    label: "숙소",
    icon: FaBed,
    activeIcon: FaBed,
  },
  {
    link: { to: "/base/market" },
    label: "거래소",
    icon: MdOutlineStorefront,
    activeIcon: MdStorefront,
  },
] as const;

export default function GlobalNav({
  mode,
  fieldBusy,
}: {
  mode: "raid" | "base";
  fieldBusy: boolean;
}) {
  const location = useLocation();
  const { tab } = useSearch({ strict: false });
  const pathname = location.pathname.replace(/\/$/, "");
  const tabs = mode === "raid" ? raidTabs : baseTabs;
  const activeIndex = tabs.findIndex(({ link }, index) => {
    if (mode === "base" && pathname === "/base/quest") return index === 0;
    if (pathname !== link.to) return false;
    return (
      link.to !== "/field" || (tab === "backpack" ? index === 1 : index === 0)
    );
  });

  return (
    <nav
      className={styles.navContainer}
      aria-label={mode === "raid" ? "탐사 내비게이션" : "거점 내비게이션"}
    >
      {activeIndex >= 0 && (
        <div
          className={styles.activePill}
          style={{
            transform: `translateX(calc(${activeIndex * 100}% + ${activeIndex * 6}px))`,
          }}
        />
      )}
      {tabs.map(({ link, label, icon, activeIcon }, index) => {
        const active = index === activeIndex;
        const Icon = active ? activeIcon : icon;
        return (
          <Link
            key={label}
            {...link}
            className={styles.navLink}
            aria-current={active ? "page" : undefined}
            disabled={
              fieldBusy && pathname === "/field" && link.to !== "/field"
            }
            viewTransition={pathname !== link.to}
          >
            <div className={styles.navItem({ active })}>
              <Icon className={styles.navIcon} />
              <span className={styles.navLabel}>
                <span className={styles.navIndex}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                {label}
              </span>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
