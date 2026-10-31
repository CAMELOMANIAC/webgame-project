import { type AnyRouter, Link, useLocation, useSearch } from "@tanstack/react-router";
import { motion } from "motion/react";
import { BiRadio, BiSolidRadio } from "react-icons/bi";
import { FaCircleUser, FaRegCircleUser } from "react-icons/fa6";
import { MdBackpack, MdOutlineBackpack } from "react-icons/md";
import { RiMap2Fill, RiMap2Line } from "react-icons/ri";

import * as styles from "./GlobalNav.css";

const GlobalNav = () => {
  const location = useLocation();
  const { tab } = useSearch({ strict: false });

  const isFieldMap = location.pathname === "/field" && !tab;
  const isBackpack = tab === "backpack";
  const isQuest = location.pathname === "/field/quest";
  const isUser = location.pathname === "/field/user";

  return (
    <nav className={styles.navContainer} aria-label="하단 글로벌 내비게이션">
      <Link
        to="/field"
        className={styles.navLink}
        viewTransition={location.pathname !== "/field"}
      >
        {isFieldMap && (
          <motion.div className={styles.activePill} layoutId="highlight" />
        )}
        <div className={styles.navItem({ active: isFieldMap })}>
          {isFieldMap ? (
            <RiMap2Fill className={styles.navIcon} />
          ) : (
            <RiMap2Line className={styles.navIcon} />
          )}
          <span className={styles.navLabel}>
            <span className={styles.navIndex}>01</span>전술지도
          </span>
        </div>
      </Link>

      <Link
        to="."
        from="/field"
        className={styles.navLink}
        search={(prev: AnyRouter) => ({ ...prev, tab: "backpack" })}
        viewTransition={location.pathname !== "/field"}
      >
        {isBackpack && (
          <motion.div className={styles.activePill} layoutId="highlight" />
        )}
        <div className={styles.navItem({ active: isBackpack })}>
          {isBackpack ? (
            <MdBackpack className={styles.navIcon} />
          ) : (
            <MdOutlineBackpack className={styles.navIcon} />
          )}
          <span className={styles.navLabel}>
            <span className={styles.navIndex}>02</span>가방
          </span>
        </div>
      </Link>

      <Link to="/field/quest" className={styles.navLink} viewTransition>
        {isQuest && (
          <motion.div className={styles.activePill} layoutId="highlight" />
        )}
        <div className={styles.navItem({ active: isQuest })}>
          {isQuest ? (
            <BiSolidRadio className={styles.navIcon} />
          ) : (
            <BiRadio className={styles.navIcon} />
          )}
          <span className={styles.navLabel}>
            <span className={styles.navIndex}>03</span>임무통신
          </span>
        </div>
      </Link>

      <Link to="/field/user" className={styles.navLink} viewTransition>
        {isUser && (
          <motion.div className={styles.activePill} layoutId="highlight" />
        )}
        <div className={styles.navItem({ active: isUser })}>
          {isUser ? (
            <FaCircleUser className={styles.navIcon} />
          ) : (
            <FaRegCircleUser className={styles.navIcon} />
          )}
          <span className={styles.navLabel}>
            <span className={styles.navIndex}>04</span>거점정비
          </span>
        </div>
      </Link>
    </nav>
  );
};

export default GlobalNav;
