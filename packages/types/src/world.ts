export const seopoMapVersion = "seopo-prototype-1";
export const firstMissionNodeId = 26;
export const secondMissionNodeId = 91;
export const thirdMissionNodeId = 609;

export const MISSION_NODE_LABELS: Record<number, string> = {
  [firstMissionNodeId]: "기록 중계 시설",
  [secondMissionNodeId]: "물류센터 봉쇄 중계점",
  [thirdMissionNodeId]: "중앙 전력 변전소",
};

export type BuildingCategory =
  | "COMMERCIAL"
  | "PUBLIC"
  | "MEDICAL"
  | "LOGISTICS"
  | "INFRA"
  | "CULTURAL";

export type DistrictKind =
  | "RESIDENTIAL"
  | "COMMERCIAL"
  | "INDUSTRIAL"
  | "MEDICAL"
  | "INFRA";

export interface MapPoint {
  x: number;
  y: number;
}

export interface MapDistrict {
  id: string;
  name: string;
  kind: DistrictKind;
  seedX: number;
  seedY: number;
  labelX: number;
  labelY: number;
  centerNodeId: number;
  maxLoot: number;
  materialIds: string[];
  hull: MapPoint[];
}

export interface MapBuilding {
  id: number;
  height: number;
  coordinates: { x: number; y: number }[];
  roadNodeId: number;
  name?: string;
  category?: BuildingCategory;
}
