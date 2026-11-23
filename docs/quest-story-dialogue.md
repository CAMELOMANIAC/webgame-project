# 퀘스트 채팅형 대화·분기 개편 스토리 원고 (`quest-story-dialogue.md`)

> 기준 문서: `quest-dialogue-plan.md` (2026-11-23, 8판 / A안), `docs/STORY-WRITING-GUIDE.md`, `docs/SF-생존-게임-세계관.md`
> 작성 원칙:
> 1. **고유명사 배제**: 인게임 노출 텍스트에서 도시·기업 고유명사를 배제하고 `도시`, `기업`, `본사`, `거점` 등 일반 명칭만 사용합니다.
> 2. **호흡 압축 및 속도 연출**: 모든 대사는 1~2문장으로 압축하고 `[즉시]`(`INSTANT`), `[빠르게]`(`FAST`), `[보통]`(`NORMAL`), `[느리게]`(`SLOW`)와 `[n초 쉼]`(`pauseBeforeMs`)을 명시합니다.
> 3. **서버 검증 규칙(§2.5) 준수**:
>    - 1막(1~2차)은 체인 분기(`UNLOCK_QUEST`, `LOCK_QUEST`) 없이 합류형 대화로 구성합니다.
>    - 아이템·크레딧 보유 조건(`HAS_ITEM`, `CREDITS_GTE`)과 소모·보상 즉시 지급(`CONSUME_ITEMS`, `SPEND_CREDITS`, 거점 보상 `GRANT_ITEMS`)은 모두 `BASE_ONLY` 노드에서만 실행합니다.
>    - 탐사 중 임무 수락 시 지급품(`supplyItems`)은 `QuestDelivery` 대기열에 적재되어 탐사 종료(탈출·사망) 후 거점에서 지급됩니다.
>    - 거절(`END: DECLINED`)은 제안 대화의 마지막 선택 노드(`ACCEPT_OBJECTIVE`와 동일한 노드)에만 배치합니다.

## 1. 전체 임무 체인 및 분기 구조 요약

| 막 | 임무 ID | 차수·제목 | 발령자 | 해금 조건 (`unlock`) | 목표 노드 (`objectives`) | 임무 적 (`enemyArchetypeId`) | 핵심 분기·플래그 및 공개 기록 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1막 | `hanlim-first-recovery` | 1차 · 중계 시설 기록 회수 | 조 시설과장 (`relief-contact`) | 초기 해금 (`ALWAYS`) | `obj-relay-26`: 기록 중계 시설 (`#26`) | `npc-hanlim-control` (탈주한 통제요원) | 선형 합류 / 기록 `return-observation` 공개 |
| 1막 | `hanlim-tier2-ration-audit` | 2차 · 상가 배급 단말기 대장 회수 | 최 사장 (`market-contact`) | `QUEST_OUTCOME(hanlim-first-recovery, COMPLETE)` | `obj-ration-73`: 상가 비상 배급창구 (`#73`) | `npc-com-scout` (조직폭력배) | 선형 합류 (거점 추가 정산 선택지) / 기록 `ration-discrepancy-log` 공개 |
| 2막 | `hanlim-tier3-ward-manifest` | 3차 · 응급 병동 생체 이송 내역 회수 | 윤 책임연구원 (`lab-contact`) | `QUEST_OUTCOME(hanlim-tier2-ration-audit, COMPLETE)` | `obj-ward-741`: 남부 응급 병동 (`#741`) | `npc-med-medic` (폭주한 생체실험체) | 보고 대상 분기: `ward-manifest-to = yun / jo` / 기록 `medical-transfer-manifest` 공개 |
| 2막 | `hanlim-second-contraband` | 4차(최 루트) · 물류 봉쇄선 적하목록 회수 | 최 사장 (`market-contact`) | `QUEST_OUTCOME(hanlim-tier3-ward-manifest, COMPLETE)` | `obj-logistics-91`: 물류센터 봉쇄 중계점 (`#91`) | `npc-ind-enforcer` (과격한 노조원) | 수락(`tier4-route = choi`) vs 조 과장 제보(`DECLINED` + 4차 대체 해금) / 완료 시 `single-executive-directive`·`executive-contact` 공개 |
| 2막 | `hanlim-tier4-official-audit` | 4차(조 루트) · 보급 집하장 결재 원부 감사 | 조 시설과장 (`relief-contact`) | `QUEST_OUTCOME(hanlim-second-contraband, DECLINED)` | `obj-depot-305`: 중앙 보급 집하장 (`#305`) 또는 `obj-depot-842`: 서포 물류 중계창 (`#842`) | `#305`: `npc-ind-enforcer` / `#842`: `npc-hanlim-control` | 목표 시설 선택 가능 (`ACCEPT_OBJECTIVE`) / 완료 시 `single-executive-directive`·`executive-contact` 공개 |
| 3막 | `hanlim-tier5-border-alarm` | 5차 · 외곽 검문소 중복 경보 로그 회수 | 조 시설과장 (`relief-contact`) | `ANY(COMPLETE(4차 최 루트), COMPLETE(4차 조 루트))` | `obj-border-90`: 물류단지 외곽 검문소 (`#90`) | `npc-patrol-mid` (무장 생존자 잔상) | `BRANCH`로 3·4차 플래그별 대사 변주 / 기록 `duplicate-gate-alarm` 공개 |
| 3막 | `hanlim-third-anomaly` | 6차 · 변전소 중첩 관측 로그 회수 | 윤 책임연구원 (`lab-contact`) | `QUEST_OUTCOME(hanlim-tier5-border-alarm, COMPLETE)` | `obj-substation-609`: 중앙 전력 변전소 (`#609`) | `npc-inf-drone-op` (오작동 드론 통제체) | 최종 보고 대상(조/윤/최) 분기 → 공통 `divergent-owner-audit`·`executive-contact-b` + 결말 기록 3종 중 1종 공개 |

## 2. 임무별 대화 그래프 상세 원고 (§11.7 양식)

### [임무 1] 1차 — 중계 시설 기록 회수 (`hanlim-first-recovery`)

