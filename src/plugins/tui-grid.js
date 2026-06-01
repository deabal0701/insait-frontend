// ★ (2026-05-27, dspark): tui-grid 초기화 + Figma 토큰 정합 theme + ko locale.
//   가이드 06_grid-toast-ui.md §3 정합. P2 Step 9 진입 시 본격 채움.
//   현재 골격: lazy import + applyTheme + setLanguage 만. design-system v2 의
//   themes/tui-grid-figma.ts 가 SSOT (작성됨, project_design_system_v2_data_table_figma_boost 참조).
//   ★ 2026-05-27: plugins/tui-grid.js 로 이동 (이전 lib/tui-grid.js). 외부 라이브러리 초기화는
//   plugins/ 가 시장 표준 (vben-admin / pure-admin 정합).
//
// 사용: const Grid = await loadGrid();  →  new Grid({ el, columns, data, ... })
// ★ (2026-05-28, dspark): tui-grid 기본 CSS 1회 진입점. side-effect import.
import 'tui-grid/dist/tui-grid.css';

let _Grid = null;
let _localeSet = false;

/** tui-grid 동적 import + theme/locale 적용.
 *  ★ (2026-06-01, dspark): #4 — theme 는 매 build 마다 현재 토큰으로 재적용(테마 토글 후
 *  신규 그리드 마운트도 정합). locale 만 1회. (이전 _initialized 가드는 theme stale 유발) */
export async function loadGrid() {
  if (!_Grid) {
    const mod = await import('tui-grid');
    _Grid = mod.default || mod;
  }
  if (!_localeSet) { setLocale('ko'); _localeSet = true; }
  await applyDefaultTheme();
  return _Grid;
}

/** Figma 토큰 정합 theme 적용. ★ (2026-06-01, dspark): #4 green 추종 —
 *  buildFigmaTheme() 가 적용 시점의 :root 현재 토큰값을 읽어 brand 색 반영. */
async function applyDefaultTheme() {
  try {
    const { buildFigmaTheme } = await import('@/themes/tui-grid-figma');
    if (_Grid?.applyTheme) _Grid.applyTheme('default', buildFigmaTheme());
  } catch (e) {
    // theme 모듈 미존재 시에도 기본 theme 으로 진행 (개발 초기 graceful fallback)
    console.warn('[tui-grid] figma theme 로드 실패 — default theme 사용', e);
  }
}

/** 테마 토글 시 호출 — 현재 토큰값으로 theme 재적용. 마운트된 그리드는 rebuild 로 재렌더. */
export async function reapplyTheme() {
  if (!_Grid) return;
  const { buildFigmaTheme } = await import('@/themes/tui-grid-figma');
  if (_Grid.applyTheme) _Grid.applyTheme('default', buildFigmaTheme());
}

/** locale 변경 — vue-i18n locale 전환과 별도. ko/en 만 지원. */
export function setLocale(locale) {
  if (!_Grid?.setLanguage) return;
  _Grid.setLanguage(locale === 'en' ? 'en' : 'ko');
}
