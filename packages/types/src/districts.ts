import type { MapBuilding, MapDistrict } from "./world";

export const MAP_DISTRICTS: readonly MapDistrict[] = [
  {
    "id": "dist-res-w1",
    "name": "서부 주거 1단지",
    "kind": "RESIDENTIAL",
    "seedX": 213,
    "seedY": 475,
    "maxLoot": 5,
    "materialIds": [
      "mat-tape",
      "mat-wire",
      "mat-lighter",
      "mat-electrolyte"
    ],
    "labelX": 213.3,
    "labelY": 474.6,
    "centerNodeId": 47,
    "hull": [
      {
        "x": 128.2,
        "y": 453.7
      },
      {
        "x": 248.3,
        "y": 394.3
      },
      {
        "x": 298.4,
        "y": 495.5
      },
      {
        "x": 178.4,
        "y": 555
      }
    ]
  },
  {
    "id": "dist-res-w2",
    "name": "서중부 주거 2단지",
    "kind": "RESIDENTIAL",
    "seedX": 357,
    "seedY": 405,
    "maxLoot": 5,
    "materialIds": [
      "mat-tape",
      "mat-wire",
      "mat-lighter",
      "mat-electrolyte"
    ],
    "labelX": 356.9,
    "labelY": 405.2,
    "centerNodeId": 44,
    "hull": [
      {
        "x": 255,
        "y": 394.3
      },
      {
        "x": 410,
        "y": 317.5
      },
      {
        "x": 458.8,
        "y": 416.1
      },
      {
        "x": 303.8,
        "y": 492.9
      }
    ]
  },
  {
    "id": "dist-log-sw",
    "name": "서남 물류단지",
    "kind": "INDUSTRIAL",
    "seedX": 86,
    "seedY": 591,
    "maxLoot": 6,
    "materialIds": [
      "mat-titanium",
      "mat-fuel",
      "mat-tape",
      "mat-wire"
    ],
    "labelX": 86.3,
    "labelY": 590.5,
    "centerNodeId": 90,
    "hull": [
      {
        "x": -43.2,
        "y": 534.7
      },
      {
        "x": 120.4,
        "y": 453.7
      },
      {
        "x": 215.8,
        "y": 646.4
      },
      {
        "x": 52.3,
        "y": 727.4
      }
    ]
  },
  {
    "id": "dist-com-w",
    "name": "서부 생활상업지구",
    "kind": "COMMERCIAL",
    "seedX": 359,
    "seedY": 566,
    "maxLoot": 5,
    "materialIds": [
      "mat-lens",
      "mat-relay",
      "mat-battery",
      "mat-ceramic"
    ],
    "labelX": 359,
    "labelY": 566.4,
    "centerNodeId": 73,
    "hull": [
      {
        "x": 181.9,
        "y": 561.2
      },
      {
        "x": 461.7,
        "y": 422.1
      },
      {
        "x": 536.1,
        "y": 571.6
      },
      {
        "x": 256.3,
        "y": 710.7
      }
    ]
  },
  {
    "id": "dist-cul-c",
    "name": "중앙 문화·주거단지",
    "kind": "RESIDENTIAL",
    "seedX": 574,
    "seedY": 517,
    "maxLoot": 5,
    "materialIds": [
      "mat-tape",
      "mat-wire",
      "mat-lighter",
      "mat-electrolyte"
    ],
    "labelX": 573.9,
    "labelY": 517,
    "centerNodeId": 598,
    "hull": [
      {
        "x": 468.3,
        "y": 420.4
      },
      {
        "x": 560.5,
        "y": 374.5
      },
      {
        "x": 679.4,
        "y": 613.6
      },
      {
        "x": 587.2,
        "y": 659.5
      }
    ]
  },
  {
    "id": "dist-inf-c",
    "name": "중앙 변전·통신단지",
    "kind": "INFRA",
    "seedX": 765,
    "seedY": 348,
    "maxLoot": 6,
    "materialIds": [
      "mat-battery",
      "mat-pcb",
      "mat-cooling-gel",
      "mat-relay"
    ],
    "labelX": 764.5,
    "labelY": 348.3,
    "centerNodeId": 612,
    "hull": [
      {
        "x": 563.3,
        "y": 343.5
      },
      {
        "x": 877.7,
        "y": 181.9
      },
      {
        "x": 965.7,
        "y": 353.1
      },
      {
        "x": 651.3,
        "y": 514.7
      }
    ]
  },
  {
    "id": "dist-med-s",
    "name": "남부 응급의료단지",
    "kind": "MEDICAL",
    "seedX": 774,
    "seedY": 580,
    "maxLoot": 6,
    "materialIds": [
      "mat-coagulant",
      "mat-stimulant",
      "mat-optics",
      "mat-electrolyte"
    ],
    "labelX": 774.3,
    "labelY": 580.2,
    "centerNodeId": 741,
    "hull": [
      {
        "x": 654.5,
        "y": 520.9
      },
      {
        "x": 795.9,
        "y": 448.3
      },
      {
        "x": 894.2,
        "y": 639.5
      },
      {
        "x": 752.8,
        "y": 712.2
      }
    ]
  },
  {
    "id": "dist-com-c",
    "name": "중앙 한림상업지구",
    "kind": "COMMERCIAL",
    "seedX": 1030,
    "seedY": 296,
    "maxLoot": 6,
    "materialIds": [
      "mat-lens",
      "mat-relay",
      "mat-ceramic",
      "mat-pcb"
    ],
    "labelX": 1029.6,
    "labelY": 296.4,
    "centerNodeId": 290,
    "hull": [
      {
        "x": 887.1,
        "y": 184.9
      },
      {
        "x": 1021.9,
        "y": 115.7
      },
      {
        "x": 1172,
        "y": 407.9
      },
      {
        "x": 1037.3,
        "y": 477.1
      }
    ]
  },
  {
    "id": "dist-pub-c",
    "name": "중부 행정·주거단지",
    "kind": "RESIDENTIAL",
    "seedX": 941,
    "seedY": 509,
    "maxLoot": 5,
    "materialIds": [
      "mat-tape",
      "mat-wire",
      "mat-lighter",
      "mat-ceramic"
    ],
    "labelX": 940.6,
    "labelY": 509.4,
    "centerNodeId": 828,
    "hull": [
      {
        "x": 802.1,
        "y": 445.1
      },
      {
        "x": 968.9,
        "y": 359.4
      },
      {
        "x": 1079.1,
        "y": 573.7
      },
      {
        "x": 912.3,
        "y": 659.4
      }
    ]
  },
  {
    "id": "dist-ind-n",
    "name": "북부 터미널산업단지",
    "kind": "INDUSTRIAL",
    "seedX": 1217,
    "seedY": 98,
    "maxLoot": 7,
    "materialIds": [
      "mat-titanium",
      "mat-solenoid",
      "mat-fuel",
      "mat-carbon"
    ],
    "labelX": 1216.5,
    "labelY": 97.6,
    "centerNodeId": 316,
    "hull": [
      {
        "x": 1055.8,
        "y": 81.4
      },
      {
        "x": 1277.1,
        "y": -52.2
      },
      {
        "x": 1377.3,
        "y": 113.9
      },
      {
        "x": 1156,
        "y": 247.5
      }
    ]
  },
  {
    "id": "dist-com-e",
    "name": "동부 디지털상업지구",
    "kind": "COMMERCIAL",
    "seedX": 1310,
    "seedY": 252,
    "maxLoot": 6,
    "materialIds": [
      "mat-lens",
      "mat-relay",
      "mat-pcb",
      "mat-optics"
    ],
    "labelX": 1309.8,
    "labelY": 252.2,
    "centerNodeId": 363,
    "hull": [
      {
        "x": 1159.6,
        "y": 253.5
      },
      {
        "x": 1380.9,
        "y": 119.9
      },
      {
        "x": 1460,
        "y": 250.9
      },
      {
        "x": 1238.6,
        "y": 384.5
      }
    ]
  },
  {
    "id": "dist-med-se",
    "name": "남동 성모의료산업단지",
    "kind": "MEDICAL",
    "seedX": 1165,
    "seedY": 560,
    "maxLoot": 7,
    "materialIds": [
      "mat-coagulant",
      "mat-stimulant",
      "mat-optics",
      "mat-cooling-gel"
    ],
    "labelX": 1164.9,
    "labelY": 560.2,
    "centerNodeId": 975,
    "hull": [
      {
        "x": 1040.5,
        "y": 483.3
      },
      {
        "x": 1174.8,
        "y": 414.3
      },
      {
        "x": 1289.3,
        "y": 637.1
      },
      {
        "x": 1155,
        "y": 706.1
      }
    ]
  },
  {
    "id": "dist-res-e",
    "name": "동부 주거 3단지",
    "kind": "RESIDENTIAL",
    "seedX": 1453,
    "seedY": 520,
    "maxLoot": 5,
    "materialIds": [
      "mat-tape",
      "mat-wire",
      "mat-lighter",
      "mat-electrolyte"
    ],
    "labelX": 1453,
    "labelY": 519.8,
    "centerNodeId": 1072,
    "hull": [
      {
        "x": 1282.2,
        "y": 477.8
      },
      {
        "x": 1518.3,
        "y": 356.4
      },
      {
        "x": 1623.9,
        "y": 561.9
      },
      {
        "x": 1387.8,
        "y": 683.2
      }
    ]
  },
  {
    "id": "dist-ind-ne",
    "name": "동부 외곽공업단지",
    "kind": "INDUSTRIAL",
    "seedX": 1518,
    "seedY": 125,
    "maxLoot": 8,
    "materialIds": [
      "mat-titanium",
      "mat-solenoid",
      "mat-fuel",
      "mat-core"
    ],
    "labelX": 1517.6,
    "labelY": 124.8,
    "centerNodeId": 443,
    "hull": [
      {
        "x": 1334.4,
        "y": 28.3
      },
      {
        "x": 1517.7,
        "y": -82.2
      },
      {
        "x": 1700.8,
        "y": 221.3
      },
      {
        "x": 1517.5,
        "y": 331.8
      }
    ]
  }
];

