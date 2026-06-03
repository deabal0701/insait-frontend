<script setup>
import { computed } from 'vue';
import ArrowDownIcon from '@/assets/icons/arrow-down.svg';
import StatusErrorIcon from '@/assets/icons/status-error.svg';

/**
 * InSelect — Figma 1166:15105 / 단일 variant 1162:4447
 *
 * 출처: design-system/v2/src/components/ui/InSelect.vue (Plain JS 변환)
 *
 * Figma Props: label, showLabel, showRequired, multiSelect (False/True),
 *              uses (Basic/Grid), type (Horizontal/Vertical), color (Default/White),
 *              state (6), status (Inactive/Active)
 * 시각: 밑줄형 + grey bg + 우측 Figma arrow_down 아이콘
 * 검증: design-system v2 docs/verification-select.md
 *
 * el-select wrapper (Plain JS) — v2 의 ts 정의를 defineProps + validator 로 그대로 옮김.
 */

const props = defineProps({
  modelValue: { type: [String, Number, Array, null], default: undefined },
  options: {
    type: Array,
    required: true,
    // [{ value: string|number, label: string, disabled?: boolean }]
  },
  label: { type: String, default: '' },         // ★ (2026-06-03, dspark): 'Label' default → '' (호출 측에서 명시한 경우만 표시)
  input: { type: String, default: '선택하지 않음' },          // Figma 'input' = placeholder
  showLabel: { type: Boolean, default: true },
  showRequired: { type: Boolean, default: false },
  multiSelect: { type: Boolean, default: false },             // Figma multiSelect (False/True)
  uses: {
    type: String,
    default: 'basic',
    validator: (v) => ['basic', 'grid'].includes(v),
  },
  layout: {
    type: String,
    default: 'horizontal',
    validator: (v) => ['horizontal', 'vertical'].includes(v),
  },
  status: {
    type: String,
    default: 'default',
    validator: (v) => ['default', 'error'].includes(v),
  },
  color: {
    type: String,
    default: 'default',
    validator: (v) => ['default', 'white'].includes(v),
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v),
  },
  disabled: { type: Boolean, default: false },
  clearable: { type: Boolean, default: false },
  filterable: { type: Boolean, default: false },
  helper: { type: String, default: undefined },
  message: { type: String, default: undefined },
  labelWidth: { type: [Number, String], default: undefined },
});

defineEmits(['update:modelValue']);

const elSize = computed(() => {
  if (props.size === 'sm') return 'small';
  if (props.size === 'lg') return 'large';
  return 'default';
});

const labelWidthValue = computed(() => {
  if (props.layout !== 'horizontal') return undefined;
  const w = props.labelWidth ?? 85;
  return typeof w === 'number' ? `${w}px` : w;
});

const statusMessage = computed(() => {
  if (props.status !== 'default' && props.message) return props.message;
  return props.helper;
});
</script>

<template>
  <div
    class="in-sel"
    :class="[
      `in-sel--${layout}`,
      `in-sel--${status}`,
      `in-sel--c-${color}`,
      `in-sel--${size}`,
      `in-sel--uses-${uses}`,
      { 'in-sel--disabled': disabled, 'in-sel--multiple': multiSelect },
    ]"
    :style="layout === 'horizontal' ? { '--in-sel-label-width': labelWidthValue } : undefined"
  >
    <div class="in-sel__row">
      <div v-if="showLabel && label" class="in-sel__label">
        <span class="in-sel__label-text">{{ label }}</span>
        <span v-if="showRequired" class="in-sel__req" aria-hidden="true">*</span>
      </div>
      <div class="in-sel__control">
        <el-select
          :model-value="modelValue"
          :placeholder="input"
          :size="elSize"
          :disabled="disabled"
          :clearable="clearable"
          :filterable="filterable"
          :multiple="multiSelect"
          :collapse-tags="multiSelect"
          :collapse-tags-tooltip="multiSelect"
          :suffix-icon="undefined"
          @update:model-value="(v) => $emit('update:modelValue', v)"
        >
          <el-option
            v-for="o in options"
            :key="o.value"
            :value="o.value"
            :label="o.label"
            :disabled="o.disabled"
          />
        </el-select>
        <!-- Figma arrow_down 아이콘 (el-select 의 native suffix icon 위에 덮어씀) -->
        <span class="in-sel__arrow" aria-hidden="true">
          <img v-if="status !== 'error'" :src="ArrowDownIcon" alt="" />
          <img v-else :src="StatusErrorIcon" alt="" />
        </span>
      </div>
    </div>
    <span
      v-if="statusMessage"
      class="in-sel__msg"
      :class="`in-sel__msg--${status}`"
    >{{ statusMessage }}</span>
  </div>
