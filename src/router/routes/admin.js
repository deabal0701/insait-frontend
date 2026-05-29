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
  MetaHub:            () => import('@/pages/admin/meta/MetaHub.vue'),
  NewScreenWizard:    () => import('@/pages/admin/meta/NewScreenWizard.vue'),
  ServiceCatalog:     () => import('@/pages/admin/services/ServiceCatalog.vue'),
  ServiceTester:      () => import('@/pages/admin/services/ServiceTester.vue'),
  // P4~P6 진입 시 정식 화면 추가:
  // CCD0020: () => import('@/pages/admin/CCD0020.vue'),
  // IST0050: () => import('@/pages/admin/IST0050.vue'),
  // ...
};

const ADMIN_SCREENS = [
  { object: 'CCD0020', path: 'ccd0020', menuId: '',         title: 'CCD0020 공통코드',     view: 'CCD0020Placeholder' },
  { object: 'IST0010', path: 'ist0010', menuId: 'SD_SQL',   title: 'IST0010 SQL 관리',    view: 'Placeholder' },
  { object: 'IST0020', path: 'ist0020', menuId: '',         title: 'IST0020 엔터티 관리',  view: 'Placeholder' },
  { object: 'IST0030', path: 'ist0030', menuId: 'SD_MSG',   title: 'IST0030 메시지 관리',  view: 'Placeholder' },
  { object: 'IST0050', path: 'ist0050', menuId: 'SD_MSG1',  title: 'IST0050 서비스 카탈로그', view: 'ServiceCatalog' },
  { object: 'AUT0030', path: 'aut0030', menuId: 'SD_OBJ',   title: 'AUT0030 오브젝트 관리', view: 'Placeholder' },
  { object: 'AUT0040', path: 'aut0040', menuId: '',         title: 'AUT0040 권한 관리',    view: 'Placeholder' },
  { object: 'AUT0050', path: 'aut0050', menuId: '',         title: 'AUT0050 메뉴 관리',    view: 'Placeholder' },
  { object: 'FRM0090', path: 'frm0090', menuId: 'SD_PDS',   title: 'FRM0090 파일자료실',   view: 'Placeholder' },
  { object: 'SETTINGS', path: 'settings', menuId: '',       title: '환경 설정',            view: 'SettingsPage' },
  { object: 'COMPONENTS', path: 'components', menuId: '',   title: '컴포넌트 카탈로그',     view: 'ComponentsCatalog' },
  { object: 'META_HUB',  path: 'meta',       menuId: '',    title: '메타관리',                  view: 'MetaHub' },
  { object: 'META_NEW',  path: 'meta/new',   menuId: '',    title: '메타관리 — 신규 화면 마법사', view: 'NewScreenWizard' },
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
  {
    path: 'admin/services/test',
    name: 'SERVICE_TESTER_HOME',
    component: VIEWS.ServiceTester,
    meta: { requiresAuth: true, objectId: 'SERVICE_TESTER', menuId: '', title: '서비스 테스터' },
  },
  {
    path: 'admin/services/test/:serviceId',
    name: 'SERVICE_TESTER',
    component: VIEWS.ServiceTester,
    meta: { requiresAuth: true, objectId: 'SERVICE_TESTER', menuId: '', title: '서비스 테스터' },
  },
);

export default routes;