```text
[임무] 1차 — 중계 시설 기록 회수 (hanlim-first-recovery)
발령자: 조 시설과장 (relief-contact / 구호·시설 운영)
막: 1
해금 조건: 초기 해금 (기본 활성)
목표:
  - obj-relay-26: 기록 중계 시설 / 노드 #26 / 임무 적 npc-hanlim-control (탈주한 통제요원)
지급품(수락 시, 거점 즉시 지급 / 탐사 중 수락 시 탐사 후 수령):
  - 기업 구호용 카빈 (hanlim-relief-carbine) ×1
보상(보고 시, 거점 전용):
  - 고압 충격봉 (eq-pub-t1) ×1, 외상 응급 처치 키트 (med-trauma-kit) ×1, 따뜻한 전투식량 (food-combat-ration) ×1, 200 CR
  - 공개 기록: 복귀 개체 관측 기록 (return-observation)

[노드] offer-1 (CHOICE, availability: ANYWHERE)
조 시설과장 [보통]: 거점 통신망 접속을 확인했습니다. 구호 운영부 조 과장입니다.
조 시설과장 [보통, 0.4초 쉼]: 외곽 기록 중계 시설의 정기 송신이 오늘 새벽부터 끊겼습니다. 현장 단말기에서 운영 기록을 회수해 주셔야겠습니다.
- 선택지 "현장에 위험 요소가 있습니까?" → offer-ask-risk
- 선택지 "지급 장비는 무엇입니까?" → offer-ask-supply
- 선택지 "알겠습니다. 바로 준비하겠습니다." → offer-final

[노드] offer-ask-risk (LINES, availability: ANYWHERE)
플레이어 [즉시]: 현장에 위험 요소가 있습니까?
조 시설과장 [보통]: 통제망에서 이탈한 전직 요원들이 중계 시설 주변을 무단 점거하고 있습니다.
조 시설과장 [느리게, 0.5초 쉼]: 구호 부서의 회수 허가서를 제시해도 발포할 가능성이 높으니 교전에 대비하십시오.
→ offer-final

[노드] offer-ask-supply (LINES, availability: ANYWHERE)
플레이어 [즉시]: 지급 장비는 무엇입니까?
조 시설과장 [보통]: 구호 부서 표준 화기인 기업 구호용 카빈 1정을 배정해 두었습니다.
조 시설과장 [보통]: 거점 창고로 바로 불출되며, 이미 외부 탐사 중이시라면 복귀 즉시 수령하실 수 있습니다.
→ offer-final

[노드] offer-final (CHOICE, availability: ANYWHERE)
조 시설과장 [보통]: 기록 중계 시설에서 데이터를 확보한 뒤 중앙 탈출 지점을 통해 거점으로 복귀해 주십시오. 임무를 수락하시겠습니까?
- 선택지 "임무를 수락한다. (기록 중계 시설 #26)"
  → 효과: ACCEPT_OBJECTIVE(obj-relay-26), GRANT_ITEMS(hanlim-relief-carbine ×1)
  → await

[노드] await (AWAIT_OBJECTIVE)
조 시설과장 [보통]: 목표 위치는 기록 중계 시설(#26)입니다. 기록을 회수한 뒤 무사히 탈출하십시오.
onRecovered → recovered-ping
onReady → report-1

[노드] recovered-ping (LINES, availability: ANYWHERE)
시스템 [즉시]: [회수 완료] 중계 시설 단말기에서 암호화된 운영 기록 저장소를 추출했습니다.
조 시설과장 [빠르게, 0.3초 쉼]: 신호가 잡혔습니다. 단말기 데이터에 손상이 없도록 휴대하고 중앙 탈출 지점으로 빠져나오십시오.
조 시설과장 [느리게, 0.6초 쉼]: …부록 파일은 열람 권한이 걸려 있으니 임의로 열어보지 마시고 거점에서 인계해 주십시오.
→ await (탈출 시 onReady로 전이)

[노드] report-1 (CHOICE, availability: BASE_ONLY)
조 시설과장 [보통]: 무사히 복귀하셨군요. 회수해 오신 중계 기록 저장소를 확인하겠습니다.
- 선택지 "저장소를 그대로 인계한다." → report-finish
- 선택지 "부록에 제 신체 검사 항목이 적혀 있던데, 무슨 기록입니까?"
  → 효과: SET_FLAG(asked-observation-log = true)
  → report-ask-appendix

[노드] report-ask-appendix (LINES, availability: BASE_ONLY)
플레이어 [즉시]: 부록에 제 탐사 경로와 신체 검사 항목이 적혀 있었습니다. 구호 시설에서 왜 이런 걸 기록합니까?
조 시설과장 [느리게, 0.8초 쉼]: …거점 내 감염과 중첩 후유증을 예방하기 위한 표준 생체 모니터링입니다.
조 시설과장 [보통]: 연구 부문에서 열람 권한을 일부 해제해 두었으니, 기록실 단말기에서 직접 확인하셔도 좋습니다.
→ report-finish

[노드] report-finish (LINES, availability: BASE_ONLY)
조 시설과장 [보통]: 수고하셨습니다. 약정된 구호 보급품과 정산 크레딧을 창고로 지급했습니다.
시스템 [즉시]: [보상 지급] 고압 충격봉 ×1 · 외상 응급 처치 키트 ×1 · 따뜻한 전투식량 ×1 · 200 CR
→ 효과: GRANT_ITEMS(eq-pub-t1 ×1, med-trauma-kit ×1, food-combat-ration ×1), GRANT_CREDITS(200), DISCLOSE(records: [return-observation])
→ end-complete

[노드] end-complete (END: COMPLETE)
시스템 [즉시]: [기록 공개] 복귀 개체 관측 기록이 아카이브에 등록되었습니다.
```

### [임무 2] 2차 — 상가 배급 단말기 대장 회수 (`hanlim-tier2-ration-audit`)

