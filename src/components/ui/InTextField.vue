<script setup>
import { computed } from 'vue';
import StatusErrorIcon from '@/assets/icons/status-error.svg';
import StatusWarningIcon from '@/assets/icons/status-warning.svg';
import StatusSuccessIcon from '@/assets/icons/status-success.svg';

/**
 * InTextField — Figma 1152:22722 / 단일 variant 1152:22856
 *
 * Figma Props API (정합):
 *   - input          → placeholder (Figma 의 "Input" 값)
 *   - label          → label prop
 *   - characterCount → characterCount prop ("0/100" 등)
 *   - showLabel      → showLabel (default true)
 *   - showRequired   → showRequired (default false)
 *   - showCharacterCount → showCharacterCount (default false)
 *   - showBtn        → showBtn (default false)  + btn slot
 *   - type           → layout (Horizontal/Vertical)
 *   - status         → status (default/error/warning/success)
 *   - color          → color (default/white)
 *
 * 시각: 밑줄형 (bottom border only) + grey bg (Surface/State/Default #f5f5f5)
 * 검증 리포트: docs/verification-text-field.md
 */

const props = defineProps({
  modelValue: { type: [String, Number], default: undefined },
  label: { type: String, default: 'Label' },
  input: { type: String, default: 'Input' },              // Figma prop name (placeholder)
  placeholder: { type: String, default: undefined },      // Vue convention — alias for input (consumer 편의)
  characterCount: { type: String, default: undefined },
  showLabel: { type: Boolean, default: true },
  showRequired: { type: Boolean, default: false },
  showCharacterCount: { type: Boolean, default: false },
  showBtn: { type: Boolean, default: false },
  layout: {
    type: String,
    default: 'horizontal',
    validator: (v) => ['horizontal', 'vertical'].includes(v),
  },
  status: {
    type: String,
    default: 'default',
    validator: (v) => ['default', 'error', 'warning', 'success'].includes(v),
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
  readonly: { type: Boolean, default: false },
  message: { type: String, default: undefined },
  helper: { type: String, default: undefined },
  type: {
    type: String,
    default: 'text',
    validator: (v) => ['text', 'number', 'email', 'tel', 'url'].includes(v),
  },
  labelWidth: { type: [Number, String], default: undefined },
});

defineEmits(['update:modelValue']);

const elSize = computed(() => {
  if (props.size === 'sm') return 'small';
  if (props.size === 'lg') return 'large';
  return 'default';
});

// placeholder prop 우선 (Vue 관례), fallback 으로 Figma 의 input prop 사용
const effectivePlaceholder = computed(() => props.placeholder ?? props.input);

const labelWidthValue = computed(() => {
  if (props.layout !== 'horizontal') return undefined;
  const w = props.labelWidth ?? 85; // Figma w-[85px]
  return typeof w === 'number' ? `${w}px` : w;
});

const statusMessage = computed(() => {
  if (props.status !== 'default' && props.message) return props.message;
  return props.helper;
});

const statusIcon = computed(() => {
  if (props.status === 'error') return StatusErrorIcon;
  if (props.status === 'warning') return StatusWarningIcon;
  if (props.status === 'success') return StatusSuccessIcon;
  return null;
});
</script>

<template>
  <div
    class="in-tf"
    :class="[
      `in-tf--${layout}`,
      `in-tf--${status}`,
      `in-tf--c-${color}`,
      `in-tf--${size}`,
      { 'in-tf--disabled': disabled, 'in-tf--readonly': readonly },
    ]"
    :style="layout === 'horizontal' ? { '--in-tf-label-width': labelWidthValue } : undefined"
  >
    <!-- CharacterCount (Figma: 상단 우측, height 16) -->
    <div v-if="showCharacterCount" class="in-tf__counter">{{ characterCount || '0/100' }}</div>

    <!-- 메인 라인: 라벨 + 인풋 + 보조 버튼 -->
    <div class="in-tf__row">
      <div v-if="showLabel" class="in-tf__label">
        <span class="in-tf__label-text">{{ label }}</span>
        <span v-if="showRequired" class="in-tf__req" aria-hidden="true">*</span>
      </div>
      <div class="in-tf__control">
        <el-input
          :model-value="modelValue"
          :placeholder="effectivePlaceholder"
          :size="elSize"
          :disabled="disabled"
          :readonly="readonly"
          :type="type"
          @update:model-value="(v) => $emit('update:modelValue', v)"
        >
          <template v-if="statusIcon" #suffix>
            <span class="in-tf__status-icon" aria-hidden="true">
              <img :src="statusIcon" alt="" />
            </span>
          </template>
        </el-input>
        <div v-if="showBtn" class="in-tf__btn-slot">
          <slot name="btn" />
        </div>
      </div>
    </div>
    <span
      v-if="statusMessage"
      class="in-tf__msg"
      :class="`in-tf__msg--${status}`"
    >{{ statusMessage }}</span>
  </div>
