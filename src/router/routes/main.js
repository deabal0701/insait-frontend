// ★ (2026-05-27, dspark): 인증 후 메인 라우트 — MainLayout (InLNB + content) 안에
//   Dashboard + 도메인 children 을 nesting. 도메인별 children 은 각 도메인 모듈에서 import.
import adminRoutes from './admin';

const routes = [
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('@/pages/DashboardPage.vue'),
        meta: { requiresAuth: true, title: '대시보드' },
      },
      ...adminRoutes,
      // TODO(Phase 1B+): ...phmRoutes, ...payRoutes, ...dtsRoutes, ...elaRoutes
    ],
  },
];

export default routes;
