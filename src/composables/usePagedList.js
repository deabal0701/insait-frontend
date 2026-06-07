/**
 * ★ (2026-06-03, dspark): 04-admin-lane 카탈로그 화면 공통 페이징 composable.
 *
 * 책임:
 *  - 페이지/사이즈/필터/정렬 상태 보유 (reactive)
 *  - 조회 함수(adminApi.meta.xxx.list) 호출 + 로딩/에러 처리
 *  - 디바운스 필터 (검색어 입력 시 300ms)
 *  - URL query 동기화 (옵션, 브라우저 뒤로가기/공유 가능)
 *  - InDataTable 의 서버페이징 props 와 직접 연결
 *
 * 사용:
 *   const list = usePagedList({
 *     fetcher: adminApi.meta.services.list,
 *     initialSize: 50,
 *     initialFilter: { q: '', cmdClass: '' },
 *     defaultSort: ['sv_def_nm,asc'],
 *     syncUrl: true,  // route.query 와 동기화
 *   });
 *   onMounted(() => list.reload());
 *
 * 노출 state: rows, total, page, size, filter, sort, loading, error
 * 메서드: reload, setPage, setSize, setFilter, setSort, resetFilter
 */

import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const DEBOUNCE_MS = 300;

export function usePagedList(options) {
  const {
    fetcher,                          // (params) => Promise<{content,page,size,total}>
    initialPage = 1,
    initialSize = 50,
    initialFilter = {},
    defaultSort = [],                 // ['col,asc', 'col2,desc']
    syncUrl = false,                  // route.query 동기화
    extraParams = () => ({}),         // 호출 시 추가 파라미터 (예: expand)
  } = options;

  const route = syncUrl ? useRoute() : null;
  const router = syncUrl ? useRouter() : null;

  // 초기값을 URL query 에서 복원 (있으면)
  const initial = syncUrl ? readFromUrl(route.query, initialFilter, defaultSort, initialPage, initialSize) : null;

  const page = ref(initial?.page ?? initialPage);
  const size = ref(initial?.size ?? initialSize);
  const filter = ref({ ...initialFilter, ...(initial?.filter ?? {}) });
  const sort = ref(initial?.sort ?? [...defaultSort]);

  const rows = ref([]);
  const total = ref(0);
  const loading = ref(false);
  const error = ref(null);

  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / size.value)));

  let debounceTimer = null;
  // ★ (2026-06-07, dspark): 기존 inflightAbort 는 AbortController 가 한 번도 할당되지 않아
  //   abort() 가 죽은 코드였고, 겹친 reload 가 last-response-wins 로 서로 덮어쓰는 경합이 있었음.
  //   fetcher 가 AbortSignal 을 안 받아도 되는 단조 증가 reqSeq 가드로 교체 — 최신 요청 결과만 반영.
  let reqSeq = 0;

  async function reload({ silent = false } = {}) {
    if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
    const myReq = ++reqSeq;

    if (!silent) loading.value = true;
    error.value = null;
    try {
      const params = {
        page: page.value,
        size: size.value,
        sort: sort.value,
        ...stripBlank(filter.value),
        ...extraParams(),
      };
      const data = await fetcher(params);
      if (myReq !== reqSeq) return;            // 더 새로운 요청이 진행 중 — stale 결과 폐기
      rows.value = data?.content ?? [];
      total.value = data?.total ?? 0;
      if (syncUrl) writeToUrl(router, route, page.value, size.value, filter.value, sort.value);
    } catch (e) {
      if (myReq !== reqSeq) return;            // stale 요청의 에러도 무시
      error.value = normalizeError(e);
      rows.value = [];
      total.value = 0;
    } finally {
      if (myReq === reqSeq) loading.value = false; // 최신 요청만 로딩 해제 (이전 요청이 늦게 끝나도 로딩 유지)
    }
  }

  function reloadDebounced() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => reload(), DEBOUNCE_MS);
  }

  function setPage(p) {
    page.value = Math.max(1, Math.min(p, totalPages.value));
    reload();
  }

  function setSize(s) {
    size.value = Math.max(1, Math.min(s, 500));
    page.value = 1;
    reload();
  }

  /** 필터 패치 — 부분 업데이트 + 디바운스. text 입력에는 이거 사용. */
  function setFilter(patch, { debounce = true } = {}) {
    filter.value = { ...filter.value, ...patch };
    page.value = 1;
    if (debounce) reloadDebounced();
    else reload();
  }

  function resetFilter() {
    filter.value = { ...initialFilter };
    page.value = 1;
    reload();
  }

  /** 정렬 — 컬럼 헤더 클릭 시 toggle (asc → desc → 제거). */
  function setSort(col, dir = null) {
    // ★ (2026-06-03, dspark): splice 대신 새 배열 할당 — ref(array) 안의 splice 후 router.replace 시 동일 reference 로 인식되어 URL 동기화 누락되는 사례 회피
    if (dir === null) {
      // toggle: 현재 sort 의 col 항목 찾기
      const idx = sort.value.findIndex((s) => s.startsWith(`${col},`));
      if (idx === -1) {
        sort.value = [`${col},asc`, ...sort.value];
      } else if (sort.value[idx].endsWith(',asc')) {
        const next = [...sort.value];
        next[idx] = `${col},desc`;
        sort.value = next;
      } else {
        sort.value = sort.value.filter((_, i) => i !== idx);
      }
    } else {
      sort.value = [`${col},${dir}`];
    }
    page.value = 1;
    reload();
  }

  function clearSort() {
    sort.value = [...defaultSort];
    reload();
  }

  return {
    // state
    rows, total, page, size, filter, sort, loading, error, totalPages,
    // actions
    reload, reloadDebounced, setPage, setSize, setFilter, resetFilter, setSort, clearSort,
  };
}

// ─── helpers ────────────────────────────────────────────────────────────

function stripBlank(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && v !== undefined && v !== '') out[k] = v;
  }
  return out;
}

function normalizeError(e) {
  if (e?.response?.data?.error) return e.response.data.error; // { code, message }
  if (e?.envelope) return { code: e.resultCode || 'ENVELOPE_ERROR', message: e.message };
  return { code: 'INTERNAL', message: e?.message || String(e) };
}

function readFromUrl(query, initialFilter, defaultSort, initialPage, initialSize) {
  const out = { filter: {}, sort: [...defaultSort] };
  if (query.page) out.page = Number(query.page) || initialPage;
  if (query.size) out.size = Number(query.size) || initialSize;
  if (query.sort) out.sort = Array.isArray(query.sort) ? query.sort : [query.sort];
  for (const k of Object.keys(initialFilter)) {
    if (query[k] !== undefined) out.filter[k] = query[k];
  }
  return out;
}

function writeToUrl(router, route, page, size, filter, sort) {
  const q = { ...route.query };
  q.page = String(page);
  q.size = String(size);
  if (sort && sort.length) q.sort = sort;
  else delete q.sort;
  for (const [k, v] of Object.entries(filter)) {
    if (v === null || v === undefined || v === '') delete q[k];
    else q[k] = String(v);
  }
  router.replace({ path: route.path, query: q }).catch(() => {}); // duplicate route OK
}

export default usePagedList;
