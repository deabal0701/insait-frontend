// ★ (2026-05-27, dspark): vue-i18n + i18n store + envelope HEADER.localeCd 동기 wrapper.
//   가이드 05_composables §7 / 10_i18n.md 정합. P5 Step 16 진입 시 본격 사용.
//   현재 골격: vue-i18n 의 t / locale + i18n store setLocale 통합.
import { useI18n as useVueI18n } from 'vue-i18n';
import { useI18nStore } from '@/stores/i18n';

export function useI18n() {
  const vue = useVueI18n();
  const store = useI18nStore();

  /** locale 전환 — vue-i18n + store 동시 갱신. 다음 envelope 부터 localeCd 적용. */
  function setLocale(locale) {
    const next = (locale || 'ko').toLowerCase();
    vue.locale.value = next;
    store.setLocale(next);
  }

  return {
    t: vue.t,
    locale: vue.locale,
    setLocale,
    /** envelope HEADER.localeCd (대문자) — useEnvelope 가 참조. */
    get localeCd() { return store.localeCd; },
  };
}