</template>

<style scoped>
.in-tf {
  font-family: var(--in-font-family-body);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* === Layout === */
.in-tf--horizontal .in-tf__row {
  display: flex;
  align-items: center;
  gap: 10px; /* Figma gap-[10px] */
}
.in-tf--horizontal .in-tf__label {
  min-width: var(--in-tf-label-width, 85px);
  width: var(--in-tf-label-width, 85px);
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  height: 16px;
}

.in-tf--vertical .in-tf__row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: stretch;
}
.in-tf--vertical .in-tf__label {
  display: inline-flex;
  align-items: center;
}

/* === Label === */
.in-tf__label-text {
  color: var(--in-text-accent);            /* Figma Text/Accent #010101 */
  font-size: var(--in-font-size-md);
  line-height: var(--in-line-height-md);
  font-weight: var(--in-font-weight-regular);
  letter-spacing: var(--in-letter-spacing-md);
}
.in-tf__req {
  margin-left: 2px;
  color: var(--in-text-info-error);
  font-size: var(--in-font-size-sm);
  line-height: var(--in-line-height-sm);
}

/* === CharacterCount === */
.in-tf__counter {
  text-align: right;
  height: 16px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  color: var(--in-text-default);
  font-size: var(--in-font-size-sm);
  line-height: var(--in-line-height-sm);
}

/* === Control + Btn === */
.in-tf__control {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  align-items: stretch;
}
.in-tf__btn-slot {
  display: inline-flex;
  align-items: stretch;
  margin-left: -1px;
}

/* === el-input override (밑줄형 + grey bg) — Figma 정합 === */
.in-tf :deep(.el-input) { flex: 1 1 0; min-width: 0; }
.in-tf :deep(.el-input__wrapper) {
  background: var(--in-surface-state-default);        /* Figma Surface/State/Default #f5f5f5 */
  box-shadow: none !important;
  border-radius: 0;
  border: none;
  border-bottom: 1px solid var(--in-border-input-default); /* Figma Border/Input/Default #9e9e9e */
  height: 30px;
  padding: 0 12px;                                /* Figma px-[12px] */
}
.in-tf :deep(.el-input__inner) {
  color: var(--in-text-accent);
  font-family: var(--in-font-family-body);
  font-size: var(--in-font-size-md);
  line-height: var(--in-line-height-md);
}
.in-tf :deep(.el-input__inner::placeholder) {
  color: var(--in-text-subtler);                  /* Figma Text/Subtler #9e9e9e */
}
.in-tf :deep(.el-input__wrapper:hover):not(:focus-within) {
  border-bottom-color: var(--in-text-default);
}
.in-tf :deep(.el-input__wrapper:focus-within) {
  border-bottom-color: var(--in-border-brand);
}

/* === Status === */
.in-tf--error :deep(.el-input__wrapper) {
  background: var(--in-surface-error);
  border-bottom-color: var(--in-border-error);
}
.in-tf--warning :deep(.el-input__wrapper) {
  background: var(--in-surface-warning);
  border-bottom-color: var(--in-border-warning);
}
.in-tf--success :deep(.el-input__wrapper) {
  background: var(--in-surface-success);
  border-bottom-color: var(--in-border-success);
}

/* === Color=White === */
.in-tf--c-white :deep(.el-input__wrapper) {
  background: var(--in-surface-white);
}

/* === Disabled / ReadOnly === */
.in-tf--disabled :deep(.el-input__wrapper) {
  background: var(--in-bg-state-disabled);
  border-bottom-color: var(--in-border-state-disabled);
}
.in-tf--readonly :deep(.el-input__wrapper) {
  background: var(--in-surface-state-default);
}

/* === Message === */
.in-tf__msg {
  font-size: 11px;
  line-height: 16px;
  color: var(--in-text-subtle);
}
.in-tf__msg--error { color: var(--in-text-info-error); }
.in-tf__msg--warning { color: var(--in-text-info-warning); }
.in-tf__msg--success { color: var(--in-text-info-success); }

/* === Status icon (Figma 자산: status-error/warning/success.svg) === */
.in-tf__status-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}
.in-tf__status-icon img { width: 100%; height: 100%; display: block; }
</style>
