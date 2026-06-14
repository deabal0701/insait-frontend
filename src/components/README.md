# components/ — UI 컴포넌트 SSOT

가이드: [02-tobe/01-phase1/03-frontend/07_in-components.md](../../../../../h5-saas-docs/02-tobe/01-phase1/03-frontend/07_in-components.md)

## 세 가지 영역

| 디렉토리 | 책임 | 첫 사용 시점 |
|---|---|---|
| `ui/` | In* 컴포넌트 라이브러리 **단일 출처**. design-system v1/v2 의 코드를 참고해 작성 (직접 import 안 함) | P0~P1 |
| `feature/{domain}/` | 도메인별 재사용 조합 컴포넌트 (사원 검색 모달, 권한 매트릭스 등) | P4 이후 필요 시 |
| `layout/` | layout 부속 (`InUserBadge`, `InBreadcrumb` 등) | 레이아웃 보강 시 |

## 작성 정책 — 우선순위 (★ 2026-05-29 갱신)

### 1순위 — design-system SSOT 우선 (from-scratch 작성 금지)

- 신규 In* 컴포넌트 추가 시 **반드시 먼저** [design-system/v2/src/components/ui/](../../../../../design-system/v2/src/components/ui/) 와 [design-system/v1/src/components/ui/](../../../../../design-system/v1/src/components/ui/) 에 **동명 컴포넌트가 있는지 확인**
- 있으면: 해당 코드를 **복사 후 Plain JS 로 변환** (lang="ts" 제거, defineProps generic + withDefaults → object validator, type/interface 삭제, import type 삭제)
- v2 와 v1 모두 있으면 **v2 우선** (Figma 진본 정합도 v2 가 최신)
- 없으면: Figma MCP 로 진본 노드 확인 후 신규 작성 (또는 v1/v2 패치 기여 후 가져오기)
- **금지**: design-system 확인 없이 from-scratch 작성. 정책 위반 시 PR 반려.

### 2순위 — Figma 노드 ID 명시 의무

모든 In* 컴포넌트의 JSDoc 상단에 **반드시** Figma 노드 ID 를 포함한다:

```js
/**
 * InSelect — Figma 1166:15105 / 단일 variant 1162:4447
 *
 * 출처: design-system/v2/src/components/ui/InSelect.vue (Plain JS 변환)
 * ...
 */
```

Figma 정의가 부재한 경우 `Figma 노드 ID = TBD` 로 명시:

```js
/**
 * InNumberField — Figma 노드 ID = TBD (design-system v2 에 미정의, v1 SSOT)
 *
 * 출처: design-system/v1/src/components/ui/InNumberField.vue (Plain JS 변환)
 *
 * TODO(Figma 정합): v2 카탈로그에 NumberField 진본 정의 시 노드 ID 추가.
 * ...
 */
```

`TBD` 표기는 추후 Figma 정합 작업 대상으로 자동 인식된다. grep 대상: `grep -r "Figma 노드 ID = TBD" src/components/ui/`.

### 3순위 — element-plus 사용 여부는 v1/v2 정합 우선

v2 의 일부 컴포넌트는 Figma 진본 정합을 위해 **el-* 미사용 native 구현** 이다 (예: InSwitch, InTabs, InModal). 다음 원칙:

- v2 가 native 면 native, v2 가 el-* wrapper 면 wrapper (v2 정합)
- v1 SSOT 만 있는 컴포넌트는 v1 패턴 따름 (대부분 native)
- 운영 동작상 popup·검증·복잡 인터랙션이 필요한 경우 v1 시각 + el-* hybrid OK (예: InDatePicker — v1 placeholder + el-date-picker)
- README 의 "감쌀 대상" 컬럼은 실제 구현 기준으로 표기 (native 면 "native", el-* wrap 이면 컴포넌트명)

### 기타 정책

- 컴포넌트 prefix = `In*` (insait), 파일명 = `In{명사}.vue`
- props 는 Plain JS + `defineProps({...})` + `validator` 로 enum 표현
- 토큰은 `var(--in-*)` Semantic alias 만 (Primitive `--in-iblue-*` 직접 X)
- `:deep(.el-*)` override 는 본 컴포넌트 네임스페이스 내부에서만 — 전역 누출 금지
- 컴포넌트 prefix BEM 클래스: `in-{shortname}` (`in-sel`, `in-radio`, `in-sw`, `in-tabs`, `in-modal`, `in-tag`, `in-fi`, `in-num`, `in-dp` 등)
- design-system 의 v1/v2 코드는 **직접 import 안 함** (`@ds/...` alias 없음) — 우리 `ui/` 로 옮긴 사본만 사용

## 현재 ui/ 컴포넌트 (P0~P1)

