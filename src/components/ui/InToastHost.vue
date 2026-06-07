<script setup>
// ★ (2026-06-02, dspark): InToast 스택 렌더러 — useToast() 큐를 화면 우상단에 표시.
//   App.vue 에 1회만 마운트. Teleport(body) + TransitionGroup(슬라이드/페이드).
//   토스트 자체 클릭만 받고 컨테이너는 통과(pointer-events) — 뒤 화면 조작 방해 X.
import InToast from '@/components/ui/InToast.vue';
import { useToastState, useToast } from '@/composables/useToast';

const state = useToastState();
const { remove } = useToast();
</script>

<template>
  <Teleport to="body">
    <div class="in-toast-host" aria-live="polite" aria-atomic="false">
      <TransitionGroup name="in-toast-fade">
        <InToast
          v-for="t in state.toasts"
          :key="t.id"
          :status="t.status"
          :message="t.message"
          :closable="t.closable"
          @close="remove(t.id)"
        />
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
/* ★ (2026-06-02, dspark): 상단 중앙(top-center) 배치 — ElMessage 와 동일 위치감. */
.in-toast-host {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: var(--in-z-toast);   /* ★ (2026-06-07, dspark): 9999 매직넘버 → 토큰 (1300, modal 1000 위) */
  display: flex;
  flex-direction: column;
  align-items: center; /* 스택 가운데 정렬 */
  gap: 10px;
  pointer-events: none; /* 컨테이너는 통과 */
}
.in-toast-host > * {
  pointer-events: auto; /* 토스트만 클릭 가능 */
}

/* enter/leave 전환 — 위에서 내려오며 페이드 */
.in-toast-fade-enter-active,
.in-toast-fade-leave-active {
  transition: opacity 220ms ease, transform 220ms ease;
}
.in-toast-fade-enter-from,
.in-toast-fade-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}
.in-toast-fade-move {
  transition: transform 220ms ease;
}
</style>
