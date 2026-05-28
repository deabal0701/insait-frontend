# components/ — UI 컴포넌트 SSOT

가이드: [02-tobe/01-phase1/03-frontend/07_in-components.md](../../../../../h5-saas-docs/02-tobe/01-phase1/03-frontend/07_in-components.md)

## 세 가지 영역

| 디렉토리 | 책임 | 사용 시점 |
|---|---|---|
| `ui/` | design-system v2 (`@ds/components/ui/In*`) **부족분의 로컬 wrapper** | design-system 에 없는 컴포넌트 (예: `InPanel`, `InFormField`) 필요할 때 |
| `feature/{domain}/` | 도메인별 재사용 조합 컴포넌트 | 같은 도메인의 여러 화면에서 반복 사용 (예: 사원 검색 모달, 권한 매트릭스) |
| `layout/` | layout 부속 (`InUserBadge`, `InBreadcrumb` 등) | MainLayout · AuthLayout 안 보조 컴포넌트 |

## 기본 원칙

- **design-system v2 의 In\* 가 SSOT** — `@ds/components/ui/InButton.vue` 같이 직접 import
- 본 디렉토리의 `ui/` 는 design-system 에 없거나 wrapping 이 필요한 경우만 작성
- 컴포넌트 prefix = `In*` (insait), 파일명 = `In{명사}.vue`
- props 는 Plain JS + `defineProps` validator 로 enum 표현
- 토큰은 `var(--in-*)` Semantic alias 만 참조 (Primitive 직접 X)

## 도메인 wave 추가 시

새 도메인 (`phm` / `pay` / `dts` / `ela` / `cam` / `fsq` …) 진입 시:

1. `feature/{domain}/` 디렉토리 신설
2. 도메인 내 여러 화면에서 재사용되는 위젯 → 본 디렉토리에 추출
3. 한 화면 전용 위젯은 `pages/{domain}/` 안에 inline 작성 OK