| 파일 | 출처 SSOT | Figma 노드 | 구현 | 주요 prop |
|---|---|---|---|---|
| InButton.vue | (자체) | 1152:21795 / 1152:21959 | native button | variant(7) × size(3) |
| InTextField.vue | v2 | 1152:22722 / 1152:22856 | el-input wrap | label / layout / status / size |
| InPasswordField.vue | v2 | (확인 필요) | el-input wrap | visible 토글 |
| InNumberField.vue | v1 | **TBD** | native input | min/max/step/precision/formatComma |
| InSelect.vue | v2 | 1166:15105 / 1162:4447 | el-select wrap | options · multiSelect · filterable · uses · color |
| InDatePicker.vue | v1+el hybrid | **TBD** | el-date-picker wrap + v1 시각 | type/format. valueFormat='YYYYMMDD' |
| InCheckbox.vue | v2 | 1241:50106 | native input + Figma 자산 | indeterminate · size · state |
| InRadio.vue | v2 | 1152:22617 | native input + Figma 자산 (atomic) | v-model · value · label · state. **단일 radio — RadioGroup wrapper 없음** |
| InSwitch.vue | v2 | 1815:73431 | native button + halo (el-switch 미사용) | size(sm/md) · status(default/error) |
| InTabs.vue | v2 | 1499:43392 | native tablist + ARIA (el-tabs 미사용) | items=[{name,tabLabel,disabled}] · size · activation |
| InModal.vue | v2 | **TBD** | native Teleport + focus-trap (el-dialog 미사용) | type=confirm/form/detail |
| InTag.vue | v1 | **TBD** | native span (el-tag 미사용) | variant(5) · size(2) · closable |
| InToast.vue | v2 | 2559:115889 | native (정적) | status × closable |
| InForm.vue | v1 | **TBD** | native form + provide/inject (el-form 미사용) | layout/labelWidth/density/disabled |
| InFormItem.vue | v1 | **TBD** | native (el-form-item 미사용) | label/required/**error**/help |
| InCard.vue | v2 | 1247:24387 / 1255:26008 | native | state(6) · type(content/title) |
| InCompanyLogo.vue | v2 | (확인 필요) | native | size · variant=insait |
| InLNB.vue | v2 | (확인 필요) | native | items · height |
| InLNBSubmenu.vue | v2 | (확인 필요) | native | items · activeKey · companyName |
| InDataTable.vue | v2 (의도된 분기) | (확인 필요) | @win/grid(WinGrid) shim | columns/data/options + **조회·저장 흡수**(2026-06-02 옵션 1). 그리드 엔진은 라이브러리 @win/grid 로 분리(2026-06-14) — 본 shim 은 Figma 테마 주입(themes/tui-grid-figma) + envelope(useEntityGrid) 만 흡수. self-managed: retrieve-service-id/save-service-id/slot-name/:header → ref.retrieve()/ref.save() |
| InBadge.vue | v2 | 1169:15297 | native span | state(8) × badgeStyle(standard/dot) |
| InTooltip.vue | v2 | 1241:85351 / 1244:30035 | el-tooltip wrap | direction(5) × styleVariant(default/minimal). prop 명 `style`→`styleVariant` (Vue reserved 회피) |
| InEmptyState.vue | v2 | (확인 필요) | native | type(no-data/no-search/no-permission/error/first-time) + actions slot |
| InIcon.vue | (보조) | — | native | name · size |

**확인 필요 = JSDoc 에 Figma 노드 ID 가 명시되어 있으나 정합 검증 미수행. 향후 정리 대상.**

## 도메인 wave 추가 시

새 도메인 (`phm` / `pay` / `dts` / `ela` / `cam` / `fsq` …) 진입 시:

1. `feature/{domain}/` 디렉토리 신설
2. 도메인 내 여러 화면에서 재사용되는 위젯 → 본 디렉토리에 추출
3. 한 화면 전용 위젯은 `pages/{domain}/` 안에 inline 작성 OK

## design-system 변경 동기화

design-system v1/v2 의 In\* 가 갱신되면 (Figma 정합 보강 등) 본 디렉토리에 수동 sync 한다.

절차:
1. 변경된 `design-system/v{1,2}/src/components/ui/In*.vue` 파일 확인
2. `insait-frontend/src/components/ui/` 의 동일 파일에 변경분 적용 (Plain JS 변환 유지)
3. 의존 자산 (icons/registry.js, form-context-key.js 등) 도 동기화
4. ComponentsCatalogPage 의 데모 코드도 새 API 에 맞춰 갱신
5. dev 서버 시각 확인 + 변경 commit

## 카탈로그·검수

- 시각 검수: **시스템관리 > 환경설정 > 컴포넌트** (`/admin/components`) — 모든 In* 라이브 데모 + 사용 코드 + Figma=TBD 표기
- 진본 대조: 각 컴포넌트의 JSDoc 헤더 + `design-system/v{1,2}/` 원본 비교
