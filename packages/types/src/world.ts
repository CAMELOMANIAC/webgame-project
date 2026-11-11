// 구현 검증용 명칭·경계·중첩 주기이며 확정 세계관 지명은 아니다.
export const seopoMapVersion = "seopo-prototype-1";
export const firstMissionNodeId = 26;

export interface RegionContext {
  id: string;
  name: string;
  facility: "SHELTER" | "ARCHIVE" | "RELIEF" | "INFRASTRUCTURE";
  overlap: "STABLE" | "UNSTABLE";
  encounter: "SAFE" | "SUPPORT" | "HOSTILE";
  extraction: boolean;
  baseNodeId: number;
}

export function seopoRegion(
  nodeId: number,
  round: number,
  position: { x: number; y: number },
): RegionContext {
  if (nodeId === 0)
    return {
      id: "temp-shelter",
      name: "임시 대피 구역",
      facility: "SHELTER",
      overlap: "STABLE",
      encounter: "SAFE",
      extraction: true,
      baseNodeId: 0,
    };
  const overlap = round % 6 >= 4 ? "UNSTABLE" : "STABLE";
  if (nodeId === firstMissionNodeId)
    return {
      id: "record-relay",
      name: "기록 중계 시설",
      facility: "ARCHIVE",
      overlap,
      encounter: "HOSTILE",
      extraction: false,
      baseNodeId: 0,
    };
  if (position.x < 512 && overlap === "STABLE")
    return {
      id: "relief-sector",
      name: "생활 지원 구역",
      facility: "RELIEF",
      overlap,
      encounter: "SUPPORT",
      extraction: false,
      baseNodeId: 0,
    };
  return {
    id: "control-sector",
    name: "도시 기반 시설 구역",
    facility: "INFRASTRUCTURE",
    overlap,
    encounter: "HOSTILE",
    extraction: false,
    baseNodeId: 0,
  };
}
