<script setup>
/**
 * InMetaStepHeader — 마법사 5-Step 의 공통 헤더 (제목 + 코드 칩 + 부제).
 *
 * Figma 노드 ID = TBD
 *
 * 시각: var(--in-font-size-xl) 제목 + brand 컬러 monospace code chip + subtitle.
 * Step1IdGate / Step2Sql / Step3Message / Step4Entity / Step5Service 공통.
 *
 * Props:
 *   prefix?: string — "①" "②" 등 단계 마커 (선택)
 *   title: string
 *   code?: string — 우측 코드 칩 (예: 자원 ID)
 *   subtitle?: string — 본문 설명
 *
 * Slots:
 *   subtitle — subtitle prop 대신 풍부한 마크업 필요 시
 */
defineProps({
  prefix: { type: String, default: '' },
  title: { type: String, required: true },
  code: { type: String, default: '' },
  subtitle: { type: String, default: '' },
});
</script>

<template>
  <header class="in-meta-step-header">
    <h3 class="in-meta-step-header__title">
      <span v-if="prefix" class="in-meta-step-header__prefix">{{ prefix }}</span>
      <span>{{ title }}</span>
      <code v-if="code" class="in-meta-step-header__code">{{ code }}</code>
    </h3>
    <p v-if="$slots.subtitle || subtitle" class="in-meta-step-header__sub">
      <slot name="subtitle">{{ subtitle }}</slot>
    </p>
  </header>
</template>

<style scoped>
.in-meta-step-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-family: var(--in-font-family-body);
}
.in-meta-step-header__title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin: 0;
  font-size: var(--in-font-size-xl);
  line-height: var(--in-line-height-xl);
  font-weight: var(--in-font-weight-medium);
  color: var(--in-text-accent);
  letter-spacing: var(--in-letter-spacing-xl);
}
.in-meta-step-header__prefix {
  color: var(--in-text-subtle);
  font-weight: var(--in-font-weight-regular);
}
.in-meta-step-header__code {
  font-family: 'Consolas', 'Menlo', monospace;
  color: var(--in-brand);
  background: var(--in-bg-accent-subtle, var(--in-brand-50, #e1f5fc));
  padding: 1px 8px;
  border-radius: var(--in-radius-xxs);
  font-size: var(--in-font-size-lg);
  font-weight: var(--in-font-weight-medium);
}
.in-meta-step-header__sub {
  margin: 0;
  font-size: var(--in-font-size-sm);
  line-height: var(--in-line-height-sm);
  color: var(--in-text-subtle);
}
:slotted(strong),
.in-meta-step-header__sub :deep(strong) {
  color: var(--in-text-warning);
  font-weight: var(--in-font-weight-medium);
}
</style>
