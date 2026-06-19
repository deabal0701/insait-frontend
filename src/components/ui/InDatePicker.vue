<script setup>
import { computed, ref } from 'vue';

/**
 * InDatePicker — Figma 노드 ID = TBD
 *
 * 출처: design-system/v1/src/components/ui/InDatePicker.vue (시각 시그니처)
 *       + el-date-picker (실제 캘린더 popup 동작 위임)
 *
 * TODO(Figma 정합): v2 카탈로그에 DatePicker 진본 정의 시 노드 ID 추가.
 *   v1 은 placeholder (캘린더 popup 미구현, text input + 아이콘 버튼만).
 *   실제 인사 도메인은 popup·범위·shortcuts 가 필수이므로 el-date-picker 위임.
 *
 * 시각 (v1 정합):
 *   - 밑줄형 (border-bottom only) + grey surface bg
 *   - label/required/disabled/error 패턴은 InTextField 와 동형
 *
 * 동작 (el-date-picker):
 *   - type: date/dates/week/month/year/daterange/monthrange/datetime/datetimerange
 *   - 기본 valueFormat='YYYYMMDD' (envelope 정합 — AS-IS 페이로드 형식)
 *   - 기본 format='YYYY.MM.DD' (v1 placeholder 정합)
 */

const props = defineProps({
  modelValue: { type: [String, Number, Date, Array], default: undefined },
  label: { type: String, default: undefined },
  type: {
    type: String,
    default: 'date',
    validator: (v) => [
      'year', 'month', 'date', 'dates', 'week',
      'datetime', 'datetimerange', 'daterange', 'monthrange',
    ].includes(v),
  },
  format: { type: String, default: undefined },           // 표시 형식 (default 'YYYY.MM.DD')
  valueFormat: { type: String, default: 'YYYYMMDD' },     // v-model 형식 (envelope 정합)
  disabledDate: { type: Function, default: undefined },   // (Date)=>boolean — 비활성 날짜 판정(el-date-picker 위임). 예: 미래일자 차단
  placeholder: { type: String, default: undefined },
  layout: {
    type: String,
    default: 'horizontal',
    validator: (v) => ['horizontal', 'vertical'].includes(v),
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v),
  },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  error: { type: Boolean, default: false },
  hideLabel: { type: Boolean, default: false },
  labelWidth: { type: [Number, String], default: undefined },
});

defineEmits(['update:modelValue', 'change']);

const inner = ref(null);
defineExpose({ inner, focus: () => inner.value?.focus?.() });

const elSize = computed(() => (props.size === 'sm' ? 'small' : props.size === 'lg' ? 'large' : 'default'));

const resolvedFormat = computed(() => {
  if (props.format) return props.format;
  if (props.type === 'year') return 'YYYY';
  if (props.type === 'month' || props.type === 'monthrange') return 'YYYY-MM';
  if (props.type === 'datetime' || props.type === 'datetimerange') return 'YYYY.MM.DD HH:mm:ss';
  return 'YYYY.MM.DD';
});

const resolvedPlaceholder = computed(() => props.placeholder ?? resolvedFormat.value);

const labelWidthValue = computed(() => {
  if (props.layout !== 'horizontal') return undefined;
  const w = props.labelWidth ?? 85;
  return typeof w === 'number' ? `${w}px` : w;
});

const wrapperClasses = computed(() => [
  'in-dp',
  `in-dp--${props.layout}`,
  `in-dp--${props.size}`,
  {
    'in-dp--disabled': props.disabled,
    'in-dp--error': props.error,
  },
]);
</script>

<template>
  <div
    :class="wrapperClasses"
    :style="layout === 'horizontal' ? { '--in-dp-label-width': labelWidthValue } : undefined"
  >
    <label v-if="label && !hideLabel" class="in-dp__label">
      <span>{{ label }}</span>
      <span v-if="required" class="in-dp__required" aria-hidden="true">*</span>
    </label>

    <div class="in-dp__field">
      <el-date-picker
        ref="inner"
        :model-value="modelValue"
        :type="type"
        :format="resolvedFormat"
        :value-format="valueFormat"
        :size="elSize"
        :placeholder="resolvedPlaceholder"
        :disabled="disabled"
        :readonly="readonly"
        :disabled-date="disabledDate"
        @update:model-value="(v) => $emit('update:modelValue', v)"
        @change="(v) => $emit('change', v)"
      />
    </div>
  </div>
</template>

<style scoped>
.in-dp {
  display: flex;
  width: 100%;
  font-family: var(--in-font-family-body);
}
.in-dp--horizontal { flex-direction: row; align-items: center; gap: 10px; }
.in-dp--vertical { flex-direction: column; align-items: stretch; gap: 4px; }

.in-dp__label {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  height: 16px;
  color: var(--in-text-accent);
  font-size: 13px;
  line-height: 20px;
  letter-spacing: -0.1px;
  white-space: nowrap;
}
.in-dp--horizontal .in-dp__label {
  width: var(--in-dp-label-width, 85px);
  min-width: 61px;
}
.in-dp__required {
  margin-left: 2px;
  color: var(--in-text-error);
  font-size: 12px;
}

.in-dp__field {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
}

/* === el-date-picker → v1 밑줄형 시각으로 override === */
.in-dp :deep(.el-date-editor),
.in-dp :deep(.el-input) {
  width: 100%;
}
.in-dp :deep(.el-input__wrapper) {
  background: var(--in-surface-default);
  box-shadow: none !important;
  border: none;
  border-bottom: 1px solid var(--in-border-input);
  border-radius: 0;
  height: 30px;
  padding: 0 12px;
  transition: border-color 120ms ease;
}
.in-dp--sm :deep(.el-input__wrapper) { height: 24px; }
.in-dp--lg :deep(.el-input__wrapper) { height: 36px; }

.in-dp :deep(.el-input__wrapper:hover):not(:focus-within) {
  border-bottom-color: var(--in-text-default);
}
.in-dp :deep(.el-input__wrapper:focus-within) {
  border-bottom-color: var(--in-border-brand);
}
.in-dp :deep(.el-input__inner) {
  color: var(--in-text-accent);
  font-family: var(--in-font-family-body);
  font-size: 13px;
}
.in-dp :deep(.el-input__inner::placeholder) {
  color: var(--in-text-subtler);
}

/* range editor 도 동형 */
.in-dp :deep(.el-range-editor) {
  background: var(--in-surface-default);
  box-shadow: none !important;
  border: none;
  border-bottom: 1px solid var(--in-border-input);
  border-radius: 0;
  height: 30px;
  padding: 0 12px;
}
.in-dp :deep(.el-range-editor.is-active) {
  border-bottom-color: var(--in-border-brand);
}

/* error / disabled */
.in-dp--error :deep(.el-input__wrapper),
.in-dp--error :deep(.el-range-editor) {
  border-bottom-color: var(--in-text-error) !important;
}
.in-dp--disabled :deep(.el-input__wrapper),
.in-dp--disabled :deep(.el-range-editor) {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
