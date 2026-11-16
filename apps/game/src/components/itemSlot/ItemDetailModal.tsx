import {
  formatSynergySummary,
  getCatalogItemById,
  getCatalogItemByName,
  getItemKind,
  getWeaponTags,
  resolveCatalogWeaponData,
  WEAPON_TAG_LABELS,
  type WeaponData,
} from "@webgame/types";
import { useEffect, useId, useRef } from "react";
import { RiCloseLine } from "react-icons/ri";

import { resolveItemImageSrc } from "@/assets/items";
import { resolveItemSource } from "@/utils/resolveItemSource";

import * as styles from "./ItemDetailModal.css";

export interface ItemDetailAction {
  label: string;
  tone?: "primary" | "default";
  disabled?: boolean;
  onClick: () => void;
}

export interface InspectedItem {
  id: string;
  masterId?: string;
  name: string;
  iconKey?: string;
  quantity?: number;
  weight: number;
  value: number;
  weaponData?: Omit<Partial<WeaponData>, "effect"> & {
    description?: string | null;
    effect?: WeaponData["effect"] | null;
  };
  slotLabel?: string;
  actions?: ItemDetailAction[];
}

interface ItemDetailModalProps {
  item: InspectedItem | null;
  onClose: () => void;
}

const closedByAttrs = {
  closedby: "any",
} as React.DialogHTMLAttributes<HTMLDialogElement>;