```text
[임무] 2차 — 상가 배급 단말기 대장 회수 (hanlim-tier2-ration-audit)
발령자: 최 사장 (market-contact / 비공식 물자 거래)
막: 1
해금 조건: QUEST_OUTCOME(hanlim-first-recovery, COMPLETE)
목표:
  - obj-ration-73: 상가 비상 배급창구 / 노드 #73 / 임무 적 npc-com-scout (조직폭력배)
지급품(수락 시):
  - 압박 붕대 (med-bandage) ×2, 고열량 에너지 바 (food-energy-bar) ×1
보상(보고 시, 거점 전용):
  - 기본: 리튬 배터리 (mat-battery) ×2, 전해질 이온 음료 (food-ion-drink) ×2, 250 CR
  - 선택 추가(고속 릴레이 칩 1개 전달 시): +90 CR 추가 정산
  - 공개 기록: 배급 단말기 재고 대조표 (ration-discrepancy-log)

[노드] offer-1 (CHOICE, availability: ANYWHERE)
최 사장 [빠르게]: 어이, 조 과장 심부름 무사히 마쳤다며? 거래소 쪽 채널로 잠깐 귀 좀 빌려줘.
최 사장 [보통, 0.3초 쉼]: 거점 공식 배급만 바라보고 있다간 다 굶어 죽어. 상업지구 배급창구 단말기에 아직 안 털린 재고 대장이 남아 있거든.
- 선택지 "재고 대장은 뽑아서 어디에 쓰려고?" → offer-ask-why
- 선택지 "주변에 얼쩡거리는 패거리가 있지 않나?" → offer-ask-enemy
- 선택지 "조건만 맞으면 가져오지." → offer-final

[노드] offer-ask-why (LINES, availability: ANYWHERE)
플레이어 [즉시]: 재고 대장은 뽑아서 어디에 쓰려고?
최 사장 [보통]: 출고 도장만 찍히고 실제로는 안 빠져나간 비축분 위치를 찾으려는 거지.
최 사장 [빠르게, 0.4초 쉼]: 요즘 장부에 유령 수령인이 잔뜩 찍혀 있어서, 먼저 확인하는 사람이 임자야.
→ offer-final

[노드] offer-ask-enemy (LINES, availability: ANYWHERE)
플레이어 [즉시]: 상가 쪽이면 폭력배들이 자리를 잡고 있을 텐데.
최 사장 [보통]: 맞아, 충격봉 든 상가 패거리들이 배급창구 앞을 막고 통행세를 뜯고 있어.
최 사장 [보통]: 그래서 맨손으로 가라는 소리는 안 해. 비상용 붕대랑 에너지 바를 먼저 챙겨 줄게.
→ offer-final

[노드] offer-final (CHOICE, availability: ANYWHERE)
최 사장 [보통]: 상가 비상 배급창구(#73) 단말기에서 출고 대장만 뽑아 오면 배터리랑 현금으로 두둑하게 쳐줄게. 어때, 해 볼래?
- 선택지 "의뢰를 수락한다. (상가 비상 배급창구 #73)"
  → 효과: ACCEPT_OBJECTIVE(obj-ration-73), GRANT_ITEMS(med-bandage ×2, food-energy-bar ×1)
  → await

[노드] await (AWAIT_OBJECTIVE)
최 사장 [보통]: 상가 비상 배급창구(#73)야. 단말기 대장만 챙겨서 중앙 탈출 지점으로 빠져나와.
onRecovered → recovered-ping
onReady → report-1

[노드] recovered-ping (LINES, availability: ANYWHERE)
시스템 [즉시]: [회수 완료] 배급창구 단말기에서 최근 30일분 출고 대장을 복사했습니다.
최 사장 [빠르게, 0.3초 쉼]: 오, 신호 들어왔다! 잠깐, 방금 전송된 미리보기 표 좀 봐봐.
최 사장 [느리게, 0.7초 쉼]: …거점 등록 인원보다 매일 수십 명분이 더 빠져나갔는데, 수령 서명에 어제 복귀한 사람 이름이 오늘 날짜로 또 찍혀 있네? 일단 들고 나와 봐.
→ await

[노드] report-1 (CHOICE, availability: BASE_ONLY)
최 사장 [보통]: 고생했어! 대장 파일 이리 넘겨줘. 약속한 리튬 배터리랑 음료, 크레딧은 바로 챙겨 놓았어.
최 사장 [보통, 0.4초 쉼]: 혹시 오면서 단말기에서 뜯어온 고속 릴레이 칩 있으면 하나만 같이 넘기지 않을래? 시세보다 후하게 90 크레딧 더 얹어 줄게.
- 선택지 "출고 대장만 넘기고 기본 보상을 받는다."
  → 효과: GRANT_ITEMS(mat-battery ×2, food-ion-drink ×2), GRANT_CREDITS(250), DISCLOSE(records: [ration-discrepancy-log])
  → report-normal
- 선택지 "출고 대장과 함께 고속 릴레이 칩 1개를 넘긴다. (+90 CR)"
  [조건: HAS_ITEM(mat-relay ×1) / 조건 문구: "조건: 창고에 고속 릴레이 칩 1개 보유"]
  → 효과: CONSUME_ITEMS(mat-relay ×1), GRANT_ITEMS(mat-battery ×2, food-ion-drink ×2), GRANT_CREDITS(340), SET_FLAG(choi-chip-bonus = true), DISCLOSE(records: [ration-discrepancy-log])
  → report-bonus

[노드] report-normal (LINES, availability: BASE_ONLY)
플레이어 [즉시]: 대장 데이터만 넘기겠습니다.
최 사장 [보통]: 그래, 깔끔하네. 그런데 이 중복 수령 서명들은 아무리 봐도 전산 오류 수준이 아니야. 연구실 윤 박사 쪽에도 사본 하나가 흘러 들어갈 거다.
시스템 [즉시]: [보상 지급] 리튬 배터리 ×2 · 전해질 이온 음료 ×2 · 250 CR
→ end-complete

[노드] report-bonus (LINES, availability: BASE_ONLY)
플레이어 [즉시]: 마침 여분 릴레이 칩이 있습니다. 같이 정산하시죠.
최 사장 [빠르게]: 역시 일 처리는 확실하다니까! 칩 값까지 340 크레딧 꽉 채워 넣었어. 다음에 큰 건수 들어오면 너부터 찾을게.
시스템 [즉시]: [소모] 고속 릴레이 칩 ×1 / [보상 지급] 리튬 배터리 ×2 · 전해질 이온 음료 ×2 · 340 CR
→ end-complete

[노드] end-complete (END: COMPLETE)
시스템 [즉시]: [기록 공개] 배급 단말기 재고 대조표가 아카이브에 등록되었습니다.
```

### [임무 3] 3차 — 응급 병동 생체 이송 내역 회수 (`hanlim-tier3-ward-manifest`)

```text
[임무] 3차 — 응급 병동 생체 이송 내역 회수 (hanlim-tier3-ward-manifest)
발령자: 윤 책임연구원 (lab-contact / 연구·유전자 분석)
막: 2
해금 조건: QUEST_OUTCOME(hanlim-tier2-ration-audit, COMPLETE)
목표:
  - obj-ward-741: 남부 응급 병동 / 노드 #741 / 임무 적 npc-med-medic (폭주한 생체실험체)
지급품(수락 시):
  - 전술 지혈대 (med-tourniquet) ×1, 멸균 생체 젤 (mat-biogel) ×1
보상(보고 시, 거점 전용):
  - 생체 자극 주입기 (eq-med-t1) ×1, 나노 봉합사 (mat-nanosuture) ×1, 300 CR
  - 공개 기록: 비표준 생체 이관 내역 (medical-transfer-manifest)
  - 핵심 분기: 보고 시 이송 명단 원본 전달 대상 선택 (ward-manifest-to = yun / jo)

[노드] offer-1 (CHOICE, availability: ANYWHERE)
윤 책임연구원 [보통]: 유전자 분석실 윤 책임연구원입니다. 최 사장이 회수한 배급 대조표를 열람했습니다.
윤 책임연구원 [느리게, 0.5초 쉼]: 초과 배급분과 같은 날짜에, 구호 부서가 구조한 시민 명단 일부가 일반 병원이 아니라 기업 연구동 격리 구역으로 이관되고 있습니다.
- 선택지 "구호 환자를 왜 격리 구역으로 보냅니까?" → offer-ask-reason
- 선택지 "남부 응급 병동 내부 상황은 어떻습니까?" → offer-ask-ward
- 선택지 "확인이 필요한 위치만 알려주십시오." → offer-final

[노드] offer-ask-reason (LINES, availability: ANYWHERE)
플레이어 [즉시]: 구호 환자를 왜 연구동 격리 구역으로 보냅니까?
윤 책임연구원 [보통]: 이관 사유 코드가 '비표준 생체 파형'으로만 적혀 있습니다.
윤 책임연구원 [느리게, 0.5초 쉼]: 제 권한으로도 원본 명단은 가려져 있어서, 현장 병동 서버에 남은 물리 로그를 직접 빼내야 합니다.
→ offer-final

[노드] offer-ask-ward (LINES, availability: ANYWHERE)
플레이어 [즉시]: 남부 응급 병동 내부 상황은 어떻습니까?
윤 책임연구원 [보통]: 봉쇄 직전 비인가 생체 처치를 받은 피험체들이 격리실을 부수고 배회 중입니다.
윤 책임연구원 [보통]: 응급 생체 팩으로 자체 회복을 반복하는 개체들이니 지혈대와 생체 젤을 먼저 지급해 드리겠습니다.
→ offer-final

[노드] offer-final (CHOICE, availability: ANYWHERE)
윤 책임연구원 [보통]: 남부 응급 병동(#741) 원무 단말기에서 생체 이송 내역 원본을 회수해 주십시오. 맡아주실 수 있겠습니까?
- 선택지 "임무를 수락한다. (남부 응급 병동 #741)"
  → 효과: ACCEPT_OBJECTIVE(obj-ward-741), GRANT_ITEMS(med-tourniquet ×1, mat-biogel ×1)
  → await

[노드] await (AWAIT_OBJECTIVE)
윤 책임연구원 [보통]: 남부 응급 병동(#741)에서 이송 내역을 확보한 뒤 거점으로 복귀해 주십시오.
onRecovered → recovered-ping
onReady → report-1

[노드] recovered-ping (LINES, availability: ANYWHERE)
시스템 [즉시]: [회수 완료] 응급 병동 원무 서버에서 '격리동 이관 대상자 명부' 원본을 확보했습니다.
윤 책임연구원 [빠르게, 0.3초 쉼]: 데이터 수신을 확인했습니다. 명단 비고란에 '동일 생체 식별자 중복 입원 — 대조 표본 지정'이라고 적혀 있군요.
조 시설과장 [보통, 0.8초 쉼]: …거점 운영부에서 끼어들겠습니다. 해당 병동 로그는 구호 부서 관할 보안 문서입니다. 복귀 즉시 운영부로도 인계 절차를 밟아 주십시오.
→ await

[노드] report-1 (CHOICE, availability: BASE_ONLY)
윤 책임연구원 [보통]: 복귀하셨군요. 방금 조 과장 쪽에서도 원무 로그 회수 건으로 정식 인계 요청을 걸어왔습니다.
윤 책임연구원 [느리게, 0.6초 쉼]: 조 과장에게 원본을 넘기면 상부 보안 규정에 따라 대조 표본 명단이 봉인될 겁니다. 원본을 제 연구실로 넘기시겠습니까, 아니면 운영부 조 과장에게 공식 보고하시겠습니까?
- 선택지 "윤 책임연구원에게 원본을 넘기고 분석을 맡긴다."
  → 효과: SET_FLAG(ward-manifest-to = yun), GRANT_ITEMS(eq-med-t1 ×1, mat-nanosuture ×1), GRANT_CREDITS(300), DISCLOSE(records: [medical-transfer-manifest])
  → report-to-yun
- 선택지 "조 시설과장에게 공식 절차대로 원본을 보고한다."
  → 효과: SET_FLAG(ward-manifest-to = jo), GRANT_ITEMS(eq-med-t1 ×1, mat-nanosuture ×1), GRANT_CREDITS(300), DISCLOSE(records: [medical-transfer-manifest])
  → report-to-jo

[노드] report-to-yun (LINES, availability: BASE_ONLY)
플레이어 [즉시]: 운영부에는 복구 불가 본만 넘기고, 원본은 연구실에서 분석해 주십시오.
윤 책임연구원 [보통]: 현명한 판단입니다. 이 명단에 적힌 사람들은 병에 걸린 게 아니라… 이미 거점에 있는 생존자와 똑같은 생체 번호를 가진 두 번째 개체들입니다.
윤 책임연구원 [보통, 0.4초 쉼]: 약속한 임상 장비와 보상을 창고로 넣어 두었습니다.
시스템 [즉시]: [보상 지급] 생체 자극 주입기 ×1 · 나노 봉합사 ×1 · 300 CR
→ end-complete

[노드] report-to-jo (LINES, availability: BASE_ONLY)
플레이어 [즉시]: 거점 규정대로 조 과장님께 원본 로그를 정식 인계하겠습니다.
조 시설과장 [보통]: 협조에 감사드립니다. 미확인 생체 기록이 유출되면 거점 내부에 불필요한 동요만 일어납니다.
윤 책임연구원 [느리게, 0.7초 쉼]: …원본은 운영부로 넘어갔지만, 회수 당시 추출된 요약 메타데이터는 기록실에 남겨 두었습니다. 보상은 약정대로 지급합니다.
시스템 [즉시]: [보상 지급] 생체 자극 주입기 ×1 · 나노 봉합사 ×1 · 300 CR
→ end-complete

[노드] end-complete (END: COMPLETE)
시스템 [즉시]: [기록 공개] 비표준 생체 이관 내역이 아카이브에 등록되었습니다.
```

