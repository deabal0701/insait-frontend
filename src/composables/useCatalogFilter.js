/**
 * useCatalogFilter — 5 admin 카탈로그 (Service/Message/Query/Entity/Object) 공통 staged filter.
 *
 * ★ (2026-06-04, dspark): 검색 자동조회 해제 정책 (f4a2a6f) — [조회] 버튼 명시 클릭 시에만 fetch.
 *   staged 에만 사용자 입력 보관 → applyFilter() 가 list 에 push.
 *   사용자 피드백: "검색명령 등 입력시에 자동조회 되지 않도록".
 *
 * 패턴 (5 카탈로그 공통):
 *   1) staged ref — 사용자 입력 즉시 반영 (fetch X)
 *   2) applyFilter() — [조회] 클릭 또는 Enter 시 list.setFilter
 *   3) resetFilter() — [초기화] 클릭 시 staged + list 동시 reset
 *   4) removeFilter(key) — chip 제거 시 staged + list 동기 reset
 *
 * Usage:
 *   const { staged, applyFilter, resetFilter, removeFilter } = useCatalogFilter({
 *     list,
 *     initial: { q: '', cmdClass: '', txSupportYn: '', useLogYn: '' },
 *   });
 *   <InSearchField :model-value="staged.q" @update:model-value="v => staged.q = v" @search="applyFilter" />
 *   <InButton @click="applyFilter">조회</InButton>
 *   <InButton @click="resetFilter">초기화</InButton>
 *
 * @param {object} opts
 * @param {object} opts.list - usePagedList 인스턴스
 * @param {object} opts.initial - 필터 초기값 (모든 키 포함 필수, list.initialFilter 와 동일 구조)
 * @returns {{ staged, applyFilter, resetFilter, removeFilter }}
 */
import { computed, ref } from 'vue';

export function useCatalogFilter({ list, initial, chipLabels = {} }) {
  const blank = () => ({ ...initial });
  // 적용된 필터(URL→list.filter)로 staged 초기화 → 새로고침/직접진입 시 검색칸이 현재 필터를 반영.
  const staged = ref({ ...blank(), ...(list?.filter?.value ?? {}) });

  // ★ (2026-06-05) activeFilters 공통화 — 5개 카탈로그 동일 패턴 흡수.
  //   chipLabels = { q: '검색', dataSource: 'DS', ... } (키→칩 라벨 접두). 미지정 키는 키명 사용.
  //   initial 키 순서대로, 값 있는 필터만 칩 생성.
  const activeFilters = computed(() => {
    const f = list?.filter?.value ?? {};
    return Object.keys(initial)
      .filter((k) => f[k])
      .map((k) => ({ key: k, label: `${chipLabels[k] ?? k}: ${f[k]}` }));
  });

  function applyFilter() {
    list.setFilter({ ...staged.value }, { debounce: false });
  }

  function resetFilter() {
    staged.value = blank();
    list.resetFilter();
  }

  function removeFilter(key) {
    staged.value[key] = '';
    list.setFilter({ [key]: '' }, { debounce: false });
  }

  return { staged, activeFilters, applyFilter, resetFilter, removeFilter };
}
