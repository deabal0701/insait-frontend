<script setup>
/**
 * ObjectCatalog — AUT0030 오브젝트관리 (admin lane 카탈로그).
 * ★ (2026-06-03, dspark): GET /api/admin/meta/objects (직접 REST).
 *   상세 확장: ?expand=attributes,children. key = OBJECT_NM 또는 OBJECT_ID 숫자.
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
  fetcher: adminApi.meta.objects.list,
  initialSize: 50,
  initialFilter: { q: '', objectType: '', status: '', companyCd: '', hasParent: '' },
  defaultSort: ['object_nm,asc'],
  syncUrl: true,
});

// ★ (2026-06-04, dspark): useCatalogFilter composable 사용.
const { staged, applyFilter, resetFilter, removeFilter } = useCatalogFilter({
  list,
  initial: { q: '', objectType: '', status: '', companyCd: '', hasParent: '' },
});
function onSearch(v) { staged.value.q = v; }
function onType(v) { staged.value.objectType = v; }
function onParent(v) { staged.value.hasParent = v; }

// AUT0030 OBJECT_TYPE 실측 값 (런타임 검증에서 'view' 확인)
const typeOptions = [
  { value: '',          label: '전체 타입' },
  { value: 'view',      label: 'view (메인)' },
  { value: 'popup',     label: 'popup' },
  { value: 'detail',    label: 'detail' },
  { value: 'dialog',    label: 'dialog' },
];
const parentOptions = [
  { value: '',  label: '부모 무관' },
  { value: 'Y', label: '하위 (popup/detail)' },
  { value: 'N', label: '최상위' },
];

const activeFilters = computed(() => {
  const f = list.filter.value;
  const out = [];
  if (f.q) out.push({ key: 'q', label: `검색: ${f.q}` });
  if (f.objectType) out.push({ key: 'objectType', label: `type: ${f.objectType}` });
  if (f.hasParent) out.push({ key: 'hasParent', label: `parent: ${f.hasParent}` });
  if (f.status) out.push({ key: 'status', label: `status: ${f.status}` });
  return out;
});
// removeFilter 는 useCatalogFilter 가 제공

const columns = [
  { field: 'objectNm',        label: 'OBJECT_NM',  sortable: true, sortKey: 'object_nm', width: 220 },
  { field: 'objectDisplayNm', label: '한글명',     sortable: true, sortKey: 'object_display_nm' },
  { field: 'objectType',      label: 'Type',       sortable: true, sortKey: 'object_type', align: 'center', width: 80 },
  { field: 'objectLink',      label: 'JSP 경로' },
  { field: 'parentId',        label: '부모', align: 'right', width: 100 },
  { field: 'status',          label: 'Status', sortable: true, sortKey: 'status', align: 'center', width: 80 },
];

const selected = ref(null);
const detail = ref(null);
const detailLoading = ref(false);
const drawerTab = ref('def');

async function openDetail(row) {
  selected.value = row;
  detail.value = null;
  detailLoading.value = true;
  try {
    detail.value = await adminApi.meta.objects.detail(row.objectNm || String(row.objectId), {
      expand: ['attributes', 'children'],
    });
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
    title="오브젝트 관리"
    :subtitle="`FRM_EXECUTABLE_OBJECT · 운영 ` + (list.total.value || 0).toLocaleString() + `건`"
    :list="list"
    :columns="columns"
    row-key="objectNm"
    :active-filters="activeFilters"
    :selected-row="selected"
    @row-click="openDetail"
    @filter-remove="removeFilter"
    @retry="list.reload()"
  >
    <template #filters>
      <!-- ★ (2026-06-03, dspark): 한 줄 배치 + vertical layout. -->
      <div class="o-filters">
        <InSearchField
          :model-value="staged.q"
          label="검색"
          input="OBJECT_NM prefix — 예: AUT0030 (Enter 또는 [조회] 버튼)"
          layout="vertical"
          @update:model-value="onSearch"
          @search="applyFilter"
        />
        <InSelect
          :model-value="staged.objectType"
          :options="typeOptions"
          label="Type"
          input="전체"
          layout="vertical"
          size="sm"
          @update:model-value="onType"
        />
        <InSelect
          :model-value="staged.hasParent"
          :options="parentOptions"
          label="부모"
          input="전체"
          layout="vertical"
          size="sm"
          @update:model-value="onParent"
        />
        <InButton class="o-filters__search-btn" variant="primary" size="md" :left-icon-show="false" :right-icon-show="false" @click="applyFilter">조회</InButton>
        <InButton class="o-filters__reset-btn" variant="default" size="md" :left-icon-show="false" :right-icon-show="false" @click="resetFilter">초기화</InButton>
      </div>
    </template>

    <template #cell-objectNm="{ value }"><strong>{{ value }}</strong></template>
    <template #cell-objectType="{ value }">
      <InTag :label="value" :variant="value === 'view' ? 'brand' : 'default'" size="sm" />
    </template>
    <template #cell-objectLink="{ value }">
      <code class="link">{{ value || '—' }}</code>
    </template>
    <template #cell-parentId="{ value }"><span class="muted">{{ value || '—' }}</span></template>

    <template #drawer>
      <InModal
        v-if="selected"
        :model-value="!!selected"
        :title="`오브젝트 상세 — ${selected.objectNm}`"
        type="detail"
        :width="900"
        @update:model-value="(v) => { if (!v) closeDetail(); }"
      >
        <div v-if="detailLoading" class="loading">상세 조회 중…</div>
        <div v-else-if="detail">
          <div class="head"><InButton size="sm" variant="text" @click="copyJson(detail)">📋 JSON 복사</InButton></div>
          <InTabs v-model="drawerTab" :items="[
            { name: 'def',        tabLabel: '정의' },
            { name: 'attributes', tabLabel: `속성 (${detail.attributes?.length || 0})` },
            { name: 'children',   tabLabel: `자식 (${detail.children?.length || 0})` },
          ]" />

          <section v-if="drawerTab === 'def'" class="section">
            <dl class="kv">
              <dt>OBJECT_ID</dt><dd>{{ detail.def.objectId }}</dd>
              <dt>OBJECT_NM</dt><dd>{{ detail.def.objectNm }}</dd>
              <dt>한글명</dt><dd>{{ detail.def.objectDisplayNm || '—' }}</dd>
              <dt>JSP 경로</dt><dd><code>{{ detail.def.objectLink || '—' }}</code></dd>
              <dt>Type</dt><dd>{{ detail.def.objectType }}</dd>
              <dt>부모</dt><dd>{{ detail.def.parentId || '—' }}</dd>
              <dt>Status / Company</dt><dd>{{ detail.def.status || '—' }} / {{ detail.def.companyCd || '—' }}</dd>
            </dl>
          </section>

          <section v-else-if="drawerTab === 'attributes'" class="section">
            <ul class="resource-list">
              <li v-for="a in detail.attributes" :key="a.attributeId">
                <InTag :label="a.attributeTypeCd" size="sm" />
                <code>{{ a.attributeNm }}</code>
                <span class="muted">= {{ a.attributeValue }}</span>
              </li>
              <li v-if="!detail.attributes?.length" class="muted">속성 없음</li>
            </ul>
          </section>

          <section v-else-if="drawerTab === 'children'" class="section">
            <p class="muted">FRM_OBJECT_RELATION (PARENT_OBJ_ID = 본 오브젝트)</p>
            <ul class="resource-list">
              <li v-for="r in detail.children" :key="r.objectRelId">
                <InTag :label="r.relTypeCd" size="sm" />
                <code>{{ r.childObjectNm || `(id=${r.childObjId})` }}</code>
                <span class="muted">seq: {{ r.seq }}</span>
              </li>
              <li v-if="!detail.children?.length" class="muted">자식 없음</li>
            </ul>
          </section>
        </div>
      </InModal>
    </template>
  </CatalogPage>
</template>

<style scoped>
/* ★ (2026-06-03, dspark): 검색 + 콤보 한 줄 배치. */
.o-filters { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; }
.o-filters > :deep(.in-sf) { flex: 1 1 320px; min-width: 280px; }
.o-filters > :deep(.in-sel) { flex: 0 0 200px; }
.o-filters__search-btn, .o-filters__reset-btn { flex: 0 0 auto; align-self: flex-end; }
.muted { color: var(--in-text-subtle); }
.link { font-family: var(--in-font-family-mono, ui-monospace); font-size: var(--in-font-size-sm); color: var(--in-text-default); }
.loading { padding: 32px; text-align: center; color: var(--in-text-subtle); }
.head { display: flex; gap: 8px; margin-bottom: 12px; }
.section { padding: 12px 4px; }
.kv { display: grid; grid-template-columns: 130px 1fr; gap: 8px 12px; margin: 0; }
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
</style>
