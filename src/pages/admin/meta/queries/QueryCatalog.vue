<script setup>
/**
 * QueryCatalog — IST0010 SQL관리 (admin lane 카탈로그).
 * ★ (2026-06-03, dspark): GET /api/admin/meta/queries (직접 REST).
 *   상세 확장: ?expand=body,params,services — 본문/파라미터/역방향(이 SQL 호출 서비스).
 */
import { computed, onMounted, ref } from 'vue';
import { adminApi } from '@/services/adminApi';
import { usePagedList } from '@/composables/usePagedList';
import { useToast } from '@/composables/useToast';

import CatalogPage from '@/components/feature/admin/CatalogPage.vue';
import HealthDot from '@/components/feature/admin/HealthDot.vue';

import InSearchField from '@/components/ui/InSearchField.vue';
import InSelect from '@/components/ui/InSelect.vue';
import InButton from '@/components/ui/InButton.vue';
import InTag from '@/components/ui/InTag.vue';
import InModal from '@/components/ui/InModal.vue';
import InTabs from '@/components/ui/InTabs.vue';

const toast = useToast();

const list = usePagedList({
  fetcher: adminApi.meta.queries.list,
  initialSize: 50,
  initialFilter: { q: '', dataSource: '', useYn: '', status: '' },
  defaultSort: ['query_name,asc'],
  syncUrl: true,
});

function onSearch(v) { list.setFilter({ q: v }); }
function onDs(v) { list.setFilter({ dataSource: v }, { debounce: false }); }
function onUseYn(v) { list.setFilter({ useYn: v }, { debounce: false }); }

const ynOptions = [
  { value: '',  label: '전체' },
  { value: 'Y', label: 'Y' },
  { value: 'N', label: 'N' },
];

const activeFilters = computed(() => {
  const f = list.filter.value;
  const out = [];
  if (f.q) out.push({ key: 'q', label: `검색: ${f.q}` });
  if (f.dataSource) out.push({ key: 'dataSource', label: `DS: ${f.dataSource}` });
  if (f.useYn) out.push({ key: 'useYn', label: `use: ${f.useYn}` });
  if (f.status) out.push({ key: 'status', label: `status: ${f.status}` });
  return out;
});
function removeFilter(key) { list.setFilter({ [key]: '' }, { debounce: false }); }

const columns = [
  { field: 'queryName',   label: 'SQL 이름', sortable: true, sortKey: 'query_name', width: 260 },
  { field: 'displayName', label: '한글명',   sortable: true, sortKey: 'display_name' },
  { field: 'dataSource',  label: 'DataSource', sortable: true, sortKey: 'data_source', width: 140 },
  { field: 'useYn',       label: 'Use',      sortable: true, sortKey: 'use_yn',  align: 'center', width: 60 },
  { field: 'status',      label: 'Status',   sortable: true, sortKey: 'status',  align: 'center', width: 100 },
  { field: 'version',     label: 'Ver',      sortable: true, sortKey: 'version', align: 'center', width: 60 },
];

// 상세
const selected = ref(null);
const detail = ref(null);
const detailLoading = ref(false);
const drawerTab = ref('def');