export default function ItemDetailModal({ item, onClose }: ItemDetailModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (item) {
      if (!dialog.open) {
        dialog.showModal();
      }
      return;
    }

    if (dialog.open) {
      dialog.close();
    }
  }, [item]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || "closedBy" in HTMLDialogElement.prototype) return;

    const isOutside = (e: PointerEvent) => {
      const rect = dialog.getBoundingClientRect();
      return (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      );
    };

    let pressedOutside = false;
    const handlePointerDown = (e: PointerEvent) => {
      pressedOutside = isOutside(e);
    };
    const handlePointerUp = (e: PointerEvent) => {
      if (pressedOutside && isOutside(e)) {
        dialog.close();
      }
      pressedOutside = false;
    };

    dialog.addEventListener("pointerdown", handlePointerDown);
    dialog.addEventListener("pointerup", handlePointerUp);
    return () => {
      dialog.removeEventListener("pointerdown", handlePointerDown);
      dialog.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  const handleNativeClose = () => {
    if (dialogRef.current) {
      dialogRef.current.returnValue = "";
    }
    onClose();
  };

  const catalog = item
    ? ((item.masterId ? getCatalogItemById(item.masterId) : undefined) ??
      getCatalogItemByName(item.name))
    : undefined;

  const mergedWeapon: WeaponData | undefined = item
    ? resolveCatalogWeaponData({
        id: item.masterId ?? catalog?.id ?? item.id,
        name: item.name,
        iconKey: item.iconKey ?? catalog?.iconKey,
        weight: item.weaponData?.weight ?? item.weight ?? catalog?.weight ?? 0,
        value: item.weaponData?.value ?? item.value ?? catalog?.value ?? 0,
        damage: item.weaponData?.damage ?? catalog?.damage ?? 0,
        staminaCost: item.weaponData?.staminaCost ?? catalog?.staminaCost ?? 0,
        cooldownTicks:
          item.weaponData?.cooldownTicks ?? catalog?.cooldownTicks ?? 0,
        castTicks: item.weaponData?.castTicks ?? catalog?.castTicks ?? 0,
        attackType: item.weaponData?.attackType ?? catalog?.attackType,
        tags: item.weaponData?.tags ?? catalog?.tags,
        effect: item.weaponData?.effect ?? catalog?.effect,
      })
    : undefined;

  const itemKind = mergedWeapon ? getItemKind(mergedWeapon) : "EQUIPMENT";
  const tags = mergedWeapon ? getWeaponTags(mergedWeapon) : [];
  const synergySummary = mergedWeapon
    ? formatSynergySummary(mergedWeapon.effect)
    : null;
  const description = item?.weaponData?.description ?? catalog?.description;
  const itemSource = resolveItemSource(catalog?.id ?? item?.masterId ?? item?.id);
  const itemImageSrc = item
    ? resolveItemImageSrc(item.masterId ?? catalog?.id, item.name)
    : undefined;
  const quantity = item?.quantity ?? 1;
  const showCombatStats =
    itemKind === "EQUIPMENT" ||
    (mergedWeapon !== undefined &&
      (mergedWeapon.damage > 0 || mergedWeapon.cooldownTicks > 0));

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className={styles.dialog}
      onClose={handleNativeClose}
      {...closedByAttrs}
    >
      {item && mergedWeapon && (
        <div className={styles.content}>
          <div className={styles.hero}>
            {itemImageSrc && (
              <div className={styles.heroImageWrap} aria-hidden="true">
                <img
                  src={itemImageSrc}
                  alt=""
                  draggable={false}
                  className={styles.heroImage}
                />
              </div>
            )}
            <div className={styles.header}>
              <div className={styles.titleMeta}>
                <span className={styles.slotMeta}>
                  {item.slotLabel
                    ? `${item.slotLabel} · `
                    : ""}
                  {itemKind === "MATERIAL"
                    ? "재료 / 소모품"
                    : mergedWeapon.attackType === "RANGED"
                      ? "장비 · 원거리"
                      : "장비 · 근접"}
                </span>
                <div className={styles.titleRow}>
                  <h2 id={titleId} className={styles.title}>
                    {item.name}
                  </h2>
                  {quantity > 1 && (
                    <span className={styles.quantityBadge}>×{quantity}</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                aria-label="닫기"
                autoFocus
                onClick={() => dialogRef.current?.close()}
              >
                <RiCloseLine aria-hidden="true" />
              </button>
            </div>

            {tags.length > 0 && (
              <div className={styles.tagRow}>
                {tags.map((tag) => (
                  <span key={tag} className={styles.tagBadge}>
                    {WEAPON_TAG_LABELS[tag]}
                  </span>
                ))}
              </div>
            )}
          </div>

          {showCombatStats ? (
            <div className={styles.statsGrid}>
              <div className={styles.statCell}>
                <span className={styles.statLabel}>DMG</span>
                <span className={styles.statValue}>{mergedWeapon.damage}</span>
              </div>
              <div className={styles.statCell}>
                <span className={styles.statLabel}>CD</span>
                <span className={styles.statValue}>
                  {mergedWeapon.cooldownTicks}s
                </span>
              </div>
              <div className={styles.statCell}>
                <span className={styles.statLabel}>CAST</span>
                <span className={styles.statValue}>
                  {mergedWeapon.castTicks > 0
                    ? `${mergedWeapon.castTicks}s`
                    : "즉시"}
                </span>
              </div>
              <div className={styles.statCell}>
                <span className={styles.statLabel}>ENG</span>
                <span className={styles.statValue}>
                  {mergedWeapon.staminaCost}
                </span>
              </div>
              <div className={styles.statCell}>
                <span className={styles.statLabel}>WGT</span>
                <span className={styles.statValue}>
                  {mergedWeapon.weight}kg
                </span>
              </div>
              <div className={styles.statCell}>
                <span className={styles.statLabel}>VAL</span>
                <span className={styles.statValue}>{mergedWeapon.value}</span>
              </div>
            </div>
          ) : (
            <div className={styles.statsGrid}>
              <div className={styles.statCell}>
                <span className={styles.statLabel}>QTY</span>
                <span className={styles.statValue}>{quantity}</span>
              </div>
              <div className={styles.statCell}>
                <span className={styles.statLabel}>WGT</span>
                <span className={styles.statValue}>
                  {mergedWeapon.weight * quantity}kg
                </span>
              </div>
              <div className={styles.statCell}>
                <span className={styles.statLabel}>VAL</span>
                <span className={styles.statValue}>{mergedWeapon.value}</span>
              </div>
            </div>
          )}

          {synergySummary && (
            <div className={styles.synergyBox}>
              <span className={styles.synergyLabel}>효과 / 시너지</span>
              <span className={styles.synergyText}>{synergySummary}</span>
            </div>
          )}

          {description && <p className={styles.description}>{description}</p>}

          {itemSource && (
            <div className={styles.sourceBox}>
              <span className={styles.sourceLabel}>출처</span>
              <span className={styles.sourceText}>{itemSource}</span>
            </div>
          )}

          {item.actions && item.actions.length > 0 && (
            <div className={styles.actionRow}>
              {item.actions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  disabled={action.disabled}
                  className={styles.actionButton({ tone: action.tone ?? "default" })}
                  onClick={action.onClick}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}
