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
  // ★ (2026-06-07, dspark): pinia-plugin-persistedstate(insait.i18n) 제거 — 이중 출처 정합.
  //   state() 가 'insait.locale' 에서 복원하고 setLocale 이 같은 키에 기록하며,
  //   vue-i18n(main.js)·envelope(buildHeader) 도 'insait.locale' 만 읽음 → 단일 출처로 통일.
});