async function openDetail(row) {
  selected.value = row;
  detail.value = null;
  detailLoading.value = true;
  try {
    detail.value = await adminApi.meta.queries.detail(row.queryName, { expand: ['body', 'params', 'services'] });
    drawerTab.value = 'def';
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
    title="SQL 관리"
    :subtitle="`FRM_QUERY_DEF · 운영 ` + (list.total.value || 0).toLocaleString() + `건`"
    :list="list"
    :columns="columns"
    row-key="queryName"
    :active-filters="activeFilters"
    :selected-row="selected"
    @row-click="openDetail"
    @filter-remove="removeFilter"
    @retry="list.reload()"
  >
    <template #filters>
      <!-- ★ (2026-06-03, dspark): 한 줄 배치 + vertical layout + 명시 [조회]/[초기화] 버튼. -->
      <div class="q-filters">
        <InSearchField
          :model-value="list.filter.value.q"
          label="검색"
          input="SQL 이름 prefix — 예: IST0050 (Enter 또는 [조회] 버튼)"
          layout="vertical"
          @update:model-value="onSearch"
          @search="onSearch"
        />
        <InSelect
          :model-value="list.filter.value.dataSource"
          :options="[{value:'',label:'전체 DS'}, {value:'jdbc/h5prd',label:'jdbc/h5prd'}]"
          label="DataSource"
          input="전체"
          layout="vertical"
          size="sm"
          @update:model-value="onDs"
        />
        <InSelect
          :model-value="list.filter.value.useYn"
          :options="ynOptions"
          label="Use"
          input="전체"
          layout="vertical"
          size="sm"
          @update:model-value="onUseYn"
        />
        <InButton class="q-filters__search-btn" variant="primary" size="md" :left-icon-show="false" :right-icon-show="false" @click="list.reload()">조회</InButton>
        <InButton class="q-filters__reset-btn" variant="default" size="md" :left-icon-show="false" :right-icon-show="false" @click="list.resetFilter()">초기화</InButton>
      </div>
    </template>

    <template #cell-queryName="{ value }">
      <strong>{{ value }}</strong>
    </template>
    <template #cell-useYn="{ value }">
      <InTag v-if="value === 'Y'" label="Y" variant="success" size="sm" />
      <span v-else class="muted">N</span>
    </template>

    <template #drawer>
      <InModal
        v-if="selected"
        :model-value="!!selected"
        :title="`SQL 상세 — ${selected.queryName}`"
        type="detail"
        :width="900"
        @update:model-value="(v) => { if (!v) closeDetail(); }"
      >
        <div v-if="detailLoading" class="loading">상세 조회 중…</div>
        <div v-else-if="detail">
          <div class="head"><InButton size="sm" variant="text" @click="copyJson(detail)">📋 JSON 복사</InButton></div>
          <InTabs v-model="drawerTab" :items="[
            { name: 'def',    tabLabel: '정의' },
            { name: 'body',   tabLabel: 'SQL 본문' },
            { name: 'params', tabLabel: `파라미터 (${detail.params?.length || 0})` },
            { name: 'usages', tabLabel: `사용처 (${detail.usages?.length || 0})` },
          ]" />

          <section v-if="drawerTab === 'def'" class="section">
            <dl class="kv">
              <dt>SQL 이름</dt><dd>{{ detail.def.queryName }}</dd>
              <dt>한글명</dt><dd>{{ detail.def.displayName || '—' }}</dd>
              <dt>DataSource</dt><dd>{{ detail.def.dataSource }}</dd>
              <dt>use / status / ver</dt>
              <dd>{{ detail.def.useYn }} / {{ detail.def.status }} / {{ detail.def.version || '—' }}</dd>
              <dt>권한</dt><dd>biz: {{ detail.def.bizAuthYn || '—' }} · org: {{ detail.def.orgAuthYn || '—' }}</dd>
              <dt>decorators</dt><dd>{{ detail.def.decorators || '—' }}</dd>
            </dl>
          </section>

          <section v-else-if="drawerTab === 'body'" class="section">
            <pre class="body">{{ detail.body || '본문 없음' }}</pre>
          </section>

          <section v-else-if="drawerTab === 'params'" class="section">
            <ul class="resource-list">
              <li v-for="p in detail.params" :key="p.queryParamId">
                <InTag :label="p.queryParamInoutType" size="sm" />
                <code>:{{ p.queryParamName }}</code>
                <span class="muted">type: {{ p.queryParamType }}</span>
                <span class="muted">seq: {{ p.queryParamSeq }}</span>
              </li>
              <li v-if="!detail.params?.length" class="muted">파라미터 없음</li>
            </ul>
          </section>

          <section v-else-if="drawerTab === 'usages'" class="section">
            <p class="muted">이 SQL 을 호출하는 서비스 (FRM_SERVICE_FUNC_MAP 역방향)</p>
            <ul class="resource-list">
              <li v-for="u in detail.usages" :key="u.svDefId">
                <InTag :label="u.svMapTypeCd" variant="brand" size="sm" />
                <code>{{ u.svDefNm }}</code>
                <span class="muted">{{ shortCmd(u.cmdClassNm) }}</span>
              </li>
              <li v-if="!detail.usages?.length" class="muted">사용처 없음</li>
            </ul>
          </section>
        </div>
      </InModal>
    </template>
  </CatalogPage>
</template>

<script>
export function shortCmd(fqcn) { return fqcn ? fqcn.split('.').pop() : ''; }
</script>

<style scoped>
/* ★ (2026-06-03, dspark): 검색 + 콤보 한 줄 배치. */
.q-filters { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; }
.q-filters > :deep(.in-sf) { flex: 1 1 320px; min-width: 280px; }
.q-filters > :deep(.in-sel) { flex: 0 0 200px; }
.q-filters__search-btn, .q-filters__reset-btn { flex: 0 0 auto; align-self: flex-end; }
.muted { color: var(--in-text-subtle); }
.loading { padding: 32px; text-align: center; color: var(--in-text-subtle); }
.head { display: flex; gap: 8px; margin-bottom: 12px; }
.section { padding: 12px 4px; }
.kv { display: grid; grid-template-columns: 110px 1fr; gap: 8px 12px; margin: 0; }
.kv dt { color: var(--in-text-subtle); font-size: var(--in-font-size-sm); }
.kv dd { margin: 0; color: var(--in-text-default); word-break: break-all; }
.body {
  margin: 0;
  padding: 12px;
  background: var(--in-bg-default);
  border-radius: var(--in-radius-xs);
  font-family: var(--in-font-family-mono, ui-monospace);
  font-size: var(--in-font-size-sm);
  line-height: var(--in-line-height-sm);
  color: var(--in-text-accent);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 60vh;
  overflow: auto;
}
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
  color: var(--in-text-default);
}
</style>
