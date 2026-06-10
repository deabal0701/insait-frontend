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
      // ★ (2026-06-02, dspark): Grid 기능 카탈로그 — dev 테스트(IBSheet 형태별 tui-grid + 실서비스 TST0002).
      //   LNB 시스템관리 > Playground. 운영 메뉴 분리 정책 (admin/도메인 routes 와 격리).
      //   ★ 별도 Playground 허브·Grid 페이지 폐지 → 카탈로그 단일화 (실서비스 그리드는 카탈로그 탭으로 통합).
      { path: 'dev', redirect: { name: 'DevGridGallery' } },
      {
        path: 'dev/grid-gallery',
        name: 'DevGridGallery',
        component: () => import('@/pages/dev/GridGallery.vue'),
        meta: { requiresAuth: true, title: 'Grid 기능 카탈로그 (dev)' },
      },
       {
        path: 'dev/grid-test-page',
        name: 'DevTestGridPage',
        component: () => import('@/pages/dev/TestGridPage.vue'),
        meta: { requiresAuth: true, title: 'Grid 테스트' },
      }
      // TODO(Phase 1B+): ...phmRoutes, ...payRoutes, ...dtsRoutes, ...elaRoutes
    ],
  },
];

export default routes;
