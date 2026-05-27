// ★ (2026-05-27, dspark): locale 상태. vue-i18n 과 envelope HEADER.localeCd 정합.
//   가이드 04_pinia-stores.md §5 정합.
import { defineStore } from 'pinia';

export const useI18nStore = defineStore('i18n', {
  state: () => ({
    locale: (localStorage.getItem('insait.locale') || 'ko'),
  }),
  getters: {
    localeCd: (s) => s.locale.toUpperCase(), // envelope HEADER.localeCd 형식 (대문자)
  },
  actions: {
    setLocale(locale) {
      this.locale = (locale || 'ko').toLowerCase();
      localStorage.setItem('insait.locale', this.locale);
    },
  },
  persist: {
    storage: localStorage,
    key: 'insait.i18n',
  },
});
