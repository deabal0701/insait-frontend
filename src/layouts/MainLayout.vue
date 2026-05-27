<script setup>
// ★ (2026-05-27, dspark): 인증 후 메인 layout. 가이드 09_router-auth.md §4 정합.
//   좌측 InLNB (design-system v2) + 상단 사용자 영역 + 본문 router-view.
//   InLNB 의 메뉴는 현재 design-system v2 의 기본 인사 카탈로그 — P3 Step 10 에서 동적 fetch 로 교체.
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useAuth } from '@/composables/useAuth';
import InLNB from '@ds/components/ui/InLNB.vue';

const router = useRouter();
const auth = useAuthStore();
const { logout } = useAuth();

const adminLinks = [
  { name: 'CCD0020', label: '공통코드' },
  { name: 'IST0050', label: '서비스 관리' },
  { name: 'IST0030', label: '메시지 관리' },
  { name: 'IST0020', label: '엔터티 관리' },
  { name: 'IST0010', label: 'SQL 관리' },
  { name: 'AUT0030', label: '오브젝트 관리' },
  { name: 'AUT0040', label: '권한 관리' },
  { name: 'AUT0050', label: '메뉴 관리' },
  { name: 'FRM0090', label: '파일자료실' },
];

const displayName = computed(() => auth.loginId || auth.empId || 'user');

function go(name) {
  router.push({ name });
}
</script>

<template>
  <div class="main-layout">
    <InLNB accordion="fixed" :height="1080" class="main-layout__lnb" />

    <div class="main-layout__main">
      <header class="main-layout__header">
        <div class="main-layout__crumb">
          {{ $route.meta?.title || '' }}
        </div>
        <div class="main-layout__user">
          <span class="main-layout__user-name">{{ displayName }}</span>
          <el-button size="small" link @click="logout">로그아웃</el-button>
        </div>
      </header>

      <!-- TODO(P3 Step 10): InLNB 를 menu store fetchMenu 트리에 연결.
           현재는 상단 임시 admin shortcut bar 로 9 화면 진입 검증. -->
      <nav class="main-layout__shortcut">
        <el-button
          v-for="link in adminLinks"
          :key="link.name"
          size="small"
          :type="$route.name === link.name ? 'primary' : 'default'"
          @click="go(link.name)"
        >
          {{ link.label }}
        </el-button>
      </nav>

      <main class="main-layout__content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.main-layout {
  display: flex;
  min-height: 100vh;
  background: var(--in-bg-default, #fbfbfb);
}
.main-layout__lnb {
  flex: 0 0 auto;
  min-height: 100vh;
}
.main-layout__main {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.main-layout__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: var(--in-bg-white, #fff);
  border-bottom: 1px solid var(--in-border-default, #e2e2e2);
}
.main-layout__crumb {
  font-size: 14px;
  font-weight: 500;
  color: var(--in-text-accent, #010101);
}
.main-layout__user {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: var(--in-text-default, #565656);
}
.main-layout__user-name { font-weight: 500; }
.main-layout__shortcut {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 20px;
  background: var(--in-bg-white, #fff);
  border-bottom: 1px solid var(--in-border-default, #e2e2e2);
}
.main-layout__content {
  flex: 1 1 auto;
  padding: 20px;
  overflow: auto;
}
</style>
