<script setup>
/**
 * EntityCatalog — IST0020 엔터티관리 (admin lane 카탈로그).
 * ★ (2026-06-03, dspark): GET /api/admin/meta/entities (직접 REST).
 *   상세 확장: ?expand=mappings,services. columns 는 항상 포함.
 */
import { computed, onMounted, ref } from 'vue';
import { adminApi } from '@/services/adminApi';
import { usePagedList } from '@/composables/usePagedList';
import { useCatalogFilter } from '@/composables/useCatalogFilter';
import { useToast } from '@/composables/useToast';

import CatalogPage from '@/components/feature/admin/CatalogPage.vue';

import InSearchField from '@/components/ui/InSearchField.vue';
import InSelect from '@/components/ui/InSelect.vue';
import InButton from '@/components/ui/InButton.vue';
import InTag from '@/components/ui/InTag.vue';
import InModal from '@/components/ui/InModal.vue';
import InTabs from '@/components/ui/InTabs.vue';

const toast = useToast();

const list = usePagedList({
  fetcher: adminApi.meta.entities.list,
  initialSize: 50,
  initialFilter: { q: '', historyTypeCd: '', logYn: '', unitCd: '' },
  defaultSort: ['entity_nm,asc'],
  syncUrl: true,
});

// ★ (2026-06-04, dspark): useCatalogFilter composable 사용.
const { staged, applyFilter, resetFilter, removeFilter } = useCatalogFilter({
  list,
  initial: { q: '', historyTypeCd: '', logYn: '', unitCd: '' },
});
function onSearch(v) { staged.value.q = v; }
function onLog(v) { staged.value.logYn = v; }

const ynOptions = [
  { value: '',  label: '전체' },
  { value: 'Y', label: 'Y' },
  { value: 'N', label: 'N' },
];

const activeFilters = computed(() => {
  const f = list.filter.value;
  const out = [];
  if (f.q) out.push({ key: 'q', label: `검색: ${f.q}` });
  if (f.historyTypeCd) out.push({ key: 'historyTypeCd', label: `history: ${f.historyTypeCd}` });
  if (f.logYn) out.push({ key: 'logYn', label: `log: ${f.logYn}` });
  if (f.unitCd) out.push({ key: 'unitCd', label: `unit: ${f.unitCd}` });
  return out;
});
// removeFilter 는 useCatalogFilter 가 제공

const columns = [
  { field: 'entityNm',    label: '테이블명',  sortable: true, sortKey: 'entity_nm', width: 220 },
  { field: 'displayNm',   label: '한글명',    sortable: true, sortKey: 'display_nm' },
  { field: 'historyTypeCd',label: 'History', sortable: true, sortKey: 'history_type_cd', align: 'center', width: 100 },
  { field: 'logYn',       label: 'Log',       sortable: true, sortKey: 'log_yn',  align: 'center', width: 60 },
  { field: 'unitCd',      label: 'Unit',      sortable: true, sortKey: 'unit_cd', width: 100 },
  { field: 'columnCount', label: '컬럼수',    align: 'right', width: 80 },
];

const selected = ref(null);
const detail = ref(null);
const detailLoading = ref(false);
const drawerTab = ref('columns');

async function openDetail(row) {
  selected.value = row;
  detail.value = null;
  detailLoading.value = true;
  try {
    detail.value = await adminApi.meta.entities.detail(row.entityNm, { expand: ['mappings', 'services'] });
    drawerTab.value = 'columns';
  } catch (e) {
    toast.error?.(e?.message || '상세 조회 실패');
  } finally { detailLoading.value = false; }
}
function closeDetail() { selected.value = null; detail.value = null; }
function copyJson(obj) {
  navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
  toast.success?.('JSON 복사됨');
}

onMounted(() => list.reload());
</script>

