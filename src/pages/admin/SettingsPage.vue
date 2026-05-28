<script setup>
// ★ (2026-05-27, dspark): 시스템관리 > 환경 설정. 현재는 brand 테마 (white/green) 전환만.
//   향후 다국어 기본값 / 페이지당 row 수 등 사용자 환경설정 추가 예정.
import { computed } from 'vue';
import { useThemeStore } from '@/stores/theme';

const themeStore = useThemeStore();

const THEME_OPTIONS = [
  { value: 'white', label: '화이트 (기본)', desc: 'Blue brand 색상 — 인사잇 기본 테마' },
  { value: 'green', label: '그린',          desc: 'Green brand 색상 — 사용자 선호 시 전환' },
];

const current = computed({
  get: () => themeStore.theme,
  set: (v) => themeStore.setTheme(v),
});
</script>

<template>
  <div class="settings">
    <h2 class="settings__title">환경 설정</h2>
    <p class="settings__hint">사용자별 환경 설정. 변경 사항은 즉시 적용되며 localStorage 에 저장됩니다.</p>

    <section class="settings__section">
      <h3 class="settings__section-title">테마 색상</h3>
      <p class="settings__section-desc">전역 brand 색상을 선택합니다. 모든 화면의 강조 색·LNB·버튼이 즉시 추종합니다.</p>

      <el-radio-group v-model="current" class="settings__theme-group">
        <el-radio
          v-for="opt in THEME_OPTIONS"
          :key="opt.value"
          :value="opt.value"
          class="settings__theme-radio"
        >
          <div class="settings__theme-item">
            <span class="settings__theme-swatch" :class="`settings__theme-swatch--${opt.value}`" />
            <div class="settings__theme-text">
              <div class="settings__theme-label">{{ opt.label }}</div>
              <div class="settings__theme-desc">{{ opt.desc }}</div>
            </div>
          </div>
        </el-radio>
      </el-radio-group>
    </section>
  </div>
</template>

<style scoped>
.settings {
  max-width: 720px;
  font-family: var(--in-font-family-body);
}
.settings__title {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 500;
  color: var(--in-text-accent, #010101);
}
.settings__hint {
  margin: 0 0 24px;
  font-size: 12px;
  color: var(--in-text-subtle, #888);
}
.settings__section {
  padding: 20px 20px 24px;
  background: var(--in-bg-white, #fff);
  border: 1px solid var(--in-border-default, #e2e2e2);
  border-radius: 8px;
}
.settings__section-title {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 500;
  color: var(--in-text-accent, #010101);
}
.settings__section-desc {
  margin: 0 0 16px;
  font-size: 12px;
  color: var(--in-text-subtle, #888);
}
.settings__theme-group {
  display: flex;
  gap: 16px;
}
.settings__theme-radio {
  flex: 1 1 0;
  height: auto;
  padding: 16px;
  margin: 0;
  border: 1px solid var(--in-border-default, #e2e2e2);
  border-radius: 8px;
  align-items: center;
  transition: border-color 120ms;
}
.settings__theme-radio.is-checked {
  border-color: var(--in-brand);
  background: var(--in-bg-accent-brand);
}
.settings__theme-item {
  display: flex;
  align-items: center;
  gap: 12px;
}
.settings__theme-swatch {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 1px solid var(--in-border-default);
}
.settings__theme-swatch--white {
  background: linear-gradient(135deg, #13a9e9 0%, #0488c7 100%); /* iblue 500 → 700 */
}
.settings__theme-swatch--green {
  background: linear-gradient(135deg, #1cac6f 0%, #06683e 100%); /* green 500 → 700 */
}
.settings__theme-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.settings__theme-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--in-text-default);
}
.settings__theme-desc {
  font-size: 12px;
  color: var(--in-text-subtle);
}
</style>
