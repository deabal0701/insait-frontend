// ★ (2026-05-27, dspark): Vue Router 4. 가이드 09_router-auth.md §1·§3 정합.
//   - 라우트 path = `/admin/{object_id_lower}`, name = OBJECT_ID (대문자) 그대로
//   - meta = { requiresAuth, objectId, menuId, title }
//   - beforeEach: 인증 가드 (미로그인 + requiresAuth → /login?redirect=)
//   - afterEach: 메뉴 active 동기 (useMenuStore.setCurrentMenu)
//   - 첫 admin 화면 = CCD0020 (가이드 P4 Step 13)
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useMenuStore } from '@/stores/menu';

const routes = [
  // ── Auth (AuthLayout) ──
  {
    path: '/login',
    component: () => import('@/layouts/AuthLayout.vue'),
    meta: { requiresAuth: false },
    children: [
      {
        path: '',
        name: 'Login',
        component: () => import('@/pages/auth/LoginPage.vue'),
        meta: { requiresAuth: false, title: 'login.title' },
      },
    ],
  },

  // ── Main (MainLayout) ──
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('@/pages/DashboardPage.vue'),
        meta: { requiresAuth: true, title: 'app.title' },
      },

      // 시스템관리 9 admin 화면 (가이드 §3 카탈로그 정합)
      {
        path: 'admin/ccd0020',
        name: 'CCD0020',
        component: () => import('@/pages/admin/CCD0020Placeholder.vue'),
        meta: { requiresAuth: true, objectId: 'CCD0020', menuId: '', title: 'CCD0020 공통코드' },
      },
      {
        path: 'admin/ist0010',
        name: 'IST0010',
        component: () => import('@/pages/admin/Placeholder.vue'),
        meta: { requiresAuth: true, objectId: 'IST0010', menuId: 'SD_SQL', title: 'IST0010 SQL 관리' },
      },
      {
        path: 'admin/ist0020',
        name: 'IST0020',
        component: () => import('@/pages/admin/Placeholder.vue'),
        meta: { requiresAuth: true, objectId: 'IST0020', menuId: '', title: 'IST0020 엔터티 관리' },
      },
      {
        path: 'admin/ist0030',
        name: 'IST0030',
        component: () => import('@/pages/admin/Placeholder.vue'),
        meta: { requiresAuth: true, objectId: 'IST0030', menuId: 'SD_MSG', title: 'IST0030 메시지 관리' },
      },
      {
        path: 'admin/ist0050',
        name: 'IST0050',
        component: () => import('@/pages/admin/Placeholder.vue'),
        meta: { requiresAuth: true, objectId: 'IST0050', menuId: 'SD_MSG1', title: 'IST0050 서비스 관리' },
      },
      {
        path: 'admin/aut0030',
        name: 'AUT0030',
        component: () => import('@/pages/admin/Placeholder.vue'),
        meta: { requiresAuth: true, objectId: 'AUT0030', menuId: 'SD_OBJ', title: 'AUT0030 오브젝트 관리' },
      },
      {
        path: 'admin/aut0040',
        name: 'AUT0040',
        component: () => import('@/pages/admin/Placeholder.vue'),
        meta: { requiresAuth: true, objectId: 'AUT0040', menuId: '', title: 'AUT0040 권한 관리' },
      },
      {
        path: 'admin/aut0050',
        name: 'AUT0050',
        component: () => import('@/pages/admin/Placeholder.vue'),
        meta: { requiresAuth: true, objectId: 'AUT0050', menuId: '', title: 'AUT0050 메뉴 관리' },
      },
      {
        path: 'admin/frm0090',
        name: 'FRM0090',
        component: () => import('@/pages/admin/Placeholder.vue'),
        meta: { requiresAuth: true, objectId: 'FRM0090', menuId: 'SD_PDS', title: 'FRM0090 파일자료실' },
      },
    ],
  },

  // ── catch-all ──
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
  const menuId = to.meta?.menuId || '';
  menu.setCurrentMenu(menuId);
});

export default router;