<template>
  <CatalogPage
    title="엔터티 관리"
    :subtitle="`FRM_ENTITY · 운영 ` + (list.total.value || 0).toLocaleString() + `건`"
    :list="list"
    :columns="columns"
    row-key="entityNm"
    :active-filters="activeFilters"
    :selected-row="selected"
    @row-click="openDetail"
    @filter-remove="removeFilter"
    @retry="list.reload()"
  >
    <template #filters>
      <!-- ★ (2026-06-03, dspark): 한 줄 배치 + vertical layout. -->
      <div class="e-filters">
        <InSearchField
          :model-value="staged.q"
          label="검색"
          input="테이블명 prefix — 예: PHM_ (Enter 또는 [조회] 버튼)"
          layout="vertical"
          @update:model-value="onSearch"
          @search="applyFilter"
        />
        <InSelect
          :model-value="staged.logYn"
          :options="ynOptions"
          label="Log"
          input="전체"
          layout="vertical"
          size="sm"
          @update:model-value="onLog"
        />
        <InButton class="e-filters__search-btn" variant="primary" size="md" :left-icon-show="false" :right-icon-show="false" @click="applyFilter">조회</InButton>
        <InButton class="e-filters__reset-btn" variant="default" size="md" :left-icon-show="false" :right-icon-show="false" @click="resetFilter">초기화</InButton>
      </div>
    </template>

    <template #cell-entityNm="{ value }"><strong>{{ value }}</strong></template>
    <template #cell-logYn="{ value }">
      <InTag v-if="value === 'Y'" label="Y" variant="success" size="sm" />
      <span v-else class="muted">N</span>
    </template>

    <template #drawer>
      <InModal
        v-if="selected"
        :model-value="!!selected"
        :title="`엔터티 상세 — ${selected.entityNm}`"
        type="detail"
        :width="900"
        @update:model-value="(v) => { if (!v) closeDetail(); }"
      >
        <div v-if="detailLoading" class="loading">상세 조회 중…</div>
        <div v-else-if="detail">
          <div class="head"><InButton size="sm" variant="text" @click="copyJson(detail)">📋 JSON 복사</InButton></div>
          <InTabs v-model="drawerTab" :items="[
            { name: 'columns', tabLabel: `컬럼 (${detail.columns?.length || 0})` },
            { name: 'def',     tabLabel: '정의' },
            { name: 'usages',  tabLabel: `사용처 (${detail.usages?.length || 0})` },
          ]" />

          <section v-if="drawerTab === 'def'" class="section">
            <dl class="kv">
              <dt>테이블명</dt><dd>{{ detail.def.entityNm }}</dd>
              <dt>한글명</dt><dd>{{ detail.def.displayNm || '—' }}</dd>
              <dt>History</dt><dd>{{ detail.def.historyTypeCd || '—' }}</dd>
              <dt>Log</dt><dd>{{ detail.def.logYn }}</dd>
              <dt>Unit / Creator</dt><dd>{{ detail.def.unitCd || '—' }} / {{ detail.def.creatorCd || '—' }}</dd>
            </dl>
          </section>

          <section v-else-if="drawerTab === 'columns'" class="section">
            <ul class="resource-list">
              <li v-for="c in detail.columns" :key="c.columnId" class="col-row">
                <InTag v-if="c.keyYn === 'Y'" label="PK" variant="error" size="sm" />
                <code>{{ c.columnNm }}</code>
                <span class="muted">{{ c.displayNm || '' }}</span>
                <InTag v-if="c.useAutoInsertYn === 'Y'" label="+ins" variant="brand" size="sm" />
                <InTag v-if="c.useAutoUpdateYn === 'Y'" label="+upd" variant="warning" size="sm" />
                <InTag v-if="c.startDateColYn === 'Y'" label="시작일" size="sm" />
                <InTag v-if="c.endDateColYn === 'Y'" label="종료일" size="sm" />
                <code v-if="c.autoInsertValue" class="auto-val">ins: {{ c.autoInsertValue }}</code>
                <code v-if="c.autoUpdateValue" class="auto-val">upd: {{ c.autoUpdateValue }}</code>
                <details v-if="c.mappings?.length" class="mappings">
                  <summary>매핑 {{ c.mappings.length }}건</summary>
                  <ul>
                    <li v-for="m in c.mappings" :key="m.columnMappingId">
                      → {{ m.targetObjectNm }}.{{ m.targetColumnNm }} <span class="muted">({{ m.targetObjectTypeCd }})</span>
                    </li>
                  </ul>
                </details>
              </li>
            </ul>
          </section>

          <section v-else-if="drawerTab === 'usages'" class="section">
            <p class="muted">이 엔터티를 사용하는 서비스 (MultiSaveCommand)</p>
            <ul class="resource-list">
              <li v-for="u in detail.usages" :key="u.svDefId">
                <code>{{ u.svDefNm }}</code>
                <span class="muted">{{ (u.cmdClassNm || '').split('.').pop() }}</span>
              </li>
              <li v-if="!detail.usages?.length" class="muted">사용처 없음</li>
            </ul>
          </section>
        </div>
      </InModal>
    </template>
  </CatalogPage>
</template>

<style scoped>
/* ★ (2026-06-03, dspark): 검색 + 콤보 한 줄 배치. */
.e-filters { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; }
.e-filters > :deep(.in-sf) { flex: 1 1 320px; min-width: 280px; }
.e-filters > :deep(.in-sel) { flex: 0 0 200px; }
.e-filters__search-btn, .e-filters__reset-btn { flex: 0 0 auto; align-self: flex-end; }
.muted { color: var(--in-text-subtle); }
.loading { padding: 32px; text-align: center; color: var(--in-text-subtle); }
.head { display: flex; gap: 8px; margin-bottom: 12px; }
.section { padding: 12px 4px; }
.kv { display: grid; grid-template-columns: 110px 1fr; gap: 8px 12px; margin: 0; }
.kv dt { color: var(--in-text-subtle); font-size: var(--in-font-size-sm); }
.kv dd { margin: 0; word-break: break-all; }
.resource-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.resource-list li {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  padding: 8px 10px;
  background: var(--in-bg-default);
  border-radius: var(--in-radius-xs);
}
.resource-list code {
  font-family: var(--in-font-family-mono, ui-monospace);
  font-size: var(--in-font-size-sm);
}
.auto-val {
  background: var(--in-bg-white);
  padding: 1px 6px;
  border-radius: var(--in-radius-xxs);
  border: 1px solid var(--in-border-default);
}
.mappings { flex-basis: 100%; margin-top: 6px; }
.mappings summary { cursor: pointer; color: var(--in-text-subtle); font-size: var(--in-font-size-sm); }
.mappings ul { list-style: none; padding: 6px 0 0 16px; margin: 0; }
.mappings li { padding: 2px 0; font-size: var(--in-font-size-sm); }
</style>
