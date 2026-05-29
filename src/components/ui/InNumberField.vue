<script setup>
import { computed } from 'vue';
import InIcon from '@/components/ui/InIcon.vue';

/**
 * InNumberField — Figma 노드 ID = TBD (design-system v2 에 미정의, v1 SSOT)
 *
 * 출처: design-system/v1/src/components/ui/InNumberField.vue (Plain JS 변환)
 *
 * TODO(Figma 정합): v2 카탈로그에 NumberField 진본 정의 시 노드 ID 추가.
 *   현재는 v1 의 native input + 증감 버튼 패턴을 그대로 사용.
 *
 * NATIVE 구현 — el-input-number 미사용 (v1 SSOT 정합).
 * 시각: 밑줄형 (InTextField 동형), 좌우 증감 버튼, format-comma 옵션.
 */

const props = defineProps({
  modelValue: { type: [Number, null], default: null },
  placeholder: { type: String, default: undefined },
  min: { type: Number, default: undefined },
  max: { type: Number, default: undefined },
  step: { type: Number, default: 1 },
  precision: { type: Number, default: undefined },
  disabled: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  error: { type: Boolean, default: false },
  showControls: { type: Boolean, default: true },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v),
  },
  formatComma: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue', 'change']);

const clamp = (n) => {
  let v = n;
  if (props.min != null && v < props.min) v = props.min;
  if (props.max != null && v > props.max) v = props.max;
  if (props.precision != null) v = Number(v.toFixed(props.precision));
  return v;
};

const setValue = (n) => {
  const next = n == null || isNaN(n) ? null : clamp(n);
  emit('update:modelValue', next);
  emit('change', next);
};

const inc = () => { if (props.disabled || props.readonly) return; setValue((props.modelValue ?? 0) + props.step); };
const dec = () => { if (props.disabled || props.readonly) return; setValue((props.modelValue ?? 0) - props.step); };

const onInput = (e) => {
  const raw = e.target.value.replace(/,/g, '');
  if (raw === '') { setValue(null); return; }
  const n = Number(raw);
  if (!isNaN(n)) setValue(n);
};

const display = computed(() => {
  if (props.modelValue == null) return '';
  if (props.formatComma) return props.modelValue.toLocaleString();
  return String(props.modelValue);
});

const cls = computed(() => ['in-num', `in-num--${props.size}`, {
  'in-num--disabled': props.disabled,
  'in-num--error': props.error,
  'in-num--readonly': props.readonly,
}]);
</script>

<template>
  <div :class="cls">
    <button
      v-if="showControls"
      type="button"
      class="in-num__btn"
      :disabled="disabled || readonly || (min != null && (modelValue ?? 0) <= min)"
      aria-label="감소"
      @click="dec"
    >
      <InIcon name="close" :size="12" />
    </button>
    <input
      type="text"
      inputmode="numeric"
      class="in-num__input"
      :value="display"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      @input="onInput"
    />
    <button
      v-if="showControls"
      type="button"
      class="in-num__btn"
      :disabled="disabled || readonly || (max != null && (modelValue ?? 0) >= max)"
      aria-label="증가"
      @click="inc"
    >
      <InIcon name="add" :size="12" />
    </button>
  </div>
</template>

<style scoped>
.in-num {
  display: inline-flex;
  align-items: stretch;
  background: var(--in-surface-default);
  border-bottom: 1px solid var(--in-border-input);
  font-family: var(--in-font-family-body);
  transition: border-color 120ms ease;
}
.in-num--sm { height: 24px; }
.in-num--md { height: 30px; }
.in-num--lg { height: 36px; }
.in-num:focus-within { border-bottom-color: var(--in-border-brand); }
.in-num--error { border-bottom-color: var(--in-text-error); }
.in-num--disabled { opacity: 0.6; cursor: not-allowed; }

.in-num__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  border: 0;
  background: transparent;
  color: var(--in-icon-default);
  cursor: pointer;
  transition: color 120ms ease;
}
.in-num__btn:hover:not(:disabled) { color: var(--in-text-brand); }
.in-num__btn:disabled { color: var(--in-icon-subtle); cursor: not-allowed; }

.in-num__input {
  flex: 1 1 0;
  min-width: 80px;
  max-width: 120px;
  border: 0;
  outline: none;
  background: transparent;
  font-family: inherit;
  font-size: 13px;
  line-height: 20px;
  letter-spacing: -0.1px;
  color: var(--in-text-accent);
  text-align: right;
  padding: 0 8px;
}
.in-num__input::placeholder { color: var(--in-text-subtler); }
</style>