### [임무 4-A] 4차 (최 사장 루트) — 물류 봉쇄선 적하목록 회수 (`hanlim-second-contraband`)

```text
[임무] 4차 (최 사장 루트) — 물류 봉쇄선 적하목록 회수 (hanlim-second-contraband)
발령자: 최 사장 (market-contact / 비공식 물자 거래)
막: 2
해금 조건: QUEST_OUTCOME(hanlim-tier3-ward-manifest, COMPLETE)
목표:
  - obj-logistics-91: 물류센터 봉쇄 중계점 / 노드 #91 / 임무 적 npc-ind-enforcer (과격한 노조원)
지급품(수락 시):
  - 압박 붕대 (med-bandage) ×2, 전해질 이온 음료 (food-ion-drink) ×1
보상(보고 시, 거점 전용):
  - 떼어온 방화문짝 (eq-reactive-plate) ×1, 멸균 생체 젤 (mat-biogel) ×2, 380 CR
  - 공개 기록: 단일 결재선과 봉쇄 지시서 (single-executive-directive)
  - 공개 담당자: 기업 경영 책임자 (executive-contact)
핵심 체인 분기:
  - 마지막 제안 노드(offer-decision)에서 수락 시 최 사장 루트 진행 (tier4-route = choi, 4차 대체 임무 LOCK)
  - "조 과장에게 알린다" 선택 시 이 임무는 END(DECLINED) 처리되며 4차 공식 감사 대체 임무(hanlim-tier4-official-audit) 해금 (tier4-route = jo)

[노드] offer-1 (LINES, availability: ANYWHERE)
최 사장 [빠르게]: 목소리 낮춰. 이번 건은 조 과장 귀에 들어가면 바로 통제부서 호출이야.
최 사장 [보통, 0.4초 쉼]: 종합물류센터 봉쇄 중계점(#91)에 본사 직속 컨테이너가 묶여 있는데, 거기 적하목록이랑 봉쇄 결재 원부가 들어 있거든.
→ offer-branch-prev

[노드] offer-branch-prev (BRANCH)
- when: FLAG(ward-manifest-to == "jo") → offer-warn-jo
- otherwise → offer-trust-yun

[노드] offer-warn-jo (LINES, availability: ANYWHERE)
최 사장 [느리게, 0.5초 쉼]: 지난번 병동 명단은 조 과장한테 갖다 바쳤다며? 이번에도 고지식하게 굴면 거래소 뒷문은 영영 닫히는 줄 알아.
→ offer-decision

[노드] offer-trust-yun (LINES, availability: ANYWHERE)
최 사장 [보통]: 지난번에 윤 박사 쪽으로 명단 빼돌려 준 거 봤어. 너도 이 도시 돌아가는 꼬락서니가 수상하단 건 눈치챘을 거 아냐.
→ offer-decision

[노드] offer-decision (CHOICE, availability: ANYWHERE)
최 사장 [보통]: 누가 이 도시 구호랑 격리 봉쇄를 동시에 지시하는지, 적하목록 결재란에 진짜 책임자 서명이 찍혀 있을 거야. 조 과장 몰래 빼 올 거지?
- 선택지 "비밀리에 물류센터 봉쇄 중계점의 적하목록을 회수한다. (#91)"
  → 효과: ACCEPT_OBJECTIVE(obj-logistics-91), GRANT_ITEMS(med-bandage ×2, food-ion-drink ×1), SET_FLAG(tier4-route = choi), LOCK_QUEST(hanlim-tier4-official-audit)
  → await
- 선택지 "비공식 반출 시도를 거절하고 조 시설과장에게 알린다. (공식 감사 전환)"
  → 효과: SET_FLAG(tier4-route = jo), UNLOCK_QUEST(hanlim-tier4-official-audit)
  → decline-to-jo

[노드] decline-to-jo (END: DECLINED)
플레이어 [즉시]: 봉쇄 구역 결재 문서를 뒷거래로 빼돌릴 수는 없습니다. 운영부에 정식 감사를 요청하겠습니다.
최 사장 [빠르게, 0.4초 쉼]: 쳇, 융통성 없기는! 조 과장한테 일러바쳐 봐야 본사 결재선이 가려질 것 같냐? 마음대로 해 봐!
시스템 [즉시]: [임무 전환] 최 사장의 비공식 의뢰를 거절했습니다. 조 시설과장의 공식 감사 통신이 열렸습니다.

[노드] await (AWAIT_OBJECTIVE)
최 사장 [보통]: 물류센터 봉쇄 중계점(#91)이야. 작업장을 점거한 과격 노조원들만 뚫고 적하목록 단말기를 털어 와.
onRecovered → recovered-ping
onReady → report-1

[노드] recovered-ping (LINES, availability: ANYWHERE)
시스템 [즉시]: [회수 완료] 봉쇄 중계점 컨테이너 단말기에서 적하목록과 본사 격리 명령서를 확보했습니다.
최 사장 [빠르게, 0.3초 쉼]: 확인했어! 잠깐만… 구호 물자 배정표랑 연구동 격리 봉쇄 명령서의 최종 결재자가 완전히 똑같은 사람이잖아?
최 사장 [보통, 0.4초 쉼]: 아예 한 사람이 오른손으론 밥을 주고 왼손으론 가두고 있었네. 어서 거점으로 들고 나와!
→ await

[노드] report-1 (CHOICE, availability: BASE_ONLY)
최 사장 [보통]: 무사히 빠져나왔구나! 이 결재 서명 하나면 본사 보급선 움직이는 건 손바닥 안이야.
최 사장 [보통, 0.3초 쉼]: 약속한 중장갑 방화문짝이랑 생체 젤, 그리고 380 크레딧 여기 있어.
- 선택지 "적하목록 사본을 넘기고 보상을 수령한다."
  → 효과: GRANT_ITEMS(eq-reactive-plate ×1, mat-biogel ×2), GRANT_CREDITS(380), DISCLOSE(records: [single-executive-directive], contacts: [executive-contact])
  → report-finish

[노드] report-finish (LINES, availability: BASE_ONLY)
플레이어 [즉시]: 결재선 정보는 연구실 아카이브에도 남겨 두겠습니다.
최 사장 [보통]: 그래, 어차피 숨길 수 있는 수준도 아니니까. 이제 위에서 내려오는 지시가 누구 입에서 나오는지 똑똑히 보일 거다.
시스템 [즉시]: [보상 지급] 떼어온 방화문짝 ×1 · 멸균 생체 젤 ×2 · 380 CR
→ end-complete

[노드] end-complete (END: COMPLETE)
시스템 [즉시]: [기록·인물 공개] '단일 결재선과 봉쇄 지시서' 및 '기업 경영 책임자' 정보가 아카이브에 등록되었습니다.
```

