<script setup>
/**
 * InChip — Figma 1176:19104 / 단일 variant 1181:7966
 * Figma 노드 ID = 1176:19104
 *
 * 출처: design-system/v2/src/components/ui/InChip.vue (Plain JS 변환, 2026-06-03)
 *
 * type:    primary / default / info / error / warning / success
 *          editable / multi-select / label / label-brand
 * variant: default / filled / outlined
 * propDelete: 우측 close 버튼 표시
 */
import CloseIcon from '@/assets/icons/close.svg';

defineProps({
  label: { type: String, default: 'Chip' },
  type: { type: String, default: 'primary' },
  variant: { type: String, default: 'default' },
  propDelete: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(['close']);
</script>

<template>
  <span
    class="in-chip"
    :class="[
      `in-chip--${type}`,
      `in-chip--v-${variant}`,
      { 'in-chip--disabled': disabled, 'in-chip--deletable': propDelete },
    ]"
  >
    <span class="in-chip__label">{{ label }}</span>
    <button
      v-if="propDelete && !disabled"
      type="button"
      class="in-chip__close"
      aria-label="제거"
      @click="emit('close')"
    >
      <img :src="CloseIcon" alt="" />
    </button>
  </span>
</template>

<style scoped>
.in-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 15px;
  border-radius: 20px;
  border: 1px solid transparent;
  font-family: var(--in-font-family-body);
  font-size: var(--in-font-size-md);
  line-height: var(--in-line-height-md);
  font-weight: var(--in-font-weight-regular);
  letter-spacing: var(--in-letter-spacing-md);
  white-space: nowrap;
}
.in-chip__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  padding: 0;
  background: transparent;
  border: none;
  cursor: pointer;
}
.in-chip__close img { width: 100%; height: 100%; display: block; }

.in-chip--primary.in-chip--v-default {
  background: var(--in-brand);
  color: var(--in-text-white);
}
.in-chip--default.in-chip--v-default {
  background: var(--in-bg-white);
  color: var(--in-text-default);
  border-color: var(--in-border-input);
}
.in-chip--info.in-chip--v-default {
  background: var(--in-bg-accent-brand);
  color: var(--in-text-brand);
}
.in-chip--editable.in-chip--v-default {
  background: var(--in-bg-white);
  color: var(--in-text-default);
  border-color: var(--in-border-input);
}
.in-chip--multi-select.in-chip--v-default {
  background: var(--in-bg-accent-brand);
  color: var(--in-text-brand);
  padding: 3px 10px;
  font-size: var(--in-font-size-sm);
  line-height: var(--in-line-height-sm);
}
.in-chip--label.in-chip--v-default {
  background: var(--in-surface-default);
  color: var(--in-text-default);
  padding: 3px 10px;
  font-size: var(--in-font-size-sm);
  line-height: var(--in-line-height-sm);
}
.in-chip--label-brand.in-chip--v-default {
  background: var(--in-bg-accent-brand);
  color: var(--in-text-brand);
  padding: 3px 10px;
  font-size: var(--in-font-size-sm);
  line-height: var(--in-line-height-sm);
}

.in-chip--error.in-chip--v-filled    { background: var(--in-text-error);   color: var(--in-text-white); }
.in-chip--warning.in-chip--v-filled  { background: var(--in-text-warning); color: var(--in-text-white); }
.in-chip--success.in-chip--v-filled  { background: var(--in-text-success); color: var(--in-text-white); }

.in-chip--error.in-chip--v-outlined {
  background: var(--in-bg-white);
  color: var(--in-text-error);
  border-color: var(--in-border-error);
}
.in-chip--warning.in-chip--v-outlined {
  background: var(--in-bg-white);
  color: var(--in-text-warning);
  border-color: var(--in-border-warning);
}
.in-chip--success.in-chip--v-outlined {
  background: var(--in-bg-white);
  color: var(--in-text-success);
  border-color: var(--in-border-success);
}

.in-chip:hover:not(.in-chip--disabled) { filter: brightness(0.95); cursor: pointer; }
.in-chip--disabled { opacity: 0.5; cursor: not-allowed; }
</style>
