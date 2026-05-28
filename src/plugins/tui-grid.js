// ★ (2026-05-27, dspark): tui-grid 초기화 + Figma 토큰 정합 theme + ko locale.
//   가이드 06_grid-toast-ui.md §3 정합. P2 Step 9 진입 시 본격 채움.
//   현재 골격: lazy import + applyTheme + setLanguage 만. design-system v2 의
//   themes/tui-grid-figma.ts 가 SSOT (작성됨, project_design_system_v2_data_table_figma_boost 참조).
//   ★ 2026-05-27: plugins/tui-grid.js 로 이동 (이전 lib/tui-grid.js). 외부 라이브러리 초기화는
//   plugins/ 가 시장 표준 (vben-admin / pure-admin 정합).
//
// 사용: const Grid = await loadGrid();  →  new Grid({ el, columns, data, ... })
let _Grid = null;
let _initialized = false;

/** tui-grid 동적 import + 1회 초기화 (theme + locale). */
export async function loadGrid() {
  if (_Grid) return _Grid;
  const mod = await import('tui-grid');
  _Grid = mod.default || mod;
  if (!_initialized) {
    await applyDefaultTheme();
    setLocale('ko');
    _initialized = true;
  }
  return _Grid;
}

/** Figma 토큰 정합 theme — design-system v2 의 themes/tui-grid-figma.ts 를 lazy import.
 *  본 wrapper 는 우리 frontend 의 단일 진입점. */
async function applyDefaultTheme() {
  try {
    const theme = await import('@ds/themes/tui-grid-figma');
    const preset = theme.default || theme.figmaTheme || theme;
    if (preset && _Grid?.applyTheme) {
      _Grid.applyTheme('default', preset);
    }
  } catch (e) {
    // theme 모듈 미존재 시에도 기본 theme 으로 진행 (개발 초기 graceful fallback)
    console.warn('[tui-grid] figma theme 로드 실패 — default theme 사용', e);
  }
}

/** locale 변경 — vue-i18n locale 전환과 별도. ko/en 만 지원. */
export function setLocale(locale) {
  if (!_Grid?.setLanguage) return;
  _Grid.setLanguage(locale === 'en' ? 'en' : 'ko');
}
