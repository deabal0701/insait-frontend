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
      // ★ (2026-05-28, dspark): dev playground — LNB 노출 X, URL /dev/grid 직접 진입.
      //   InDataTable + tui-grid 시연. 운영 메뉴 분리 정책 (admin/도메인 routes 와 격리).
      {
        path: 'dev/grid',
        name: 'DevGridPlayground',
        component: () => import('@/pages/dev/GridPlayground.vue'),
        meta: { requiresAuth: true, title: 'Grid Playground (dev)' },
      },
      {
        path: 'dev/grid2',
        name: 'DevGridPlayground2',
        component: () => import('@/pages/dev/GridPlayground2.vue'),
        meta: { requireAuth: true, title: 'Grid Playground(dev)'}

      },
      // ★ (2026-06-02, dspark): [옵션 1] controlled vs self-managed 모드 비교 + TST0002 실배선.
      {
        path: 'dev/grid3',
        name: 'DevGridPlayground3',
        component: () => import('@/pages/dev/GridPlayground3.vue'),
        meta: { requiresAuth: true, title: 'Grid 모드 비교 (TST0002)' },
      }
      // TODO(Phase 1B+): ...phmRoutes, ...payRoutes, ...dtsRoutes, ...elaRoutes
    ],
  },
];

export default routes;
