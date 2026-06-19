// ★ (2026-06-19, dspark): orm 모듈(조직관리) 업무도메인 라우트 — 마이그레이션 검증 1번 케이스.
//   route name = AS-IS 조직도 오브젝트 'ORM0002' (h5on 화면ID RD002 폐기 — 우리 오브젝트 아님).
//   메뉴 연결: 하드코딩 h5on 메뉴 항목(key h5on:RD002)에 route:'ORM0002' 부여 → MainLayout.onClick3depth 가 child.route 로 이동.
//   데이터 = 보존 envelope(/serviceBroker.h5): 트리 ORM0010_00_R01 · 조직인원 ORM0040_01_R01.
//   상세 명세·도움말 = h5-saas-docs/10-myjob/02-study/asis-insait/captures/인사기본_조직도.md
const ormRoutes = [
  {
    // 인사기본 > 조직관리 > 조직도 — AS-IS 오브젝트 ORM0002 (조직도). 트리=ORM0010_00_R01, 인원=ORM0040_01_R01.
    path: 'orm/org-chart',
    name: 'ORM0002',
    component: () => import('@/pages/orm/ORM0002.vue'),
    meta: { requiresAuth: true, title: '조직도', menuId: 'ORM0002', objInfo: '조직도 · ORM0002 (트리 ORM0010_00_R01)' },
  },
];

export default ormRoutes;
