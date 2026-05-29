<script setup>
/**
 * InMetaDetailDrawer — 우측 슬라이드오버 상세 패널.
 *
 * Figma 노드 ID = TBD
 *
 * 사용처:
 *  - P5-B 서비스 카탈로그: 행 클릭 시 우측에 서비스 상세 + 자원 매핑 + 호출 통계
 *  - P5-C 서비스 테스터: REQ 폼 + 응답 그리드
 *  - P7 단독 편집: 행 상세 미리보기
 *
 * Props:
 *   open: boolean (v-model:open)
 *   title: string
 *   width?: string (default '420px')
 *
 * Slots:
 *   default — 본문
 *   header-actions — 헤더 우측 추가 액션 (copy 등)
 *   footer — 하단 sticky 액션 영역
 */
import InIcon from '@/components/ui/InIcon.vue';

defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  width: { type: String, default: '420px' },
});
const emit = defineEmits(['update:open', 'close']);

function close() {
  emit('update:open', false);
  emit('close');
}
</script>

<template>
  <Teleport to="body">
    <Transition name="in-meta-drawer">
      <aside
        v-if="open"
        class="in-meta-drawer"
        :style="{ width }"
        role="dialog"
        aria-modal="false"
        :aria-label="title"
      >
        <header class="in-meta-drawer__head">
          <h3 class="in-meta-drawer__title">{{ title }}</h3>
          <div class="in-meta-drawer__head-actions">
            <slot name="header-actions" />
            <button type="button" class="in-meta-drawer__close" aria-label="닫기" @click="close">
              <InIcon name="close" :size="16" />
            </button>
          </div>
        </header>
        <div class="in-meta-drawer__body">
          <slot />
        </div>
        <footer v-if="$slots.footer" class="in-meta-drawer__footer">
          <slot name="footer" />
        </footer>
      </aside>
    </Transition>
    <Transition name="in-meta-drawer-overlay">
      <div v-if="open" class="in-meta-drawer__overlay" @click="close" aria-hidden="true" />
    </Transition>
  </Teleport>
</template>

<style scoped>
.in-meta-drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  background: var(--in-surface-overlay, #ffffff);
  border-left: 1px solid var(--in-border-default);
  box-shadow: -4px 0 16px 0 rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  z-index: 100;
  font-family: var(--in-font-family-body);
}

.in-meta-drawer__overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.04);
  z-index: 99;
}

.in-meta-drawer__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--in-border-default);
  flex-shrink: 0;
}
.in-meta-drawer__title {
  margin: 0;
  font-size: var(--in-font-size-lg);
  font-weight: var(--in-font-weight-medium);
  color: var(--in-text-accent);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.in-meta-drawer__head-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.in-meta-drawer__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--in-radius-xs);
  cursor: pointer;
  color: var(--in-text-subtle);
  transition: background 120ms ease;
}
.in-meta-drawer__close:hover {
  background: var(--in-surface-default, #fafafa);
  color: var(--in-text-accent);
}
.in-meta-drawer__close:focus-visible {
  outline: var(--in-focus-ring-style, solid) var(--in-focus-ring-width, 2px) var(--in-focus-ring-color, var(--in-brand));
}

.in-meta-drawer__body {
  flex: 1 1 auto;
  overflow: auto;
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.in-meta-drawer__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 18px;
  border-top: 1px solid var(--in-border-default);
  background: var(--in-surface-default, #fafafa);
  flex-shrink: 0;
}

/* Transitions */
.in-meta-drawer-enter-active,
.in-meta-drawer-leave-active {
  transition: transform 200ms ease;
}
.in-meta-drawer-enter-from,
.in-meta-drawer-leave-to {
  transform: translateX(100%);
}
.in-meta-drawer-overlay-enter-active,
.in-meta-drawer-overlay-leave-active {
  transition: opacity 200ms ease;
}
.in-meta-drawer-overlay-enter-from,
.in-meta-drawer-overlay-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .in-meta-drawer {
    width: 100% !important;
  }
}
</style>
