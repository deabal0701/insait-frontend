/**
 * ★ (2026-06-03, dspark): 04-admin-lane 직접 REST 어댑터 단일 진입점.
 *
 * envelope (/serviceBroker.h5) 와 완전히 분리된 차선.
 * 응답: { content, page, size, total } | { error: { code, message } }
 * 페이지: 1-based, size 1~500.
 *
 * 설계서: h5-saas-docs/02-tobe/04-admin-lane/dev-tools/04_service-ist0050.md
 * 빌드 워크플로우 순서: SQL → 메시지 → 엔터티 → 서비스 → 오브젝트.
 *
 * 모듈화 의도:
 *  - 도메인별 namespace (queries/messages/entities/services/objects + 향후 access/system)
 *  - 모든 호출이 동일한 시그니처 (list(params) / detail(key, params))
 *  - 후속 편집 진입 시 create/update/delete 추가만 (signature 확장)
 *
 * 호출처:
 *  - composables/usePagedList.js — 모든 카탈로그 화면 공통
 *  - 페이지 직접 호출 (상세 fetch 등)
 */

import http from '@/services/http';

/** sort 파라미터를 ?sort=A&sort=B 형태로 직렬화 (서버 HttpServletRequest raw 보존 패턴 정합). */
function buildListParams({ page, size, sort, ...filters } = {}) {
  const out = {};
  if (page != null) out.page = page;
  if (size != null) out.size = size;
  // ★ (2026-06-03, dspark): axios 1.x default 는 'sort[]=A' (브라켓), 서버는 raw 'sort' 키만 인식.
  //   paramsSerializer: { indexes: null } 로 repeat key (sort=A&sort=B) 직렬화 — list() 에서 옵션 부착.
  if (Array.isArray(sort) && sort.length) out.sort = sort;
  for (const [k, v] of Object.entries(filters)) {
    if (v !== null && v !== undefined && v !== '') out[k] = v;
  }
  return out;
}

// axios 1.x repeat-key 직렬화 (sort=A&sort=B). 브라켓([])회피.
const REPEAT_KEY_SERIALIZER = { indexes: null };

/** GET … {arg}={value} 형태로 ?expand=msg,query 같은 콤마 파라미터 부착. */
function withExpand(params, expandList) {
  if (!expandList || !expandList.length) return params;
  return { ...params, expand: expandList.join(',') };
}

/** 도메인 1개의 표준 메서드 생성기. extraDetailParams 는 expand 옵션 등. */
function makeDomain(basePath) {
  return {
    list(params = {}) {
      return http.get(basePath, { params: buildListParams(params), paramsSerializer: REPEAT_KEY_SERIALIZER });
    },
    detail(key, { expand } = {}) {
      return http.get(`${basePath}/${encodeURIComponent(key)}`, {
        params: expand ? { expand: Array.isArray(expand) ? expand.join(',') : expand } : {},
      });
    },
    // ★ (2026-06-05, dspark): Phase 1 편집 CRUD. 부모+자식 묶음 body 단일 호출.
    //   백엔드: POST/PUT/DELETE/{key}/exists (com.win.insait.admin.meta.* 직접 REST).
    create(body) {
      return http.post(basePath, body);
    },
    update(key, body) {
      return http.put(`${basePath}/${encodeURIComponent(key)}`, body);
    },
    remove(key) {
      return http.delete(`${basePath}/${encodeURIComponent(key)}`);
    },
    exists(key) {
      return http.get(`${basePath}/${encodeURIComponent(key)}/exists`);
    },
  };
}

