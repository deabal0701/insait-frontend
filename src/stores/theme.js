// ★ (2026-05-27, dspark): brand 테마 상태. design-system v2 의 [data-theme='green']
//   셀렉터가 brand color ramp 를 재바인딩. 'white' (기본 light, blue brand) 와 'green'
//   (green brand) 토글. localStorage 자동 persist.
import { defineStore } from 'pinia';

const THEMES = ['white', 'green'];

function applyTheme(name) {
  const html = document.documentElement;
  if (name === 'green') {
    html.dataset.theme = 'green';
  } else {
    delete html.dataset.theme;        // white = default :root (blue brand)
  }
}

export const useThemeStore = defineStore('theme', {
  state: () => ({
    theme: 'white',                   // 'white' | 'green'
  }),
  getters: {
    isGreen: (s) => s.theme === 'green',
    options: () => THEMES,
  },
  actions: {
    setTheme(name) {
      const next = THEMES.includes(name) ? name : 'white';
      this.theme = next;
      applyTheme(next);
    },
    /** 앱 mount 직후 1회 호출 — persist 로 복원된 state 를 DOM 에 반영. */
    applyCurrent() {
      applyTheme(this.theme);
    },
  },
  persist: {
    storage: localStorage,
    key: 'insait.theme',
  },
});
