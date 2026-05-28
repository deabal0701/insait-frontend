# assets/ — insait-frontend 고유 자산 SSOT

Vite 가 빌드 시 hash + optimization 처리하는 자산. 컴포넌트에서 `import` 해서 사용.

## 디자인 시스템 자산 우선

**로고·In\* 컴포넌트 내부 아이콘은 [`@ds/assets/`](../../../../design-system/v2/src/assets/) 가 SSOT.** 본 디렉토리에는 **design-system 에 없는 자산만** 둔다.

## 하위 영역

| 디렉토리 | 용도 |
|---|---|
| `images/` | placeholder · splash · empty state · 도메인 일러스트 (PNG/JPG/WEBP) |
| `icons/` | design-system 에 없는 추가 SVG 아이콘 (도메인 한정) |
| `fonts/` | 로컬 폰트 (design-system 이 Pretendard CDN 사용 중이라 거의 비어 있음) |

## 사용 패턴

```js
// 컴포넌트에서 import
import EmptySearchIcon from '@/assets/images/empty-search.svg';
import OrgChartPlaceholder from '@/assets/images/org-chart-placeholder.png';
```

```vue
<template>
  <img :src="EmptySearchIcon" alt="검색 결과 없음" />
</template>
```

## `public/` 와의 차이

- **`src/assets/`** → Vite 빌드 파이프라인 통과 (hash, tree-shake, optimize) — 컴포넌트에서 `import` 로 사용
- **`public/`** → 빌드 시 그대로 dist/ 로 copy — HTML 절대경로 `/favicon.ico` 같이 사용

→ 컴포넌트가 import 하는 자산 = `src/assets/`, HTML/외부 호환 자산 = `public/`.

## 자산 추가 절차

1. 우선 [`@ds/assets/`](../../../../design-system/v2/src/assets/) 에 있는지 확인
2. 없으면 → design-system v2 에 추가 검토 (재사용 자산은 SSOT 에)
3. 도메인 한정 자산만 본 디렉토리에 추가
