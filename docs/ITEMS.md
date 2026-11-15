# 아이템 및 태그 시너지 도감 (`ITEMS.md`)

> 이 문서는 게임 내 전체 아이템(총 41종), 7종 태그 체계, 보호막(Shield)·시너지 전투 규칙, 건물 카테고리별 조합 레시피(18종)를 빠르게 조회하기 위한 참조 문서입니다.
>
> - **단일 원본(Source of Truth)**: [`packages/types/src/itemCatalog.ts`](../packages/types/src/itemCatalog.ts) (`ALL_CATALOG_ITEMS`, `BASE_EQUIPMENTS`, `HANLIM_EQUIPMENTS`, `CRAFTING_MATERIALS`, `CRAFTED_EQUIPMENTS`, `WEAPON_TAG_LABELS`)
> - **조합 레시피 원본**: [`packages/types/src/crafting.ts`](../packages/types/src/crafting.ts) (`CRAFTING_RECIPES`)

---

## 1. 태그 체계 (`WeaponTag`, 7종)

모든 장비와 재료 아이템은 1~3개의 태그를 가집니다. 태그는 시너지 타겟팅(`target: "TAG"`) 및 장착 태그 수 비례 효과(`perTag`) 계산에 사용됩니다.

| 태그 코드 | 표시 라벨 | combat / 시너지 역할 |
| --- | --- | --- |
| `BLADE` | 도검 | 단검·도검·봉합사 계열. 다단 시너지 및 도검 태그 증폭 빌드 |
| `FIREARM` | 총기 | 카빈·저격소총·조준 렌즈 계열. 치명타·원거리 화력 집중 빌드 |
| `BLUNT` | 타격 | 충격봉·해머·티타늄 프레임 계열. 스태미나 순환 및 타격 치명타 빌드 |
| `TECH` | 기계 | 배선·릴레이·코일·코어 계열. 쿨다운 가속(`hasteTicks`) 및 스태미나 공급 |
| `BIO` | 생체 | 생체 젤·전해질·주입기 계열. 체력 회복(`HEAL`) 및 지속 전투 보조 |
| `CHEM` | 화학 | 라이터·자극제·항응고·연료 계열. 피해 증폭 및 화염/화학 투척 |
| `ARMOR` | 방호 | 테이프·세라믹·코어·방어구 계열. 임시 보호막(`SHIELD`) 생성 및 방어 시너지 |

---

## 2. 전투·장착 핵심 규칙

1. **전 아이템 장착 가능 (`01`~`06` 슬롯)**
   - 조합 재료 16종(`itemKind: "MATERIAL"`)을 포함한 모든 카탈로그 아이템을 6개 장착 슬롯에 배치해 전투에 사용할 수 있습니다.
   - 장착 슬롯에 둔 재료는 **전투 중 소모되지 않으며** 쿨다운마다 반복 발동합니다. 재료 아이템은 구역 **조합(`CRAFT`)** 을 실행할 때만 소모됩니다 (가방 우선 소모 후, 부족 시 장착 슬롯에서도 소모 가능).
2. **보호막 (`SHIELD`)**
   - 전투 시작 시 모든 참가자의 보호막은 `0`으로 시작하며, 전투 종료 시 초기화되는 전투 한정 방어 수치입니다.
   - 피격 시 피해량은 **보호막에서 먼저 차감**되며, 보호막이 흡수한 피해량(`absorbedShield`)은 HP 감소 및 **후퇴 게이지(`retreatGauge`) 누적에 포함되지 않습니다.**
3. **시너지 타겟 규칙 (`target`)**
   - `NEXT` / `PREV` / `ADJACENT`: 현재 슬롯 기준 다음/이전/양옆 인접 슬롯 (빈 슬롯 제외, 재료 포함)
   - `EDGES`: `01`번(첫 번째)과 `06`번(여섯 번째) 장착 슬롯
   - `ALL_MELEE` / `ALL_RANGED` / `ALL_OTHER`: 자기 자신을 제외한 근접/원거리/전체 슬롯
   - `TAG` (`targetTag`): 자기 자신을 제외하고 지정된 `WeaponTag`를 보유한 모든 장착 슬롯
