// ★ (2026-05-27, dspark): Plain JS 변환 (이전 tui-grid-figma.ts) — 가이드 project_vue_stack.md 정합.
// tui-grid 4.x Figma 디자인 시스템 정합 theme. Figma 진본: DataDisplay/Table 1241:52990.
// tui-grid 4.21 PresetOptions 호환 속성만 사용. 토큰과 동일한 hex 직접 명시
// (applyTheme 시그니처가 CSS var 지원 안 함).
//
// 매핑:
//   #fbfbfb  --in-bg-default              header bg
//   #ffffff  --in-bg-white                cell bg
//   #010101  --in-text-accent             header text
//   #565656  --in-text-default            cell text
//   #e2e2e2  --in-border-default          cell/header border
//   #13a9e9  --in-border-brand            outline + focus
//   #f5fbff  --in-surface-accent-brand    focused/current row
//   #e1f5fc  --in-bg-accent-brand         selected header
//   #e33131  --in-text-accent-red         required mark

export const figmaTheme = {
  outline: {
    border: '#13a9e9',
    showVerticalBorder: true,
  },
  selection: {
    background: '#e1f5fc',
    border: '#13a9e9',
  },
  area: {
    header: { background: '#fbfbfb', border: '#e2e2e2' },
    body:   { background: '#ffffff' },
    summary:{ background: '#fbfbfb', border: '#13a9e9' },
  },
  cell: {
    normal: {
      background: '#ffffff',
      border: '#e2e2e2',
      text: '#565656',
      showVerticalBorder: true,
      showHorizontalBorder: true,
    },
    header: {
      background: '#fbfbfb',
      border: '#e2e2e2',
      text: '#010101',
      showVerticalBorder: true,
      showHorizontalBorder: true,
    },
    rowHeader: {
      background: '#fbfbfb',
      border: '#e2e2e2',
      text: '#565656',
      showVerticalBorder: true,
      showHorizontalBorder: true,
    },
    selectedHeader: { background: '#e1f5fc' },
    selectedRowHeader: { background: '#e1f5fc' },
    focused: { background: '#f5fbff', border: '#13a9e9' },
    focusedInactive: { border: '#9e9e9e' },
    required: { background: '#ffffff', text: '#e33131' },
    editable: { background: '#ffffff' },
    disabled: { background: '#e7e7e7', text: '#9e9e9e' },
    invalid: { background: '#ffffff', text: '#e33131' },
    currentRow: { background: '#f5fbff' },
    evenRow: { background: '#ffffff' },
    oddRow: { background: '#ffffff' },
    dummy: { background: '#ffffff' },
  },
};

export default figmaTheme;

// ★ (2026-06-01, dspark): #4 green 테마 추종. applyTheme 는 CSS var 미지원이라,
//   적용 시점에 :root 의 현재 semantic 토큰(--in-brand 등) 실측값을 읽어 preset 을 만든다.
//   data-theme='green' 이면 --in-brand 가 green 으로 재바인딩되어 있으므로 그대로 반영됨.
//   (white 기본은 blue) → 테마 토글 시 reapply + grid rebuild 로 추종.
function readToken(name, fallback) {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export function buildFigmaTheme() {
  const brand = readToken('--in-brand', '#13a9e9');                       // focus/outline/selection border
  const surfaceBrand = readToken('--in-surface-accent-brand', '#f5fbff'); // focused/current row bg
  const bgAccentBrand = readToken('--in-bg-accent-brand', '#e1f5fc');     // selection/selected header bg
  return {
    ...figmaTheme,
    outline: { ...figmaTheme.outline, border: brand },
    selection: { background: bgAccentBrand, border: brand },
    area: { ...figmaTheme.area, summary: { ...figmaTheme.area.summary, border: brand } },
    cell: {
      ...figmaTheme.cell,
      selectedHeader: { background: bgAccentBrand },
      selectedRowHeader: { background: bgAccentBrand },
      focused: { background: surfaceBrand, border: brand },
      currentRow: { background: surfaceBrand },
    },
  };
}
