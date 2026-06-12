<script setup>
import { computed, ref, useId, watch } from 'vue';
import VisibilityOnIcon from '@/assets/icons/visibility-on.svg';
import VisibilityOffIcon from '@/assets/icons/visibility-off.svg';

/**
 * InPasswordField — Figma 1445:85818
 *
 * Figma Props API:
 *   - characterCount, showCharacterCount, showLabel, showRequired, visible (True/False), type (Horizontal/Vertical)
 * 시각: 밑줄형 + grey bg (TextField 와 동일 패턴)
 * 자산: visibility-on.svg / visibility-off.svg (Figma Icons/icon/fill-off/visibility_on|off)
 * 검증: docs/verification-password-field.md
 */

const props = defineProps({
  modelValue: { type: String, default: undefined },
  label: { type: String, default: 'Label' },
  input: { type: String, default: '비밀번호를 입력하세요.' },  // Figma 정합 placeholder
  characterCount: { type: String, default: undefined },
  showLabel: { type: Boolean, default: true },
  showRequired: { type: Boolean, default: false },
  showCharacterCount: { type: Boolean, default: false },
  visible: { type: Boolean, default: false },  // Figma `visible` prop (false=hidden, true=visible)
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
  readonly: { type: Boolean, default: false },
  message: { type: String, default: undefined },
  helper: { type: String, default: undefined },
  labelWidth: { type: [Number, String], default: undefined },
});

const emit = defineEmits(['update:modelValue', 'update:visible']);

const internalVisible = ref(props.visible);
watch(() => props.visible, (v) => { internalVisible.value = v; });

const toggleVisible = () => {
  if (props.disabled) return;
  internalVisible.value = !internalVisible.value;
  emit('update:visible', internalVisible.value);
};

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

const inputType = computed(() => (internalVisible.value ? 'text' : 'password'));
const iconSrc = computed(() => (internalVisible.value ? VisibilityOnIcon : VisibilityOffIcon));

// ★ (2026-06-12, dspark): label↔input 연결 (#7 a11y) — InTextField 와 동일 패턴 (Vue 3.5 useId)
const inputId = useId();
</script>

<template>
  <div
    class="in-pw"
    :class="[
      `in-pw--${layout}`,
      `in-pw--${status}`,
      `in-pw--c-${color}`,
      `in-pw--${size}`,
      { 'in-pw--disabled': disabled, 'in-pw--readonly': readonly },
    ]"
    :style="layout === 'horizontal' ? { '--in-pw-label-width': labelWidthValue } : undefined"
  >
    <!-- CharacterCount -->
    <div v-if="showCharacterCount" class="in-pw__counter">{{ characterCount || '0/100' }}</div>

    <!-- 메인: 라벨 + 인풋 + visibility 토글 -->
    <div class="in-pw__row">
      <label v-if="showLabel" class="in-pw__label" :for="inputId">
        <span class="in-pw__label-text">{{ label }}</span>
        <span v-if="showRequired" class="in-pw__req" aria-hidden="true">*</span>
      </label>
      <div class="in-pw__control">
        <el-input
          :id="inputId"
          :model-value="modelValue"
          :type="inputType"
          :placeholder="input"
          :size="elSize"
          :disabled="disabled"
          :readonly="readonly"
          @update:model-value="(v) => $emit('update:modelValue', v)"
        >
          <template #suffix>
            <!-- ★ (2026-06-07, dspark): aria 상태를 prop(visible) 이 아닌 실제 상태(internalVisible)에 바인딩 — uncontrolled 사용 시 desync 교정 -->
            <button
              type="button"
              class="in-pw__visibility"
              :aria-label="internalVisible ? '비밀번호 가리기' : '비밀번호 보기'"
              :aria-pressed="internalVisible"
              :disabled="disabled"
              @click="toggleVisible"
            >
              <img :src="iconSrc" alt="" />
            </button>
          </template>
        </el-input>
      </div>
    </div>
    <span
      v-if="statusMessage"
      class="in-pw__msg"
      :class="`in-pw__msg--${status}`"
    >{{ statusMessage }}</span>
  </div>
</template>

<style scoped>
.in-pw {
  font-family: var(--in-font-family-body);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* === Layout === */
.in-pw--horizontal .in-pw__row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.in-pw--horizontal .in-pw__label {
  min-width: var(--in-pw-label-width, 85px);
  width: var(--in-pw-label-width, 85px);
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  height: 16px;
}
.in-pw--vertical .in-pw__row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.in-pw--vertical .in-pw__label {
  display: inline-flex;
  align-items: center;
}

/* === Label === */
.in-pw__label-text {
  color: var(--in-text-accent);
  font-size: var(--in-font-size-md);
  line-height: var(--in-line-height-md);
  font-weight: var(--in-font-weight-regular);
  letter-spacing: var(--in-letter-spacing-md);
}
.in-pw__req {
  margin-left: 2px;
  color: var(--in-text-error);
  font-size: var(--in-font-size-sm);
  line-height: var(--in-line-height-sm);
}

/* === CharacterCount === */
.in-pw__counter {
  text-align: right;
  height: 16px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  color: var(--in-text-default);
  font-size: var(--in-font-size-sm);
  line-height: var(--in-line-height-sm);
}

/* === Control === */
.in-pw__control {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
}

/* === el-input override (밑줄형 + grey bg) === */
.in-pw :deep(.el-input) { flex: 1 1 0; min-width: 0; }
.in-pw :deep(.el-input__wrapper) {
  background: var(--in-surface-default);
  box-shadow: none !important;
  border-radius: 0;
  border: none;
  border-bottom: 1px solid var(--in-border-input);
  height: 30px;
  padding: 0 12px;
  gap: 8px;
}
.in-pw :deep(.el-input__inner) {
  color: var(--in-text-accent);
  font-family: var(--in-font-family-body);
  font-size: var(--in-font-size-md);
  line-height: var(--in-line-height-md);
}
.in-pw :deep(.el-input__inner::placeholder) {
  color: var(--in-text-subtler);
}
.in-pw :deep(.el-input__wrapper:hover):not(:focus-within) {
  border-bottom-color: var(--in-text-default);
}
.in-pw :deep(.el-input__wrapper:focus-within) {
  border-bottom-color: var(--in-border-brand);
}

/* === Visibility toggle === */
.in-pw__visibility {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  background: transparent;
  border: none;
  cursor: pointer;
}
.in-pw__visibility:disabled { cursor: not-allowed; opacity: 0.5; }
.in-pw__visibility img { width: 100%; height: 100%; display: block; }

/* === Status=Error === */
.in-pw--error :deep(.el-input__wrapper) {
  background: var(--in-surface-error);
  border-bottom-color: var(--in-border-error);
}

/* === Color=White === */
.in-pw--c-white :deep(.el-input__wrapper) {
  background: var(--in-surface-white);
}

/* === Disabled / ReadOnly === */
.in-pw--disabled :deep(.el-input__wrapper) {
  background: var(--in-bg-state-disabled);
  border-bottom-color: var(--in-border-state-disabled);
}
.in-pw--readonly :deep(.el-input__wrapper) {
  background: var(--in-surface-default);
}

/* === Message === */
.in-pw__msg {
  font-size: 11px;
  line-height: 16px;
  color: var(--in-text-subtle);
}
.in-pw__msg--error { color: var(--in-text-error); }
</style>
