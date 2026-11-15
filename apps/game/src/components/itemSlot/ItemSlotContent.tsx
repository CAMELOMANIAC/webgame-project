import {
  GiBattleAxe,
  GiBowieKnife,
  GiBroadsword,
  GiRegeneration,
  GiRifle,
  GiShardSword,
  GiTargetArrows,
  GiWizardStaff,
} from "react-icons/gi";

import { resolveItemImageSrc } from "@/assets/items";

import * as styles from "./ItemSlot.css";

const icons = {
  DAGGER: GiBowieKnife,
  SWORD: GiBroadsword,
  RIFLE: GiRifle,
  AXE: GiBattleAxe,
  STAFF: GiWizardStaff,
  HEAL: GiRegeneration,
  TARGET: GiTargetArrows,
};

interface ItemSlotIconProps {
  itemId?: string;
  name?: string;
  iconKey?: string;
  size?: number;
}

export function ItemSlotIcon({
  itemId,
  name,
  iconKey,
  size = 32,
}: ItemSlotIconProps) {
  const imageSrc = resolveItemImageSrc(itemId, name);
  if (imageSrc) {
    return (
      <img
        src={imageSrc}
        alt=""
        aria-hidden="true"
        draggable={false}
        className={styles.itemImage}
        style={{ width: size, height: size }}
      />
    );
  }
  const Icon = icons[iconKey as keyof typeof icons] ?? GiShardSword;
  return <Icon size={Math.min(size, 20)} aria-hidden="true" />;
}

interface ItemSlotContentProps {
  name: string;
  itemId?: string;
  iconKey?: string;
  quantity?: number;
}

export default function ItemSlotContent({
  name,
  itemId,
  iconKey,
  quantity = 1,
}: ItemSlotContentProps) {
  return (
    <>
      <ItemSlotIcon itemId={itemId} name={name} iconKey={iconKey} size={32} />
      <span className={styles.itemNameLabel}>{name}</span>
      {quantity > 1 && (
        <span className={styles.quantityBadge}>×{quantity}</span>
      )}
    </>
  );
}
