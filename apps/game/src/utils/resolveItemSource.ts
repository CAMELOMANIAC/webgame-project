import {
  BASE_EQUIPMENTS,
  CRAFTING_MATERIALS,
  CRAFTING_RECIPES,
  findMaterialDistricts,
  getCatalogItemById,
  STORY_BUILDING_EVENTS,
} from "@webgame/types";

import { BUILDING_CATEGORY_LABELS } from "./recommendedDestinations";

export function resolveItemSource(itemId: string | undefined): string | null {
  if (!itemId) return null;

  const recipe = CRAFTING_RECIPES.find((r) => r.resultEquipmentId === itemId);
  if (recipe) {
    const categoryLabel = BUILDING_CATEGORY_LABELS[recipe.buildingCategory];
    const baseName =
      getCatalogItemById(recipe.baseEquipmentId)?.name ?? recipe.baseEquipmentId;
    const materialNames = recipe.materialIds
      .map((id) => getCatalogItemById(id)?.name ?? id)
      .join(" + ");
    return `${categoryLabel} 건물 조합 (${recipe.tier}단계) · ${baseName} + ${materialNames}`;
  }

  const districts = findMaterialDistricts(itemId);
  if (districts.length > 0) {
    return `탐사 수색 · ${districts.map((d) => d.name).join(", ")}`;
  }

  const storyEvents = STORY_BUILDING_EVENTS.filter((event) =>
    event.choices?.some((choice) =>
      choice.outcomes?.some((outcome) =>
        outcome.rewardItemIds?.includes(itemId),
      ),
    ),
  );
  if (storyEvents.length > 0) {
    return `건물 이벤트 · ${storyEvents.map((e) => e.title).join(", ")}`;
  }

  if (BASE_EQUIPMENTS.some((eq) => eq.id === itemId)) {
    return "기본 장비 · 초기 지급 / 적 드롭";
  }

  if (itemId === "hanlim-relief-carbine") {
    return "기업 보급 · 초기 지급 / 임무 보상";
  }

  if (itemId === "hanlim-control-baton") {
    return "기업 제식 · 순찰 개체 드롭";
  }

  if (CRAFTING_MATERIALS.some((mat) => mat.id === itemId)) {
    return "의료 · 생체 재료 · 탐사 / 이벤트";
  }

  return null;
}
