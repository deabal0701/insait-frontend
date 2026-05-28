<script setup>
// ★ (2026-05-27, dspark): Figma HRMS 06 통합 로그인 (1:98859) 정합 스테이지.
//   design-system v2 의 LoginPatternView 스테이지 구조 (bg-accent-subtle + 우하단 워터마크) 를
//   AuthLayout 에 옮겨와 RouterView 슬롯으로 LoginPage 렌더.
import InCompanyLogo from '@ds/components/ui/InCompanyLogo.vue';
</script>

<template>
  <div class="login-stage">
    <!-- 우하단 워터마크 (InCompanyLogo insait + opacity) -->
    <div class="login-watermark" aria-hidden="true">
      <InCompanyLogo :logo="true" variant="insait" :size="320" />
    </div>

    <RouterView />
  </div>
</template>

<style scoped>
.login-stage {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: var(--in-bg-accent-subtle);
  padding: 48px 24px;
  min-height: 100vh;
}
.login-watermark {
  position: absolute;
  right: -40px;
  bottom: -40px;
  opacity: 0.18;
  pointer-events: none;
}
</style>
