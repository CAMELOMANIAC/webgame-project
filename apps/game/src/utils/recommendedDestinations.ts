import type {
  BuildingCategory,
  BuildingEventDefinition,
  MapBuilding,
  NormalBuildingImageKey,
} from "@webgame/types";

import apartmentImg from "@/assets/buildings/apartment.jpg";
import commercialImg from "@/assets/buildings/commercial.jpg";
import commercialStreetImg from "@/assets/buildings/commercial_street.jpg";
import culturalImg from "@/assets/buildings/cultural.jpg";
import factoryImg from "@/assets/buildings/factory.jpg";
import infraImg from "@/assets/buildings/infra.jpg";
import labBuildingImg from "@/assets/buildings/lab_building.jpg";
import logisticsImg from "@/assets/buildings/logistics.jpg";
import luxuryHouseImg from "@/assets/buildings/luxury_house.jpg";
import medicalImg from "@/assets/buildings/medical.jpg";
import officeBuildingImg from "@/assets/buildings/office_building.jpg";
import publicImg from "@/assets/buildings/public.jpg";
import utilityFacilityImg from "@/assets/buildings/utility_facility.jpg";
import villaImg from "@/assets/buildings/villa.jpg";
import warehouseImg from "@/assets/buildings/warehouse.jpg";

import mapData from "../../../../packages/types/src/assets/map_graph.json";
import { getBuildingCenter } from "./getBuildingCenter";

export type RecommendedDestinationCategory =
  | "MISSION"
  | "EXTRACTION"
  | "LANDMARK"
  | "DISTRICT";

export interface RecommendedDestination {
  id: string;
  nodeId: number;
  buildingId?: number;
  name: string;
  category: RecommendedDestinationCategory;
  buildingCategory?: BuildingCategory;
  subtitle?: string;
}

export const BUILDING_CATEGORY_LABELS: Record<BuildingCategory, string> = {
  COMMERCIAL: "상업",
  PUBLIC: "공공",
  MEDICAL: "의료",
  LOGISTICS: "물류",
  INFRA: "기반",
  CULTURAL: "문화",
};

export const BUILDING_CATEGORY_IMAGES: Record<BuildingCategory, string> = {
  COMMERCIAL: commercialImg,
  PUBLIC: publicImg,
  MEDICAL: medicalImg,
  LOGISTICS: logisticsImg,
  INFRA: infraImg,
  CULTURAL: culturalImg,
};

export const NORMAL_BUILDING_IMAGES: Record<NormalBuildingImageKey, string> = {
  apartment: apartmentImg,
  villa: villaImg,
  luxury_house: luxuryHouseImg,
  commercial_street: commercialStreetImg,
  office_building: officeBuildingImg,
  factory: factoryImg,
  warehouse: warehouseImg,
  lab_building: labBuildingImg,
  utility_facility: utilityFacilityImg,
};

export function resolveBuildingImage(
  building: Pick<MapBuilding, "category">,
  introEvent?: Pick<BuildingEventDefinition, "imageKey">,
): string | undefined {
  if (building.category) {
    return BUILDING_CATEGORY_IMAGES[building.category];
  }
  if (introEvent?.imageKey) {
    return NORMAL_BUILDING_IMAGES[introEvent.imageKey];
  }
  return undefined;
}

const landmarkBuildings = ((mapData.buildings ?? []) as MapBuilding[]).filter(
  (building): building is MapBuilding & { name: string; category: BuildingCategory } =>
    Boolean(building.name && building.category),
);

const allBuildings = (mapData.buildings ?? []) as MapBuilding[];

export const ALL_BUILDINGS_BY_ID = new Map(
  allBuildings.map((building) => [building.id, building]),
);

export const LANDMARK_BUILDING_BY_ROAD_NODE = new Map(
  landmarkBuildings.map((building) => [building.roadNodeId, building]),
);

export const LANDMARK_BUILDING_BY_ID = new Map(
  landmarkBuildings.map((building) => [
    building.id,
    {
      building,
      center: getBuildingCenter(building),
    },
  ]),
);

/**
 * 지도 데이터(map_graph.json)에 등록된 주요 랜드마크 건물 목적지 목록.
 */
export const STATIC_RECOMMENDED_DESTINATIONS: RecommendedDestination[] =
  landmarkBuildings.map((building) => ({
    id: `landmark-${building.id}`,
    nodeId: building.roadNodeId,
    buildingId: building.id,
    name: building.name,
    category: "LANDMARK" as const,
    buildingCategory: building.category,
  }));
