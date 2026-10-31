import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { Item } from "@webgame/types";
import { useAtomValue } from "jotai";
import styled, { css } from "styled-components";

import { isCombatAtom } from "@/atoms/raidAtom";
import { cornerBracketsMixin } from "@/components/Commons";

interface BackpackProps {
  item: Item;
}

const BackpackSlot = ({ item }: BackpackProps) => {
  const isCombat = useAtomValue(isCombatAtom);
  const isEmpty = item?.id.toString().includes("empty");

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: item?.id,
    disabled: isCombat,
  });

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: item?.id,
    disabled: isCombat || isEmpty,
  });

  const combinedRef = (node: HTMLElement | null) => {
    setDropRef(node);
    setDragRef(node);
  };

  const isDraggable = !isEmpty && !isCombat;

  return (
    <StyledSlot
      ref={combinedRef}
      draggable={isDraggable}
      $isOver={isOver}
      $isDragging={isDragging}
      $isDraggable={isDraggable}
      $isEmpty={isEmpty}
      $bracketTone={isOver ? "positive" : "default"}
      {...attributes}
      {...listeners}
    >
      {isEmpty ? (
        <StyledEmptyLabel>EMPTY</StyledEmptyLabel>
      ) : (
        <>
          <StyledItemName>{item.name}</StyledItemName>
          {(item.quantity ?? 0) > 1 && (
            <StyledQuantityBadge>×{item.quantity}</StyledQuantityBadge>
          )}
        </>
      )}
    </StyledSlot>
  );
};

export default BackpackSlot;

type SlotProps = {
  $isOver: boolean;
  $isDragging: boolean;
  $isDraggable: boolean;
  $isEmpty: boolean;
  $bracketTone?: "default" | "positive" | "negative";
};

const StyledSlot = styled.div<SlotProps>`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  position: relative;
  width: 100%;
  aspect-ratio: 1/1;
  padding: 8px;
  border: 1px solid
    ${(props) =>
      props.$isOver
        ? "rgba(133, 173, 255, 0.5)"
        : props.$isEmpty
          ? "rgba(255, 255, 255, 0.06)"
          : "rgba(255, 255, 255, 0.16)"};
  border-radius: 6px;
  color: #fafafa;
  cursor: ${(props) =>
    props.$isDraggable ? (props.$isDragging ? "grabbing" : "grab") : "default"};
  touch-action: ${(props) => (props.$isDraggable ? "none" : "pan-y")};
  background-color: ${(props) =>
    props.$isOver
      ? "rgba(133, 173, 255, 0.12)"
      : props.$isEmpty
        ? "#0c0c0f"
        : "#141418"};
  opacity: ${(props) => (props.$isDragging ? 0.25 : 1)};
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    opacity 0.15s ease;

  ${(props) => (!props.$isEmpty ? cornerBracketsMixin : css``)}
`;

const StyledItemName = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: #fafafa;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const StyledEmptyLabel = styled.span`
  margin: auto;
  font-family: var(--font-mono);
  font-size: 10px;
  color: #52525b;
`;

const StyledQuantityBadge = styled.span`
  align-self: flex-end;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  color: #85adff;
  font-variant-numeric: tabular-nums;
`;
