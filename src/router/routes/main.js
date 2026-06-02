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
      // ★ (2026-06-02, dspark): Playground 허브 — dev 테스트 카탈로그. LNB 시스템관리 > Playground.
      {
        path: 'dev',
        name: 'DevPlaygroundHub',
        component: () => import('@/pages/dev/PlaygroundHub.vue'),
        meta: { requiresAuth: true, title: 'Playground (dev)' },
      },
      // ★ (2026-06-02, dspark): dev playground — Grid 테스트(InDataTable self-managed · TST0002).
      //   허브(/dev)에서 진입. 운영 메뉴 분리 정책 (admin/도메인 routes 와 격리).
      {
        path: 'dev/grid',
        name: 'DevGridPlayground',
        component: () => import('@/pages/dev/GridPlayground.vue'),
        meta: { requiresAuth: true, title: 'Grid Playground (dev)' },
      }
      // TODO(Phase 1B+): ...phmRoutes, ...payRoutes, ...dtsRoutes, ...elaRoutes
    ],
  },
];

export default routes;