### [임무 4-B] 4차 대체 (조 과장 루트) — 보급 집하장 결재 원부 감사 (`hanlim-tier4-official-audit`)

```text
[임무] 4차 대체 (조 과장 루트) — 보급 집하장 결재 원부 감사 (hanlim-tier4-official-audit)
발령자: 조 시설과장 (relief-contact / 구호·시설 운영)
막: 2
해금 조건: QUEST_OUTCOME(hanlim-second-contraband, DECLINED) (4차 최 사장 제안에서 "조 시설과장에게 알린다" 선택 시 해금)
목표(수락 선택지에 따라 1개 확정):
  - obj-depot-305: 중앙 보급 집하장 / 노드 #305 / 임무 적 npc-ind-enforcer (과격한 노조원)
  - obj-depot-842: 서포 물류 중계창 / 노드 #842 / 임무 적 npc-hanlim-control (탈주한 통제요원)
지급품(수락 시):
  - 외상 응급 처치 키트 (med-trauma-kit) ×1, 전해질 이온 음료 (food-ion-drink) ×1
보상(보고 시, 거점 전용):
  - 떼어온 방화문짝 (eq-reactive-plate) ×1, 방열 세라믹 판 (mat-ceramic) ×2, 380 CR
  - 공개 기록: 단일 결재선과 봉쇄 지시서 (single-executive-directive) — 최 사장 루트와 동일 기록 공개로 공개 순서 보존
  - 공개 담당자: 기업 경영 책임자 (executive-contact)

[노드] offer-1 (LINES, availability: ANYWHERE)
조 시설과장 [보통]: 최 사장의 비공식 반출 시도를 즉시 제보해 주셔서 감사합니다. 규율을 지켜주신 덕분에 물류 보안 사고를 막았습니다.
조 시설과장 [느리게, 0.5초 쉼]: 다만 최 사장이 언급한 '구호 물자와 격리 명령의 통합 결재 원부'가 실제로 물류망에 묶여 있는지 운영부 차원에서 공식 감사를 진행해야겠습니다.
→ offer-2

[노드] offer-2 (CHOICE, availability: ANYWHERE)
조 시설과장 [보통]: 현재 본사 결재 원부가 경유한 물류 거점은 두 곳입니다. 북측의 중앙 보급 집하장(#305)과 중부의 서포 물류 중계창(#842) 중 어느 시설로 출동하시겠습니까?
- 선택지 "중앙 보급 집하장으로 출동한다. (#305 · 과격한 노조원 점거)"
  → 효과: ACCEPT_OBJECTIVE(obj-depot-305), GRANT_ITEMS(med-trauma-kit ×1, food-ion-drink ×1), SET_FLAG(tier4-audit-target = depot305)
  → await
- 선택지 "서포 물류 중계창으로 출동한다. (#842 · 탈주한 통제요원 점거)"
  → 효과: ACCEPT_OBJECTIVE(obj-depot-842), GRANT_ITEMS(med-trauma-kit ×1, food-ion-drink ×1), SET_FLAG(tier4-audit-target = depot842)
  → await

[노드] await (AWAIT_OBJECTIVE)
조 시설과장 [보통]: 지정된 물류 시설에서 본사 결재 원부를 확보한 뒤 중앙 탈출 지점으로 복귀해 주십시오.
onRecovered → recovered-ping
onReady → report-1

[노드] recovered-ping (LINES, availability: ANYWHERE)
시스템 [즉시]: [회수 완료] 물류 감사 단말기에서 본사 직속 적하목록과 격리 봉쇄 명령서 원부를 회수했습니다.
조 시설과장 [보통, 0.4초 쉼]: 원부 해시가 확인되었습니다. …잠시만요.
조 시설과장 [느리게, 0.9초 쉼]: 구호 부서 지원 지시서와 통제 부서 강제 격리 명령서에 찍힌 최종 승인 코드가… 모두 본사 단일 경영 책임자 한 분의 직인으로 되어 있습니다. 우선 거점으로 복귀하십시오.
→ await

[노드] report-1 (CHOICE, availability: BASE_ONLY)
조 시설과장 [느리게, 0.5초 쉼]: 회수해 주신 결재 원부를 정밀 대조했습니다. 구호와 격리가 부서 간 혼선이 아니라, 동일한 최상위 경영 책임자의 단일 지휘 아래 동시에 내려오고 있었습니다.
조 시설과장 [보통]: 운영부 관리자라 해도 이 사실까지 은폐할 수는 없습니다. 감사 보고서를 공식 아카이브에 등록하고 특별 감사 보상을 지급하겠습니다.
- 선택지 "감사 보고서를 등록하고 보상을 수령한다."
  → 효과: GRANT_ITEMS(eq-reactive-plate ×1, mat-ceramic ×2), GRANT_CREDITS(380), DISCLOSE(records: [single-executive-directive], contacts: [executive-contact])
  → report-finish

[노드] report-finish (LINES, availability: BASE_ONLY)
플레이어 [즉시]: 원칙대로 기록을 공개해 주셔서 다행입니다.
조 시설과장 [보통]: 질서를 지키려면 지휘 계통의 정당성부터 투명해야 합니다. 다음 외곽 검문소 건도 곧 연락드리겠습니다.
시스템 [즉시]: [보상 지급] 떼어온 방화문짝 ×1 · 방열 세라믹 판 ×2 · 380 CR
→ end-complete

[노드] end-complete (END: COMPLETE)
시스템 [즉시]: [기록·인물 공개] '단일 결재선과 봉쇄 지시서' 및 '기업 경영 책임자' 정보가 아카이브에 등록되었습니다.
```

