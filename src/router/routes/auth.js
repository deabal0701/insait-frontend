// ★ (2026-05-27, dspark): 인증 라우트 모듈 — 가이드 09_router-auth §1.1 정합.
//   /login 및 비인증 접근 가능한 화면. AuthLayout (centered + 워터마크 배경) 안에 nesting.
const routes = [
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
];

export default routes;
