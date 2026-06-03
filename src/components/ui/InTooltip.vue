<script setup>
// ★ (2026-05-29, dspark): design-system v2 InTooltip (Figma 1241:85351) 1:1 사본 + Plain JS 변환.
//   v2 와의 의도적 분기: prop `style` → `styleVariant` (Vue 의 reserved attr `style` 과 충돌 회피.
//   운영본 InTag 가 동일 패턴). 그 외 CSS·구조·자산은 v2 와 동일.

import { computed } from 'vue';
import TooltipArrowIcon from '@/assets/icons/tooltip-arrow.svg';
import StatusErrorIcon from '@/assets/icons/status-error.svg';

/**
 * InTooltip — Figma 1241:85351
 *
 * props:
 *   text: string                                      (default "Tooltip text")
 *   direction: 'none' | 'up' | 'down' | 'left' | 'right'  (default 'down')
 *   styleVariant: 'default' | 'minimal'               (default 'default')
 *   showIcon: boolean                                 (default true)
 *   disabled: boolean                                 (default false)
 *
 * 사용 예:
 *   <InTooltip text="저장됩니다" direction="up">
 *     <InButton>저장</InButton>
 *   </InTooltip>
 */

// ★ (2026-06-03, dspark): Vue SFC `<script setup>` 의 defineProps() 는 hoist 되므로
//   외부 const(DIRECTIONS/STYLES) 참조 금지. inline literal 로 변경.
const props = defineProps({
  text: { type: String, default: 'Tooltip text' },
  direction: {
    type: String,
    default: 'down',
    validator: (v) => ['none', 'up', 'down', 'left', 'right'].includes(v),
  },
  styleVariant: {
    type: String,
    default: 'default',
    validator: (v) => ['default', 'minimal'].includes(v),
  },
  showIcon: { type: Boolean, default: true },
  disabled: { type: Boolean, default: false },
});

const placement = computed(() => {
  if (props.direction === 'up') return 'top';
  if (props.direction === 'down') return 'bottom';
  if (props.direction === 'left') return 'left';
  if (props.direction === 'right') return 'right';
  return 'top';
});
</script>

<template>
  <el-tooltip
    :placement="placement"
    :disabled="disabled || direction === 'none'"
    :show-arrow="false"
    popper-class="in-tooltip-popper"
  >
    <slot />
    <template #content>
      <div class="in-tooltip" :class="[`in-tooltip--${direction}`, `in-tooltip--${styleVariant}`]">
        <div class="in-tooltip__body">
          <span v-if="showIcon && styleVariant === 'default'" class="in-tooltip__icon" aria-hidden="true">
            <img :src="StatusErrorIcon" alt="" />
          </span>
          <span class="in-tooltip__text">{{ text }}</span>
        </div>
        <span v-if="direction !== 'none'" class="in-tooltip__arrow" :class="`in-tooltip__arrow--${direction}`" aria-hidden="true">
          <img :src="TooltipArrowIcon" alt="" />
        </span>
      </div>
    </template>
  </el-tooltip>
</template>

<style scoped>
.in-tooltip {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  font-family: var(--in-font-family-body);
}
.in-tooltip__body {
  background: var(--in-iblue-50);
  color: var(--in-text-default);
  font-size: var(--in-font-size-sm);
  line-height: var(--in-line-height-sm);
  font-weight: var(--in-font-weight-regular);
  padding: 4px 8px;
  gap: 5px;
  border-radius: var(--in-radius-xxs);
  display: inline-flex;
  align-items: flex-start;
  white-space: nowrap;
}
.in-tooltip__icon {
  display: inline-flex;
  align-items: center;
  padding-top: 2px;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}
.in-tooltip__icon img { width: 100%; height: 100%; display: block; }
.in-tooltip__text { display: inline-block; }

/* === Arrow (Figma 10×10, 방향별 rotate) === */
.in-tooltip__arrow {
  display: block;
  width: 10px;
  height: 10px;
  position: absolute;
}
.in-tooltip__arrow img { width: 100%; height: 100%; display: block; }

.in-tooltip__arrow--down  { top: 100%; left: 50%; transform: translate(-50%, -3px); }
.in-tooltip__arrow--up    { bottom: 100%; left: 50%; transform: translate(-50%, 3px) rotate(180deg); }
.in-tooltip__arrow--left  { right: 100%; top: 50%; transform: translate(3px, -50%) rotate(90deg); }
.in-tooltip__arrow--right { left: 100%; top: 50%; transform: translate(-3px, -50%) rotate(-90deg); }

/* === styleVariant=minimal (no icon, smaller) === */
.in-tooltip--minimal .in-tooltip__body {
  padding: 2px 6px;
}
</style>

<style>
/* popper container override (un-scoped — el-popper 는 teleport 됨) */
.in-tooltip-popper.el-popper {
  background: transparent !important;
  padding: 0 !important;
  border: none !important;
}
.in-tooltip-popper .el-popper__arrow { display: none !important; }
</style>
