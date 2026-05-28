# assets/ — insait-frontend 자산 SSOT

Vite 가 빌드 시 hash + optimization 처리하는 자산. 컴포넌트에서 `import` 해서 사용.

## 하위 영역

| 디렉토리 | 용도 | 현재 |
|---|---|---|
| `icons/` | SVG 아이콘 카탈로그 + `registry.ts` (ICON_REGISTRY 매핑) | 60+ icon (design-system v2 에서 가져옴) |
| `logos/` | 인사잇 브랜드 로고 (PNG + mark SVG) | insait-logo.png, mark-l.svg, mark-r.svg |
| `fonts/` | 로컬 폰트 (현재 Pretendard CDN 사용 중이라 비어 있음) | (비어 있음) |
| `images/` | placeholder · splash · empty state · 도메인 일러스트 | (점진 추가) |

## design-system v2 와의 관계

design-system v2 (`design-system/v2/src/assets/`) 가 자산의 **디자인 출처** (Figma 변환 결과). 본 디렉토리는 **운영 SSOT** — design-system 에서 가져온 사본을 갖고 있음. **직접 import 안 함** (의존 분리, 자체 완결).

design-system 자산 갱신 시 본 디렉토리에 수동 sync. 새 아이콘 추가 시:
1. `design-system/v2/src/assets/icons/` 에 먼저 추가 (Figma 정합)
2. `insait-frontend/src/assets/icons/` 로 복사
3. `registry.ts` 의 `ICON_REGISTRY` 에 신규 키 등록

## 사용 패턴

```js
// 컴포넌트에서 import
import LnbSearchIcon from '@/assets/icons/lnb-search.svg';
import InsaitLogo from '@/assets/logos/insait-logo.png';
import { ICON_REGISTRY } from '@/assets/icons/registry';
```

## `public/` 와의 차이

- **`src/assets/`** → Vite 빌드 파이프라인 통과 (hash, tree-shake, optimize) — 컴포넌트 `import`
- **`public/`** → 빌드 시 그대로 dist/ 로 copy — HTML 절대경로 (`/favicon.svg`) 같이 사용