4. **태그 비례 스케일링 (`perTag`)**
   - 아이템 발동 시점에 본인이 장착한 `perTag.tag` 보유 아이템 개수(자기 자신 포함)를 세어, 개수만큼 `damageBonus`, `shieldGain`, `healAmount`, `staminaRestore`를 추가 적용합니다.

---

## 3. 기본 및 한림 제식 장비 (`BASE_EQUIPMENTS` 5종 + `HANLIM_EQUIPMENTS` 2종)

| ID | 이름 | 유형 (`iconKey`) | 태그 | DMG | STM | CD (CAST) | WT / VAL | 효과 요약 |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| `wpn_primary` | Primary Sword | MELEE (`SWORD`) | `BLADE` | 10 | 10 | 10 (0) | 5 / 100 | 기본 균형 도검 |
| `wpn_dagger` | Secondary Dagger | MELEE (`DAGGER`) | `BLADE` | 5 | 5 | 8 (0) | 3 / 50 | 기본 경량 단검 |
| `wpn_lifesaver` | Life-saver | MELEE (`HEAL`) | `BIO` | 0 | 20 | 0 (0) | 2 / 150 | `HP +50` (HP 50% 이하, 전투당 1회) |
| `wpn_sniper` | Sniper Rifle | RANGED (`RIFLE`) | `FIREARM` | 25 | 30 | 20 (15) | 15 / 300 | 저격 타겟팅(`WEAKEST`) |
| `wpn_giant_slayer` | Giant Slayer | MELEE (`AXE`) | `BLUNT` | 15 | 15 | 12 (5) | 10 / 200 | 고체력 우선 타겟팅(`STRONGEST`) |
| `hanlim-relief-carbine` | 기업 구호용 카빈 | RANGED (`RIFLE`) | `FIREARM` | 16 | 4 | 2 (0) | 3 / 40 | 경량 제식 소총 |
| `hanlim-control-baton` | 기업 제식 충격봉 | MELEE (`STAFF`) | `BLUNT`, `TECH` | 6 | 3 | 3 (0) | 2 / 30 | `SHD +4` |

---

## 4. 조합 재료 아이템 (`CRAFTING_MATERIALS`, 16종 — 장착 가능)

