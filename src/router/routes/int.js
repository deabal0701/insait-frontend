// ★ (2026-06-17, dspark): int 모듈(AS-IS webapp/int/web/) 업무도메인 라우트 — Phase 1 인사 비결재 첫 도메인.
//   파일·폴더는 AS-IS JSP 기준(int_y19_0001.jsp → pages/int/int_y19_0001.vue)으로 1:1 추적.
//   route name = OBJECT_ID (ORM9999) → 동적 LNB(InLNBSubmenu)가 router.hasRoute(object_id)
//   로 서버 메뉴 leaf 를 이 화면에 자동 연결 (services/menuApi + MainLayout.onClick3depth 정합).
//   envelope 차선(보존 /serviceBroker.h5) — admin 직접 REST 와 무관.
const intRoutes = [
  {
    // 사업장관리 — AS-IS int_y19_0001.jsp (OBJECT_ID ORM9999)
    path: 'int/biz-site',
    name: 'ORM9999',
    component: () => import('@/pages/int/int_y19_0001.vue'),
    // ★ (2026-06-18, dspark): objInfo = 상단바 제목 옆 식별정보(페이지 본문 헤더 제거 → 상단 이전).
    meta: { requiresAuth: true, title: '사업장관리', menuId: 'ORM9999', objInfo: 'ORM9999 · envelope INT_Y19_0001' },
  },
];

export default intRoutes;
