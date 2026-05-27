<script setup>
// ★ (2026-05-27, dspark): 비인증 화면 layout. 가이드 09_router-auth.md §4 정합.
//   중앙 정렬 카드 안에 router-view (LoginPage). 브랜드 로고는 design-system v2 InCompanyLogo 사용.
import InCompanyLogo from '@ds/components/ui/InCompanyLogo.vue';
</script>

<template>
  <div class="auth-layout">
    <div class="auth-layout__card">
      <div class="auth-layout__brand">
        <InCompanyLogo />
        <h1 class="auth-layout__title">insa-IT</h1>
      </div>
      <RouterView />
    </div>
  </div>
</template>

<style scoped>
.auth-layout {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--in-bg-default, #fbfbfb);
}
.auth-layout__card {
  width: 360px;
  padding: 32px 28px;
  background: var(--in-bg-white, #fff);
  border: 1px solid var(--in-border-default, #e2e2e2);
  border-radius: 8px;
  box-shadow: 1px 2px 4px 0 #d4b7b714;
}
.auth-layout__brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
}
.auth-layout__title {
  font-size: 18px;
  font-weight: 500;
  color: var(--in-text-default, #565656);
  margin: 0;
}
</style>
