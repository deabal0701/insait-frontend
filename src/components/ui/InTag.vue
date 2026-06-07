<script setup>
import InIcon from '@/components/ui/InIcon.vue';

/**
 * InTag — Figma 노드 ID = TBD (design-system v2 에 미정의, v1 SSOT)
 *
 * 출처: design-system/v1/src/components/ui/InTag.vue (Plain JS 변환)
 *
 * TODO(Figma 정합): v2 카탈로그에 Tag 진본 정의 시 노드 ID 추가.
 *   InChip (v2 1245:24560) 와 책임 분리 검토 필요 (Tag = 상태 표시, Chip = filter/선택).
 *
 * NATIVE 구현 — el-tag 미사용 (v1 SSOT 정합).
 * variant: default / brand / success / warning / error
 * size:    sm (18px) / md (22px)
 */

defineProps({
  label: { type: String, required: true },
  variant: {
    type: String,
    default: 'default',
    validator: (v) => ['default', 'brand', 'success', 'warning', 'error'].includes(v),
  },
  closable: { type: Boolean, default: false },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md'].includes(v),
  },
});

const emit = defineEmits(['close']);
</script>

<template>
  <span :class="['in-tag', `in-tag--${variant}`, `in-tag--${size}`]">
    <slot name="prefix" />
    <span class="in-tag__label">{{ label }}</span>
    <button
      v-if="closable"
      type="button"
      class="in-tag__close"
      aria-label="제거"
      @click.stop="emit('close')"
    >
      <InIcon name="close" :size="10" />
    </button>
  </span>
</template>

<style scoped>
.in-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--in-font-family-body);
  font-weight: 400;
  border-radius: var(--in-radius-xxs);
  border: 1px solid transparent;
  white-space: nowrap;
}
.in-tag--sm { height: 18px; padding: 0 6px; font-size: 10px; line-height: 14px; }
.in-tag--md { height: 22px; padding: 0 8px; font-size: 11px; line-height: 16px; }

.in-tag--default {
  background: var(--in-surface-default);
  color: var(--in-text-default);
  border-color: var(--in-border-default);
}
.in-tag--brand {
  background: var(--in-bg-accent-brand);
  color: var(--in-text-brand);
  border-color: var(--in-border-brand);
}
/* ★ (2026-06-07, dspark): rgba/#hex 리터럴 → semantic 토큰 (InToast 와 정합, 테마 추종). */
.in-tag--success {
  background: var(--in-surface-success);
  color: var(--in-text-success);
  border-color: var(--in-border-success);
}
.in-tag--warning {
  background: var(--in-surface-warning);
  color: var(--in-text-warning);
  border-color: var(--in-border-warning);
}
.in-tag--error {
  background: var(--in-surface-error);
  color: var(--in-text-error);
  border-color: var(--in-border-error);
}

.in-tag__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  padding: 0;
  color: currentColor;
  opacity: 0.6;
  cursor: pointer;
}
.in-tag__close:hover { opacity: 1; }
</style>
