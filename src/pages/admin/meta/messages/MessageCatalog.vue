<script setup>
/**
 * MessageCatalog — IST0030 메시지관리 (admin lane 카탈로그).
 * ★ (2026-06-03, dspark): GET /api/admin/meta/messages (직접 REST).
 *   상세 확장: ?expand=children,services. columns 는 항상 포함.
 */
import { computed, onMounted, ref } from 'vue';
import { adminApi } from '@/services/adminApi';
import { usePagedList } from '@/composables/usePagedList';
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
  fetcher: adminApi.meta.messages.list,
  initialSize: 50,
  initialFilter: { q: '', typeCd: '', allowChildYn: '', hasParent: '' },
  defaultSort: ['msg_def_id,asc'],
  syncUrl: true,
});

function onSearch(v) { list.setFilter({ q: v }); }
function onType(v) { list.setFilter({ typeCd: v }, { debounce: false }); }
function onParent(v) { list.setFilter({ hasParent: v }, { debounce: false }); }

const typeOptions = [
  { value: '',        label: '전체 type' },
  { value: 'MT',      label: 'MT (타입)' },
  { value: 'ME',      label: 'ME (인스턴스)' },
  { value: 'DEFAULT', label: 'DEFAULT' },
];
const parentOptions = [
  { value: '',  label: '부모 무관' },
  { value: 'Y', label: '자식 메시지' },
  { value: 'N', label: '최상위' },
];

const activeFilters = computed(() => {
  const f = list.filter.value;
  const out = [];
  if (f.q) out.push({ key: 'q', label: `검색: ${f.q}` });
  if (f.typeCd) out.push({ key: 'typeCd', label: `type: ${f.typeCd}` });
  if (f.hasParent) out.push({ key: 'hasParent', label: `parent: ${f.hasParent}` });
  return out;
});
function removeFilter(key) { list.setFilter({ [key]: '' }, { debounce: false }); }

