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
  // axios paramsSerializer 가 array → repeat key 자동 (브라우저/axios 기본)
  if (Array.isArray(sort) && sort.length) out.sort = sort;
  for (const [k, v] of Object.entries(filters)) {
    if (v !== null && v !== undefined && v !== '') out[k] = v;
  }
  return out;
}

/** GET … {arg}={value} 형태로 ?expand=msg,query 같은 콤마 파라미터 부착. */
function withExpand(params, expandList) {
  if (!expandList || !expandList.length) return params;
  return { ...params, expand: expandList.join(',') };
}

/** 도메인 1개의 표준 메서드 생성기. extraDetailParams 는 expand 옵션 등. */
function makeDomain(basePath) {
  return {
    list(params = {}) {
      return http.get(basePath, { params: buildListParams(params) });
    },
    detail(key, { expand } = {}) {
      return http.get(`${basePath}/${encodeURIComponent(key)}`, {
        params: expand ? { expand: Array.isArray(expand) ? expand.join(',') : expand } : {},
      });
    },
    // 후속 편집 (Phase 1) 도입 시:
    // create(body) { return http.post(basePath, body); },
    // update(key, body) { return http.put(`${basePath}/${encodeURIComponent(key)}`, body); },
    // remove(key) { return http.delete(`${basePath}/${encodeURIComponent(key)}`); },
  };
}

export const adminApi = {
  meta: {
    services: makeDomain('/api/admin/meta/services'),    // IST0050
    queries:  makeDomain('/api/admin/meta/queries'),     // IST0010 SQL
    messages: makeDomain('/api/admin/meta/messages'),    // IST0030
    entities: makeDomain('/api/admin/meta/entities'),    // IST0020
    objects:  makeDomain('/api/admin/meta/objects'),     // AUT0030
  },
  // access:  { users: ..., roles: ..., menus: ... },   // Phase 1 후속
  // system:  { commonCodes: ..., options: ..., logs: ... },
};

export { buildListParams, withExpand };
export default adminApi;