| 권역 분류 | ID | 이름 | 유형 | 태그 | DMG | STM | CD | WT / VAL | 장착 시 전투 효과 |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| 생활·주거 | `mat-tape` | 고강도 테이프 | MELEE | `ARMOR` | 0 | 3 | 5 | 1 / 15 | `SHD +8` |
| 생활·주거 | `mat-wire` | 구리 배선 | MELEE | `TECH` | 2 | 2 | 4 | 1 / 18 | `NEXT -1t` |
| 생활·주거 | `mat-lighter` | 휴대용 라이터 | MELEE | `CHEM` | 5 | 3 | 4 | 1 / 16 | `NEXT +3DMG` |
| 생활·주거 | `mat-electrolyte` | 전해질 팩 | MELEE (`HEAL`) | `BIO` | 0 | 2 | 6 | 1 / 20 | `HP +6` (HP ≤ 95%, 반복) · `ENG +6` |
| 상업·전자 | `mat-lens` | 광학 렌즈 | RANGED (`TARGET`) | `TECH`, `FIREARM` | 0 | 3 | 5 | 1 / 32 | `NEXT +15%CRIT` |
| 상업·전자 | `mat-relay` | 고속 릴레이 칩 | RANGED | `TECH` | 0 | 3 | 4 | 1 / 38 | `ADJ -1t` |
| 상업·전자 | `mat-battery` | 리튬 배터리 | MELEE | `TECH` | 3 | 0 | 5 | 2 / 35 | `ENG +10` |
| 상업·전자 | `mat-ceramic` | 방열 세라믹 판 | MELEE | `ARMOR`, `TECH` | 0 | 4 | 6 | 2 / 34 | `SHD +14` |
| 의료·생체 | `mat-biogel` | 멸균 생체 젤 | MELEE (`HEAL`) | `BIO` | 0 | 5 | 6 | 1 / 42 | `HP +14` (HP ≤ 90%, 반복) |
| 의료·생체 | `mat-stimulant` | 신경 자극제 | MELEE (`HEAL`) | `BIO`, `CHEM` | 0 | 4 | 5 | 1 / 55 | `NEXT -1t · +4DMG` · `ENG +8` |
| 의료·생체 | `mat-anticoagulant` | 항응고 용액 | RANGED | `CHEM`, `BIO` | 8 | 4 | 5 | 1 / 48 | `[BLADE] +4DMG` |
| 의료·생체 | `mat-nanosuture` | 나노 봉합사 | MELEE | `BIO`, `ARMOR`, `BLADE` | 4 | 4 | 5 | 1 / 60 | `HP +6` (HP ≤ 95%, 반복) · `SHD +6` |
| 산업·기반 | `mat-titanium` | 경량 티타늄 프레임 | MELEE | `BLUNT`, `ARMOR` | 7 | 4 | 5 | 2 / 70 | `SHD +10` |
| 산업·기반 | `mat-solenoid` | 고압 솔레노이드 | MELEE | `TECH`, `BLUNT` | 8 | 5 | 5 | 2 / 85 | `NEXT +6DMG` |
| 산업·기반 | `mat-fuel` | 특수 산업용 연료 | RANGED | `CHEM` | 10 | 5 | 6 | 2 / 80 | `[TECH] +5DMG` |
| 산업·기반 | `mat-core` | 차폐 동력 코어 | MELEE | `TECH`, `ARMOR` | 5 | 5 | 6 | 3 / 120 | `SHD +12` · `ADJ -1t` |

---

## 5. 조합 장비 (`CRAFTED_EQUIPMENTS`, 18종)

