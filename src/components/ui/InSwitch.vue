<script setup>
import { computed } from 'vue';

/**
 * InSwitch — Figma DS 1815:73431 (Inputs/Switch-Wrap)
 *
 * 출처: design-system/v2/src/components/ui/InSwitch.vue (Plain JS 변환)
 *
 * Figma 매트릭스: selected (True/False) × state (Enabled/Hovered/Focused/Disabled/Error) × size (Medium/Small)
 *   - Error 는 Selected=True 일 때만 등장 (Figma metadata)
 *   - Medium 58×38 / Small 40×24
 *
 * 시각 (Figma 진본):
 *   - Track: rounded pill (opacity 적용). Selected=True 면 brand bg, False 면 gray bg
 *   - Knob: 솔리드 원. Selected=True 면 brand, False 면 gray (Icon/Accent #666)
 *   - Hovered/Focused: knob 주변 halo ring (focus 보조 단서)
 *   - Disabled: 톤 다운 (icon-state-disabled + bg-state-disabled)
 *
 * Vue 표준 API:
 *   - v-model (modelValue / update:modelValue)
 *   - props: size · status · disabled · label · ariaLabel
 *   - emits: update:modelValue · change
 *   - slots: label (기본 텍스트 label 대체)
 *   - ARIA: role="switch" · aria-checked · aria-disabled · aria-invalid
 *   - 키보드: Space / Enter
 *
 * NATIVE 구현 — el-switch 미사용 (Figma 진본 정합 위해 자체 button + halo).
 */

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md'].includes(v),
  },
  status: {
    type: String,
    default: 'default',
    validator: (v) => ['default', 'error'].includes(v),
  },
  disabled: { type: Boolean, default: false },
  label: { type: String, default: '' },
  ariaLabel: { type: String, default: '' },
});

const emit = defineEmits(['update:modelValue', 'change']);

function toggle() {
  if (props.disabled) return;
  const next = !props.modelValue;
  emit('update:modelValue', next);
  emit('change', next);
}

function onKey(e) {
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    toggle();
  }
}

// Error 는 Selected=True 일 때만 의미. False 시에는 기본 처리.
const effectiveStatus = computed(() => {
  if (props.status === 'error' && props.modelValue) return 'error';
  return 'default';
});

const switchClasses = computed(() => [
  'in-sw',
  `in-sw--${props.size}`,
  `in-sw--${effectiveStatus.value}`,
  {
    'in-sw--on': props.modelValue,
    'in-sw--disabled': props.disabled,
  },
]);
</script>

<template>
  <label class="in-sw-wrap" :class="{ 'in-sw-wrap--disabled': disabled }">
    <button
      type="button"
      role="switch"
      :class="switchClasses"
      :aria-checked="modelValue"
      :aria-disabled="disabled || undefined"
      :aria-invalid="effectiveStatus === 'error' || undefined"
      :aria-label="ariaLabel || (label ? undefined : (modelValue ? 'on' : 'off'))"
      :disabled="disabled"
      tabindex="0"
      @click="toggle"
      @keydown="onKey"
    >
      <span class="in-sw__track" aria-hidden="true"></span>
      <span class="in-sw__halo" aria-hidden="true"></span>
      <span class="in-sw__knob" aria-hidden="true"></span>
    </button>
    <span v-if="$slots.label || label" class="in-sw__label">
      <slot name="label">{{ label }}</slot>
    </span>
  </label>
</template>

<style scoped>
/* === Wrap === */
.in-sw-wrap {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--in-font-family-body);
  cursor: pointer;
}
.in-sw-wrap--disabled { cursor: not-allowed; }

/* === Button container === */
.in-sw {
  position: relative;
  display: inline-block;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  outline: none;
}
.in-sw:disabled { cursor: not-allowed; }

/* Sizes (Figma 진본 치수) */
.in-sw--md { width: 58px; height: 38px; }
.in-sw--sm { width: 40px; height: 24px; }

