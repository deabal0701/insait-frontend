// ★ (2026-05-27, dspark): Vue Router 4 — 가이드 09_router-auth §1·§2 정합.
//   라우트 정의는 routes/{auth,main,admin}.js 도메인 모듈로 분리.
//   본 파일은 라우터 인스턴스 + 가드 (beforeEach 인증 / afterEach 메뉴 active) 만.
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useMenuStore } from '@/stores/menu';
import authRoutes from './routes/auth';
import mainRoutes from './routes/main';

const routes = [
  ...authRoutes,
  ...mainRoutes,
  { path: '/:pathMatch(.*)*', redirect: { name: 'Dashboard' } },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 인증 가드 (가이드 §2.1)
router.beforeEach((to) => {
  const auth = useAuthStore();
  const requiresAuth = to.matched.some((r) => r.meta.requiresAuth);
  if (requiresAuth && !auth.isLoggedIn) {
    return { name: 'Login', query: { redirect: to.fullPath } };
  }
  if (to.name === 'Login' && auth.isLoggedIn) {
    return { name: 'Dashboard' };
  }
  return true;
});

// 메뉴 active 동기 (가이드 §2.3)
router.afterEach((to) => {
  const menu = useMenuStore();
  menu.setCurrentMenu(to.meta?.menuId || '');
});

export default router;
