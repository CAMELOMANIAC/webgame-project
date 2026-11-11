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

interface ItemSlotContentProps {
  name: string;
  iconKey?: string;
  quantity?: number;
}

export default function ItemSlotContent({
  name,
  iconKey,
  quantity = 1,
}: ItemSlotContentProps) {
  const Icon = icons[iconKey as keyof typeof icons] ?? GiShardSword;
  return (
    <>
      <Icon size={20} aria-hidden="true" />
      <span className={styles.itemNameLabel}>{name}</span>
      {quantity > 1 && (
        <span className={styles.quantityBadge}>×{quantity}</span>
      )}
    </>
  );
}
