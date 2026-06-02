<script setup>
// ★ (2026-05-27, dspark): root component — RouterView 단일. 레이아웃은 라우트별 layout meta 로 분기
// ★ (2026-06-02, dspark): InToastHost 1회 마운트 — useToast() 전역 알림 렌더 (ElMessage 대체).
//   단일 루트 lint(vue/no-multiple-template-root) 회피용 래퍼는 display:contents 라 레이아웃 영향 0.
import InToastHost from '@/components/ui/InToastHost.vue';
</script>

<template>
  <div style="display: contents">
    <RouterView />
    <InToastHost />
  </div>
</template>
