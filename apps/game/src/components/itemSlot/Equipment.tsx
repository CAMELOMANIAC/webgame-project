import { memo } from "react";

import EquipmentSlot from "@/components/itemSlot/EquipmentSlot";
import SlotManager from "@/components/itemSlot/SlotManager";
import type { CharacterData } from "@/utils/hooks/useGetCharacter";

import * as styles from "./Equipment.css";

interface EquipmentProps {
  characterData: CharacterData | undefined;
  isLoading: boolean;
  className?: string;
  layout?: "row" | "grid";
}

const Equipment = memo(
  ({
    characterData,
    isLoading,
    className,
    layout = "row",
  }: EquipmentProps) => {
    const baseClass = styles.container({ layout });
    const containerClass = className ? `${baseClass} ${className}` : baseClass;

    if (isLoading) {
      return <div className={containerClass} />;
    }

    return (
      <div className={containerClass}>
        <SlotManager items={characterData?.equipment || []} sortable>
          {(item, index) => (
            <EquipmentSlot
              item={item}
              index={index}
              characterData={characterData}
            />
          )}
        </SlotManager>
      </div>
    );
  },
);

export default Equipment;