const columns = [
  { field: 'msgDefId',     label: '메시지 ID', sortable: true, sortKey: 'msg_def_id', width: 220 },
  { field: 'msgDefNm',     label: '한글명',   sortable: true, sortKey: 'msg_def_nm' },
  { field: 'typeCd',       label: 'Type',     sortable: true, sortKey: 'type_cd',   align: 'center', width: 80 },
  { field: 'allowChildYn', label: '자식허용', sortable: true, sortKey: 'allow_child_yn', align: 'center', width: 80 },
  { field: 'parentId',     label: '부모',     width: 160 },
  { field: 'columnCount',  label: '컬럼수',   align: 'right', width: 80 },
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
    detail.value = await adminApi.meta.messages.detail(row.msgDefId, { expand: ['children', 'services'] });
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
    title="메시지 관리"
    :subtitle="`FRM_MSG_DEF · 운영 ` + (list.total.value || 0).toLocaleString() + `건`"
    :list="list"
    :columns="columns"
    row-key="msgDefId"
    :active-filters="activeFilters"
    :selected-row="selected"
    @row-click="openDetail"
    @filter-remove="removeFilter"
    @retry="list.reload()"
  >
    <template #filters>
      <div class="m-filters">
        <InSearchField
          :model-value="list.filter.value.q"
          label="검색"
          input="메시지 ID prefix (예: MT_IST0050)"
          :label-width="60"
          @update:model-value="onSearch"
        />
        <div class="m-filters__row">
          <InSelect :model-value="list.filter.value.typeCd" :options="typeOptions" placeholder="Type" size="sm" @update:model-value="onType" />
          <InSelect :model-value="list.filter.value.hasParent" :options="parentOptions" placeholder="부모" size="sm" @update:model-value="onParent" />
        </div>
      </div>
    </template>

    <template #cell-msgDefId="{ value }"><strong>{{ value }}</strong></template>
    <template #cell-typeCd="{ value }">
      <InTag :label="value" :variant="value === 'MT' ? 'brand' : value === 'ME' ? 'warning' : 'default'" size="sm" />
    </template>
    <template #cell-allowChildYn="{ value }">
      <span :class="value === 'Y' ? '' : 'muted'">{{ value || '—' }}</span>
    </template>
    <template #cell-parentId="{ value }"><span class="muted">{{ value || '—' }}</span></template>

    <template #drawer>
      <InModal
        v-if="selected"
        :model-value="!!selected"
        :title="`메시지 상세 — ${selected.msgDefId}`"
        type="detail"
        :width="900"
        @update:model-value="(v) => { if (!v) closeDetail(); }"
      >
        <div v-if="detailLoading" class="loading">상세 조회 중…</div>
        <div v-else-if="detail">
          <div class="head"><InButton size="sm" variant="text" @click="copyJson(detail)">📋 JSON 복사</InButton></div>
          <InTabs v-model="drawerTab" :items="[
            { name: 'columns',  tabLabel: `컬럼 (${detail.columns?.length || 0})` },
            { name: 'def',      tabLabel: '정의' },
            { name: 'children', tabLabel: `자식 (${detail.children?.length || 0})` },
            { name: 'usages',   tabLabel: `사용처 (${detail.usages?.length || 0})` },
          ]" />

          <section v-if="drawerTab === 'def'" class="section">
            <dl class="kv">
              <dt>메시지 ID</dt><dd>{{ detail.def.msgDefId }}</dd>
              <dt>한글명</dt><dd>{{ detail.def.msgDefNm || '—' }}</dd>
              <dt>Type</dt><dd>{{ detail.def.typeCd }}</dd>
              <dt>부모</dt><dd>{{ detail.def.parentId || '—' }}</dd>
              <dt>자식허용</dt><dd>{{ detail.def.allowChildYn }}</dd>
              <dt>child/parent col</dt><dd>{{ detail.def.childColId || '—' }} / {{ detail.def.parentColId || '—' }}</dd>
            </dl>
          </section>

          <section v-else-if="drawerTab === 'columns'" class="section">
            <ul class="resource-list">
              <li v-for="c in detail.columns" :key="c.msgColDefOid" class="col-row">
                <span class="seq">{{ c.orderSeq }}</span>
                <code>{{ c.msgColDefId }}</code>
                <InTag :label="c.typeCd" size="sm" />
                <span v-if="c.mandatoryYn === 'Y'" class="req">필수</span>
                <InTag v-if="c.useEncYn === 'Y'" label="암호화" variant="warning" size="sm" />
                <span class="muted">len: {{ c.minLength ?? '?' }}~{{ c.maxLength ?? '?' }}</span>
                <span v-if="c.labelCd" class="muted">label: {{ c.labelCd }}</span>
                <InTag v-if="c.useYn !== 'Y'" label="미사용" variant="default" size="sm" />
              </li>
              <li v-if="!detail.columns?.length" class="muted">컬럼 없음</li>
            </ul>
          </section>

          <section v-else-if="drawerTab === 'children'" class="section">
            <ul class="resource-list">
              <li v-for="ch in detail.children" :key="ch.msgDefOid">
                <code>{{ ch.msgDefId }}</code>
                <span class="muted">{{ ch.msgDefNm }}</span>
                <span class="muted">{{ ch.columnCount }}col</span>
              </li>
              <li v-if="!detail.children?.length" class="muted">자식 없음</li>
            </ul>
          </section>

          <section v-else-if="drawerTab === 'usages'" class="section">
            <p class="muted">이 메시지를 사용하는 서비스</p>
            <ul class="resource-list">
              <li v-for="u in detail.usages" :key="u.svDefId + '-' + u.usage">
                <InTag :label="u.usage" variant="brand" size="sm" />
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
.m-filters { display: flex; flex-direction: column; gap: 12px; }
.m-filters__row { display: flex; gap: 12px; flex-wrap: wrap; }
.muted { color: var(--in-text-subtle); }
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
.col-row .seq {
  display: inline-block;
  min-width: 24px;
  text-align: right;
  color: var(--in-text-subtle);
  font-size: var(--in-font-size-sm);
}
.col-row .req {
  color: var(--in-text-error);
  font-size: var(--in-font-size-sm);
}
</style>
