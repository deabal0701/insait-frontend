// ★ (2026-05-27, dspark): insait-frontend 엔트리. Pinia + persistedstate + Vue Router +
//   vue-i18n + Element Plus(자동 import) + design-system v2 tokens.css/index.css 통합.
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import { createI18n } from 'vue-i18n';
import App from './App.vue';
import router from './router';
import ko from './locales/ko.json';
import en from './locales/en.json';

import 'element-plus/dist/index.css';
// ★ (2026-06-14, dspark): tui-grid CSS 직접 import 제거 — 그리드 엔진은 @win/grid 가 캡슐화한다
//   (WinGrid 마운트 시 tui-grid CSS side-effect 자동 로드). insait 는 tui-grid 를 직접 의존하지 않음.
//   winGrid 자체 스타일(로딩 스피너·컨텍스트메뉴 등)은 @win/grid/style.css 로 로드.
import '@win/grid/style.css';
import './assets/styles/index.css';

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

// ★ (2026-05-27, dspark): theme store 의 persist 복원값을 DOM 에 반영. 시스템관리 > 환경 설정
//   페이지에서 사용자가 white/green 전환 가능. main.js 의 hardcoded data-theme 은 제거.
import { useThemeStore } from '@/stores/theme';

const i18n = createI18n({
  legacy: false,
  locale: localStorage.getItem('insait.locale') || 'ko',
  fallbackLocale: 'en',
  messages: { ko, en },
});

const app = createApp(App).use(pinia).use(router).use(i18n);

// theme store 의 persist 복원값을 DOM 에 즉시 반영 (mount 직전 — FOUC 최소화)
useThemeStore().applyCurrent();

app.mount('#app');
