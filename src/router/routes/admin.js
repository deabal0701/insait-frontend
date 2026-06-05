// ★ (2026-05-27, dspark): 시스템관리(admin) 9 화면 라우트 모듈 — 가이드 09_router-auth §3 정합.
//   path = '/admin/{object_id_lower}', name = OBJECT_ID (대문자 그대로),
//   meta = { requiresAuth, objectId, menuId, title }.
//   ★ 2026-05-27 보강: dynamic import 의 path 를 정적 매핑으로 변경 (Vite 의 dependency
//   분석을 안정화. 본격 화면 작성 시 VIEWS 에서 placeholder → 정식 컴포넌트 swap).
const VIEWS = {
  Placeholder:        () => import('@/pages/admin/Placeholder.vue'),
  CCD0020Placeholder: () => import('@/pages/admin/CCD0020Placeholder.vue'),
  SettingsPage:       () => import('@/pages/admin/SettingsPage.vue'),
  ComponentsCatalog:  () => import('@/pages/admin/ComponentsCatalogPage.vue'),
  ServiceCatalog:     () => import('@/pages/admin/services/ServiceCatalog.vue'),
  ServiceTester:      () => import('@/pages/admin/services/ServiceTester.vue'),
  // ★ (2026-06-03, dspark): 04-admin-lane 직접 REST 카탈로그 4 신규
  QueryCatalog:       () => import('@/pages/admin/meta/queries/QueryCatalog.vue'),
  MessageCatalog:     () => import('@/pages/admin/meta/messages/MessageCatalog.vue'),
  EntityCatalog:      () => import('@/pages/admin/meta/entities/EntityCatalog.vue'),
  ObjectCatalog:      () => import('@/pages/admin/meta/objects/ObjectCatalog.vue'),
  // ★ (2026-06-05, dspark): 메타 등록→envelope 조회 종단(E2E) 검증 데모.
  E2ETest:            () => import('@/pages/admin/meta/E2ETest.vue'),
  // P4~P6 진입 시 정식 화면 추가:
  // CCD0020: () => import('@/pages/admin/CCD0020.vue'),
  // IST0050: () => import('@/pages/admin/IST0050.vue'),
  // ...
};

const ADMIN_SCREENS = [
  { object: 'CCD0020', path: 'ccd0020', menuId: '',         title: 'CCD0020 공통코드',     view: 'CCD0020Placeholder' },
  { object: 'IST0010', path: 'ist0010', menuId: 'SD_SQL',   title: 'IST0010 SQL 관리',    view: 'QueryCatalog' },
  { object: 'IST0020', path: 'ist0020', menuId: '',         title: 'IST0020 엔터티 관리',  view: 'EntityCatalog' },
  { object: 'IST0030', path: 'ist0030', menuId: 'SD_MSG',   title: 'IST0030 메시지 관리',  view: 'MessageCatalog' },
  { object: 'IST0050', path: 'ist0050', menuId: 'SD_MSG1',  title: 'IST0050 서비스 카탈로그', view: 'ServiceCatalog' },
  { object: 'AUT0030', path: 'aut0030', menuId: 'SD_OBJ',   title: 'AUT0030 오브젝트 관리', view: 'ObjectCatalog' },
  { object: 'AUT0040', path: 'aut0040', menuId: '',         title: 'AUT0040 권한 관리',    view: 'Placeholder' },
  { object: 'AUT0050', path: 'aut0050', menuId: '',         title: 'AUT0050 메뉴 관리',    view: 'Placeholder' },
  { object: 'FRM0090', path: 'frm0090', menuId: 'SD_PDS',   title: 'FRM0090 파일자료실',   view: 'Placeholder' },
  { object: 'SETTINGS', path: 'settings', menuId: '',       title: '환경 설정',            view: 'SettingsPage' },
  { object: 'COMPONENTS', path: 'components', menuId: '',   title: '컴포넌트 카탈로그',     view: 'ComponentsCatalog' },
  // ★ (2026-06-04, dspark): META_HUB / META_NEW 라우트 제거 — 순차 등록 (5 카탈로그 편집 CRUD)
  //   완료 후 마법사 재구축 예정. AS-IS 운영 메타 envelope 직접 호출하던 마법사 경로 폐기.
  // ★ (2026-06-03, dspark): admin lane 카탈로그 직접 REST URL (사용자 친화 경로 alias).
  //   기존 OBJECT-ID 기반(/admin/ist0010 등)은 호환 유지하면서 의미 친화 경로 신설.
  { object: 'META_QUERIES',  path: 'meta/queries',  menuId: '', title: 'SQL 관리',         view: 'QueryCatalog' },
  { object: 'META_MESSAGES', path: 'meta/messages', menuId: '', title: '메시지 관리',     view: 'MessageCatalog' },
  { object: 'META_ENTITIES', path: 'meta/entities', menuId: '', title: '엔터티 관리',     view: 'EntityCatalog' },
  { object: 'META_SERVICES', path: 'meta/services', menuId: '', title: '서비스 관리',     view: 'ServiceCatalog' },
  { object: 'META_OBJECTS',  path: 'meta/objects',  menuId: '', title: '오브젝트 관리',   view: 'ObjectCatalog' },
  { object: 'META_E2E',      path: 'meta/e2e',      menuId: '', title: 'E2E 테스트 (등록→조회)', view: 'E2ETest' },
];

const routes = ADMIN_SCREENS.map((s) => ({
  path: `admin/${s.path}`,
  name: s.object,
  component: VIEWS[s.view],
  meta: { requiresAuth: true, objectId: s.object, menuId: s.menuId, title: s.title },
}));

// ★ (2026-05-29, dspark): 서비스 테스터 — optional path param 으로 (param 없이 진입하면 빈 폼).
//   Catalog 에서 행 [▶ 테스트] 클릭 시 router.push({ name: 'SERVICE_TESTER', params: { serviceId } })
routes.push(
  // ★ (2026-06-04, dspark): meta.backTo — banner 의 [<] 버튼이 라우트 fallback 으로 사용.
  {
    path: 'admin/services/test',
    name: 'SERVICE_TESTER_HOME',
    component: VIEWS.ServiceTester,
    meta: { requiresAuth: true, objectId: 'SERVICE_TESTER', menuId: '', title: '서비스 테스터', backTo: 'META_SERVICES' },
  },
  {
    path: 'admin/services/test/:serviceId',
    name: 'SERVICE_TESTER',
    component: VIEWS.ServiceTester,
    meta: { requiresAuth: true, objectId: 'SERVICE_TESTER', menuId: '', title: '서비스 테스터', backTo: 'META_SERVICES' },
  },
);

export default routes;