export const NODE_DISTRICT_INDEX: readonly number[] = [0,0,2,2,2,2,2,2,2,2,2,2,0,0,2,2,0,2,2,2,0,2,2,2,2,0,0,0,0,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,0,3,1,1,1,1,3,3,3,3,3,3,3,3,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3,2,3,3,3,3,2,2,3,2,2,2,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,1,1,5,5,5,5,5,5,7,7,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,7,5,5,5,5,5,5,5,5,5,5,5,5,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,13,13,13,13,13,13,13,13,13,9,9,13,13,13,13,13,13,13,13,9,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,7,7,7,7,7,7,7,7,7,5,7,7,7,7,7,9,9,7,7,9,9,9,9,9,9,10,7,7,7,7,7,7,7,10,10,10,10,10,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,10,10,9,9,9,9,9,13,13,13,13,13,10,10,10,10,10,10,10,10,13,13,13,10,9,9,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,10,13,13,13,13,13,13,13,13,13,10,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,1,1,1,1,1,1,4,4,4,1,1,1,4,4,4,4,4,4,4,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,4,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,4,4,5,5,5,3,4,4,4,3,3,3,3,3,3,4,4,4,4,4,4,4,5,4,4,5,5,5,5,5,5,5,5,4,4,4,5,6,6,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,8,8,8,8,8,8,8,8,8,8,5,5,5,5,5,5,6,6,6,5,6,6,5,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,8,6,6,8,8,8,8,8,6,6,6,6,6,8,8,8,8,8,8,3,3,3,3,3,3,3,3,4,3,3,3,3,3,3,3,4,3,3,3,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,8,8,6,8,8,5,7,7,8,8,7,7,7,7,7,7,7,7,8,8,7,8,8,8,8,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,11,7,8,8,8,8,8,8,8,8,7,8,7,7,8,8,8,11,8,8,8,8,8,8,8,8,8,8,8,8,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,10,10,10,10,10,10,10,10,10,10,10,10,10,10,11,11,10,10,10,10,10,12,10,10,10,10,12,10,10,12,10,12,12,12,12,12,12,12,12,11,11,11,11,11,12,12,12,12,12,12,12,11,11,11,11,12,12,11,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,11,11,11,8,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,11,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,13,12,13,12,12,13,12,12,12,12,12,12,12,12,12,12,12,12,13,13,13,13,12,13,13,13,13,13,13,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12];

const DISTRICT_BY_ID = new Map(MAP_DISTRICTS.map((district) => [district.id, district]));

export function getDistrictById(districtId: string): MapDistrict | undefined {
  return DISTRICT_BY_ID.get(districtId);
}

export function getNodeDistrict(nodeId: number): MapDistrict {
  const idx = NODE_DISTRICT_INDEX[nodeId] ?? 0;
  return MAP_DISTRICTS[idx] ?? MAP_DISTRICTS[0]!;
}

export function getBuildingDistrict(building: Pick<MapBuilding, "roadNodeId">): MapDistrict {
  return getNodeDistrict(building.roadNodeId);
}