</template>

<style scoped>
.in-sel {
  font-family: var(--in-font-family-body);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* === Layout === */
.in-sel--horizontal .in-sel__row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.in-sel--horizontal .in-sel__label {
  min-width: var(--in-sel-label-width, 85px);
  width: var(--in-sel-label-width, 85px);
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  height: 16px;
}
.in-sel--vertical .in-sel__row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.in-sel__label-text {
  color: var(--in-text-accent);
  font-size: var(--in-font-size-md);
  line-height: var(--in-line-height-md);
  font-weight: var(--in-font-weight-regular);
}
.in-sel__req {
  margin-left: 2px;
  color: var(--in-text-info-error);
  font-size: var(--in-font-size-sm);
}

/* === Control === */
.in-sel__control {
  flex: 1 1 0;
  min-width: 0;
  position: relative;
  display: flex;
}

/* === el-select override (밑줄형 + grey bg) === */
.in-sel :deep(.el-select) { flex: 1 1 0; min-width: 0; }
.in-sel :deep(.el-select__wrapper) {
  background: var(--in-surface-state-default);
  box-shadow: none !important;
  border-radius: 0;
  border: none;
  border-bottom: 1px solid var(--in-border-input-default);
  min-height: 30px;
  padding: 0 12px;
  gap: 8px;
}
.in-sel :deep(.el-select__placeholder) {
  color: var(--in-text-subtler);
  font-family: var(--in-font-family-body);
  font-size: var(--in-font-size-md);
  line-height: var(--in-line-height-md);
}
.in-sel :deep(.el-select__selected-item) {
  color: var(--in-text-accent);
}
.in-sel :deep(.el-select__caret) {
  display: none; /* native chevron 숨김 — Figma 자산 사용 */
}
.in-sel :deep(.el-select__suffix) {
  display: none;
}
.in-sel :deep(.el-select__wrapper:hover):not(.is-focused) {
  border-bottom-color: var(--in-text-default);
}
.in-sel :deep(.el-select__wrapper.is-focused) {
  border-bottom-color: var(--in-border-brand);
  background: var(--in-surface-accent-brand);   /* Figma 진본 Focused: 연한 brand bg */
}

/* === Arrow icon (Figma 자산 arrow-down.svg) === */
.in-sel__arrow {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  pointer-events: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.in-sel__arrow img { width: 100%; height: 100%; display: block; }

/* === Status=Error === */
.in-sel--error :deep(.el-select__wrapper) {
  background: var(--in-surface-error);
  border-bottom-color: var(--in-border-error);
}

/* === Color=White === */
.in-sel--c-white :deep(.el-select__wrapper) {
  background: var(--in-surface-white);
}

/* === Disabled === */
.in-sel--disabled :deep(.el-select__wrapper) {
  background: var(--in-surface-state-disabled);
  border-bottom-color: var(--in-border-state-disabled);
}

/* === Message === */
.in-sel__msg {
  font-size: 11px;
  line-height: 16px;
  color: var(--in-text-subtle);
}
.in-sel__msg--error { color: var(--in-text-info-error); }
</style>
