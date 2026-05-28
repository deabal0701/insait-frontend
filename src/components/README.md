# components/ — UI 컴포넌트 SSOT

가이드: [02-tobe/01-phase1/03-frontend/07_in-components.md](../../../../../h5-saas-docs/02-tobe/01-phase1/03-frontend/07_in-components.md)

## 세 가지 영역

| 디렉토리 | 책임 | 첫 사용 시점 |
|---|---|---|
| `ui/` | In* 컴포넌트 라이브러리 **단일 출처**. design-system v2 의 코드를 참고해 작성 (직접 import 안 함) | P0~P1 (현재 9 컴포넌트 작성됨) |
| `feature/{domain}/` | 도메인별 재사용 조합 컴포넌트 (사원 검색 모달, 권한 매트릭스 등) | P4 이후 필요 시 |
| `layout/` | layout 부속 (`InUserBadge`, `InBreadcrumb` 등) | 레이아웃 보강 시 |

## 자체 작성 정책

- **design-system v2 (`design-system/v2/`) 는 디자인 명세·참조 자료**. Figma 변환 결과 코드를 보고 우리 `ui/` 에 옮겨 SSOT 화
- **직접 import 안 함** (`@ds/...` alias 없음) — 의존 분리, vite.config 단순, 자체 완결
- 컴포넌트 prefix = `In*` (insait), 파일명 = `In{명사}.vue`
- props 는 Plain JS + `defineProps` validator 로 enum 표현
- 토큰은 `var(--in-*)` Semantic alias 만 참조 (Primitive 직접 X)

## 현재 ui/ 컴포넌트 (P0~P1, 10 파일)

design-system v2 의 동명 컴포넌트를 복사 후 **Plain JS 로 변환** (lang="ts" 제거, defineProps generic + withDefaults → object validator, type/interface 삭제, import type 삭제).

| 파일 | 사용처 |
|---|---|
| InCard.vue | LoginPage |
| InCompanyLogo.vue | LoginPage · AuthLayout · InLNB · InLNBSubmenu |
| InTextField.vue | LoginPage |
| InPasswordField.vue | LoginPage |
| InCheckbox.vue | LoginPage |
| InButton.vue | LoginPage |
| InToast.vue | LoginPage |
| InLNB.vue | MainLayout (collapsed) |
| InLNBSubmenu.vue | MainLayout (expanded) |
| InIcon.vue | (보조) |

## 도메인 wave 추가 시

새 도메인 (`phm` / `pay` / `dts` / `ela` / `cam` / `fsq` …) 진입 시:

1. `feature/{domain}/` 디렉토리 신설
2. 도메인 내 여러 화면에서 재사용되는 위젯 → 본 디렉토리에 추출
3. 한 화면 전용 위젯은 `pages/{domain}/` 안에 inline 작성 OK

## design-system v2 변경 동기화

design-system v2 의 In\* 가 갱신되면 (Figma 정합 보강 등) 본 디렉토리에 수동 sync 한다.

절차:
1. 변경된 `design-system/v2/src/components/ui/In*.vue` 파일 확인
2. `insait-frontend/src/components/ui/` 의 동일 파일에 변경분 적용
3. 의존 자산 (icons/registry.js 등) 도 동기화 — design-system 의 .ts 는 Plain JS 로 변환 (가이드 정합)
4. dev 서버에서 시각 확인 + 변경 commit