| 카테고리 | ID | 이름 | 유형 (`iconKey`) | 태그 | DMG | STM | CD (CAST) | WT / VAL | 시너지 및 고유 효과 |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| `LOGISTICS` | `eq-log-t1` | 개조 전술 단검 | MELEE (`DAGGER`) | `BLADE` | 9 | 4 | 6 (0) | 2 / 95 | `NEXT -1t` |
| `LOGISTICS` | `eq-log-t2a` | 초경량 연쇄 단검 | MELEE (`DAGGER`) | `BLADE`, `TECH` | 12 | 4 | 5 (0) | 1 / 210 | `NEXT -3t` |
| `LOGISTICS` | `eq-log-t2b` | 강습 타격 단검 | MELEE (`DAGGER`) | `BLADE` | 15 | 5 | 6 (0) | 2 / 225 | `[BLADE] +6DMG` · `[BLADE]×(+2DMG)` |
| `COMMERCIAL` | `eq-com-t1` | 광학 조준 카빈 | RANGED (`RIFLE`) | `FIREARM`, `TECH` | 20 | 4 | 3 (0) | 3 / 115 | `NEXT +25%CRIT` |
| `COMMERCIAL` | `eq-com-t2a` | 전술 마킹 카빈 | RANGED (`RIFLE`) | `FIREARM`, `TECH` | 24 | 4 | 3 (0) | 3 / 255 | `[FIREARM] +10DMG · +35%CRIT` |
| `COMMERCIAL` | `eq-com-t2b` | 양단 조준경 카빈 | RANGED (`RIFLE`) | `FIREARM` | 26 | 5 | 3 (0) | 3 / 240 | `EDGE -2t · +8DMG` |
| `PUBLIC` | `eq-pub-t1` | 고압 충격봉 | MELEE (`STAFF`) | `BLUNT`, `TECH` | 10 | 2 | 3 (0) | 2 / 90 | `SHD +6` · `ENG +8` · `PREV -1t` |
| `PUBLIC` | `eq-pub-t2a` | 과충전 순환봉 | MELEE (`STAFF`) | `BLUNT`, `TECH`, `CHEM` | 14 | 2 | 3 (0) | 2 / 220 | `SHD +10` · `ENG +16` · `ADJ -2t` |
| `PUBLIC` | `eq-pub-t2b` | 진압용 방전 해머 | MELEE (`AXE`) | `BLUNT`, `ARMOR` | 22 | 6 | 5 (1) | 4 / 235 | `SHD +14` · `ENG +10` · `[BLUNT] +40%CRIT` · `[ARMOR]×(+4SHD)` |
| `INFRA` | `eq-inf-t1` | 가속 릴레이 코일 | RANGED (`STAFF`) | `TECH` | 4 | 3 | 4 (0) | 2 / 110 | `ADJ -2t` |
| `INFRA` | `eq-inf-t2a` | 초전도 공명 코어 | RANGED (`STAFF`) | `TECH`, `ARMOR` | 6 | 3 | 4 (0) | 2 / 290 | `ADJ -3t · +8DMG · +8SHD` |
| `INFRA` | `eq-inf-t2b` | 양극 과부하 증폭기 | RANGED (`STAFF`) | `TECH` | 6 | 4 | 5 (0) | 3 / 295 | `EDGE -4t · +50%CRIT` · `[TECH]×(+3DMG)` |
| `MEDICAL` | `eq-med-t1` | 생체 자극 주입기 | MELEE (`HEAL`) | `BIO` | 0 | 10 | 6 (0) | 2 / 145 | `HP +35` (HP ≤ 70%, 반복) · `ENG +12` |
| `MEDICAL` | `eq-med-t2a` | 아드레날린 주입기 | MELEE (`HEAL`) | `BIO`, `ARMOR` | 0 | 8 | 5 (0) | 2 / 270 | `HP +45` (HP ≤ 80%, 반복) · `SHD +12` · `ENG +18` · `ALL -2t` |
| `MEDICAL` | `eq-med-t2b` | 신경 과활성 주사기 | MELEE (`HEAL`) | `BIO`, `CHEM` | 12 | 5 | 4 (0) | 2 / 265 | `HP +20` (HP ≤ 90%, 반복) · `NEXT -2t · +14DMG` |
| `CULTURAL` | `eq-cul-t1` | 공명 블레이드 | MELEE (`SWORD`) | `BLADE`, `ARMOR` | 15 | 6 | 6 (0) | 4 / 130 | `2HIT`마다 `SHD +8` · `NEXT +8DMG` |
| `CULTURAL` | `eq-cul-t2a` | 파동 공명검 | MELEE (`SWORD`) | `BLADE`, `TECH` | 22 | 6 | 6 (0) | 4 / 280 | `2HIT`마다 `SHD +10` · `ADJ -2t · +14DMG` |
| `CULTURAL` | `eq-cul-t2b` | 전술 지휘군도 | MELEE (`SWORD`) | `BLADE`, `ARMOR` | 19 | 5 | 5 (0) | 4 / 260 | `[BLADE] -1t · +9DMG · +6SHD` |

---

## 6. 조합 레시피 (`CRAFTING_RECIPES`, 18종)

