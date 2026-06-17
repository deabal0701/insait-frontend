// ★ (2026-06-17, dspark): 조직(ORM) 업무도메인 라우트 — Phase 1 인사 비결재 첫 도메인.
//   route name = OBJECT_ID (ORM9999) → 동적 LNB(InLNBSubmenu)가 router.hasRoute(object_id)
//   로 서버 메뉴 leaf 를 이 화면에 자동 연결 (services/menuApi + MainLayout.onClick3depth 정합).
//   envelope 차선(보존 /serviceBroker.h5) — admin 직접 REST 와 무관.
const orgRoutes = [
  {
    path: 'org/biz-site',
    name: 'ORM9999',
    component: () => import('@/pages/org/BizSiteManage.vue'),
    meta: { requiresAuth: true, title: '사업장관리', menuId: 'ORM9999' },
  },
];

export default orgRoutes;
