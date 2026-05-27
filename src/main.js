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
import './styles/index.css';

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

const i18n = createI18n({
  legacy: false,
  locale: localStorage.getItem('insait.locale') || 'ko',
  fallbackLocale: 'en',
  messages: { ko, en },
});

createApp(App).use(pinia).use(router).use(i18n).mount('#app');
