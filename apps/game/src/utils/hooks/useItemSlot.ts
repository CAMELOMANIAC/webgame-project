import type { Item } from "@webgame/types";
import { useState } from "react";

interface ItemSlot {
  initialItems: Item[];
}

const useItemSlot = ({ initialItems }: ItemSlot) => {
  const [items, setItems] = useState(initialItems);
  /**
   * 아이템 배열의 두 아이템 위치를 바꾸는 함수
   * @param {number} index1 스왑할 첫번째 아이템의 인덱스
   * @param {number} index2 스왑할 두번째 아이템의 인덱스
   */
  const swapItems = (index1: number, index2: number) => {
    const temp = items[index1];
    items[index1] = items[index2];
    items[index2] = temp;
    setItems([...items]);
  };

  /**
   * 아이템 배열의 아이템를 이동하는 함수
   * @param {number} from 이동할 아이템의 인덱스
   * @param {number} to 이동할 위치 인덱스
   */
  const moveItem = (from: number, to: number) => {
    const temp = items.filter((item) => item.id !== items[from].id);
    temp.splice(to, 0, items[from]);

    setItems([...items]);
  };

  return { items, swapItems, moveItem };
};

export default useItemSlot;
