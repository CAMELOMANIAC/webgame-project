export const seopoMapVersion = "seopo-prototype-1";
export const firstMissionNodeId = 26;

export type BuildingCategory =
  | "COMMERCIAL"
  | "PUBLIC"
  | "MEDICAL"
  | "LOGISTICS"
  | "INFRA"
  | "CULTURAL";

export interface MapBuilding {
  id: number;
  height: number;
  coordinates: { x: number; y: number }[];
  roadNodeId: number;
  name?: string;
  category?: BuildingCategory;
}
