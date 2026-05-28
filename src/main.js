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
import 'tui-grid/dist/tui-grid.css';
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