/* === Track (가운데 가로 pill) === */
.in-sw__track {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  border-radius: 9999px;
  background: var(--in-icon-accent);    /* #666 — off 기본 */
  opacity: 0.38;
  transition: background-color 200ms ease, opacity 200ms ease;
}
.in-sw--md .in-sw__track { left: 12px; width: 34px; height: 14px; }
.in-sw--sm .in-sw__track { left: 7px;  width: 26px; height: 10px; }

/* On — track brand bg, 더 진한 opacity */
.in-sw--on .in-sw__track {
  background: var(--in-bg-brand);       /* #13a9e9 */
  opacity: 0.5;
}

/* Error (Selected=True only — effectiveStatus 가 막아줌) */
.in-sw--error .in-sw__track {
  background: var(--in-text-info-error);
  opacity: 0.5;
}

/* Disabled — gray, opacity 1 */
.in-sw--disabled .in-sw__track {
  background: var(--in-surface-state-disabled);
  opacity: 1;
}

/* === Halo (hover/focus 시 knob 주변 ring) === */
.in-sw__halo {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: var(--in-icon-accent);
  opacity: 0;
  transition: opacity 150ms ease, background-color 200ms ease;
  pointer-events: none;
}
.in-sw--md .in-sw__halo { width: 38px; height: 38px; }
.in-sw--sm .in-sw__halo { width: 24px; height: 24px; }

.in-sw--md.in-sw--on .in-sw__halo { left: calc(20px + 19px); }
.in-sw--md:not(.in-sw--on) .in-sw__halo { left: 19px; }
.in-sw--sm.in-sw--on .in-sw__halo { left: calc(16px + 12px); }
.in-sw--sm:not(.in-sw--on) .in-sw__halo { left: 12px; }

.in-sw--on .in-sw__halo { background: var(--in-bg-brand); }
.in-sw--error .in-sw__halo { background: var(--in-text-info-error); }

/* Hover: halo 살짝 보임 */
.in-sw:hover:not(:disabled) .in-sw__halo { opacity: 0.12; }

/* Focused (focus-visible): halo 더 진하게 + slightly larger */
.in-sw:focus-visible .in-sw__halo {
  opacity: 0.18;
}
.in-sw--md:focus-visible .in-sw__halo { width: 44px; height: 44px; }
.in-sw--sm:focus-visible .in-sw__halo { width: 30px; height: 30px; }

/* === Knob (솔리드 원, 색은 상태에 따름) === */
.in-sw__knob {
  position: absolute;
  top: 50%;
  border-radius: 50%;
  background: var(--in-icon-accent);    /* off 기본 #666 */
  box-shadow: var(--in-shadow-elev-1);
  transition: left 200ms ease, background-color 200ms ease;
}
.in-sw--md .in-sw__knob { width: 20px; height: 20px; transform: translateY(-50%); }
.in-sw--sm .in-sw__knob { width: 16px; height: 16px; transform: translateY(-50%); }

/* Knob 위치 */
.in-sw--md .in-sw__knob { left: 9px; }
.in-sw--md.in-sw--on .in-sw__knob { left: 29px; }      /* 9 + 20 */
.in-sw--sm .in-sw__knob { left: 4px; }
.in-sw--sm.in-sw--on .in-sw__knob { left: 20px; }      /* 4 + 16 */

/* On — knob brand */
.in-sw--on .in-sw__knob {
  background: var(--in-bg-brand);
}

/* Error — knob red */
.in-sw--error .in-sw__knob {
  background: var(--in-text-info-error);
}

/* Disabled — knob muted */
.in-sw--disabled .in-sw__knob {
  background: var(--in-icon-state-disabled);
  box-shadow: none;
}

/* Focus outline (keyboard) — track 영역에는 outline 표시 안 함. halo 로 대체. */
.in-sw:focus { outline: none; }

/* === Label === */
.in-sw__label {
  font-size: var(--in-font-size-md);
  line-height: var(--in-line-height-md);
  letter-spacing: var(--in-letter-spacing-md);
  color: var(--in-text-default);
}
.in-sw-wrap--disabled .in-sw__label { color: var(--in-text-state-disabled); }
</style>
