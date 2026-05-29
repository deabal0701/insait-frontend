<script setup>
/**
 * InMetaStepSection — 마법사 step 내부의 numbered card section.
 *
 * Figma 노드 ID = TBD
 *
 * 시각: InCard 어휘 (white + border + radius-sm + shadow) + brand 컬러 step-no 칩 (22px).
 * Step1IdGate / Step2Sql / Step3Message / Step4Entity / Step5Service 공통.
 *
 * Props:
 *   stepNo: number | string — 좌측 원형 번호 (예: 1, 2, 3 또는 "i")
 *   title: string
 *   hint?: string — 우측 텍스트 hint
 *   tone?: 'default'|'muted'|'locked' — 카드 강조 강도
 *
 * Slots:
 *   default — 본문
 *   hint — hint prop 대신 풍부한 마크업 필요 시
 *   actions — head 우측 영역 (chip 등). hint 와 동시 표시 가능.
 */
defineProps({
  stepNo: { type: [Number, String], default: '' },
  title: { type: String, required: true },
  hint: { type: String, default: '' },
  tone: { type: String, default: 'default' },
});
</script>

<template>
  <section class="in-meta-step-section" :class="[`in-meta-step-section--tone-${tone}`]">
    <div class="in-meta-step-section__head">
      <span v-if="stepNo !== ''" class="in-meta-step-section__no" :class="{ 'in-meta-step-section__no--secondary': stepNo === 'i' }">
        {{ stepNo }}
      </span>
      <h4 class="in-meta-step-section__title">{{ title }}</h4>
      <span v-if="hint || $slots.hint" class="in-meta-step-section__hint">
        <slot name="hint">{{ hint }}</slot>
      </span>
      <span v-if="$slots.actions" class="in-meta-step-section__actions">
        <slot name="actions" />
      </span>
    </div>
    <div class="in-meta-step-section__body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.in-meta-step-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 18px;
  background: var(--in-surface-overlay, #ffffff);
  border: 1px solid var(--in-border-default);
  border-radius: var(--in-radius-sm);
  transition: opacity 120ms ease, border-color 120ms ease;
  font-family: var(--in-font-family-body);
}
.in-meta-step-section--tone-muted {
  background: var(--in-surface-default, #fafafa);
}
.in-meta-step-section--tone-locked {
  opacity: 0.85;
  border-style: dashed;
}

.in-meta-step-section__head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.in-meta-step-section__no {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: var(--in-radius-full);
  background: var(--in-brand);
  color: var(--in-text-white);
  font-size: var(--in-font-size-sm);
  font-weight: var(--in-font-weight-medium);
  flex-shrink: 0;
}
.in-meta-step-section__no--secondary {
  background: var(--in-surface-default, #fafafa);
  border: 1px solid var(--in-border-default);
  color: var(--in-text-subtle);
}
.in-meta-step-section__title {
  margin: 0;
  font-size: var(--in-font-size-lg);
  line-height: var(--in-line-height-lg);
  font-weight: var(--in-font-weight-medium);
  color: var(--in-text-accent);
}
.in-meta-step-section__hint {
  font-size: var(--in-font-size-xs);
  color: var(--in-text-subtle);
  margin-left: auto;
}
.in-meta-step-section__hint :deep(code) {
  font-family: 'Consolas', monospace;
  color: var(--in-text-default);
}
.in-meta-step-section__actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.in-meta-step-section__body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
