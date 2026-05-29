<script setup>
import { computed } from 'vue';
import RadioUncheckedIcon from '@/assets/icons/radio-unchecked.svg';
import RadioDotIcon from '@/assets/icons/radio-dot.svg';

/**
 * InRadio — Figma 1152:22617 (Inputs/RadioButton) ★ W6 #2 Figma 정합 rework
 *
 * 출처: design-system/v2/src/components/ui/InRadio.vue (Plain JS 변환)
 *
 * Figma 매트릭스: state(5: Enabled/Hovered/Active/Focus-Visible/Disabled) × showLabel(2)
 *                  × checked(2: Checked/Unchecked) = 20 variants
 *
 * Figma 시각 정합:
 *   - RadioButton-Container: gap 6 + py 7 (h 30)
 *   - radio-button: 16×16
 *     · Unchecked: img radio-unchecked.svg (Figma ellipse outline)
 *     · Checked:   radio-unchecked.svg (outer ring) + radio-dot.svg overlay
 *     · Disabled:  opacity 0.6 + grayscale
 *   - 라벨: Body/sm (Pretendard 400 / 12 / 19 / 0)
 *
 * ATOMIC 컴포넌트: 단일 radio button. RadioGroup 같은 wrapper 없이 사용처에서 v-for 로
 *   여러 개 렌더 + 동일 v-model 공유. Figma 진본 정합 (v2 의 의도).
 *
 *   <InRadio v-for="o in options" :key="o.value"
 *            v-model="selected" :value="o.value" :label="o.label" />
 */

const props = defineProps({
  modelValue: { type: [String, Number, Boolean], default: undefined },
  value: { type: [String, Number, Boolean], required: true },
  label: { type: String, default: 'RadioButton' },
  showLabel: { type: Boolean, default: true },
  state: {
    type: String,
    default: 'enabled',
    validator: (v) => ['enabled', 'hovered', 'active', 'focus-visible', 'disabled'].includes(v),
  },
  disabled: { type: Boolean, default: false },
  name: { type: String, default: '' },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md'].includes(v),
  },
});

const emit = defineEmits(['update:modelValue', 'change']);

const checked = computed(() => props.modelValue === props.value);

function onChange() {
  if (props.disabled) return;
  emit('update:modelValue', props.value);
  emit('change', props.value);
}

const labelClass = computed(() => [
  'in-radio',
  `in-radio--${props.size}`,
  `in-radio--${props.state}`,
  {
    'in-radio--checked': checked.value,
    'in-radio--disabled': props.disabled,
    'in-radio--no-label': !props.showLabel,
  },
]);
</script>

<template>
  <label :class="labelClass">
    <input
      type="radio"
      class="in-radio__input"
      :checked="checked"
      :disabled="disabled"
      :name="name"
      :value="String(value)"
      @change="onChange"
    />
    <span class="in-radio__ring" aria-hidden="true">
      <img :src="RadioUncheckedIcon" alt="" class="in-radio__base" />
      <img v-if="checked && !disabled" :src="RadioDotIcon" alt="" class="in-radio__dot" />
    </span>
    <span v-if="showLabel" class="in-radio__label">{{ label }}</span>
  </label>
</template>

<style scoped>
.in-radio {
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

.in-radio__input {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

.in-radio__ring {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.in-radio--sm .in-radio__ring { width: 14px; height: 14px; }
.in-radio--md .in-radio__ring { width: 16px; height: 16px; }

.in-radio__base {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}

.in-radio__dot {
  position: relative;
  width: 100%;
  height: 100%;
  display: block;
}

/* === States === */
.in-radio:hover .in-radio__base,
.in-radio--hovered .in-radio__base {
  filter: brightness(0.85);
}

.in-radio--focus-visible .in-radio__ring {
  outline: var(--in-focus-ring-style) var(--in-focus-ring-width) var(--in-focus-ring-color);
  outline-offset: var(--in-focus-ring-offset);
  border-radius: var(--in-radius-full);
}

.in-radio--disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.in-radio--disabled .in-radio__base {
  filter: grayscale(1);
}
.in-radio--disabled .in-radio__label {
  color: var(--in-text-state-disabled);
}

.in-radio__label {
  display: inline-flex;
  align-items: center;
}

.in-radio--no-label { gap: 0; }
</style>
