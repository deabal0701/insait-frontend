<script setup>
import { computed } from 'vue';
import CheckCircleIcon from '@/assets/icons/check-circle.svg';
import StatusSuccessIcon from '@/assets/icons/status-success.svg';
import StatusWarningIcon from '@/assets/icons/status-warning.svg';
import StatusErrorIcon from '@/assets/icons/status-error.svg';
import CloseIcon from '@/assets/icons/close.svg';

/**
 * InToast — Figma DS 2559:115889 (Feedback/Toast-Wrap)
 *
 * Figma 매트릭스: status (Enabled / Success / Warning / Error)
 * 시각 (Figma 진본):
 *   - Container 320×56 · radius 8 (Corner/sm) · shadow Elevation Light/1
 *   - status 별 3 영역 동기화:
 *       Enabled  → white bg          + brand border    + check-circle (brand)
 *       Success  → tint green bg     + green border    + status-success
 *       Warning  → tint orange bg    + orange border   + status-warning
 *       Error    → tint red bg       + red border      + status-error
 *   - Body/lg_w400 (14/21) · Text/Accent
 *   - 우측 close 버튼 (옵션) — Icon/Default
 *
 * Vue 표준 API:
 *   - props: status · message · closable
 *   - emits: close
 *   - slots: default (메시지 내용 커스터마이징) · icon (아이콘 슬롯)
 *   - ARIA: role="status" · aria-live="polite"
 */

const props = defineProps({
  status: {
    type: String,
    default: 'enabled',
    validator: (v) => ['enabled', 'success', 'warning', 'error'].includes(v),
  },
  message: { type: String, default: 'Message' },
  closable: { type: Boolean, default: false },
});

defineEmits(['close']);   // close 는 template 의 $emit('close') 로 직접 발신

const statusIcon = computed(() => {
  switch (props.status) {
    case 'success': return StatusSuccessIcon;
    case 'warning': return StatusWarningIcon;
    case 'error':   return StatusErrorIcon;
    default:        return CheckCircleIcon;       // Enabled — brand check-circle
  }
});
</script>

<template>
  <div
    class="in-toast"
    :class="`in-toast--${status}`"
    role="status"
    aria-live="polite"
  >
    <span class="in-toast__icon" aria-hidden="true">
      <slot name="icon">
        <img :src="statusIcon" alt="" />
      </slot>
    </span>
    <span class="in-toast__message">
      <slot>{{ message }}</slot>
    </span>
    <button
      v-if="closable"
      type="button"
      class="in-toast__close"
      aria-label="닫기"
      @click="$emit('close')"
    >
      <img :src="CloseIcon" alt="" />
    </button>
  </div>
</template>

<style scoped>
.in-toast {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  width: 320px;
  background: var(--in-surface-white);
  border: 1px solid var(--in-border-brand);
  border-radius: var(--in-radius-sm);
  box-shadow: var(--in-shadow-elev-1);
  padding: 16px 14px 16px 20px;
  font-family: var(--in-font-family-body);
  font-size: var(--in-font-size-lg);
  line-height: var(--in-line-height-lg);
  font-weight: var(--in-font-weight-regular);
  letter-spacing: var(--in-letter-spacing-lg);
  color: var(--in-text-accent);
}

.in-toast__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}
.in-toast__icon img { width: 100%; height: 100%; display: block; }

.in-toast__message {
  flex: 1 1 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.in-toast__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  background: transparent;
  border: none;
  cursor: pointer;
  flex-shrink: 0;
  border-radius: var(--in-radius-xxs);
  transition: background 120ms ease;
}
.in-toast__close:hover { background: var(--in-surface-state-default); }
.in-toast__close img { width: 100%; height: 100%; display: block; }

/* === Status — Figma 진본: border + tint bg 동시 적용 === */
.in-toast--enabled {
  background: var(--in-surface-white);
  border-color: var(--in-border-brand);
}
.in-toast--success {
  background: var(--in-surface-success);                /* #37ae3414 */
  border-color: var(--in-border-success);               /* #37ae34 */
}
.in-toast--warning {
  background: var(--in-surface-warning);                /* #ed6c0214 */
  border-color: var(--in-border-warning);               /* #ed6c02 */
}
.in-toast--error {
  background: var(--in-surface-error);                  /* #e3313114 */
  border-color: var(--in-border-error);                 /* #e33131 */
}
</style>
