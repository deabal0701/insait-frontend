<script setup>
/**
 * InMetaStepper — 메타관리 마법사 5-Step progress.
 *
 * Figma 노드 ID = TBD (추후 정합 작업 대상 — grep "Figma 노드 ID = TBD")
 *
 * v1/v2 SSOT 에 동일 컴포넌트 없음 (메타관리 특화 composite) — design-system v2 의
 * Navigation/Tabs (InTabs) 시각 어휘를 따른다: text-subtler → text-accent 전이,
 * 하단 2px brand border-bottom, padding 10px, h-40. 단 step 별 상태 (pending /
 * in_progress / completed / error / skipped) 5종을 추가로 표현한다.
 *
 * Props:
 *   steps: [{ id, no, label, description }]
 *   statuses: { [stepId]: 'pending'|'in_progress'|'completed'|'error'|'skipped' }
 *   current: stepId (in_progress 표시용)
 *
 * Emits:
 *   navigate(stepId) — 사용자가 step 클릭. 호출처에서 canEnter() 검사 후 store.goTo()
 */
import { computed } from 'vue';
import InIcon from '@/components/ui/InIcon.vue';

const props = defineProps({
  steps: { type: Array, required: true },
  statuses: { type: Object, default: () => ({}) },
  current: { type: String, default: '' },
});
const emit = defineEmits(['navigate']);

const items = computed(() =>
  props.steps.map((s) => ({
    ...s,
    status: props.statuses[s.id] || 'pending',
    isCurrent: s.id === props.current,
  })),
);

function onClick(item) {
  if (item.status === 'skipped') return;
  emit('navigate', item.id);
}

function iconKey(status) {
  switch (status) {
    case 'completed': return 'check';
    case 'in_progress': return 'arrow-right';
    case 'error': return 'error';
    case 'skipped': return 'close';
    default: return null;
  }
}
</script>

<template>
  <ol class="in-meta-stepper" role="list">
    <li
      v-for="item in items"
      :key="item.id"
      class="in-meta-stepper__step"
      :class="[
        `in-meta-stepper__step--${item.status}`,
        { 'in-meta-stepper__step--current': item.isCurrent },
      ]"
    >
      <button
        type="button"
        class="in-meta-stepper__btn"
        :aria-current="item.isCurrent ? 'step' : undefined"
        :disabled="item.status === 'skipped'"
        @click="onClick(item)"
      >
        <span class="in-meta-stepper__no" aria-hidden="true">
          <InIcon v-if="iconKey(item.status)" :name="iconKey(item.status)" :size="14" />
          <template v-else>{{ item.no }}</template>
        </span>
        <span class="in-meta-stepper__text">
          <span class="in-meta-stepper__label">{{ item.label }}</span>
          <span v-if="item.description" class="in-meta-stepper__desc">{{ item.description }}</span>
        </span>
      </button>
      <span v-if="item.no < items.length" class="in-meta-stepper__divider" aria-hidden="true" />
    </li>
  </ol>
</template>

<style scoped>
.in-meta-stepper {
  display: flex;
  align-items: stretch;
  gap: 0;
  list-style: none;
  margin: 0;
  padding: 0;
  width: 100%;
  font-family: var(--in-font-family-body);
}

.in-meta-stepper__step {
  display: flex;
  align-items: center;
  flex: 1 1 0;
  min-width: 0;
}

.in-meta-stepper__btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  text-align: left;
  width: 100%;
  outline: none;
  transition: color 120ms ease, border-color 120ms ease, background 120ms ease;
}

.in-meta-stepper__btn:focus-visible {
  outline: var(--in-focus-ring-style, solid) var(--in-focus-ring-width, 2px) var(--in-focus-ring-color, var(--in-brand));
  outline-offset: var(--in-focus-ring-offset-inset, -2px);
  border-radius: var(--in-radius-xxs);
}

.in-meta-stepper__btn:disabled {
  cursor: not-allowed;
}

.in-meta-stepper__no {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--in-radius-full);
  background: var(--in-surface-default);
  border: 1px solid var(--in-border-default);
  color: var(--in-text-subtle);
  font-size: var(--in-font-size-sm);
  font-weight: var(--in-font-weight-medium);
  flex-shrink: 0;
}

.in-meta-stepper__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.in-meta-stepper__label {
  font-size: var(--in-font-size-lg);
  line-height: var(--in-line-height-lg);
  font-weight: var(--in-font-weight-medium);
  color: var(--in-text-subtler);
  letter-spacing: var(--in-letter-spacing-lg);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.in-meta-stepper__desc {
  font-size: var(--in-font-size-xs);
  line-height: var(--in-line-height-xs);
  color: var(--in-text-subtler);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.in-meta-stepper__divider {
  flex: 0 0 auto;
  width: 16px;
  height: 1px;
  background: var(--in-border-default);
  margin: 0 4px;
}

/* === State === */
.in-meta-stepper__step--completed .in-meta-stepper__no {
  background: var(--in-brand);
  border-color: var(--in-brand);
  color: var(--in-text-white);
}
.in-meta-stepper__step--completed .in-meta-stepper__label {
  color: var(--in-text-default);
}

.in-meta-stepper__step--in_progress .in-meta-stepper__no,
.in-meta-stepper__step--current .in-meta-stepper__no {
  background: var(--in-bg-accent-brand, var(--in-brand-50, #e1f5fc));
  border-color: var(--in-brand);
  color: var(--in-brand);
}
.in-meta-stepper__step--current .in-meta-stepper__label {
  color: var(--in-text-accent);
}
.in-meta-stepper__step--current .in-meta-stepper__btn {
  border-bottom-color: var(--in-brand);
}

.in-meta-stepper__step--error .in-meta-stepper__no {
  background: var(--in-surface-error, #fef2f2);
  border-color: var(--in-text-error);
  color: var(--in-text-error);
}
.in-meta-stepper__step--error .in-meta-stepper__label {
  color: var(--in-text-error);
}

.in-meta-stepper__step--skipped .in-meta-stepper__no {
  background: transparent;
  border-style: dashed;
  color: var(--in-icon-subtle);
}
.in-meta-stepper__step--skipped .in-meta-stepper__label,
.in-meta-stepper__step--skipped .in-meta-stepper__desc {
  color: var(--in-icon-subtle);
}
</style>
