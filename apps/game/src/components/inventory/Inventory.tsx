import { useSetAtom } from "jotai";
import { Fragment, type PointerEvent, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { type CSSProperties, styled } from "styled-components";

import { setEquipItemAtom } from "../../atoms/weaponItemAtom";
import DragProxy from "./DragProxy";
import InventorySlot, { SlotBox } from "./InventorySlot";

const Inventory = () => {
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [inventorySlot, setInventorySlot] = useState([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const [selectedSlot, setSelectedSlot] = useState<null | number>(null);
  const selectedSlotRef = useRef<number | null>(selectedSlot);
  useEffect(() => {
    selectedSlotRef.current = selectedSlot;
  }, [selectedSlot]);

  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const offsetRef = useRef<{ x: number; y: number }>(offset);
  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  const setEquipItem = useSetAtom(setEquipItemAtom);

  const onPointerDownHandler = (e: PointerEvent<HTMLDivElement>, slotId: number) => {
    if (selectedSlot !== null) return;
    // 클릭된 요소의 현재 위치(화면 기준)를 가져옵니다.
    const rect = e.currentTarget.getBoundingClientRect();

    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    flushSync(() => {
      setSelectedSlot(slotId);

      // setOffset에는 새로 계산한 오프셋을 저장합니다.
      setOffset({ x: offsetX, y: offsetY });

      // setDragPosition에는 현재 커서 위치와 새로 계산한 오프셋을 사용합니다.
      setDragPosition({ x: e.clientX - offsetX, y: e.clientY - offsetY });
    });
  };

  const handlePointerUp = (e: globalThis.PointerEvent) => {
    // 💡 최신 selectedSlot 값을 Ref에서 가져옵니다.
    const currentSelectedSlot = selectedSlotRef.current;

    const swapInventoryItem = async (slotId: number) => {
      if (!slotId || !currentSelectedSlot) return;

      for (let i = 0; i < inventorySlot.length; i++) {
        if (inventorySlot[i] === currentSelectedSlot) {
          // Ref 값 사용
          inventorySlot[i] = slotId;
        } else if (inventorySlot[i] === slotId) {
          inventorySlot[i] = currentSelectedSlot; // Ref 값 사용
        }
      }
      setInventorySlot([...inventorySlot]);
    };

    type TargetElement = Element & {
      dataset?: DOMStringMap;
    };
    const element: TargetElement | null = document.elementFromPoint(e.clientX, e.clientY);
    const targetElement: TargetElement | null = element;
    if (!targetElement || !targetElement.dataset) return;

    //인벤토리 슬롯간 상호작용
    const slotId = targetElement.dataset["slotId"]; //html5 표준 방법으로
    if (slotId) {
      // 💡 교체 로직을 실행할 때도, null 체크는 currentSelectedSlot으로 해야 합니다.
      if (currentSelectedSlot !== null) {
        swapInventoryItem(Number(slotId));
      }
    }

    //무기 슬롯간 상호작용
    const weaponSlotId = targetElement.dataset["weaponSlotId"];
    if (weaponSlotId) {
      setEquipItem({ inventoryId: currentSelectedSlot, equipId: Number(weaponSlotId) });
    }

    // 상태 초기화는 그대로 유지 (리렌더링 유발)
    setSelectedSlot(null);
  };

  const handlePointerMove = (e: globalThis.PointerEvent) => {
    setDragPosition({
      x: e.clientX - offsetRef.current.x,
      y: e.clientY - offsetRef.current.y,
    });
  };

  useEffect(() => {
    document.addEventListener("pointerup", handlePointerUp);
    document.addEventListener("pointermove", handlePointerMove);
    return () => {
      document.removeEventListener("pointerup", handlePointerUp);
      document.removeEventListener("pointermove", handlePointerMove);
    };
  }, []); //eslint-disable-line

  return (
    <InventoryWrapper $isSelected={selectedSlot !== null}>
      {inventorySlot.map((slot) =>
        slot !== selectedSlot ? (
          <InventorySlot
            key={slot}
            slotId={slot}
            selectedSlot={selectedSlot}
            onPointerDown={(e) => onPointerDownHandler(e, slot)}
          />
        ) : (
          <Fragment key={selectedSlot}>
            <DragProxy dragPosition={dragPosition} selectedSlot={selectedSlot} />
            <div style={dummyStyle}></div>
          </Fragment>
        )
      )}
    </InventoryWrapper>
  );
};

type InventoryWrapperProps = {
  $isSelected: boolean;
};
const InventoryWrapper = styled.div<InventoryWrapperProps>`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-content: flex-start;
  align-items: flex-start;
  justify-content: flex-start;
  position: relative;

  width: 20rem;
  height: 100%;
  padding: 0.5rem;
  border-radius: var(--border-radius);

  background-color: gray;

  color: white;

  cursor: ${({ $isSelected }) => ($isSelected ? "grabbing !important" : "auto")};
  gap: 0.5rem;

  ${SlotBox}:hover {
    cursor: ${({ $isSelected }) => ($isSelected ? "inherit" : "grab")};
  }
`;

const dummyStyle: CSSProperties = {
  position: "relative",
  width: "4rem",
  height: "4rem",
  userSelect: "none",
  opacity: 0,
};

export default Inventory;
