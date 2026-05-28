<script setup>
import { computed } from 'vue';
import LanguageIcon from '@/assets/icons/language.svg';

/**
 * InButton — Figma 1152:21795 / 단일 variant 1152:21959
 *
 * Figma Props API (정합 매핑):
 *   - label                → default slot
 *   - leftIconShow=true    → leftIconShow prop (default true) — true 면 globe 기본 또는 prefix slot
 *   - leftIconSwap=null    → prefix slot (swap)
 *   - rightIconShow=true   → rightIconShow prop (default true)
 *   - rightIconSwap=null   → suffix slot
 *   - size                 → 'sm' | 'md' | 'lg' (Small/Medium/Large)
 *   - type                 → variant 7종
 *
 * 자산: src/assets/icons/language.svg (Figma Icons/icon/fill-on/language)
 * 검증 리포트: docs/verification-button.md
 */

const props = defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (v) => ['primary', 'default', 'rounded', 'text', 'link', 'only-icon', 'only-icon-primary'].includes(v),
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v),
  },
  leftIconShow: { type: Boolean, default: true },
  rightIconShow: { type: Boolean, default: true },
  block: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  type: {
    type: String,
    default: 'button',
    validator: (v) => ['button', 'submit', 'reset'].includes(v),
  },
  ariaLabel: { type: String, default: undefined },
});

defineEmits(['click']);

const isIconOnly = computed(() => props.variant === 'only-icon' || props.variant === 'only-icon-primary');

const renderLeftIcon = computed(() => !isIconOnly.value && !props.loading && props.leftIconShow);
const renderRightIcon = computed(() => !isIconOnly.value && props.rightIconShow);

const classes = computed(() => [
  'in-btn',
  `in-btn--${props.variant}`,
  `in-btn--${props.size}`,
  { 'in-btn--block': props.block, 'in-btn--loading': props.loading },
]);
</script>

<template>
  <button
    :type="type"
    :class="classes"
    :disabled="disabled || loading"
    :aria-label="ariaLabel"
    @click="$emit('click', $event)"
  >
    <span v-if="loading" class="in-btn__spinner" aria-hidden="true"></span>
    <span v-if="renderLeftIcon" class="in-btn__icon in-btn__icon--prefix" aria-hidden="true">
      <slot name="prefix">
        <img :src="LanguageIcon" alt="" />
      </slot>
    </span>
    <span class="in-btn__label">
      <slot />
    </span>
    <span v-if="renderRightIcon" class="in-btn__icon in-btn__icon--suffix" aria-hidden="true">
      <slot name="suffix">
        <img :src="LanguageIcon" alt="" />
      </slot>
    </span>
  </button>
</template>

<style scoped>
.in-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px; /* Figma gap-[4px] (단일 variant 검증) */
  border: 1px solid transparent;
  border-radius: var(--in-radius-xs);
  font-family: var(--in-font-family-body);
  font-weight: var(--in-font-weight-medium);
  letter-spacing: var(--in-letter-spacing-md);
  cursor: pointer;
  transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease, box-shadow 120ms ease;
  user-select: none;
  white-space: nowrap;
}

.in-btn:disabled { cursor: not-allowed; }
.in-btn--block { width: 100%; }

/* Sizes (Figma 정합) */
.in-btn--sm { height: 28px; padding: 0 12px; font-size: var(--in-font-size-sm); line-height: var(--in-line-height-sm); }
.in-btn--md { height: 33px; padding: 0 14px; font-size: var(--in-font-size-md); line-height: var(--in-line-height-md); }
.in-btn--lg { height: 35px; padding: 0 14px; font-size: var(--in-font-size-lg); line-height: var(--in-line-height-lg); }

/* === Icon slots === */
.in-btn__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.in-btn--sm .in-btn__icon { width: 16px; height: 16px; }
.in-btn--md .in-btn__icon { width: 18px; height: 18px; }
.in-btn--lg .in-btn__icon { width: 20px; height: 20px; } /* Figma size-[20px] */
.in-btn__icon :deep(svg),
.in-btn__icon img { width: 100%; height: 100%; display: block; }
.in-btn__icon img { filter: brightness(0) saturate(100%) invert(100%); } /* SVG mask 대용 — 텍스트 색에 맞춤 */

/* Primary 는 white icon (inverted), 그 외는 currentColor 매칭 */
.in-btn--default .in-btn__icon img,
.in-btn--rounded .in-btn__icon img,
.in-btn--text .in-btn__icon img,
.in-btn--only-icon .in-btn__icon img {
  filter: brightness(0) saturate(100%) invert(40%) sepia(0%) saturate(0%) hue-rotate(0deg);
}
.in-btn--link .in-btn__icon img,
.in-btn--only-icon-primary .in-btn__icon img {
  filter: brightness(0) saturate(100%) invert(53%) sepia(76%) saturate(2618%) hue-rotate(170deg);
}

