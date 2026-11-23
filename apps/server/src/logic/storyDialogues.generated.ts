// 자동 생성 파일입니다. docs/quest-story-dialogue.md를 고친 뒤 `pnpm --filter server story:generate`로 다시 만드세요.
import type { ManuscriptMission } from "./storyManuscript";

export const STORY_MANUSCRIPT_MISSIONS: readonly ManuscriptMission[] = [
  {
    "id": "hanlim-first-recovery",
    "act": 1,
    "issuerContactId": "relief-contact",
    "unlock": {
      "type": "ALL",
      "of": []
    },
    "objectives": {
      "obj-relay-26": {
        "id": "obj-relay-26",
        "targetLabel": "기록 중계 시설",
        "targetNodeId": 26,
        "enemyArchetypeId": "npc-hanlim-control"
      }
    },
    "dialogue": {
      "entry": "offer-1",
      "nodes": {
        "offer-1": {
          "id": "offer-1",
          "kind": "CHOICE",
          "lines": [
            {
              "speaker": {
                "contactId": "relief-contact"
              },
              "text": "거점 통신망 접속을 확인했습니다. 구호 운영부 조 과장입니다.",
              "pace": "NORMAL"
            },
            {
              "speaker": {
                "contactId": "relief-contact"
              },
              "text": "외곽 기록 중계 시설의 정기 송신이 오늘 새벽부터 끊겼습니다. 현장 단말기에서 운영 기록을 회수해 주셔야겠습니다.",
              "pace": "NORMAL",
              "pauseBeforeMs": 400
            }
          ],
          "choices": [
            {
              "id": "c1",
              "label": "현장에 위험 요소가 있습니까?",
              "next": "offer-ask-risk"
            },
            {
              "id": "c2",
              "label": "지급 장비는 무엇입니까?",
              "next": "offer-ask-supply"
            },
            {
              "id": "c3",
              "label": "알겠습니다. 바로 준비하겠습니다.",
              "next": "offer-final"
            }
          ]
        },
        "offer-ask-risk": {
          "id": "offer-ask-risk",
          "kind": "LINES",
          "lines": [
            {
              "speaker": "player",
              "text": "현장에 위험 요소가 있습니까?",
              "pace": "INSTANT"
            },
            {
              "speaker": {
                "contactId": "relief-contact"
              },
              "text": "통제망에서 이탈한 전직 요원들이 중계 시설 주변을 무단 점거하고 있습니다.",
              "pace": "NORMAL"
            },
            {
              "speaker": {
                "contactId": "relief-contact"
              },
              "text": "구호 부서의 회수 허가서를 제시해도 발포할 가능성이 높으니 교전에 대비하십시오.",
              "pace": "SLOW",
              "pauseBeforeMs": 500
            }
          ],
          "next": "offer-final"
        },
        "offer-ask-supply": {
          "id": "offer-ask-supply",
          "kind": "LINES",
          "lines": [
            {
              "speaker": "player",
              "text": "지급 장비는 무엇입니까?",
              "pace": "INSTANT"
            },
            {
              "speaker": {
                "contactId": "relief-contact"
              },
              "text": "구호 부서 표준 화기인 기업 구호용 카빈 1정을 배정해 두었습니다.",
              "pace": "NORMAL"
            },
            {
              "speaker": {
                "contactId": "relief-contact"
              },
              "text": "거점 창고로 바로 불출되며, 이미 외부 탐사 중이시라면 복귀 즉시 수령하실 수 있습니다.",
              "pace": "NORMAL"
            }
          ],
          "next": "offer-final"
        },
        "offer-final": {
          "id": "offer-final",
          "kind": "CHOICE",
          "lines": [
            {
              "speaker": {
                "contactId": "relief-contact"
              },
              "text": "기록 중계 시설에서 데이터를 확보한 뒤 중앙 탈출 지점을 통해 거점으로 복귀해 주십시오. 임무를 수락하시겠습니까?",
              "pace": "NORMAL"
            }
          ],
          "choices": [
            {
              "id": "c1",
              "label": "임무를 수락한다. (기록 중계 시설 #26)",
              "effects": [
                {
                  "type": "ACCEPT_OBJECTIVE",
                  "objectiveId": "obj-relay-26"
                },
                {
                  "type": "GRANT_ITEMS",
                  "items": [
                    {
                      "weaponId": "hanlim-relief-carbine",
                      "quantity": 1
                    }
                  ]
                }
              ],
              "next": "await"
            }
          ]
        },
        "await": {
          "id": "await",
          "kind": "AWAIT_OBJECTIVE",
          "lines": [
            {
              "speaker": {
                "contactId": "relief-contact"
              },
              "text": "목표 위치는 기록 중계 시설(#26)입니다. 기록을 회수한 뒤 무사히 탈출하십시오.",
              "pace": "NORMAL"
            }
          ],
          "next": "report-1",
          "recoveredLines": [
            {
              "speaker": "system",
              "text": "[회수 완료] 중계 시설 단말기에서 암호화된 운영 기록 저장소를 추출했습니다.",
              "pace": "INSTANT"
            },
            {
              "speaker": {
                "contactId": "relief-contact"
              },
              "text": "신호가 잡혔습니다. 단말기 데이터에 손상이 없도록 휴대하고 중앙 탈출 지점으로 빠져나오십시오.",
              "pace": "FAST",
              "pauseBeforeMs": 300
            },
            {
              "speaker": {
                "contactId": "relief-contact"
              },
              "text": "…부록 파일은 열람 권한이 걸려 있으니 임의로 열어보지 마시고 거점에서 인계해 주십시오.",
              "pace": "SLOW",
              "pauseBeforeMs": 600
            }
          ]
        },
        "report-1": {
          "id": "report-1",
          "kind": "CHOICE",
          "lines": [
            {
              "speaker": {
                "contactId": "relief-contact"
              },
              "text": "무사히 복귀하셨군요. 회수해 오신 중계 기록 저장소를 확인하겠습니다.",
              "pace": "NORMAL"
            }
          ],
          "choices": [
            {
              "id": "c1",
              "label": "저장소를 그대로 인계한다.",
              "next": "report-finish"
            },
            {
              "id": "c2",
              "label": "부록에 제 신체 검사 항목이 적혀 있던데, 무슨 기록입니까?",
              "effects": [
                {
                  "type": "SET_FLAG",
                  "key": "asked-observation-log",
                  "value": true
                }
              ],
              "next": "report-ask-appendix"
            }
          ],
          "availability": "BASE_ONLY"
        },
        "report-ask-appendix": {
          "id": "report-ask-appendix",
          "kind": "LINES",
          "lines": [
            {
              "speaker": "player",
              "text": "부록에 제 탐사 경로와 신체 검사 항목이 적혀 있었습니다. 구호 시설에서 왜 이런 걸 기록합니까?",
              "pace": "INSTANT"
            },
            {
              "speaker": {
                "contactId": "relief-contact"
              },
              "text": "…거점 내 감염과 중첩 후유증을 예방하기 위한 표준 생체 모니터링입니다.",
              "pace": "SLOW",
              "pauseBeforeMs": 800
            },
            {
              "speaker": {
                "contactId": "relief-contact"
              },
              "text": "연구 부문에서 열람 권한을 일부 해제해 두었으니, 기록실 단말기에서 직접 확인하셔도 좋습니다.",
              "pace": "NORMAL"
            }
          ],
          "next": "report-finish"
        },
        "report-finish": {
          "id": "report-finish",
          "kind": "LINES",
          "lines": [
            {
              "speaker": {
                "contactId": "relief-contact"
              },
              "text": "수고하셨습니다. 약정된 구호 보급품과 정산 크레딧을 창고로 지급했습니다.",
              "pace": "NORMAL"
            },
            {
              "speaker": "system",
              "text": "[보상 지급] 고압 충격봉 ×1 · 외상 응급 처치 키트 ×1 · 따뜻한 전투식량 ×1 · 200 CR",
              "pace": "INSTANT"
            }
          ],
          "next": "end-complete",
          "effects": [
            {
              "type": "GRANT_ITEMS",
              "items": [
                {
                  "weaponId": "eq-pub-t1",
                  "quantity": 1
                },
                {
                  "weaponId": "med-trauma-kit",
                  "quantity": 1
                },
                {
                  "weaponId": "food-combat-ration",
                  "quantity": 1
                }
              ]
            },
            {
              "type": "GRANT_CREDITS",
              "amount": 200
            },
            {
              "type": "DISCLOSE",
              "recordIds": [
                "return-observation"
              ],
              "contactIds": []
            }
          ]
        },
        "end-complete": {
          "id": "end-complete",
          "kind": "END",
          "lines": [
            {
              "speaker": "system",
              "text": "[기록 공개] 복귀 개체 관측 기록이 아카이브에 등록되었습니다.",
              "pace": "INSTANT"
            }
          ],
          "outcome": "COMPLETE"
        }
      }
    }
  },
  {
    "id": "hanlim-tier2-ration-audit",
    "act": 1,
    "issuerContactId": "market-contact",
    "unlock": {
      "type": "QUEST_OUTCOME",
      "questId": "hanlim-first-recovery",
      "outcome": "COMPLETE"
    },
    "objectives": {
      "obj-ration-73": {
        "id": "obj-ration-73",
        "targetLabel": "상가 비상 배급창구",
        "targetNodeId": 73,
        "enemyArchetypeId": "npc-com-scout"
      }
    },
    "dialogue": {
      "entry": "offer-1",
      "nodes": {
        "offer-1": {
          "id": "offer-1",
          "kind": "CHOICE",
          "lines": [
            {
              "speaker": {
                "contactId": "market-contact"
              },
              "text": "어이, 조 과장 심부름 무사히 마쳤다며? 거래소 쪽 채널로 잠깐 귀 좀 빌려줘.",
              "pace": "FAST"
            },
            {
              "speaker": {
                "contactId": "market-contact"
              },
              "text": "거점 공식 배급만 바라보고 있다간 다 굶어 죽어. 상업지구 배급창구 단말기에 아직 안 털린 재고 대장이 남아 있거든.",
              "pace": "NORMAL",
              "pauseBeforeMs": 300
            }
          ],
          "choices": [
            {
              "id": "c1",
              "label": "재고 대장은 뽑아서 어디에 쓰려고?",
              "next": "offer-ask-why"
            },
            {
              "id": "c2",
              "label": "주변에 얼쩡거리는 패거리가 있지 않나?",
              "next": "offer-ask-enemy"
            },
            {
              "id": "c3",
              "label": "조건만 맞으면 가져오지.",
              "next": "offer-final"
            }
          ]
        },
        "offer-ask-why": {
          "id": "offer-ask-why",
          "kind": "LINES",
          "lines": [
            {
              "speaker": "player",
              "text": "재고 대장은 뽑아서 어디에 쓰려고?",
              "pace": "INSTANT"
            },
            {
              "speaker": {
                "contactId": "market-contact"
              },
              "text": "출고 도장만 찍히고 실제로는 안 빠져나간 비축분 위치를 찾으려는 거지.",
              "pace": "NORMAL"
            },
            {
              "speaker": {
                "contactId": "market-contact"
              },
              "text": "요즘 장부에 유령 수령인이 잔뜩 찍혀 있어서, 먼저 확인하는 사람이 임자야.",
              "pace": "FAST",
              "pauseBeforeMs": 400
            }
          ],
          "next": "offer-final"
        },
        "offer-ask-enemy": {
          "id": "offer-ask-enemy",
          "kind": "LINES",
          "lines": [
            {
              "speaker": "player",
              "text": "상가 쪽이면 폭력배들이 자리를 잡고 있을 텐데.",
              "pace": "INSTANT"
            },
            {
              "speaker": {
                "contactId": "market-contact"
              },
              "text": "맞아, 충격봉 든 상가 패거리들이 배급창구 앞을 막고 통행세를 뜯고 있어.",
              "pace": "NORMAL"
            },
            {
              "speaker": {
                "contactId": "market-contact"
              },
              "text": "그래서 맨손으로 가라는 소리는 안 해. 비상용 붕대랑 에너지 바를 먼저 챙겨 줄게.",
              "pace": "NORMAL"
            }
          ],
          "next": "offer-final"
        },
        "offer-final": {
          "id": "offer-final",
          "kind": "CHOICE",
          "lines": [
            {
              "speaker": {
                "contactId": "market-contact"
              },
              "text": "상가 비상 배급창구(#73) 단말기에서 출고 대장만 뽑아 오면 배터리랑 현금으로 두둑하게 쳐줄게. 어때, 해 볼래?",
              "pace": "NORMAL"
            }
          ],
          "choices": [
            {
              "id": "c1",
              "label": "의뢰를 수락한다. (상가 비상 배급창구 #73)",
              "effects": [
                {
                  "type": "ACCEPT_OBJECTIVE",
                  "objectiveId": "obj-ration-73"
                },
                {
                  "type": "GRANT_ITEMS",
                  "items": [
                    {
                      "weaponId": "med-bandage",
                      "quantity": 2
                    },
                    {
                      "weaponId": "food-energy-bar",
                      "quantity": 1
                    }
                  ]
                }
              ],
              "next": "await"
            }
          ]
        },
        "await": {
          "id": "await",
          "kind": "AWAIT_OBJECTIVE",
          "lines": [
            {
              "speaker": {
                "contactId": "market-contact"
              },
              "text": "상가 비상 배급창구(#73)야. 단말기 대장만 챙겨서 중앙 탈출 지점으로 빠져나와.",
              "pace": "NORMAL"
            }
          ],
          "next": "report-1",
          "recoveredLines": [
            {
              "speaker": "system",
              "text": "[회수 완료] 배급창구 단말기에서 최근 30일분 출고 대장을 복사했습니다.",
              "pace": "INSTANT"
            },
            {
              "speaker": {
                "contactId": "market-contact"
              },
              "text": "오, 신호 들어왔다! 잠깐, 방금 전송된 미리보기 표 좀 봐봐.",
              "pace": "FAST",
              "pauseBeforeMs": 300
            },
            {
              "speaker": {
                "contactId": "market-contact"
              },
              "text": "…거점 등록 인원보다 매일 수십 명분이 더 빠져나갔는데, 수령 서명에 어제 복귀한 사람 이름이 오늘 날짜로 또 찍혀 있네? 일단 들고 나와 봐.",
              "pace": "SLOW",
              "pauseBeforeMs": 700
            }
          ]
        },
        "report-1": {
          "id": "report-1",
          "kind": "CHOICE",
          "lines": [
            {
              "speaker": {
                "contactId": "market-contact"
              },
              "text": "고생했어! 대장 파일 이리 넘겨줘. 약속한 리튬 배터리랑 음료, 크레딧은 바로 챙겨 놓았어.",
              "pace": "NORMAL"
            },
            {
              "speaker": {
                "contactId": "market-contact"
              },
              "text": "혹시 오면서 단말기에서 뜯어온 고속 릴레이 칩 있으면 하나만 같이 넘기지 않을래? 시세보다 후하게 90 크레딧 더 얹어 줄게.",
              "pace": "NORMAL",
              "pauseBeforeMs": 400
            }
          ],
          "choices": [
            {
              "id": "c1",
              "label": "출고 대장만 넘기고 기본 보상을 받는다.",
              "effects": [
                {
                  "type": "GRANT_ITEMS",
                  "items": [
                    {
                      "weaponId": "mat-battery",
                      "quantity": 2
                    },
                    {
                      "weaponId": "food-ion-drink",
                      "quantity": 2
                    }
                  ]
                },
                {
                  "type": "GRANT_CREDITS",
                  "amount": 250
                },
                {
                  "type": "DISCLOSE",
                  "recordIds": [
                    "ration-discrepancy-log"
                  ],
                  "contactIds": []
                }
              ],
              "next": "report-normal"
            },
            {
              "id": "c2",
              "label": "출고 대장과 함께 고속 릴레이 칩 1개를 넘긴다. (+90 CR)",
              "condition": {
                "type": "HAS_ITEM",
                "itemId": "mat-relay",
                "quantity": 1
              },
              "conditionLabel": "창고에 고속 릴레이 칩 1개 보유",
              "effects": [
                {
                  "type": "CONSUME_ITEMS",
                  "items": [
                    {
                      "weaponId": "mat-relay",
                      "quantity": 1
                    }
                  ]
                },
                {
                  "type": "GRANT_ITEMS",
                  "items": [
                    {
                      "weaponId": "mat-battery",
                      "quantity": 2
                    },
                    {
                      "weaponId": "food-ion-drink",
                      "quantity": 2
                    }
                  ]
                },
                {
                  "type": "GRANT_CREDITS",
                  "amount": 340
                },
                {
                  "type": "SET_FLAG",
                  "key": "choi-chip-bonus",
                  "value": true
                },
                {
                  "type": "DISCLOSE",
                  "recordIds": [
                    "ration-discrepancy-log"
                  ],
                  "contactIds": []
                }
              ],
              "next": "report-bonus"
            }
          ],
          "availability": "BASE_ONLY"
        },
        "report-normal": {
          "id": "report-normal",
          "kind": "LINES",
          "lines": [
            {
              "speaker": "player",
              "text": "대장 데이터만 넘기겠습니다.",
              "pace": "INSTANT"
            },
            {
              "speaker": {
                "contactId": "market-contact"
              },
              "text": "그래, 깔끔하네. 그런데 이 중복 수령 서명들은 아무리 봐도 전산 오류 수준이 아니야. 연구실 윤 박사 쪽에도 사본 하나가 흘러 들어갈 거다.",
              "pace": "NORMAL"
            },
            {
              "speaker": "system",
              "text": "[보상 지급] 리튬 배터리 ×2 · 전해질 이온 음료 ×2 · 250 CR",
              "pace": "INSTANT"
            }
          ],
          "next": "end-complete"
        },
        "report-bonus": {
          "id": "report-bonus",
          "kind": "LINES",
          "lines": [
            {
              "speaker": "player",
              "text": "마침 여분 릴레이 칩이 있습니다. 같이 정산하시죠.",
              "pace": "INSTANT"
            },
            {
              "speaker": {
                "contactId": "market-contact"
              },
              "text": "역시 일 처리는 확실하다니까! 칩 값까지 340 크레딧 꽉 채워 넣었어. 다음에 큰 건수 들어오면 너부터 찾을게.",
              "pace": "FAST"
            },
            {
              "speaker": "system",
              "text": "[소모] 고속 릴레이 칩 ×1 / [보상 지급] 리튬 배터리 ×2 · 전해질 이온 음료 ×2 · 340 CR",
              "pace": "INSTANT"
            }
          ],
          "next": "end-complete"
        },
        "end-complete": {
          "id": "end-complete",
          "kind": "END",
          "lines": [
            {
              "speaker": "system",
              "text": "[기록 공개] 배급 단말기 재고 대조표가 아카이브에 등록되었습니다.",
              "pace": "INSTANT"
            }
          ],
          "outcome": "COMPLETE"
        }
      }
    }
  },
  {
    "id": "hanlim-tier3-ward-manifest",
    "act": 2,
    "issuerContactId": "lab-contact",
    "unlock": {
      "type": "QUEST_OUTCOME",
      "questId": "hanlim-tier2-ration-audit",
      "outcome": "COMPLETE"
    },
    "objectives": {
      "obj-ward-741": {
        "id": "obj-ward-741",
        "targetLabel": "남부 응급 병동",
        "targetNodeId": 741,
        "enemyArchetypeId": "npc-med-medic"
      }
    },
    "dialogue": {
      "entry": "offer-1",
      "nodes": {
        "offer-1": {
          "id": "offer-1",
          "kind": "CHOICE",
          "lines": [
            {
              "speaker": {
                "contactId": "lab-contact"
              },
              "text": "유전자 분석실 윤 책임연구원입니다. 최 사장이 회수한 배급 대조표를 열람했습니다.",
              "pace": "NORMAL"
            },
            {
              "speaker": {
                "contactId": "lab-contact"
              },
              "text": "초과 배급분과 같은 날짜에, 구호 부서가 구조한 시민 명단 일부가 일반 병원이 아니라 기업 연구동 격리 구역으로 이관되고 있습니다.",
              "pace": "SLOW",
              "pauseBeforeMs": 500
            }
          ],
          "choices": [
            {
              "id": "c1",
              "label": "구호 환자를 왜 격리 구역으로 보냅니까?",
              "next": "offer-ask-reason"
            },
            {
              "id": "c2",
              "label": "남부 응급 병동 내부 상황은 어떻습니까?",
              "next": "offer-ask-ward"
            },
            {
              "id": "c3",
              "label": "확인이 필요한 위치만 알려주십시오.",
              "next": "offer-final"
            }
          ]
        },
        "offer-ask-reason": {
          "id": "offer-ask-reason",
          "kind": "LINES",
          "lines": [
            {
              "speaker": "player",
              "text": "구호 환자를 왜 연구동 격리 구역으로 보냅니까?",
              "pace": "INSTANT"
            },
            {
              "speaker": {
                "contactId": "lab-contact"
              },
              "text": "이관 사유 코드가 '비표준 생체 파형'으로만 적혀 있습니다.",
              "pace": "NORMAL"
            },
            {
              "speaker": {
                "contactId": "lab-contact"
              },
              "text": "제 권한으로도 원본 명단은 가려져 있어서, 현장 병동 서버에 남은 물리 로그를 직접 빼내야 합니다.",
              "pace": "SLOW",
              "pauseBeforeMs": 500
            }
          ],
          "next": "offer-final"
        },
        "offer-ask-ward": {
          "id": "offer-ask-ward",
          "kind": "LINES",
          "lines": [
            {
              "speaker": "player",
              "text": "남부 응급 병동 내부 상황은 어떻습니까?",
              "pace": "INSTANT"
            },
            {
              "speaker": {
                "contactId": "lab-contact"
              },
              "text": "봉쇄 직전 비인가 생체 처치를 받은 피험체들이 격리실을 부수고 배회 중입니다.",
              "pace": "NORMAL"
            },
            {
              "speaker": {
                "contactId": "lab-contact"
              },
              "text": "응급 생체 팩으로 자체 회복을 반복하는 개체들이니 지혈대와 생체 젤을 먼저 지급해 드리겠습니다.",
              "pace": "NORMAL"
            }
          ],
          "next": "offer-final"
        },
        "offer-final": {
          "id": "offer-final",
          "kind": "CHOICE",
          "lines": [
            {
              "speaker": {
                "contactId": "lab-contact"
              },
              "text": "남부 응급 병동(#741) 원무 단말기에서 생체 이송 내역 원본을 회수해 주십시오. 맡아주실 수 있겠습니까?",
              "pace": "NORMAL"
            }
          ],
          "choices": [
            {
              "id": "c1",
              "label": "임무를 수락한다. (남부 응급 병동 #741)",
              "effects": [
                {
                  "type": "ACCEPT_OBJECTIVE",
                  "objectiveId": "obj-ward-741"
                },
                {
                  "type": "GRANT_ITEMS",
                  "items": [
                    {
                      "weaponId": "med-tourniquet",
                      "quantity": 1
                    },
                    {
                      "weaponId": "mat-biogel",
                      "quantity": 1
                    }
                  ]
                }
              ],
              "next": "await"
            }
          ]
        },
        "await": {
          "id": "await",
          "kind": "AWAIT_OBJECTIVE",
          "lines": [
            {
              "speaker": {
                "contactId": "lab-contact"
              },
              "text": "남부 응급 병동(#741)에서 이송 내역을 확보한 뒤 거점으로 복귀해 주십시오.",
              "pace": "NORMAL"
            }
          ],
          "next": "report-1",
          "recoveredLines": [
            {
              "speaker": "system",
              "text": "[회수 완료] 응급 병동 원무 서버에서 '격리동 이관 대상자 명부' 원본을 확보했습니다.",
              "pace": "INSTANT"
            },
            {
              "speaker": {
                "contactId": "lab-contact"
              },
              "text": "데이터 수신을 확인했습니다. 명단 비고란에 '동일 생체 식별자 중복 입원 — 대조 표본 지정'이라고 적혀 있군요.",
              "pace": "FAST",
              "pauseBeforeMs": 300
            },
            {
              "speaker": {
                "contactId": "relief-contact"
              },
              "text": "…거점 운영부에서 끼어들겠습니다. 해당 병동 로그는 구호 부서 관할 보안 문서입니다. 복귀 즉시 운영부로도 인계 절차를 밟아 주십시오.",
              "pace": "NORMAL",
              "pauseBeforeMs": 800
            }
          ]
        },
        "report-1": {
          "id": "report-1",
          "kind": "CHOICE",
          "lines": [
            {
              "speaker": {
                "contactId": "lab-contact"
              },
              "text": "복귀하셨군요. 방금 조 과장 쪽에서도 원무 로그 회수 건으로 정식 인계 요청을 걸어왔습니다.",
              "pace": "NORMAL"
            },
            {
              "speaker": {
                "contactId": "lab-contact"
              },
              "text": "조 과장에게 원본을 넘기면 상부 보안 규정에 따라 대조 표본 명단이 봉인될 겁니다. 원본을 제 연구실로 넘기시겠습니까, 아니면 운영부 조 과장에게 공식 보고하시겠습니까?",
              "pace": "SLOW",
              "pauseBeforeMs": 600
            }
          ],
          "choices": [
            {
              "id": "c1",
              "label": "윤 책임연구원에게 원본을 넘기고 분석을 맡긴다.",
              "effects": [
                {
                  "type": "SET_FLAG",
                  "key": "ward-manifest-to",
                  "value": "yun"
                },
                {
                  "type": "GRANT_ITEMS",
                  "items": [
                    {
                      "weaponId": "eq-med-t1",
                      "quantity": 1
                    },
                    {
                      "weaponId": "mat-nanosuture",
                      "quantity": 1
                    }
                  ]
                },
                {
                  "type": "GRANT_CREDITS",
                  "amount": 300
                },
                {
                  "type": "DISCLOSE",
                  "recordIds": [
                    "medical-transfer-manifest"
                  ],
                  "contactIds": []
                }
              ],
              "next": "report-to-yun"
            },
            {
              "id": "c2",
              "label": "조 시설과장에게 공식 절차대로 원본을 보고한다.",
              "effects": [
                {
                  "type": "SET_FLAG",
                  "key": "ward-manifest-to",
                  "value": "jo"
                },
                {
                  "type": "GRANT_ITEMS",
                  "items": [
                    {
                      "weaponId": "eq-med-t1",
                      "quantity": 1
                    },
                    {
                      "weaponId": "mat-nanosuture",
                      "quantity": 1
                    }
                  ]
                },
                {
                  "type": "GRANT_CREDITS",
                  "amount": 300
                },
                {
                  "type": "DISCLOSE",
                  "recordIds": [
                    "medical-transfer-manifest"
                  ],
                  "contactIds": []
                }
              ],
              "next": "report-to-jo"
            }
          ],
          "availability": "BASE_ONLY"
        },
        "report-to-yun": {
          "id": "report-to-yun",
          "kind": "LINES",
          "lines": [
            {
              "speaker": "player",
              "text": "운영부에는 복구 불가 본만 넘기고, 원본은 연구실에서 분석해 주십시오.",
              "pace": "INSTANT"
            },
            {
              "speaker": {
                "contactId": "lab-contact"
              },
              "text": "현명한 판단입니다. 이 명단에 적힌 사람들은 병에 걸린 게 아니라… 이미 거점에 있는 생존자와 똑같은 생체 번호를 가진 두 번째 개체들입니다.",
              "pace": "NORMAL"
            },
            {
              "speaker": {
                "contactId": "lab-contact"
              },
              "text": "약속한 임상 장비와 보상을 창고로 넣어 두었습니다.",
              "pace": "NORMAL",
              "pauseBeforeMs": 400
            },
            {
              "speaker": "system",
              "text": "[보상 지급] 생체 자극 주입기 ×1 · 나노 봉합사 ×1 · 300 CR",
              "pace": "INSTANT"
            }
          ],
          "next": "end-complete"
        },
        "report-to-jo": {
          "id": "report-to-jo",
          "kind": "LINES",
          "lines": [
            {
              "speaker": "player",
              "text": "거점 규정대로 조 과장님께 원본 로그를 정식 인계하겠습니다.",
              "pace": "INSTANT"
            },
            {
              "speaker": {
                "contactId": "relief-contact"
              },
              "text": "협조에 감사드립니다. 미확인 생체 기록이 유출되면 거점 내부에 불필요한 동요만 일어납니다.",
              "pace": "NORMAL"
            },
            {
              "speaker": {
                "contactId": "lab-contact"
              },
              "text": "…원본은 운영부로 넘어갔지만, 회수 당시 추출된 요약 메타데이터는 기록실에 남겨 두었습니다. 보상은 약정대로 지급합니다.",
              "pace": "SLOW",
              "pauseBeforeMs": 700
            },
            {
              "speaker": "system",
              "text": "[보상 지급] 생체 자극 주입기 ×1 · 나노 봉합사 ×1 · 300 CR",
              "pace": "INSTANT"
            }
          ],
          "next": "end-complete"
        },
        "end-complete": {
          "id": "end-complete",
          "kind": "END",
          "lines": [
            {
              "speaker": "system",
              "text": "[기록 공개] 비표준 생체 이관 내역이 아카이브에 등록되었습니다.",
              "pace": "INSTANT"
            }
          ],
          "outcome": "COMPLETE"
        }
      }
    }
  },
  {
    "id": "hanlim-second-contraband",
    "act": 2,
    "issuerContactId": "market-contact",
    "unlock": {
      "type": "QUEST_OUTCOME",
      "questId": "hanlim-tier3-ward-manifest",
      "outcome": "COMPLETE"
    },
    "objectives": {
      "obj-logistics-91": {
        "id": "obj-logistics-91",
        "targetLabel": "물류센터 봉쇄 중계점",
        "targetNodeId": 91,
        "enemyArchetypeId": "npc-ind-enforcer"
      }
    },
    "dialogue": {
      "entry": "offer-1",
      "nodes": {
        "offer-1": {
          "id": "offer-1",
          "kind": "LINES",
          "lines": [
            {
              "speaker": {
                "contactId": "market-contact"
              },
              "text": "목소리 낮춰. 이번 건은 조 과장 귀에 들어가면 바로 통제부서 호출이야.",
              "pace": "FAST"
            },
            {
              "speaker": {
                "contactId": "market-contact"
              },
              "text": "종합물류센터 봉쇄 중계점(#91)에 본사 직속 컨테이너가 묶여 있는데, 거기 적하목록이랑 봉쇄 결재 원부가 들어 있거든.",
              "pace": "NORMAL",
              "pauseBeforeMs": 400
            }
          ],
          "next": "offer-branch-prev"
        },
        "offer-branch-prev": {
          "id": "offer-branch-prev",
          "kind": "BRANCH",
          "cases": [
            {
              "when": {
                "type": "FLAG",
                "key": "ward-manifest-to",
                "equals": "jo"
              },
              "next": "offer-warn-jo"
            }
          ],
          "otherwise": "offer-trust-yun"
        },
        "offer-warn-jo": {
          "id": "offer-warn-jo",
          "kind": "LINES",
          "lines": [
            {
              "speaker": {
                "contactId": "market-contact"
              },
              "text": "지난번 병동 명단은 조 과장한테 갖다 바쳤다며? 이번에도 고지식하게 굴면 거래소 뒷문은 영영 닫히는 줄 알아.",
              "pace": "SLOW",
              "pauseBeforeMs": 500
            }
          ],
          "next": "offer-decision"
        },
        "offer-trust-yun": {
          "id": "offer-trust-yun",
          "kind": "LINES",
          "lines": [
            {
              "speaker": {
                "contactId": "market-contact"
              },
              "text": "지난번에 윤 박사 쪽으로 명단 빼돌려 준 거 봤어. 너도 이 도시 돌아가는 꼬락서니가 수상하단 건 눈치챘을 거 아냐.",
              "pace": "NORMAL"
            }
          ],
          "next": "offer-decision"
        },
        "offer-decision": {
          "id": "offer-decision",
          "kind": "CHOICE",
          "lines": [
            {
              "speaker": {
                "contactId": "market-contact"
              },
              "text": "누가 이 도시 구호랑 격리 봉쇄를 동시에 지시하는지, 적하목록 결재란에 진짜 책임자 서명이 찍혀 있을 거야. 조 과장 몰래 빼 올 거지?",
              "pace": "NORMAL"
            }
          ],
          "choices": [
            {
              "id": "c1",
              "label": "비밀리에 물류센터 봉쇄 중계점의 적하목록을 회수한다. (#91)",
              "effects": [
                {
                  "type": "ACCEPT_OBJECTIVE",
                  "objectiveId": "obj-logistics-91"
                },
                {
                  "type": "GRANT_ITEMS",
                  "items": [
                    {
                      "weaponId": "med-bandage",
                      "quantity": 2
                    },
                    {
                      "weaponId": "food-ion-drink",
                      "quantity": 1
                    }
                  ]
                },
                {
                  "type": "SET_FLAG",
                  "key": "tier4-route",
                  "value": "choi"
                },
                {
                  "type": "LOCK_QUEST",
                  "questId": "hanlim-tier4-official-audit"
                }
              ],
              "next": "await"
            },
            {
              "id": "c2",
              "label": "비공식 반출 시도를 거절하고 조 시설과장에게 알린다. (공식 감사 전환)",
              "effects": [
                {
                  "type": "SET_FLAG",
                  "key": "tier4-route",
                  "value": "jo"
                },
                {
                  "type": "UNLOCK_QUEST",
                  "questId": "hanlim-tier4-official-audit"
                }
              ],
              "next": "decline-to-jo"
            }
          ]
        },
        "decline-to-jo": {
          "id": "decline-to-jo",
          "kind": "END",
          "lines": [
            {
              "speaker": "player",
              "text": "봉쇄 구역 결재 문서를 뒷거래로 빼돌릴 수는 없습니다. 운영부에 정식 감사를 요청하겠습니다.",
              "pace": "INSTANT"
            },
            {
              "speaker": {
                "contactId": "market-contact"
              },
              "text": "쳇, 융통성 없기는! 조 과장한테 일러바쳐 봐야 본사 결재선이 가려질 것 같냐? 마음대로 해 봐!",
              "pace": "FAST",
              "pauseBeforeMs": 400
            },
            {
              "speaker": "system",
              "text": "[임무 전환] 최 사장의 비공식 의뢰를 거절했습니다. 조 시설과장의 공식 감사 통신이 열렸습니다.",
              "pace": "INSTANT"
            }
          ],
          "outcome": "DECLINED"
        },
        "await": {
          "id": "await",
          "kind": "AWAIT_OBJECTIVE",
          "lines": [
            {
              "speaker": {
                "contactId": "market-contact"
              },
              "text": "물류센터 봉쇄 중계점(#91)이야. 작업장을 점거한 과격 노조원들만 뚫고 적하목록 단말기를 털어 와.",
              "pace": "NORMAL"
            }
          ],
          "next": "report-1",
          "recoveredLines": [
            {
              "speaker": "system",
              "text": "[회수 완료] 봉쇄 중계점 컨테이너 단말기에서 적하목록과 본사 격리 명령서를 확보했습니다.",
              "pace": "INSTANT"
            },
            {
              "speaker": {
                "contactId": "market-contact"
              },
              "text": "확인했어! 잠깐만… 구호 물자 배정표랑 연구동 격리 봉쇄 명령서의 최종 결재자가 완전히 똑같은 사람이잖아?",
              "pace": "FAST",
              "pauseBeforeMs": 300
            },
            {
              "speaker": {
                "contactId": "market-contact"
              },
              "text": "아예 한 사람이 오른손으론 밥을 주고 왼손으론 가두고 있었네. 어서 거점으로 들고 나와!",
              "pace": "NORMAL",
              "pauseBeforeMs": 400
            }
          ]
        },
        "report-1": {
          "id": "report-1",
          "kind": "CHOICE",
          "lines": [
            {
              "speaker": {
                "contactId": "market-contact"
              },
              "text": "무사히 빠져나왔구나! 이 결재 서명 하나면 본사 보급선 움직이는 건 손바닥 안이야.",
              "pace": "NORMAL"
            },
            {
              "speaker": {
                "contactId": "market-contact"
              },
              "text": "약속한 중장갑 방화문짝이랑 생체 젤, 그리고 380 크레딧 여기 있어.",
              "pace": "NORMAL",
              "pauseBeforeMs": 300
            }
          ],
          "choices": [
            {
              "id": "c1",
              "label": "적하목록 사본을 넘기고 보상을 수령한다.",
              "effects": [
                {
                  "type": "GRANT_ITEMS",
                  "items": [
                    {
                      "weaponId": "eq-reactive-plate",
                      "quantity": 1
                    },
                    {
                      "weaponId": "mat-biogel",
                      "quantity": 2
                    }
                  ]
                },
                {
                  "type": "GRANT_CREDITS",
                  "amount": 380
                },
                {
                  "type": "DISCLOSE",
                  "recordIds": [
                    "single-executive-directive"
                  ],
                  "contactIds": [
                    "executive-contact"
                  ]
                }
              ],
              "next": "report-finish"
            }
          ],
          "availability": "BASE_ONLY"
        },
        "report-finish": {
          "id": "report-finish",
          "kind": "LINES",
          "lines": [
            {
              "speaker": "player",
              "text": "결재선 정보는 연구실 아카이브에도 남겨 두겠습니다.",
              "pace": "INSTANT"
            },
            {
              "speaker": {
                "contactId": "market-contact"
              },
              "text": "그래, 어차피 숨길 수 있는 수준도 아니니까. 이제 위에서 내려오는 지시가 누구 입에서 나오는지 똑똑히 보일 거다.",
              "pace": "NORMAL"
            },
            {
              "speaker": "system",
              "text": "[보상 지급] 떼어온 방화문짝 ×1 · 멸균 생체 젤 ×2 · 380 CR",
              "pace": "INSTANT"
            }
          ],
          "next": "end-complete"
        },
        "end-complete": {
          "id": "end-complete",
          "kind": "END",
          "lines": [
            {
              "speaker": "system",
              "text": "[기록·인물 공개] '단일 결재선과 봉쇄 지시서' 및 '기업 경영 책임자' 정보가 아카이브에 등록되었습니다.",
              "pace": "INSTANT"
            }
          ],
          "outcome": "COMPLETE"
        }
      }
    }
  },
  {
    "id": "hanlim-tier4-official-audit",
    "act": 2,
    "issuerContactId": "relief-contact",
    "unlock": {
      "type": "QUEST_OUTCOME",
      "questId": "hanlim-second-contraband",
      "outcome": "DECLINED"
    },
    "objectives": {
      "obj-depot-305": {
        "id": "obj-depot-305",
        "targetLabel": "중앙 보급 집하장",
        "targetNodeId": 305,
        "enemyArchetypeId": "npc-ind-enforcer"
      },
      "obj-depot-842": {
        "id": "obj-depot-842",
        "targetLabel": "서포 물류 중계창",
        "targetNodeId": 842,
        "enemyArchetypeId": "npc-hanlim-control"
      }
    },
    "dialogue": {
      "entry": "offer-1",
      "nodes": {
        "offer-1": {
          "id": "offer-1",
          "kind": "LINES",
          "lines": [
            {
              "speaker": {
                "contactId": "relief-contact"
              },
              "text": "최 사장의 비공식 반출 시도를 즉시 제보해 주셔서 감사합니다. 규율을 지켜주신 덕분에 물류 보안 사고를 막았습니다.",
              "pace": "NORMAL"
            },
            {
              "speaker": {
                "contactId": "relief-contact"
              },
              "text": "다만 최 사장이 언급한 '구호 물자와 격리 명령의 통합 결재 원부'가 실제로 물류망에 묶여 있는지 운영부 차원에서 공식 감사를 진행해야겠습니다.",
              "pace": "SLOW",
              "pauseBeforeMs": 500
            }
          ],
          "next": "offer-2"
        },
        "offer-2": {
          "id": "offer-2",
          "kind": "CHOICE",
          "lines": [
            {
              "speaker": {
                "contactId": "relief-contact"
              },
              "text": "현재 본사 결재 원부가 경유한 물류 거점은 두 곳입니다. 북측의 중앙 보급 집하장(#305)과 중부의 서포 물류 중계창(#842) 중 어느 시설로 출동하시겠습니까?",
              "pace": "NORMAL"
            }
          ],
          "choices": [
            {
              "id": "c1",
              "label": "중앙 보급 집하장으로 출동한다. (#305 · 과격한 노조원 점거)",
              "effects": [
                {
                  "type": "ACCEPT_OBJECTIVE",
                  "objectiveId": "obj-depot-305"
                },
                {
                  "type": "GRANT_ITEMS",
                  "items": [
                    {
                      "weaponId": "med-trauma-kit",
                      "quantity": 1
                    },
                    {
                      "weaponId": "food-ion-drink",
                      "quantity": 1
                    }
                  ]
                },
                {
                  "type": "SET_FLAG",
                  "key": "tier4-audit-target",
                  "value": "depot305"
                }
              ],
              "next": "await"
            },
            {
              "id": "c2",
              "label": "서포 물류 중계창으로 출동한다. (#842 · 탈주한 통제요원 점거)",
              "effects": [
                {
                  "type": "ACCEPT_OBJECTIVE",
                  "objectiveId": "obj-depot-842"
                },
                {
                  "type": "GRANT_ITEMS",
                  "items": [
                    {
                      "weaponId": "med-trauma-kit",
                      "quantity": 1
                    },
                    {
                      "weaponId": "food-ion-drink",
                      "quantity": 1
                    }
                  ]
                },
                {
                  "type": "SET_FLAG",
                  "key": "tier4-audit-target",
                  "value": "depot842"
                }
              ],
              "next": "await"
            }
          ]
        },
        "await": {
          "id": "await",
          "kind": "AWAIT_OBJECTIVE",
          "lines": [
            {
              "speaker": {
                "contactId": "relief-contact"
              },
              "text": "지정된 물류 시설에서 본사 결재 원부를 확보한 뒤 중앙 탈출 지점으로 복귀해 주십시오.",
              "pace": "NORMAL"
            }
          ],
          "next": "report-1",
          "recoveredLines": [
            {
              "speaker": "system",
              "text": "[회수 완료] 물류 감사 단말기에서 본사 직속 적하목록과 격리 봉쇄 명령서 원부를 회수했습니다.",
              "pace": "INSTANT"
            },
            {
              "speaker": {
                "contactId": "relief-contact"
              },
              "text": "원부 해시가 확인되었습니다. …잠시만요.",
              "pace": "NORMAL",
              "pauseBeforeMs": 400
            },
            {
              "speaker": {
                "contactId": "relief-contact"
              },
              "text": "구호 부서 지원 지시서와 통제 부서 강제 격리 명령서에 찍힌 최종 승인 코드가… 모두 본사 단일 경영 책임자 한 분의 직인으로 되어 있습니다. 우선 거점으로 복귀하십시오.",
              "pace": "SLOW",
              "pauseBeforeMs": 900
            }
          ]
        },
        "report-1": {
          "id": "report-1",
          "kind": "CHOICE",
          "lines": [
            {
              "speaker": {
                "contactId": "relief-contact"
              },
              "text": "회수해 주신 결재 원부를 정밀 대조했습니다. 구호와 격리가 부서 간 혼선이 아니라, 동일한 최상위 경영 책임자의 단일 지휘 아래 동시에 내려오고 있었습니다.",
              "pace": "SLOW",
              "pauseBeforeMs": 500
            },
            {
              "speaker": {
                "contactId": "relief-contact"
              },
              "text": "운영부 관리자라 해도 이 사실까지 은폐할 수는 없습니다. 감사 보고서를 공식 아카이브에 등록하고 특별 감사 보상을 지급하겠습니다.",
              "pace": "NORMAL"
            }
          ],
          "choices": [
            {
              "id": "c1",
              "label": "감사 보고서를 등록하고 보상을 수령한다.",
              "effects": [
                {
                  "type": "GRANT_ITEMS",
                  "items": [
                    {
                      "weaponId": "eq-reactive-plate",
                      "quantity": 1
                    },
                    {
                      "weaponId": "mat-ceramic",
                      "quantity": 2
                    }
                  ]
                },
                {
                  "type": "GRANT_CREDITS",
                  "amount": 380
                },
                {
                  "type": "DISCLOSE",
                  "recordIds": [
                    "single-executive-directive"
                  ],
                  "contactIds": [
                    "executive-contact"
                  ]
                }
              ],
              "next": "report-finish"
            }
          ],
          "availability": "BASE_ONLY"
        },
        "report-finish": {
          "id": "report-finish",
          "kind": "LINES",
          "lines": [
            {
              "speaker": "player",
              "text": "원칙대로 기록을 공개해 주셔서 다행입니다.",
              "pace": "INSTANT"
            },
            {
              "speaker": {
                "contactId": "relief-contact"
              },
              "text": "질서를 지키려면 지휘 계통의 정당성부터 투명해야 합니다. 다음 외곽 검문소 건도 곧 연락드리겠습니다.",
              "pace": "NORMAL"
            },
            {
              "speaker": "system",
              "text": "[보상 지급] 떼어온 방화문짝 ×1 · 방열 세라믹 판 ×2 · 380 CR",
              "pace": "INSTANT"
            }
          ],
          "next": "end-complete"
        },
        "end-complete": {
          "id": "end-complete",
          "kind": "END",
          "lines": [
            {
              "speaker": "system",
              "text": "[기록·인물 공개] '단일 결재선과 봉쇄 지시서' 및 '기업 경영 책임자' 정보가 아카이브에 등록되었습니다.",
              "pace": "INSTANT"
            }
          ],
          "outcome": "COMPLETE"
        }
      }
    }
  },
  {
    "id": "hanlim-tier5-border-alarm",
    "act": 3,
    "issuerContactId": "relief-contact",
    "unlock": {
      "type": "ANY",
      "of": [
        {
          "type": "QUEST_OUTCOME",
          "questId": "hanlim-second-contraband",
          "outcome": "COMPLETE"
        },
        {
          "type": "QUEST_OUTCOME",
          "questId": "hanlim-tier4-official-audit",
          "outcome": "COMPLETE"
        }
      ]
    },
    "objectives": {
      "obj-border-90": {
        "id": "obj-border-90",
        "targetLabel": "물류단지 외곽 검문소",
        "targetNodeId": 90,
        "enemyArchetypeId": "npc-patrol-mid"
      }
    },
    "dialogue": {
      "entry": "offer-entry",
      "nodes": {
        "offer-entry": {
          "id": "offer-entry",
          "kind": "BRANCH",
          "cases": [
            {
              "when": {
                "type": "ALL",
                "of": [
                  {
                    "type": "FLAG",
                    "key": "tier4-route",
                    "equals": "jo"
                  },
                  {
                    "type": "FLAG",
                    "key": "ward-manifest-to",
                    "equals": "jo"
                  }
                ]
              },
              "next": "offer-loyal"
            },
            {
              "when": {
                "type": "FLAG",
                "key": "tier4-route",
                "equals": "jo"
              },
              "next": "offer-official"
            }
          ],
          "otherwise": "offer-contraband"
        },
        "offer-loyal": {
          "id": "offer-loyal",
          "kind": "LINES",
          "lines": [
            {
              "speaker": {
                "contactId": "relief-contact"
              },
              "text": "병동 로그 인계부터 물류 원부 감사까지, 늘 운영부의 원칙을 지켜 주셔서 깊이 신뢰하고 있습니다.",
              "pace": "NORMAL"
            },
            {
              "speaker": {
                "contactId": "relief-contact"
              },
              "text": "그래서 이번 외곽 검문소 이상 경보 건도 다른 인원이 아닌 당신께 직접 맡기려 합니다.",
              "pace": "NORMAL",
              "pauseBeforeMs": 400
            }
          ],
          "next": "offer-main"
        },
        "offer-official": {
          "id": "offer-official",
          "kind": "LINES",
          "lines": [
            {
              "speaker": {
                "contactId": "relief-contact"
              },
              "text": "지난번 물류 원부 감사에서 협조해 주신 덕분에 본사 결재선 구조를 파악할 수 있었습니다.",
              "pace": "NORMAL"
            },
            {
              "speaker": {
                "contactId": "relief-contact"
              },
              "text": "그 연장선에서 외곽 검문소의 비정상 경보 기록을 하나 더 확인해야 합니다.",
              "pace": "NORMAL",
              "pauseBeforeMs": 400
            }
          ],
          "next": "offer-main"
        },
        "offer-contraband": {
          "id": "offer-contraband",
          "kind": "LINES",
          "lines": [
            {
              "speaker": {
                "contactId": "relief-contact"
              },
              "text": "…최 사장과 물류 봉쇄선 문서를 따로 접촉하셨다는 보고는 받았습니다.",
              "pace": "SLOW",
              "pauseBeforeMs": 600
            },
            {
              "speaker": {
                "contactId": "relief-contact"
              },
              "text": "지금은 책임을 물을 때가 아닙니다. 물류단지 외곽 검문소에서 매뉴얼로 설명되지 않는 출입 경보가 반복되고 있어 현장에 나설 베테랑이 필요합니다.",
              "pace": "NORMAL"
            }
          ],
          "next": "offer-main"
        },
        "offer-main": {
          "id": "offer-main",
          "kind": "CHOICE",
          "lines": [
            {
              "speaker": {
                "contactId": "relief-contact"
              },
              "text": "물류단지 외곽 검문소(#90)에서 동일한 생체 인식 번호를 가진 인원의 출입 경보가 같은 시각에 중복 기록되고 있습니다. 현장 검문소 블랙박스를 회수해 주십시오.",
              "pace": "NORMAL"
            }
          ],
          "choices": [
            {
              "id": "c1",
              "label": "검문소 주변에 교전 징후가 있습니까?",
              "next": "offer-ask-patrol"
            },
            {
              "id": "c2",
              "label": "임무를 수락한다. (물류단지 외곽 검문소 #90)",
              "effects": [
                {
                  "type": "ACCEPT_OBJECTIVE",
                  "objectiveId": "obj-border-90"
                },
                {
                  "type": "GRANT_ITEMS",
                  "items": [
                    {
                      "weaponId": "med-trauma-kit",
                      "quantity": 1
                    },
                    {
                      "weaponId": "food-combat-ration",
                      "quantity": 1
                    }
                  ]
                }
              ],
              "next": "await"
            }
          ]
        },
        "offer-ask-patrol": {
          "id": "offer-ask-patrol",
          "kind": "LINES",
          "lines": [
            {
              "speaker": "player",
              "text": "검문소 주변에 교전 징후가 있습니까?",
              "pace": "INSTANT"
            },
            {
              "speaker": {
                "contactId": "relief-contact"
              },
              "text": "검문소 통로마다 이미 1차 장비 개조를 마친 무장 잔상 개체들이 순찰하듯 머물고 있습니다.",
              "pace": "NORMAL"
            },
            {
              "speaker": {
                "contactId": "relief-contact"
              },
              "text": "장기전에 대비해 외상 응급 처치 키트와 전투식량을 지급해 두었습니다.",
              "pace": "NORMAL"
            }
          ],
          "next": "offer-accept-only"
        },
        "offer-accept-only": {
          "id": "offer-accept-only",
          "kind": "CHOICE",
          "lines": [
            {
              "speaker": {
                "contactId": "relief-contact"
              },
              "text": "물류단지 외곽 검문소(#90)의 중복 경보 로그를 회수해 주시겠습니까?",
              "pace": "NORMAL"
            }
          ],
          "choices": [
            {
              "id": "c1",
              "label": "임무를 수락한다. (물류단지 외곽 검문소 #90)",
              "effects": [
                {
                  "type": "ACCEPT_OBJECTIVE",
                  "objectiveId": "obj-border-90"
                },
                {
                  "type": "GRANT_ITEMS",
                  "items": [
                    {
                      "weaponId": "med-trauma-kit",
                      "quantity": 1
                    },
                    {
                      "weaponId": "food-combat-ration",
                      "quantity": 1
                    }
                  ]
                }
              ],
              "next": "await"
            }
          ]
        },
        "await": {
          "id": "await",
          "kind": "AWAIT_OBJECTIVE",
          "lines": [
            {
              "speaker": {
                "contactId": "relief-contact"
              },
              "text": "목표는 물류단지 외곽 검문소(#90)입니다. 블랙박스 로그를 확보해 탈출하십시오.",
              "pace": "NORMAL"
            }
          ],
          "next": "report-1",
          "recoveredLines": [
            {
              "speaker": "system",
              "text": "[회수 완료] 외곽 검문소 게이트 제어기에서 중복 출입 경보 원시 로그를 추출했습니다.",
              "pace": "INSTANT"
            },
            {
              "speaker": {
                "contactId": "lab-contact"
              },
              "text": "연구실에서 통신에 합류했습니다. 방금 추출된 게이트 타임스탬프를 보십시오.",
              "pace": "FAST",
              "pauseBeforeMs": 300
            },
            {
              "speaker": {
                "contactId": "lab-contact"
              },
              "text": "생존자뿐만 아니라 본사 경영 책임자의 보안 인가 코드까지 같은 시각, 서로 다른 두 구획에서 동시에 찍혀 있습니다. 거점으로 복귀해 주십시오.",
              "pace": "NORMAL",
              "pauseBeforeMs": 400
            }
          ]
        },
        "report-1": {
          "id": "report-1",
          "kind": "CHOICE",
          "lines": [
            {
              "speaker": {
                "contactId": "relief-contact"
              },
              "text": "로그를 확인했습니다. 시스템은 후순위 출입 기록을 '미등록 개체 오류'로 자동 덮어쓰고 있었군요.",
              "pace": "SLOW",
              "pauseBeforeMs": 700
            },
            {
              "speaker": {
                "contactId": "lab-contact"
              },
              "text": "오류가 아닙니다, 조 과장님. 생존자들이 겪는 중첩 현상이 본사 최고 결재권자에게도 똑같이 일어나고 있다는 뜻입니다.",
              "pace": "NORMAL"
            }
          ],
          "choices": [
            {
              "id": "c1",
              "label": "회수한 검문소 블랙박스를 인계하고 보상을 받는다.",
              "effects": [
                {
                  "type": "GRANT_ITEMS",
                  "items": [
                    {
                      "weaponId": "mat-titanium",
                      "quantity": 2
                    },
                    {
                      "weaponId": "mat-core",
                      "quantity": 1
                    }
                  ]
                },
                {
                  "type": "GRANT_CREDITS",
                  "amount": 450
                },
                {
                  "type": "DISCLOSE",
                  "recordIds": [
                    "duplicate-gate-alarm"
                  ],
                  "contactIds": []
                }
              ],
              "next": "report-finish"
            }
          ],
          "availability": "BASE_ONLY"
        },
        "report-finish": {
          "id": "report-finish",
          "kind": "LINES",
          "lines": [
            {
              "speaker": {
                "contactId": "relief-contact"
              },
              "text": "…우선 약정된 특수 자재와 450 크레딧을 지급했습니다. 중앙 변전소 관측망 대조는 윤 책임연구원이 이어서 브리핑할 겁니다.",
              "pace": "NORMAL"
            },
            {
              "speaker": "system",
              "text": "[보상 지급] 경량 티타늄 프레임 ×2 · 차폐 동력 코어 ×1 · 450 CR",
              "pace": "INSTANT"
            }
          ],
          "next": "end-complete"
        },
        "end-complete": {
          "id": "end-complete",
          "kind": "END",
          "lines": [
            {
              "speaker": "system",
              "text": "[기록 공개] 중복 통행 경보 이력이 아카이브에 등록되었습니다.",
              "pace": "INSTANT"
            }
          ],
          "outcome": "COMPLETE"
        }
      }
    }
  },
  {
    "id": "hanlim-third-anomaly",
    "act": 3,
    "issuerContactId": "lab-contact",
    "unlock": {
      "type": "QUEST_OUTCOME",
      "questId": "hanlim-tier5-border-alarm",
      "outcome": "COMPLETE"
    },
    "objectives": {
      "obj-substation-609": {
        "id": "obj-substation-609",
        "targetLabel": "중앙 전력 변전소",
        "targetNodeId": 609,
        "enemyArchetypeId": "npc-inf-drone-op"
      }
    },
    "dialogue": {
      "entry": "offer-1",
      "nodes": {
        "offer-1": {
          "id": "offer-1",
          "kind": "CHOICE",
          "lines": [
            {
              "speaker": {
                "contactId": "lab-contact"
              },
              "text": "검문소 경보 이력과 물류 결재선을 교차 대조했습니다.",
              "pace": "NORMAL"
            },
            {
              "speaker": {
                "contactId": "lab-contact"
              },
              "text": "같은 경영 책임자의 생체 서명이 같은 시각에 서로 다른 구획에서 두 번 승인됐습니다. 구호를 지시한 책임자와 봉쇄를 지시한 책임자가 물리적으로 다른 개체일 가능성이 높습니다.",
              "pace": "SLOW",
              "pauseBeforeMs": 500
            }
          ],
          "choices": [
            {
              "id": "c1",
              "label": "중앙 전력 변전소에서 무엇을 확인해야 합니까?",
              "next": "offer-ask-target"
            },
            {
              "id": "c2",
              "label": "변전소 방어 체계는 어느 정도입니까?",
              "next": "offer-ask-drone"
            },
            {
              "id": "c3",
              "label": "마지막 관측 로그를 회수하러 가겠습니다.",
              "next": "offer-final"
            }
          ]
        },
        "offer-ask-target": {
          "id": "offer-ask-target",
          "kind": "LINES",
          "lines": [
            {
              "speaker": "player",
              "text": "중앙 전력 변전소에서 무엇을 확인해야 합니까?",
              "pace": "INSTANT"
            },
            {
              "speaker": {
                "contactId": "lab-contact"
              },
              "text": "도시 전역의 중첩 파형과 본사 전용 통신선이 모두 중앙 전력 변전소(#609) 주 서버를 거칩니다.",
              "pace": "NORMAL"
            },
            {
              "speaker": {
                "contactId": "lab-contact"
              },
              "text": "그곳의 중첩 관측 로그를 뽑아오면 두 결재 서명의 유전자 염기 편차를 확정할 수 있습니다.",
              "pace": "NORMAL"
            }
          ],
          "next": "offer-final"
        },
        "offer-ask-drone": {
          "id": "offer-ask-drone",
          "kind": "LINES",
          "lines": [
            {
              "speaker": "player",
              "text": "변전소 방어 체계는 어느 정도입니까?",
              "pace": "INSTANT"
            },
            {
              "speaker": {
                "contactId": "lab-contact"
              },
              "text": "식별 코드가 깨진 자율 드론 통제체가 모든 접근자를 침입자로 간주해 공격 드론을 전개하고 있습니다.",
              "pace": "NORMAL"
            },
            {
              "speaker": {
                "contactId": "lab-contact"
              },
              "text": "화력을 집중할 수 있는 장비를 챙기시고, 지급해 드리는 처치 키트를 활용하십시오.",
              "pace": "NORMAL"
            }
          ],
          "next": "offer-final"
        },
        "offer-final": {
          "id": "offer-final",
          "kind": "CHOICE",
          "lines": [
            {
              "speaker": {
                "contactId": "lab-contact"
              },
              "text": "중앙 전력 변전소(#609)에서 중첩 관측 로그 원본을 회수해 주십시오. 준비되셨습니까?",
              "pace": "NORMAL"
            }
          ],
          "choices": [
            {
              "id": "c1",
              "label": "임무를 수락한다. (중앙 전력 변전소 #609)",
              "effects": [
                {
                  "type": "ACCEPT_OBJECTIVE",
                  "objectiveId": "obj-substation-609"
                },
                {
                  "type": "GRANT_ITEMS",
                  "items": [
                    {
                      "weaponId": "med-trauma-kit",
                      "quantity": 1
                    },
                    {
                      "weaponId": "mat-biogel",
                      "quantity": 1
                    }
                  ]
                }
              ],
              "next": "await"
            }
          ]
        },
        "await": {
          "id": "await",
          "kind": "AWAIT_OBJECTIVE",
          "lines": [
            {
              "speaker": {
                "contactId": "lab-contact"
              },
              "text": "중앙 전력 변전소(#609)에서 중첩 관측 로그를 확보한 뒤 거점으로 귀환해 주십시오.",
              "pace": "NORMAL"
            }
          ],
          "next": "report-1",
          "recoveredLines": [
            {
              "speaker": "system",
              "text": "[회수 완료] 변전소 주 관측 서버에서 동시각 이중 결재 파형 및 유전자 편차 로그를 확보했습니다.",
              "pace": "INSTANT"
            },
            {
              "speaker": {
                "contactId": "lab-contact"
              },
              "text": "파형 대조가 끝났습니다! 역시 서로 다른 세계선에서 유입된 두 명의 경영 책임자가 각자 다른 지시를 내리고 있었습니다.",
              "pace": "FAST",
              "pauseBeforeMs": 300
            },
            {
              "speaker": {
                "contactId": "relief-contact"
              },
              "text": "…여기는 운영부 조 과장입니다. 해당 관측 로그는 도시 통제권 전체를 흔들 수 있는 1급 보안 자료입니다. 복귀 즉시 운영부로 귀속시켜 주십시오.",
              "pace": "NORMAL",
              "pauseBeforeMs": 600
            },
            {
              "speaker": {
                "contactId": "market-contact"
              },
              "text": "잠깐, 그 황금알을 왜 공짜로 넘겨! 결재권자가 둘이라는 증거만 내 손에 있으면 본사 보급망을 통째로 흔들 수 있다고. 거점 와서 나랑 얘기해!",
              "pace": "FAST",
              "pauseBeforeMs": 500
            }
          ]
        },
        "report-1": {
          "id": "report-1",
          "kind": "CHOICE",
          "lines": [
            {
              "speaker": {
                "contactId": "lab-contact"
              },
              "text": "무사히 돌아오셨군요. 변전소 로그의 기초 대조본은 이미 아카이브에 등록되어 복수 경영 책임자의 존재가 확인되었습니다.",
              "pace": "NORMAL"
            },
            {
              "speaker": {
                "contactId": "lab-contact"
              },
              "text": "하지만 관리자 인증 키가 담긴 원본 드라이브는 하나뿐입니다. 조 과장의 운영부, 제 연구실, 최 사장의 거래소 중 누구에게 이 원본 키를 맡기시겠습니까?",
              "pace": "SLOW",
              "pauseBeforeMs": 600
            }
          ],
          "choices": [
            {
              "id": "c1",
              "label": "조 시설과장에게 인계한다. (구호·통제 질서 유지 및 보안 등급 편입)",
              "effects": [
                {
                  "type": "SET_FLAG",
                  "key": "ending",
                  "value": "jo"
                },
                {
                  "type": "GRANT_ITEMS",
                  "items": [
                    {
                      "weaponId": "eq-arc-emitter",
                      "quantity": 1
                    },
                    {
                      "weaponId": "gene-ampoule-haerin",
                      "quantity": 1
                    },
                    {
                      "weaponId": "mat-core",
                      "quantity": 1
                    }
                  ]
                },
                {
                  "type": "GRANT_CREDITS",
                  "amount": 550
                },
                {
                  "type": "DISCLOSE",
                  "recordIds": [
                    "divergent-owner-audit",
                    "ending-jo-protocol"
                  ],
                  "contactIds": [
                    "executive-contact-b"
                  ]
                }
              ],
              "next": "ending-jo"
            },
            {
              "id": "c2",
              "label": "윤 책임연구원에게 맡긴다. (중첩 관측망 역추적 및 독자 생체 연구)",
              "effects": [
                {
                  "type": "SET_FLAG",
                  "key": "ending",
                  "value": "yun"
                },
                {
                  "type": "GRANT_ITEMS",
                  "items": [
                    {
                      "weaponId": "eq-arc-emitter",
                      "quantity": 1
                    },
                    {
                      "weaponId": "gene-ampoule-haerin",
                      "quantity": 1
                    },
                    {
                      "weaponId": "mat-nanosuture",
                      "quantity": 2
                    }
                  ]
                },
                {
                  "type": "GRANT_CREDITS",
                  "amount": 550
                },
                {
                  "type": "DISCLOSE",
                  "recordIds": [
                    "divergent-owner-audit",
                    "ending-yun-divergence"
                  ],
                  "contactIds": [
                    "executive-contact-b"
                  ]
                }
              ],
              "next": "ending-yun"
            },
            {
              "id": "c3",
              "label": "최 사장에게 넘긴다. (이중 결재선 공백을 이용한 비공식 보급망 장악)",
              "effects": [
                {
                  "type": "SET_FLAG",
                  "key": "ending",
                  "value": "choi"
                },
                {
                  "type": "GRANT_ITEMS",
                  "items": [
                    {
                      "weaponId": "eq-arc-emitter",
                      "quantity": 1
                    },
                    {
                      "weaponId": "gene-ampoule-haerin",
                      "quantity": 1
                    }
                  ]
                },
                {
                  "type": "GRANT_CREDITS",
                  "amount": 700
                },
                {
                  "type": "DISCLOSE",
                  "recordIds": [
                    "divergent-owner-audit",
                    "ending-choi-arbitrage"
                  ],
                  "contactIds": [
                    "executive-contact-b"
                  ]
                }
              ],
              "next": "ending-choi"
            }
          ],
          "availability": "BASE_ONLY"
        },
        "ending-jo": {
          "id": "ending-jo",
          "kind": "LINES",
          "lines": [
            {
              "speaker": "player",
              "text": "거점이 무너지면 생존자들도 버틸 수 없습니다. 운영부에서 질서를 유지하는 데 써 주십시오.",
              "pace": "INSTANT"
            },
            {
              "speaker": {
                "contactId": "relief-contact"
              },
              "text": "어려운 결단을 내려 주셨습니다. 상부 결재선이 둘로 갈라진 이상, 거점 현장 운영부가 중심을 잡아야 도시가 유지됩니다.",
              "pace": "NORMAL"
            },
            {
              "speaker": {
                "contactId": "relief-contact"
              },
              "text": "당신을 거점 특별 보안 인력으로 등록하고, 비축해 둔 차폐 동력 코어와 정식 보상을 지급했습니다.",
              "pace": "NORMAL",
              "pauseBeforeMs": 400
            },
            {
              "speaker": "system",
              "text": "[보상 지급] 고압 전기파리채 ×1 · 서해린 유전자 앰플 ×1 · 차폐 동력 코어 ×1 · 550 CR",
              "pace": "INSTANT"
            }
          ],
          "next": "end-complete"
        },
        "ending-yun": {
          "id": "ending-yun",
          "kind": "LINES",
          "lines": [
            {
              "speaker": "player",
              "text": "운영부에 넘기면 또 봉인될 겁니다. 연구실에서 끝까지 파형을 추적해 주십시오.",
              "pace": "INSTANT"
            },
            {
              "speaker": {
                "contactId": "lab-contact"
              },
              "text": "고맙습니다. 인증 키가 있으면 기업이 생존자들을 표본으로 삼던 관측망을 역으로 이용해, 중첩의 경계를 찾아낼 수 있습니다.",
              "pace": "NORMAL"
            },
            {
              "speaker": {
                "contactId": "lab-contact"
              },
              "text": "연구실 비축분 나노 봉합사와 유전자 앰플, 개조 장비를 창고로 보냈습니다.",
              "pace": "NORMAL",
              "pauseBeforeMs": 400
            },
            {
              "speaker": "system",
              "text": "[보상 지급] 고압 전기파리채 ×1 · 서해린 유전자 앰플 ×1 · 나노 봉합사 ×2 · 550 CR",
              "pace": "INSTANT"
            }
          ],
          "next": "end-complete"
        },
        "ending-choi": {
          "id": "ending-choi",
          "kind": "LINES",
          "lines": [
            {
              "speaker": "player",
              "text": "기업이나 연구실이나 믿을 수 없습니다. 실질적인 보급선과 현금으로 바꾸겠습니다.",
              "pace": "INSTANT"
            },
            {
              "speaker": {
                "contactId": "market-contact"
              },
              "text": "하하, 역시 마지막엔 장사꾼 계산이 제일 정확한 법이지! 위에 앉은 사장님이 두 명이면, 양쪽 결재 도장으로 물자를 두 배로 빼낼 수 있다는 소리잖아.",
              "pace": "FAST"
            },
            {
              "speaker": {
                "contactId": "market-contact"
              },
              "text": "약정 보상에 내 특별 사례금 150 크레딧을 더 얹어 700 크레딧으로 입금했어. 앞으로도 거점 물자는 내가 책임진다!",
              "pace": "NORMAL",
              "pauseBeforeMs": 400
            },
            {
              "speaker": "system",
              "text": "[보상 지급] 고압 전기파리채 ×1 · 서해린 유전자 앰플 ×1 · 700 CR",
              "pace": "INSTANT"
            }
          ],
          "next": "end-complete"
        },
        "end-complete": {
          "id": "end-complete",
          "kind": "END",
          "lines": [
            {
              "speaker": "system",
              "text": "[기록·인물 공개] '중첩 개체 대조 보고서', 선택 결말 기록 및 복수 경영 책임자 개체 정보가 아카이브에 등록되었습니다.",
              "pace": "INSTANT"
            }
          ],
          "outcome": "COMPLETE"
        }
      }
    }
  }
];
