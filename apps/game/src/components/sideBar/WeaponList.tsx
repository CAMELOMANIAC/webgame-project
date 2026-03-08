import { useAtomValue } from "jotai";
import { motion } from "motion/react";
import { Fragment, type PointerEvent, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { type CSSProperties, styled } from "styled-components";

import { weaponItemAtom } from "../../atoms/weaponItemAtom";

const duration = 0.2;

const WeaponList = () => {
  const [weaponSlotOrder, setWeaponSlotOrders] = useState([0, 1, 2, 3]);
  const [selectedSlot, setSelectedSlot] = useState<null | number>(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const wrapperRef = useRef<HTMLUListElement>(null);

  const equipItem = useAtomValue(weaponItemAtom);

  const selectedSlotRef = useRef<number | null>(selectedSlot);
  useEffect(() => {
    selectedSlotRef.current = selectedSlot;
  }, [selectedSlot]);

  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const offsetRef = useRef<{ x: number; y: number }>(offset);
  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  const rectArrayRef = useRef<
    Array<{
      slotId: number;
      rect: DOMRect | undefined;
      slotRef: HTMLLIElement | null;
    }>
  >([]);
  useEffect(() => {
    if (weaponSlotOrder.length > 0) {
      // 1. DOM이 새 순서로 렌더링되기를 기다립니다.
      // 2. DOM이 업데이트된 후, 다음 브라우저 페인트 이전에 rect를 재측정합니다.

      // 이 시점에서 Framer Motion의 레이아웃 변경이 완료되었거나 시작되었을 것입니다.
      // Framer Motion의 애니메이션 완료를 기다려야 한다면, setTimeout이 필요할 수도 있습니다.

      const measureRects = () => {
        // rectArrayRef.current에 있는 모든 slotRef를 사용하여
        // getBoundingClientRect()를 호출하여 rect를 업데이트합니다.
        rectArrayRef.current.forEach((item) => {
          if (item.slotRef) {
            // 순서가 바뀌었으므로, rectArrayRef의 index(slotId) 위치의 rect를 업데이트합니다.
            item.rect = item.slotRef.getBoundingClientRect();
          }
        });
        // (필요하다면 여기서 console.log로 rect 값 확인)
      };

      // Framer Motion 애니메이션 완료(0.2s)를 고려하여 약간의 딜레이를 주거나
      // 다음 프레임에서 실행하도록 합니다.
      requestAnimationFrame(() => {
        // DOM이 업데이트된 후, 다음 프레임에서 측정
        setTimeout(() => {
          measureRects();
        }, duration * 1000);
      });
    }

    // weaponSlotOrder가 변경될 때마다 실행
  }, [weaponSlotOrder]);

  const onPointerDownHandler = (e: PointerEvent<HTMLLIElement>, slotId: number) => {
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
    const currentSelectedSlot = selectedSlotRef.current;

    const reorderSlot = () => {
      const mouseY = e.clientY - 51 / 2;

      const rectArray = rectArrayRef.current.filter((item) => item.rect);

      const existingSlots = rectArray.map((item) => {
        const rect = item.rect;
        const slotCenterY = rect!.top;

        return {
          slotId: item.slotId,
          slotCenterY: slotCenterY,
        };
      });

      const selectedSlotAsMouse = {
        slotId: currentSelectedSlot,
        slotCenterY: mouseY,
      };

      const allSlots = [...existingSlots, selectedSlotAsMouse];

      const sortedSlots = allSlots.sort((a, b) => a.slotCenterY - b.slotCenterY).map((item) => item.slotId!);
      return sortedSlots;
    };

    type TargetElement = Element & {
      dataset?: DOMStringMap;
    };
    const element: TargetElement | null = document.elementFromPoint(e.clientX, e.clientY);
    const targetElement: TargetElement | null = element;
    if (!targetElement || !targetElement.dataset) return;

    //인벤토리 슬롯간 상호작용
    const isInteractive = targetElement.dataset["weaponSlotId"] || wrapperRef.current === e.target; //html5 표준 방법으로
    if (isInteractive && currentSelectedSlot !== null) {
      flushSync(() => {
        const newOrder = reorderSlot();
        setWeaponSlotOrders(newOrder);
      });
    }
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
  }, []);

  return (
    <ul style={ulStyle} ref={wrapperRef}>
      <p style={pStyle}>무기</p>
      {weaponSlotOrder.map((order) =>
        selectedSlot !== order ? (
          <WeaponLi
            key={order}
            data-weapon-slot-id={order}
            layoutId={`weapon-slot-${order}`}
            onPointerDown={(e) => onPointerDownHandler(e, order)}
            ref={(el) => {
              rectArrayRef.current[order] = {
                slotId: order,
                rect: el?.getBoundingClientRect(),
                slotRef: el,
              };
            }}
          >
            {equipItem[order]?.name || order}
          </WeaponLi>
        ) : (
          <Fragment key={order}>
            <ProxyLi
              data-weapon-slot-id={order}
              layout="size"
              layoutId={`weapon-slot-${order}`}
              transition={{
                x: { duration: 0 },
                y: { duration: 0 },
                layout: { duration: duration },
              }}
              animate={{ x: dragPosition.x, y: dragPosition.y }}
            >
              {order}
            </ProxyLi>
            <WeaponLi style={{ opacity: 0 }}>{order}</WeaponLi>
          </Fragment>
        )
      )}
    </ul>
  );
};

const pStyle: CSSProperties = {
  padding: "0.5rem",
};

const ulStyle: CSSProperties = {
  padding: "0.5rem",
  listStyle: "none",
  height: "100%",
};

const WeaponLi = styled(motion.li)`
  padding: 0.5rem;
  border: 1px solid black;

  user-select: none;
`;

const ProxyLi = styled(motion.li)`
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;

  padding: 0.5rem;
  border: 1px solid red;

  pointer-events: none;
  user-select: none;
`;

export default WeaponList;
