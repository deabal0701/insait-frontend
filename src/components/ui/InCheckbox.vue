<script setup>
import { computed } from 'vue';
import CheckBoxIcon from '@/assets/icons/check-box.svg';

/**
 * InCheckbox — Figma 1241:50106 (Inputs/CheckBox) ★ W6 #2 Figma 정합 rework
 *
 * Figma 매트릭스: state(5: Enabled/Hovered/Pressed/Focus-Visible/Disabled) × status(2: Inactive/Active) × showLabel(2: True/False)
 *   실제 정의: 14 variants
 *
 * Figma 시각 정합:
 *   - CheckBox-Container: gap 6 + py 7 (h 30)
 *   - check-box: 16×16
 *     · Inactive: bg-white + border 1px input-default + radius 2 (xxs)
 *     · Active:   img check-box.svg (Figma 자산, 채워진 ✓ 박스)
 *     · Disabled/Inactive: bg-state-disabled + border-state-disabled + radius 2
 *   - 라벨: Body/sm (Pretendard 400 / 12 / 19 / 0), text-default → Disabled 시 text-state-disabled
 *
 * Props (Figma camelCase 정합): label / showLabel / state / status
 *   v2 확장: modelValue/indeterminate/disabled/size (가독성)
 */

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  label: { type: String, default: 'CheckBox' },
  showLabel: { type: Boolean, default: true },
  state: {
    type: String,
    default: 'enabled',
    validator: (v) => ['enabled', 'hovered', 'pressed', 'focus-visible', 'disabled'].includes(v),
  },
  indeterminate: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md'].includes(v),
  },
});

const emit = defineEmits(['update:modelValue', 'change']);

function onChange() {
  if (props.disabled) return;
  const next = !props.modelValue;
  emit('update:modelValue', next);
  emit('change', next);
}

const labelClass = computed(() => [
  'in-cb',
  `in-cb--${props.size}`,
  `in-cb--${props.state}`,
  {
    'in-cb--active': props.modelValue && !props.indeterminate,
    'in-cb--indeterminate': props.indeterminate,
    'in-cb--disabled': props.disabled,
    'in-cb--no-label': !props.showLabel,
  },
]);
</script>

<template>
  <label :class="labelClass">
    <input
      type="checkbox"
      class="in-cb__input"
      :checked="modelValue"
      :disabled="disabled"
      :aria-checked="indeterminate ? 'mixed' : modelValue"
      @change="onChange"
    />
    <span class="in-cb__box" aria-hidden="true">
      <!-- Figma Active: 채워진 check_box.svg -->
      <img v-if="modelValue && !indeterminate && !disabled" :src="CheckBoxIcon" alt="" class="in-cb__icon" />
      <!-- Indeterminate: 가로선 -->
      <span v-else-if="indeterminate" class="in-cb__indeterminate"></span>
      <!-- Inactive: 빈 박스 (CSS border + bg) -->
    </span>
    <span v-if="showLabel" class="in-cb__label">{{ label }}</span>
  </label>
</template>

<style scoped>
.in-cb {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 7px 0;
  cursor: pointer;
  font-family: var(--in-font-family-body);
  font-size: var(--in-font-size-sm);
  line-height: var(--in-line-height-sm);
  letter-spacing: var(--in-letter-spacing-sm);
  font-weight: var(--in-font-weight-regular);
  color: var(--in-text-default);
  user-select: none;
}

.in-cb__input {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

.in-cb__box {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--in-surface-white);
  border: 1px solid var(--in-border-input);
  border-radius: var(--in-radius-xxs);
  transition: background 120ms ease, border-color 120ms ease;
  color: var(--in-text-white);
}

.in-cb--sm .in-cb__box { width: 14px; height: 14px; }
.in-cb--md .in-cb__box { width: 16px; height: 16px; }

.in-cb__icon {
  width: 100%;
  height: 100%;
  display: block;
}

.in-cb__indeterminate {
  width: 70%;
  height: 2px;
  background: var(--in-bg-brand);
  border-radius: 1px;
}

/* === States (Figma) === */
/* Inactive Enabled — 기본 */
.in-cb:hover .in-cb__box,
.in-cb--hovered .in-cb__box {
  border-color: var(--in-border-bold);
}

.in-cb--focus-visible .in-cb__box {
  outline: var(--in-focus-ring-style) var(--in-focus-ring-width) var(--in-focus-ring-color);
  outline-offset: var(--in-focus-ring-offset);
}

/* Active (modelValue=true) — Figma 자산 img 사용, border 0 */
.in-cb--active .in-cb__box {
  background: transparent;
  border-color: transparent;
}

/* Indeterminate */
.in-cb--indeterminate .in-cb__box {
  background: var(--in-surface-white);
  border-color: var(--in-border-brand);
}

/* Disabled (Figma 정합: bg-state-disabled + border-state-disabled) */
.in-cb--disabled {
  cursor: not-allowed;
}
.in-cb--disabled .in-cb__box {
  background: var(--in-bg-state-disabled);
  border-color: var(--in-border-state-disabled);
}
.in-cb--disabled .in-cb__label {
  color: var(--in-text-state-disabled);
}
.in-cb--disabled .in-cb__icon {
  opacity: 0.4;
}

.in-cb__label {
  display: inline-flex;
  align-items: center;
}

.in-cb--no-label { gap: 0; }
</style>
