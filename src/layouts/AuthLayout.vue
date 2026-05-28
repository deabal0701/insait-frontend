<script setup>
// ★ (2026-05-27, dspark): 비인증 화면 layout. 단순 centered 카드 스테이지.
//   ★ 2026-05-27 갱신: 우하단 InCompanyLogo 워터마크 제거 (사용자 요청 — 흐릿하게
//   보여 시각 정합 안 좋음).
</script>

<template>
  <div class="login-stage">
    <RouterView />
  </div>
</template>

<style scoped>
.login-stage {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: var(--in-bg-accent-subtle);
  padding: 48px 24px;
  min-height: 100vh;
}
</style>
