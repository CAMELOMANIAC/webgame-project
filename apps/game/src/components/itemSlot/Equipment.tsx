import { memo } from "react";

import EquipmentSlot from "@/components/itemSlot/EquipmentSlot";
import SlotManager from "@/components/itemSlot/SlotManager";
import { useGetCharacter } from "@/utils/hooks/useGetCharacter";

import * as styles from "./Equipment.css";

const Equipment = memo(() => {
  const { data: characterData, isLoading } = useGetCharacter();

  if (isLoading) {
    return <div className={styles.container} />;
  }

  return (
    <div className={styles.container}>
      <SlotManager items={characterData?.equipment || []} sortable>
        {(item, index) => <EquipmentSlot item={item} index={index} />}
      </SlotManager>
    </div>
  );
});

export default Equipment;
