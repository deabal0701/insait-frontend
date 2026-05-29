<script setup>
// ★ (2026-05-27, dspark): 시스템관리 > 환경 설정. 현재는 brand 테마 (white/green) 전환만.
// ★ (2026-05-29, dspark): 정책 정합 — el-radio 직접 사용 → InRadio (atomic, v2 1152:22617) 다중 사용.
//   v2 InRadio 는 single radio button (RadioGroup wrapper 없음). 선택지 카드는 v-for 로 InRadio 를
//   여러 개 렌더하고 동일 v-model 공유. 카드형 시각 (label + description + 스와치) 은 페이지 한정.
import { computed } from 'vue';
import { useThemeStore } from '@/stores/theme';
import InRadio from '@/components/ui/InRadio.vue';

const themeStore = useThemeStore();

const THEME_OPTIONS = [
  { value: 'white', label: '화이트 (기본)', description: 'Blue brand 색상 — 인사잇 기본 테마' },
  { value: 'green', label: '그린',          description: 'Green brand 색상 — 사용자 선호 시 전환' },
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

      <div class="settings__theme-cards">
        <label
          v-for="opt in THEME_OPTIONS"
          :key="opt.value"
          class="settings__theme-card"
          :class="{ 'is-active': current === opt.value }"
        >
          <!-- atomic InRadio: 사용처가 직접 v-for + v-model 공유 -->
          <InRadio
            v-model="current"
            :value="opt.value"
            :show-label="false"
            name="theme"
          />
          <span
            class="settings__theme-swatch"
            :class="`settings__theme-swatch--${opt.value}`"
            aria-hidden="true"
          />
          <span class="settings__theme-text">
            <span class="settings__theme-label">{{ opt.label }}</span>
            <span class="settings__theme-desc">{{ opt.description }}</span>
          </span>
        </label>
      </div>
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
  position: relative;
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

.settings__theme-cards {
  display: flex;
  gap: 16px;
}
.settings__theme-card {
  flex: 1 1 0;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--in-border-default);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 120ms, background 120ms;
}
.settings__theme-card.is-active {
  border-color: var(--in-brand);
  background: var(--in-bg-accent-brand);
}
.settings__theme-swatch {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 1px solid var(--in-border-default);
}
.settings__theme-swatch--white {
  background: linear-gradient(135deg, #13a9e9 0%, #0488c7 100%);
}
.settings__theme-swatch--green {
  background: linear-gradient(135deg, #1cac6f 0%, #06683e 100%);
}
.settings__theme-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1 1 0;
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