### [임무 5] 5차 — 외곽 검문소 중복 경보 로그 회수 (`hanlim-tier5-border-alarm`)

```text
[임무] 5차 — 외곽 검문소 중복 경보 로그 회수 (hanlim-tier5-border-alarm)
발령자: 조 시설과장 (relief-contact / 구호·시설 운영)
막: 3
해금 조건: ANY(QUEST_OUTCOME(hanlim-second-contraband, COMPLETE), QUEST_OUTCOME(hanlim-tier4-official-audit, COMPLETE))
목표:
  - obj-border-90: 물류단지 외곽 검문소 / 노드 #90 / 임무 적 npc-patrol-mid (무장 생존자 잔상)
지급품(수락 시):
  - 외상 응급 처치 키트 (med-trauma-kit) ×1, 따뜻한 전투식량 (food-combat-ration) ×1
보상(보고 시, 거점 전용):
  - 경량 티타늄 프레임 (mat-titanium) ×2, 차폐 동력 코어 (mat-core) ×1, 450 CR
  - 공개 기록: 중복 통행 경보 이력 (duplicate-gate-alarm)
특징:
  - 앞선 3·4차 선택 플래그(tier4-route, ward-manifest-to)에 따라 BRANCH 노드로 도입·보고 대사가 달라지며 효과는 동일하게 합류합니다.

[노드] offer-entry (BRANCH)
- when: ALL(FLAG(tier4-route == "jo"), FLAG(ward-manifest-to == "jo")) → offer-loyal
- when: FLAG(tier4-route == "jo") → offer-official
- otherwise → offer-contraband

[노드] offer-loyal (LINES, availability: ANYWHERE)
조 시설과장 [보통]: 병동 로그 인계부터 물류 원부 감사까지, 늘 운영부의 원칙을 지켜 주셔서 깊이 신뢰하고 있습니다.
조 시설과장 [보통, 0.4초 쉼]: 그래서 이번 외곽 검문소 이상 경보 건도 다른 인원이 아닌 당신께 직접 맡기려 합니다.
→ offer-main

[노드] offer-official (LINES, availability: ANYWHERE)
조 시설과장 [보통]: 지난번 물류 원부 감사에서 협조해 주신 덕분에 본사 결재선 구조를 파악할 수 있었습니다.
조 시설과장 [보통, 0.4초 쉼]: 그 연장선에서 외곽 검문소의 비정상 경보 기록을 하나 더 확인해야 합니다.
→ offer-main

[노드] offer-contraband (LINES, availability: ANYWHERE)
조 시설과장 [느리게, 0.6초 쉼]: …최 사장과 물류 봉쇄선 문서를 따로 접촉하셨다는 보고는 받았습니다.
조 시설과장 [보통]: 지금은 책임을 물을 때가 아닙니다. 물류단지 외곽 검문소에서 매뉴얼로 설명되지 않는 출입 경보가 반복되고 있어 현장에 나설 베테랑이 필요합니다.
→ offer-main

[노드] offer-main (CHOICE, availability: ANYWHERE)
조 시설과장 [보통]: 물류단지 외곽 검문소(#90)에서 동일한 생체 인식 번호를 가진 인원의 출입 경보가 같은 시각에 중복 기록되고 있습니다. 현장 검문소 블랙박스를 회수해 주십시오.
- 선택지 "검문소 주변에 교전 징후가 있습니까?" → offer-ask-patrol
- 선택지 "임무를 수락한다. (물류단지 외곽 검문소 #90)"
  → 효과: ACCEPT_OBJECTIVE(obj-border-90), GRANT_ITEMS(med-trauma-kit ×1, food-combat-ration ×1)
  → await

[노드] offer-ask-patrol (LINES, availability: ANYWHERE)
플레이어 [즉시]: 검문소 주변에 교전 징후가 있습니까?
조 시설과장 [보통]: 검문소 통로마다 이미 1차 장비 개조를 마친 무장 잔상 개체들이 순찰하듯 머물고 있습니다.
조 시설과장 [보통]: 장기전에 대비해 외상 응급 처치 키트와 전투식량을 지급해 두었습니다.
→ offer-accept-only

[노드] offer-accept-only (CHOICE, availability: ANYWHERE)
조 시설과장 [보통]: 물류단지 외곽 검문소(#90)의 중복 경보 로그를 회수해 주시겠습니까?
- 선택지 "임무를 수락한다. (물류단지 외곽 검문소 #90)"
  → 효과: ACCEPT_OBJECTIVE(obj-border-90), GRANT_ITEMS(med-trauma-kit ×1, food-combat-ration ×1)
  → await

[노드] await (AWAIT_OBJECTIVE)
조 시설과장 [보통]: 목표는 물류단지 외곽 검문소(#90)입니다. 블랙박스 로그를 확보해 탈출하십시오.
onRecovered → recovered-ping
onReady → report-1

[노드] recovered-ping (LINES, availability: ANYWHERE)
시스템 [즉시]: [회수 완료] 외곽 검문소 게이트 제어기에서 중복 출입 경보 원시 로그를 추출했습니다.
윤 책임연구원 [빠르게, 0.3초 쉼]: 연구실에서 통신에 합류했습니다. 방금 추출된 게이트 타임스탬프를 보십시오.
윤 책임연구원 [보통, 0.4초 쉼]: 생존자뿐만 아니라 본사 경영 책임자의 보안 인가 코드까지 같은 시각, 서로 다른 두 구획에서 동시에 찍혀 있습니다. 거점으로 복귀해 주십시오.
→ await

[노드] report-1 (CHOICE, availability: BASE_ONLY)
조 시설과장 [느리게, 0.7초 쉼]: 로그를 확인했습니다. 시스템은 후순위 출입 기록을 '미등록 개체 오류'로 자동 덮어쓰고 있었군요.
윤 책임연구원 [보통]: 오류가 아닙니다, 조 과장님. 생존자들이 겪는 중첩 현상이 본사 최고 결재권자에게도 똑같이 일어나고 있다는 뜻입니다.
- 선택지 "회수한 검문소 블랙박스를 인계하고 보상을 받는다."
  → 효과: GRANT_ITEMS(mat-titanium ×2, mat-core ×1), GRANT_CREDITS(450), DISCLOSE(records: [duplicate-gate-alarm])
  → report-finish

[노드] report-finish (LINES, availability: BASE_ONLY)
조 시설과장 [보통]: …우선 약정된 특수 자재와 450 크레딧을 지급했습니다. 중앙 변전소 관측망 대조는 윤 책임연구원이 이어서 브리핑할 겁니다.
시스템 [즉시]: [보상 지급] 경량 티타늄 프레임 ×2 · 차폐 동력 코어 ×1 · 450 CR
→ end-complete

[노드] end-complete (END: COMPLETE)
시스템 [즉시]: [기록 공개] 중복 통행 경보 이력이 아카이브에 등록되었습니다.
```

### [임무 6] 6차 — 변전소 중첩 관측 로그 회수 (`hanlim-third-anomaly`)