| 레시피 ID | 건물 카테고리 | Tier | 기반 장비 (`baseEquipmentId` / 호환 이름) | 필요 재료 2종 (`materialIds`) | 결과 장비 (`resultEquipmentId`) |
| --- | --- | :---: | --- | --- | --- |
| `rcp-log-1` | `LOGISTICS` | 1 | `wpn_dagger` (`Secondary Dagger`, `Dagger`, `secondary`) | `mat-tape` + `mat-wire` | `eq-log-t1` (개조 전술 단검) |
| `rcp-log-2a` | `LOGISTICS` | 2 | `eq-log-t1` (`개조 전술 단검`) | `mat-titanium` + `mat-relay` | `eq-log-t2a` (초경량 연쇄 단검) |
| `rcp-log-2b` | `LOGISTICS` | 2 | `eq-log-t1` (`개조 전술 단검`) | `mat-titanium` + `mat-solenoid` | `eq-log-t2b` (강습 타격 단검) |
| `rcp-com-1` | `COMMERCIAL` | 1 | `hanlim-relief-carbine` (`기업 구호용 카빈`, `Sniper Rifle`) | `mat-lens` + `mat-ceramic` | `eq-com-t1` (광학 조준 카빈) |
| `rcp-com-2a` | `COMMERCIAL` | 2 | `eq-com-t1` (`광학 조준 카빈`) | `mat-relay` + `mat-solenoid` | `eq-com-t2a` (전술 마킹 카빈) |
| `rcp-com-2b` | `COMMERCIAL` | 2 | `eq-com-t1` (`광학 조준 카빈`) | `mat-lens` + `mat-battery` | `eq-com-t2b` (양단 조준경 카빈) |
| `rcp-pub-1` | `PUBLIC` | 1 | `hanlim-control-baton` (`기업 제식 충격봉`, `Giant Slayer`) | `mat-lighter` + `mat-battery` | `eq-pub-t1` (고압 충격봉) |
| `rcp-pub-2a` | `PUBLIC` | 2 | `eq-pub-t1` (`고압 충격봉`) | `mat-fuel` + `mat-wire` | `eq-pub-t2a` (과충전 순환봉) |
| `rcp-pub-2b` | `PUBLIC` | 2 | `eq-pub-t1` (`고압 충격봉`) | `mat-fuel` + `mat-titanium` | `eq-pub-t2b` (진압용 방전 해머) |
| `rcp-inf-1` | `INFRA` | 1 | `hanlim-control-baton` (`기업 제식 충격봉`, `Life-saver`) | `mat-wire` + `mat-battery` | `eq-inf-t1` (가속 릴레이 코일) |
| `rcp-inf-2a` | `INFRA` | 2 | `eq-inf-t1` (`가속 릴레이 코일`) | `mat-solenoid` + `mat-core` | `eq-inf-t2a` (초전도 공명 코어) |
| `rcp-inf-2b` | `INFRA` | 2 | `eq-inf-t1` (`가속 릴레이 코일`) | `mat-relay` + `mat-core` | `eq-inf-t2b` (양극 과부하 증폭기) |
| `rcp-med-1` | `MEDICAL` | 1 | `wpn_lifesaver` (`Life-saver`, `Secondary Dagger`) | `mat-biogel` + `mat-electrolyte` | `eq-med-t1` (생체 자극 주입기) |
| `rcp-med-2a` | `MEDICAL` | 2 | `eq-med-t1` (`생체 자극 주입기`) | `mat-stimulant` + `mat-nanosuture` | `eq-med-t2a` (아드레날린 주입기) |
| `rcp-med-2b` | `MEDICAL` | 2 | `eq-med-t1` (`생체 자극 주입기`) | `mat-anticoagulant` + `mat-stimulant` | `eq-med-t2b` (신경 과활성 주사기) |
| `rcp-cul-1` | `CULTURAL` | 1 | `wpn_primary` (`Primary Sword`, `primary`) | `mat-tape` + `mat-ceramic` | `eq-cul-t1` (공명 블레이드) |
| `rcp-cul-2a` | `CULTURAL` | 2 | `eq-cul-t1` (`공명 블레이드`) | `mat-anticoagulant` + `mat-core` | `eq-cul-t2a` (파동 공명검) |
| `rcp-cul-2b` | `CULTURAL` | 2 | `eq-cul-t1` (`공명 블레이드`) | `mat-nanosuture` + `mat-lens` | `eq-cul-t2b` (전술 지휘군도) |