export const adminApi = {
  meta: {
    services: makeDomain('/api/admin/meta/services'),    // IST0050
    // ★ (2026-06-08, dspark): #3 queries 에 describeColumns 추가 — 등록 SQL 출력 컬럼 자동 추출.
    //   메시지관리(IST0030) RES 메시지 컬럼 자동 채움 소비. GET /api/admin/meta/queries/{name}/columns.
    queries: {
      ...makeDomain('/api/admin/meta/queries'),          // IST0010 SQL
      describeColumns(queryName) {
        return http.get(`/api/admin/meta/queries/${encodeURIComponent(queryName)}/columns`);
      },
    },
    messages: makeDomain('/api/admin/meta/messages'),    // IST0030
    entities: makeDomain('/api/admin/meta/entities'),    // IST0020
    objects:  makeDomain('/api/admin/meta/objects'),     // AUT0030
  },
  // ★ (2026-06-08, dspark): 「사용자와 접근제어」 직접 REST (com.win.insait.admin.access.*).
  //   표준 list/detail/create/update/remove 는 makeDomain. 화면별 비표준 메서드만 확장.
  access: {
    // ★ (2026-06-15, dspark): 현재 로그인 사용자의 권한(역할) 목록 — 상단바 권한 콤보. [{authItemId, authItemName, displayName}]
    myAuths() { return http.get('/api/admin/access/my-auths'); },
    users: {
      ...makeDomain('/api/admin/access/users'),          // AUT0010
      // exists 는 /{key}/exists 가 아니라 ?loginId 쿼리 (백엔드 계약 — login_id 가 업무 유일키, PK 는 userId).
      exists(loginId, companyCd) {
        return http.get('/api/admin/access/users/exists', {
          params: { loginId, ...(companyCd ? { companyCd } : {}) },
        });
      },
      // 비밀번호 초기화 — 랜덤 임시비번 발급 (S2). 응답 { tempPassword, message }.
      passwordReset(userId) {
        return http.post(`/api/admin/access/users/${encodeURIComponent(userId)}/password-reset`);
      },
    },
    // ★ (2026-06-10, dspark): AUT0040 권한 관리 (직접 REST). def + 3종 바인딩(groups/users/menus) rowStatus I/D.
    authItems: {
      ...makeDomain('/api/admin/access/auth-items'),     // AUT0040
      exists(authItemName) {
        return http.get('/api/admin/access/auth-items/exists', { params: { authItemName } });
      },
    },
    // ★ (2026-06-10, dspark): AUT0050 메뉴 — 평면 검색(권한 메뉴바인딩 picker용) + ★ 2026-06-11 lazy 트리 CRUD.
    menus: {
      search(q) { return http.get('/api/admin/access/menus/search', { params: { q } }); },
      // lazy 트리 직계자식 (parentId 미지정 = 루트). menuGroup 필터(SYS_ADMIN/PRIVATE_GROUP).
      children(parentId, menuGroup) {
        return http.get('/api/admin/access/menus', {
          params: { ...(parentId ? { parentId } : {}), ...(menuGroup ? { menuGroup } : {}) },
        });
      },
      detail(menuId) { return http.get(`/api/admin/access/menus/${encodeURIComponent(menuId)}`); },
      exists(menuId) { return http.get('/api/admin/access/menus/exists', { params: { menuId } }); },
      create(payload) { return http.post('/api/admin/access/menus', payload); },
      update(menuId, payload) { return http.put(`/api/admin/access/menus/${encodeURIComponent(menuId)}`, payload); },
      remove(menuId) { return http.delete(`/api/admin/access/menus/${encodeURIComponent(menuId)}`); },
    },
    // ★ (2026-06-10, dspark): AUT0100 외부사용자 관리 (직접 REST). 단일 폼(서브컬렉션 없음).
    //   ★ 응답에 PASSWORD_VIEW(평문)·CTZ_NO 미포함(S1/S3). create/update body = flat(ExtUserWrite). 비번초기화 = 랜덤(S2).
    externalUsers: {
      ...makeDomain('/api/admin/access/external-users'),   // AUT0100
      passwordReset(extUserId) {
        return http.post(`/api/admin/access/external-users/${encodeURIComponent(extUserId)}/password-reset`);
      },
    },
    // ★ (2026-06-10, dspark): AUT0020 사용자그룹 관리 (직접 REST). def + members(rowStatus I/D) 단일 호출.
    userGroups: {
      ...makeDomain('/api/admin/access/user-groups'),    // AUT0020
      // exists 는 /{key}/exists 가 아니라 ?usergroupId 쿼리 (백엔드 계약).
      exists(usergroupId) {
        return http.get('/api/admin/access/user-groups/exists', { params: { usergroupId } });
      },
    },
    // ★ TEMP (2026-06-09, dspark): 발령확정 전 "테스트 계정" 생성/조회/삭제 — 추후 제거. grep 키 "TEMP (2026-06-09".
    //   AS-IS 발령 체인(P_CAM_EMP_NO_CREATE→P_FRM_USER_CREATE) 재사용. 백엔드 com.win.insait.admin.access.user.TestAccount*.
    //   경로 = /api/admin/access/test-accounts (★ /users/{userId} 충돌 회피 위해 분리, 2026-06-09).
    testAccounts: {
      list() { return http.get('/api/admin/access/test-accounts'); },
      create(payload) { return http.post('/api/admin/access/test-accounts', payload || {}); },
      remove(empId) { return http.delete(`/api/admin/access/test-accounts/${encodeURIComponent(empId)}`); },
      removeAll() { return http.delete('/api/admin/access/test-accounts'); },
    },
    // ★ (2026-06-11, dspark): AUT0070 권한기준 관리 (직접 REST). 좌 옵션트리(조회) + 우 직책코드기준 그리드(R/W).
    //   tree = FRM_OPTION_ITEM(AUT_CAM_MANAGE) / grid = FRM_UNIT_STD_HIS(직책→부여권한, mgr 6615127) 동적컬럼+행.
    //   설계: 02-tobe/04-admin-lane/access-control/07_auth-criteria-aut0070.md.
    authCriteria: {
      tree(groupTag, companyCd) {
        return http.get('/api/admin/access/auth-criteria', {
          params: { ...(groupTag ? { groupTag } : {}), ...(companyCd ? { companyCd } : {}) },
        });
      },
      grid(params) {
        return http.get('/api/admin/access/auth-criteria/grid', { params: params || {} });
      },
      saveGrid(body, params) {
        return http.put('/api/admin/access/auth-criteria/grid', body, { params: params || {} });
      },
    },
    // ★ (2026-06-11, dspark): AUT0060 조직권한 관리 (직접 REST). 조직트리(lazy) + 그룹/사원 권한 2그리드.
    //   find/save = org_id 스코프 2 entity(rowStatus I/U/D). orgTree = ORM_ORG lazy. employees = 사원검색 picker.
    //   설계: 02-tobe/04-admin-lane/access-control/04_org-auth-aut0060.md.
    orgAuth: {
      find(orgId, companyCd) {
        return http.get('/api/admin/access/org-auth', {
          params: { orgId, ...(companyCd ? { companyCd } : {}) },
        });
      },
      save(orgId, body, companyCd) {
        return http.put('/api/admin/access/org-auth', body, {
          params: { orgId, ...(companyCd ? { companyCd } : {}) },
        });
      },
      orgTree(parentOrgId, baseYmd) {
        return http.get('/api/admin/access/org-auth/org-tree', {
          params: { ...(parentOrgId != null ? { parentOrgId } : {}), baseYmd },
        });
      },
      employees(q) {
        return http.get('/api/admin/access/org-auth/employees', { params: { q } });
      },
    },
    // 후속: menus (lazy tree)
  },
  // ★ (2026-06-11, dspark): 시스템환경(SYS_ENV) 직접 REST — CCD0040 인사영역 + CCD0010 공통코드.
  system: {
    // 인사영역(FRM_COMPANY) 단일 그리드
    companies: {
      list(q) { return http.get('/api/admin/system/companies', { params: { ...(q ? { q } : {}) } }); },
      save(rows) { return http.put('/api/admin/system/companies', { rows }); },
    },
    // 단위업무(FRM_BIZ_UNIT) 단일 그리드 — 업무기준의 UNIT_CD 마스터
    units: {
      list(q) { return http.get('/api/admin/system/units', { params: { ...(q ? { q } : {}) } }); },
      save(rows) { return http.put('/api/admin/system/units', { rows }); },
    },
    // 공통코드: 코드분류(FRM_CODE_KIND) 마스터 + 코드(FRM_CODE) 디테일
    codeKinds: {
      list(q) { return http.get('/api/admin/system/code-kinds', { params: { ...(q ? { q } : {}) } }); },
      save(rows) { return http.put('/api/admin/system/code-kinds', { rows }); },
      codes(cdKind, params) {
        return http.get(`/api/admin/system/code-kinds/${encodeURIComponent(cdKind)}/codes`, { params: params || {} });
      },
      saveCodes(cdKind, body) {
        return http.put(`/api/admin/system/code-kinds/${encodeURIComponent(cdKind)}/codes`, body);
      },
    },
  },
};

export { buildListParams, withExpand };
export default adminApi;