```text
[임무] 6차 — 변전소 중첩 관측 로그 회수 (hanlim-third-anomaly)
발령자: 윤 책임연구원 (lab-contact / 연구·유전자 분석)
막: 3
해금 조건: QUEST_OUTCOME(hanlim-tier5-border-alarm, COMPLETE)
목표:
  - obj-substation-609: 중앙 전력 변전소 / 노드 #609 / 임무 적 npc-inf-drone-op (오작동 드론 통제체)
지급품(수락 시):
  - 외상 응급 처치 키트 (med-trauma-kit) ×1, 멸균 생체 젤 (mat-biogel) ×1
보상(보고 시, 거점 전용 공통 보상):
  - 고압 전기파리채 (eq-arc-emitter) ×1, 서해린 유전자 앰플 (gene-ampoule-haerin) ×1, 550 CR
  - 공통 공개 기록: 중첩 개체 대조 보고서 (divergent-owner-audit)
  - 공통 공개 담당자: 기업 경영 책임자 — 별도 개체 확인 (executive-contact-b)
결말 분기(최종 보고서 원본 인계 대상 선택):
  - 조 시설과장 인계: ending = jo, 결말 기록 ending-jo-protocol 공개 (+차폐 동력 코어 mat-core ×1)
  - 윤 책임연구원 인계: ending = yun, 결말 기록 ending-yun-divergence 공개 (+나노 봉합사 mat-nanosuture ×2)
  - 최 사장 인계: ending = choi, 결말 기록 ending-choi-arbitrage 공개 (+150 CR 추가)
  ※ 앞선 선택과 무관하게 3인 모두 선택 가능하되, 3·4차에서 해당 인물 루트를 탔다면 추가 신뢰 대사가 출력됩니다.

[노드] offer-1 (CHOICE, availability: ANYWHERE)
윤 책임연구원 [보통]: 검문소 경보 이력과 물류 결재선을 교차 대조했습니다.
윤 책임연구원 [느리게, 0.5초 쉼]: 같은 경영 책임자의 생체 서명이 같은 시각에 서로 다른 구획에서 두 번 승인됐습니다. 구호를 지시한 책임자와 봉쇄를 지시한 책임자가 물리적으로 다른 개체일 가능성이 높습니다.
- 선택지 "중앙 전력 변전소에서 무엇을 확인해야 합니까?" → offer-ask-target
- 선택지 "변전소 방어 체계는 어느 정도입니까?" → offer-ask-drone
- 선택지 "마지막 관측 로그를 회수하러 가겠습니다." → offer-final

[노드] offer-ask-target (LINES, availability: ANYWHERE)
플레이어 [즉시]: 중앙 전력 변전소에서 무엇을 확인해야 합니까?
윤 책임연구원 [보통]: 도시 전역의 중첩 파형과 본사 전용 통신선이 모두 중앙 전력 변전소(#609) 주 서버를 거칩니다.
윤 책임연구원 [보통]: 그곳의 중첩 관측 로그를 뽑아오면 두 결재 서명의 유전자 염기 편차를 확정할 수 있습니다.
→ offer-final

[노드] offer-ask-drone (LINES, availability: ANYWHERE)
플레이어 [즉시]: 변전소 방어 체계는 어느 정도입니까?
윤 책임연구원 [보통]: 식별 코드가 깨진 자율 드론 통제체가 모든 접근자를 침입자로 간주해 공격 드론을 전개하고 있습니다.
윤 책임연구원 [보통]: 화력을 집중할 수 있는 장비를 챙기시고, 지급해 드리는 처치 키트를 활용하십시오.
→ offer-final

[노드] offer-final (CHOICE, availability: ANYWHERE)
윤 책임연구원 [보통]: 중앙 전력 변전소(#609)에서 중첩 관측 로그 원본을 회수해 주십시오. 준비되셨습니까?
- 선택지 "임무를 수락한다. (중앙 전력 변전소 #609)"
  → 효과: ACCEPT_OBJECTIVE(obj-substation-609), GRANT_ITEMS(med-trauma-kit ×1, mat-biogel ×1)
  → await

[노드] await (AWAIT_OBJECTIVE)
윤 책임연구원 [보통]: 중앙 전력 변전소(#609)에서 중첩 관측 로그를 확보한 뒤 거점으로 귀환해 주십시오.
onRecovered → recovered-ping
onReady → report-1

[노드] recovered-ping (LINES, availability: ANYWHERE)
시스템 [즉시]: [회수 완료] 변전소 주 관측 서버에서 동시각 이중 결재 파형 및 유전자 편차 로그를 확보했습니다.
윤 책임연구원 [빠르게, 0.3초 쉼]: 파형 대조가 끝났습니다! 역시 서로 다른 세계선에서 유입된 두 명의 경영 책임자가 각자 다른 지시를 내리고 있었습니다.
조 시설과장 [보통, 0.6초 쉼]: …여기는 운영부 조 과장입니다. 해당 관측 로그는 도시 통제권 전체를 흔들 수 있는 1급 보안 자료입니다. 복귀 즉시 운영부로 귀속시켜 주십시오.
최 사장 [빠르게, 0.5초 쉼]: 잠깐, 그 황금알을 왜 공짜로 넘겨! 결재권자가 둘이라는 증거만 내 손에 있으면 본사 보급망을 통째로 흔들 수 있다고. 거점 와서 나랑 얘기해!
→ await

[노드] report-1 (CHOICE, availability: BASE_ONLY)
윤 책임연구원 [보통]: 무사히 돌아오셨군요. 변전소 로그의 기초 대조본은 이미 아카이브에 등록되어 복수 경영 책임자의 존재가 확인되었습니다.
윤 책임연구원 [느리게, 0.6초 쉼]: 하지만 관리자 인증 키가 담긴 원본 드라이브는 하나뿐입니다. 조 과장의 운영부, 제 연구실, 최 사장의 거래소 중 누구에게 이 원본 키를 맡기시겠습니까?
- 선택지 "조 시설과장에게 인계한다. (구호·통제 질서 유지 및 보안 등급 편입)"
  → 효과: SET_FLAG(ending = jo), GRANT_ITEMS(eq-arc-emitter ×1, gene-ampoule-haerin ×1, mat-core ×1), GRANT_CREDITS(550), DISCLOSE(records: [divergent-owner-audit, ending-jo-protocol], contacts: [executive-contact-b])
  → ending-jo
- 선택지 "윤 책임연구원에게 맡긴다. (중첩 관측망 역추적 및 독자 생체 연구)"
  → 효과: SET_FLAG(ending = yun), GRANT_ITEMS(eq-arc-emitter ×1, gene-ampoule-haerin ×1, mat-nanosuture ×2), GRANT_CREDITS(550), DISCLOSE(records: [divergent-owner-audit, ending-yun-divergence], contacts: [executive-contact-b])
  → ending-yun
- 선택지 "최 사장에게 넘긴다. (이중 결재선 공백을 이용한 비공식 보급망 장악)"
  → 효과: SET_FLAG(ending = choi), GRANT_ITEMS(eq-arc-emitter ×1, gene-ampoule-haerin ×1), GRANT_CREDITS(700), DISCLOSE(records: [divergent-owner-audit, ending-choi-arbitrage], contacts: [executive-contact-b])
  → ending-choi

[노드] ending-jo (LINES, availability: BASE_ONLY)
플레이어 [즉시]: 거점이 무너지면 생존자들도 버틸 수 없습니다. 운영부에서 질서를 유지하는 데 써 주십시오.
조 시설과장 [보통]: 어려운 결단을 내려 주셨습니다. 상부 결재선이 둘로 갈라진 이상, 거점 현장 운영부가 중심을 잡아야 도시가 유지됩니다.
조 시설과장 [보통, 0.4초 쉼]: 당신을 거점 특별 보안 인력으로 등록하고, 비축해 둔 차폐 동력 코어와 정식 보상을 지급했습니다.
시스템 [즉시]: [보상 지급] 고압 전기파리채 ×1 · 서해린 유전자 앰플 ×1 · 차폐 동력 코어 ×1 · 550 CR
→ end-complete

[노드] ending-yun (LINES, availability: BASE_ONLY)
플레이어 [즉시]: 운영부에 넘기면 또 봉인될 겁니다. 연구실에서 끝까지 파형을 추적해 주십시오.
윤 책임연구원 [보통]: 고맙습니다. 인증 키가 있으면 기업이 생존자들을 표본으로 삼던 관측망을 역으로 이용해, 중첩의 경계를 찾아낼 수 있습니다.
윤 책임연구원 [보통, 0.4초 쉼]: 연구실 비축분 나노 봉합사와 유전자 앰플, 개조 장비를 창고로 보냈습니다.
시스템 [즉시]: [보상 지급] 고압 전기파리채 ×1 · 서해린 유전자 앰플 ×1 · 나노 봉합사 ×2 · 550 CR
→ end-complete

[노드] ending-choi (LINES, availability: BASE_ONLY)
플레이어 [즉시]: 기업이나 연구실이나 믿을 수 없습니다. 실질적인 보급선과 현금으로 바꾸겠습니다.
최 사장 [빠르게]: 하하, 역시 마지막엔 장사꾼 계산이 제일 정확한 법이지! 위에 앉은 사장님이 두 명이면, 양쪽 결재 도장으로 물자를 두 배로 빼낼 수 있다는 소리잖아.
최 사장 [보통, 0.4초 쉼]: 약정 보상에 내 특별 사례금 150 크레딧을 더 얹어 700 크레딧으로 입금했어. 앞으로도 거점 물자는 내가 책임진다!
시스템 [즉시]: [보상 지급] 고압 전기파리채 ×1 · 서해린 유전자 앰플 ×1 · 700 CR
→ end-complete

[노드] end-complete (END: COMPLETE)
시스템 [즉시]: [기록·인물 공개] '중첩 개체 대조 보고서', 선택 결말 기록 및 복수 경영 책임자 개체 정보가 아카이브에 등록되었습니다.
```

