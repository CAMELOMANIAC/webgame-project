export type RecommendedDestinationCategory = "MISSION" | "EXTRACTION" | "LANDMARK";

export interface RecommendedDestination {
  id: string;
  nodeId: number;
  name: string;
  category: RecommendedDestinationCategory;
}

/**
 * 추후 주요 거점·랜드마크 목적지를 추가할 때 사용하는 정적 추천 목적지 목록.
 */
export const STATIC_RECOMMENDED_DESTINATIONS: RecommendedDestination[] = [];