/* === Type=Primary === */
.in-btn--primary {
  background: var(--in-brand);
  color: var(--in-text-white);
  border-color: var(--in-brand);
}
.in-btn--primary:hover:not(:disabled) {
  background: var(--in-bg-state-hover);
  border-color: var(--in-bg-state-hover);
}
.in-btn--primary:active:not(:disabled) {
  background: var(--in-bg-state-active);
  border-color: var(--in-bg-state-active);
}
.in-btn--primary:disabled {
  background: var(--in-bg-state-disabled);
  color: var(--in-icon-state-disabled);
  border-color: var(--in-bg-state-disabled);
}

/* === Type=Default === */
.in-btn--default {
  background: var(--in-bg-white);
  color: var(--in-text-default);
  border-color: var(--in-border-state-enabled);
}
.in-btn--default:hover:not(:disabled) {
  background: var(--in-surface-default);
  color: var(--in-text-state-hover);
  border-color: var(--in-text-state-hover);
}
.in-btn--default:active:not(:disabled) {
  background: var(--in-bg-accent-brand);
  color: var(--in-text-state-active);
  border-color: var(--in-text-state-active);
}
.in-btn--default:disabled {
  background: var(--in-bg-state-disabled);
  color: var(--in-text-state-disabled);
  border-color: var(--in-border-state-disabled);
}

/* === Type=Rounded === */
.in-btn--rounded {
  background: var(--in-bg-white);
  color: var(--in-text-default);
  border-color: var(--in-border-default);
  font-weight: var(--in-font-weight-regular);
}
.in-btn--rounded:hover:not(:disabled) {
  background: var(--in-surface-default);
  color: var(--in-text-state-hover);
  border-color: var(--in-text-state-hover);
}
.in-btn--rounded:active:not(:disabled) {
  background: var(--in-bg-accent-brand);
  color: var(--in-text-state-active);
  border-color: var(--in-text-state-active);
}
.in-btn--rounded:disabled {
  background: var(--in-bg-state-disabled);
  color: var(--in-text-state-disabled);
  border-color: var(--in-border-state-disabled);
}

/* === Type=Text === */
.in-btn--text {
  background: transparent;
  color: var(--in-text-default);
  border-color: transparent;
}
.in-btn--text:hover:not(:disabled) { color: var(--in-text-state-hover); }
.in-btn--text:active:not(:disabled) { color: var(--in-text-state-active); }
.in-btn--text:disabled { color: var(--in-text-state-disabled); }

/* === Type=Link === */
.in-btn--link {
  background: transparent;
  color: var(--in-text-brand);
  border-color: transparent;
}
.in-btn--link:hover:not(:disabled) { color: var(--in-text-state-hover); text-decoration: underline; }
.in-btn--link:active:not(:disabled) { color: var(--in-text-state-active); text-decoration: underline; }
.in-btn--link:disabled { color: var(--in-text-state-disabled); }

/* === Only Icon === */
.in-btn--only-icon {
  background: transparent;
  color: var(--in-icon-default);
  border-color: transparent;
  padding: 0;
}
.in-btn--only-icon.in-btn--sm { width: 28px; }
.in-btn--only-icon.in-btn--md { width: 33px; }
.in-btn--only-icon.in-btn--lg { width: 35px; }
.in-btn--only-icon:hover:not(:disabled) {
  color: var(--in-icon-state-hover);
  background: var(--in-surface-default);
}
.in-btn--only-icon:active:not(:disabled) {
  color: var(--in-icon-state-active);
  background: var(--in-bg-accent-brand);
}
.in-btn--only-icon:disabled { color: var(--in-icon-state-disabled); }

/* === Only Icon Primary === */
.in-btn--only-icon-primary {
  background: transparent;
  color: var(--in-icon-brand);
  border-color: transparent;
  padding: 0;
}
.in-btn--only-icon-primary.in-btn--sm { width: 28px; }
.in-btn--only-icon-primary.in-btn--md { width: 33px; }
.in-btn--only-icon-primary.in-btn--lg { width: 35px; }
.in-btn--only-icon-primary:hover:not(:disabled) {
  color: var(--in-text-state-hover);
  background: var(--in-bg-accent-brand);
}
.in-btn--only-icon-primary:active:not(:disabled) {
  color: var(--in-text-state-active);
  background: var(--in-bg-accent-brand);
}
.in-btn--only-icon-primary:disabled { color: var(--in-icon-state-disabled); }

/* Loading spinner */
.in-btn__spinner {
  width: 12px;
  height: 12px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: in-btn-spin 700ms linear infinite;
}
@keyframes in-btn-spin {
  to { transform: rotate(360deg); }
}
</style>