## 3. 회수·공개 기록 (`records`) 및 담당자 (`contacts`) 정의

### 3.1 공개 기록 목록 (기존 6종 + 6차 결말 기록 3종)

| 기록 ID | 제목 | 공개 시점 (`DISCLOSE`) | 본문 (고유명사 배제 · 보고서 문체) |
| :--- | :--- | :--- | :--- |
| `return-observation` | 복귀 개체 관측 기록 | 1차 완료 시 | 구호 장비 지급과 도시 설비 유지가 계속되고 있다. 같은 문서의 부록에는 생존자의 탐사 경로와 복귀 후 신체 검사 결과가 관측 항목으로 기재되어 있다. 구호와 실험은 같은 운영 체계 안에서 진행된다. |
| `ration-discrepancy-log` | 배급 단말기 재고 대조표 | 2차 완료 시 | 상가 무인 배급창구에서 회수한 출고 기록을 대조한 결과, 거점에 등록된 인원 수보다 실제 배급 수령 건수가 매일 일정 비율만큼 초과 집계되고 있다. 일부 수령 서명은 이미 귀환 보고를 마친 인원과 같은 날짜로 찍혀 있다. |
| `medical-transfer-manifest` | 비표준 생체 이관 내역 | 3차 완료 시 | 남부 응급 병동의 구호 환자 이송 명단 일부가 일반 치료 시설이 아닌 기업 연구동 격리 구역으로 분류되어 있었다. 분류 사유란에는 '비표준 생체 파형 - 대조 표본 지정'이라는 짧은 문구만 남아 있다. |
| `single-executive-directive` | 단일 결재선과 봉쇄 지시서 | 4차(최 루트 또는 조 루트) 완료 시 | 물류 거점에서 회수한 적하목록과 격리 명령서는 모두 기업의 단일 경영 책임자 명의로 직접 결재되어 있었다. 구호 물자 배정과 통제 구역 봉쇄가 서로 다른 부서의 충돌이 아니라, 동일한 최상위 지휘 계통에서 동시에 내려오고 있다. |
| `duplicate-gate-alarm` | 중복 통행 경보 이력 | 5차 완료 시 | 물류단지 외곽 검문소의 출입 로그에 동일한 생체 인식 번호를 가진 인원이 같은 시각 다른 구획에서 동시에 통과한 기록이 남아 있다. 시스템은 매뉴얼에 따라 후순위 기록을 자동으로 '미등록 개체 오류'로 덮어쓰고 있었다. |
| `divergent-owner-audit` | 중첩 개체 대조 보고서 | 6차 완료 시 (공통) | 중앙 전력 변전소 관측 로그와 결재 생체 서명을 대조한 결과, 동일한 경영 책임자의 서명이 서로 다른 구획에서 동시각에 승인된 흔적이 확인되었다. 유전자 염기 미세 편차 분석에 따라 두 지시는 서로 다른 세계선에서 유입된 별도 개체가 발행한 것으로 판별된다. |
| `ending-jo-protocol` | 구호 통제망 특별 보안 인가서 | 6차 조 시설과장 인계 시 | 변전소 관측 드라이브는 거점 운영부 보안 금고에 봉인되었다. 상부 결재선의 분열로 인한 혼란을 막기 위해 현장 운영부는 자율 통제 등급을 격상했으며, 보고자는 거점 특별 보안 인력으로 편입되어 정기 동력 보급 권한을 부여받았다. |
| `ending-yun-divergence` | 비공식 중첩 파형 대조 초안 | 6차 윤 책임연구원 인계 시 | 변전소 관리자 인증 키를 확보한 연구실은 본사 관측망의 역추적 채널을 개설했다. 복수의 경영 책임자 개체가 서로 다른 실험 지시를 내리는 틈을 이용해, 생존자를 단순 표본에서 벗어나 중첩 경계를 추적하는 독자 관측 주체로 전환하는 연구가 시작되었다. |
| `ending-choi-arbitrage` | 이중 결재선 차익 통행권 | 6차 최 사장 인계 시 | 두 명의 경영 책임자가 각기 발주하는 중복 결재 코드가 거점 거래소의 비공식 물류망에 연동되었다. 본사 지휘 계통의 상호 간섭으로 감시 사각지대가 넓어진 사이, 봉쇄선을 넘나드는 독립 보급 루트가 거점 생존자들의 새로운 생명선으로 자리 잡았다. |

### 3.2 담당자 (`contacts`) 공개 기준

| 담당자 ID (`publicId`) | 표시 이름 | 직함 (`role`) | 소속 (`affiliation`) | 개체 표식 (`entityId`) | 공개 조건 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `relief-contact` | 조 시설과장 | 구호·시설 운영 | 기업 구호 운영부 | — | 초기 공개 |
| `market-contact` | 최 사장 | 비공식 물자 거래 · 거래소 | 거점 자영업자 | — | 초기 공개 |
| `lab-contact` | 윤 책임연구원 | 연구·유전자 분석 · 연구실 | 기업 연구부문 | — | 초기 공개 |
| `executive-contact` | 기업 경영 책임자 | 경영 지시 | 기업 본사 | `owner-instance-a` (6차 완료 시 노출) | 4차(최 루트 또는 조 루트) 완료 시 `DISCLOSE` |
| `executive-contact-b` | 기업 경영 책임자 | 별도 개체 확인 | 기업 본사 (중첩 개체) | `owner-instance-b` (6차 완료 시 노출) | 6차 완료 시 `DISCLOSE` |
