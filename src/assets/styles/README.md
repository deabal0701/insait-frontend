# assets/styles/ — CSS 관리 SSOT

insait-frontend 의 모든 글로벌 스타일·토큰·CSS variable 의 단일 출처. 시장 표준 (vben-admin / pure-admin / vue3-element-admin) 정합.

## 핵심 원칙

### 1. 철저한 중앙화 — 모든 색상·폰트·간격·radius·shadow 는 본 디렉토리에서만 정의
- 컴포넌트 / 페이지 안 hex 리터럴 작성 **금지** (예외: tui-grid theme preset — applyTheme 시그니처 한계)
- 모든 색상은 Semantic alias (`var(--in-text-accent)`, `var(--in-bg-brand)` 등) 만 참조
- Primitive (`var(--in-iblue-500)` 같은 ramp 컬러) 도 직접 참조 금지

### 2. SSOT 단계 — Figma → tokens → @theme → Element Plus
```
Figma 디자인 시스템 (KKwV3FylHy4M7KScqFhblf, IDS-인사잇 디자인시스템)
  ↓ scripts/build-tokens (design-system v2 의 자동 추출)
tokens/_generated-tokens.css                  ← Figma 자동 생성 토큰 (--in-bg-brand, --in-text-* 등)
tokens.css                                    ← 수기 정의 + Semantic alias + [data-theme='green'] 재바인딩
  ↓
index.css 의 @theme {} (Tailwind v4)          ← Tailwind utility 의 color-brand-500 같은 클래스 자동 생성
index.css 안 Element Plus override            ← --el-color-primary: var(--in-brand) 등
  ↓
컴포넌트 / 페이지의 var(--in-*) 참조
```

### 3. SCSS 도입 안 함 (★ 결정)
- Tailwind v4 + CSS variables 가 Vue 3 + Vite 7 의 신 시장 표준
- SCSS 도입 시 의존성 추가 + 빌드 복잡도만 증가, 토큰 정의는 CSS variable 만으로 충분
- Element Plus 도 v2 이후 CSS variable override 공식 지원

### 4. Tailwind utility 적극 활용
- HTML 레벨 `<div class="flex gap-4 items-center">` 권장
- 길게 `<style scoped>` 블록 작성 지양 (가능한 layout 은 utility 로)
- 단, design-system v2 의 In* 컴포넌트는 1:1 정합 위해 scoped CSS 유지 OK
- 페이지 (pages/admin/*) 작성 시 utility 우선

---

## 파일 구성

| 파일 | 역할 | SSOT |
|---|---|---|
| `index.css` | 진입점 — Pretendard CDN + tokens + @theme + Tailwind import + base + Element Plus override | (집결) |
| `tokens.css` | Semantic alias 정의 (`--in-text-*`, `--in-bg-*`, `--in-brand` 등) + `[data-theme='green']` 재바인딩 + `--el-*` Element Plus 매핑 | 수기 |
| `base.css` | body 기본 font-family · color · margin reset · scrollbar 등 globally applied | 수기 |
| `tokens/_generated-tokens.css` | Figma 자동 생성 — 모든 색상 토큰 raw 정의 | **자동 생성** (수정 금지) |
| `tokens/_dark-tokens.css` | dark mode 토큰 (`@media (prefers-color-scheme: dark)` + class-based) | **자동 생성** |

---

## 변경 가이드

| 작업 | 어디서 변경 |
|---|---|
| Figma 토큰 갱신 (색·간격·radius·typography) | `tokens/_generated-tokens.css` — design-system v2 의 scripts/build-tokens 재실행 |
| Semantic alias 매핑 변경 (`--in-bg-brand: var(--in-brand)`) | `tokens.css` |
| 테마 추가 (예: blue / dark) | `tokens.css` 안 `[data-theme='X']` 블록 추가 + `stores/theme.js` 의 THEMES 확장 |
| Tailwind utility 색 추가 | `index.css` 안 `@theme` 블록의 `--color-*` 추가 |
| Element Plus 변수 override | `tokens.css` 안 `--el-*` 라인 |
| 글로벌 reset / typography | `base.css` |
| 컴포넌트 별 스타일 | 해당 `.vue` 의 `<style scoped>` 또는 Tailwind utility |

---

## 컴포넌트 작성 정책

### In* 컴포넌트 (`src/components/ui/`)
- design-system v2 의 1:1 정합 위해 `<style scoped>` 유지 OK
- 단 hex 리터럴은 var(--in-*) 로 (utility 또는 변수)
- props 의 variant·size·status 별 class 분기 (`.in-tf--horizontal`, `.in-tf--error` 등)

### 페이지 (`src/pages/**/*.vue`)
- **Tailwind utility 적극 활용** (HTML 레벨)
- 페이지 한정 외형 변형은 scoped CSS OK (예: LoginPage 의 input box style override)
- 일반 layout (flex / grid / gap / padding) 은 utility

### 레이아웃 (`src/layouts/`)
- AppShell 구조는 scoped CSS 합리 (응집)
- design-system 자식 컴포넌트 override 는 `:deep()` + 명확한 wrapper class

---

## 자주 묻는 질문

**Q. Tailwind config.js 가 왜 없나?**
A. Tailwind v4 는 CSS 파일 안 `@theme` 디렉티브로 토큰 정의가 신 표준. config.js 는 v3 이전 방식이라 우리는 사용 안 함.

**Q. `tokens.css` 와 `_generated-tokens.css` 의 차이?**
A. 후자는 Figma 자동 추출 (raw 색·간격 등) / 전자는 수기 Semantic alias + 테마 cascade + Element Plus 매핑. 두 파일 모두 `index.css` 에서 import.

**Q. 컴포넌트에서 `var(--in-brand)` 와 Tailwind `text-brand-500` 중 무엇?**
A. 둘 다 가능 — utility 가 더 짧고 visible. scoped CSS 안에서는 `var(--in-*)`, HTML utility 에서는 Tailwind 클래스.

**Q. 새 컴포넌트 추가 시 `<style scoped>` 에 정의해야 하나?**
A. design-system v2 부족분의 wrapping 이면 scoped OK. 단순 layout 이면 Tailwind utility 우선.

---

## 외부 자료

- design-system v2: `../../../../../design-system/v2/src/styles/` (Figma 변환 원본)
- Tailwind v4: https://tailwindcss.com/docs/v4-beta
- Element Plus theming: https://element-plus.org/en-US/guide/theming.html
