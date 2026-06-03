<script setup>
/**
 * ServiceCatalog — IST0050 서비스관리 (admin lane 카탈로그).
 * ★ (2026-06-03, dspark): envelope listServices → adminApi.meta.services 격상.
 *   v2 디자인시스템 정합 (InTable/InPagination/InSearchField/InChip + CatalogPage 추상).
 *
 * 한 줄로:
 *   FRM_SERVICE_DEF 6,210+ 조회·페이징·정렬·필터 + 행 클릭 상세 Drawer(확장 응답 1회).
 *
 * URL:  /admin/meta/services
 * API:  GET /api/admin/meta/services       목록
 *       GET /api/admin/meta/services/{nm}  상세 (?expand=msg,query,object)
 */
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

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
import InTooltip from '@/components/ui/InTooltip.vue';

const router = useRouter();
const toast = useToast();

// ─── 목록 ───────────────────────────────────────────────────────────────
const list = usePagedList({
  fetcher: adminApi.meta.services.list,
  initialSize: 50,
  initialFilter: { q: '', cmdClass: '', txSupportYn: '', useLogYn: '' },
  defaultSort: ['sv_def_nm,asc'],
  syncUrl: true,
});

function onSearch(v) { list.setFilter({ q: v }); }
function onCmdClass(v) { list.setFilter({ cmdClass: v }, { debounce: false }); }
function onTx(v) { list.setFilter({ txSupportYn: v }, { debounce: false }); }
function onUseLog(v) { list.setFilter({ useLogYn: v }, { debounce: false }); }

const cmdOptions = [
  { value: '', label: '전체 Command' },
  { value: 'MultiQuery', label: 'MultiQuery (조회)' },
  { value: 'MultiSave',  label: 'MultiSave (저장)' },
  { value: 'Procedure',  label: 'Procedure (PL/SQL)' },
  { value: 'ElaService', label: 'ElaService (전자결재)' },
];
const ynOptions = [
  { value: '',  label: '전체' },
  { value: 'Y', label: 'Y' },
  { value: 'N', label: 'N' },
];

const activeFilters = computed(() => {
  const f = list.filter.value;
  const out = [];
  if (f.q) out.push({ key: 'q', label: `검색: ${f.q}` });
  if (f.cmdClass) out.push({ key: 'cmdClass', label: `Cmd: ${f.cmdClass}` });
  if (f.txSupportYn) out.push({ key: 'txSupportYn', label: `tx: ${f.txSupportYn}` });
  if (f.useLogYn) out.push({ key: 'useLogYn', label: `log: ${f.useLogYn}` });
  return out;
});
function removeFilter(key) { list.setFilter({ [key]: '' }, { debounce: false }); }

const columns = [
  { field: 'svDefNm',    label: '서비스명',     sortable: true, sortKey: 'sv_def_nm', width: 240 },
  { field: 'cmdClassNm', label: 'Command',     sortable: true, sortKey: 'cmd_class_nm' },
  { field: 'txSupportYn',label: 'TX',          sortable: true, sortKey: 'tx_support_yn', align: 'center', width: 50 },
  { field: 'asyncYn',    label: 'Async',       sortable: true, sortKey: 'async_yn',     align: 'center', width: 60 },
  { field: 'useLogYn',   label: 'Log',         sortable: true, sortKey: 'use_log_yn',   align: 'center', width: 50 },
  { field: 'modDate',    label: '변경일',      sortable: true, sortKey: 'mod_date', width: 160 },
  { field: 'note',       label: '비고' },
];

// ─── 상세 Drawer ─────────────────────────────────────────────────────────
const selected = ref(null);
const detail = ref(null);
const detailLoading = ref(false);
const drawerTab = ref('def');

async function openDetail(row) {
  selected.value = row;
  detail.value = null;
  detailLoading.value = true;
  try {
    detail.value = await adminApi.meta.services.detail(row.svDefNm, { expand: ['msg', 'query', 'object'] });
    drawerTab.value = 'def';
  } catch (e) {
    toast.error?.(e?.message || '상세 조회 실패');
  } finally {
    detailLoading.value = false;
  }
}
function closeDetail() { selected.value = null; detail.value = null; }

const trapCount = computed(() => {
  if (!detail.value) return 0;
  let n = 0;
  for (const a of detail.value.attrs || []) if (a.msgRef && a.msgRef.exists === false) n += 1;
  for (const f of detail.value.funcMaps || []) {
    if (f.queryRef && f.queryRef.exists === false) n += 1;
    if (f.reqMsgRef && f.reqMsgRef.exists === false) n += 1;
    if (f.resMsgRef && f.resMsgRef.exists === false) n += 1;
  }
  return n;
});

function gotoTester(row) {
  router.push({ name: 'ServiceTester', query: { serviceId: row.svDefNm } });
}
function copyJson(obj) {
  navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
  toast.success?.('JSON 복사됨');
}

function shortCmd(fqcn) {
  if (!fqcn) return '';
  return fqcn.split('.').pop();
}

onMounted(() => list.reload());
</script>

<template>
  <CatalogPage
    title="서비스관리"
    :subtitle="`FRM_SERVICE_DEF · 운영 ` + (list.total.value || 0).toLocaleString() + `건`"
    :list="list"
    :columns="columns"
    row-key="svDefNm"
    :active-filters="activeFilters"
    :selected-row="selected"
    @row-click="openDetail"
    @filter-remove="removeFilter"
    @retry="list.reload()"
  >
    <template #filters>
      <div class="svc-filters">
        <InSearchField
          :model-value="list.filter.value.q"
          label="검색"
          input="서비스명 prefix (예: IST0050)"
          :label-width="60"
          @update:model-value="onSearch"
          @search="onSearch"
        />
        <div class="svc-filters__row">
          <InSelect
            :model-value="list.filter.value.cmdClass"
            :options="cmdOptions"
            placeholder="Command"
            size="sm"
            @update:model-value="onCmdClass"
          />
          <InSelect
            :model-value="list.filter.value.txSupportYn"
            :options="ynOptions"
            placeholder="TX"
            size="sm"
            @update:model-value="onTx"
          />
          <InSelect
            :model-value="list.filter.value.useLogYn"
            :options="ynOptions"
            placeholder="Log"
            size="sm"
            @update:model-value="onUseLog"
          />
        </div>
      </div>
    </template>

    <template #cell-svDefNm="{ value, row }">
      <span class="svc-name">
        <strong>{{ value }}</strong>
        <InTooltip v-if="row.note" :text="row.note">
          <span class="svc-note-dot">·</span>
        </InTooltip>
      </span>
    </template>

    <template #cell-cmdClassNm="{ value }">
      <span class="svc-cmd">{{ shortCmd(value) }}</span>
    </template>

    <template #cell-txSupportYn="{ value }">
      <InTag v-if="value === 'Y'" type="success" size="sm">Y</InTag>
      <span v-else class="muted">N</span>
    </template>
    <template #cell-asyncYn="{ value }">
      <InTag v-if="value === 'Y'" type="warning" size="sm">Y</InTag>
      <span v-else class="muted">N</span>
    </template>
    <template #cell-useLogYn="{ value }">
      <InTag v-if="value === 'Y'" type="info" size="sm">Y</InTag>
      <span v-else class="muted">N</span>
    </template>

    <template #cell-modDate="{ value }">
      <span class="muted">{{ (value || '').slice(0, 10) }}</span>
    </template>

    <template #drawer>
      <InModal
        v-if="selected"
        :model-value="!!selected"
        :title="`서비스 상세 — ${selected.svDefNm}`"
        size="lg"
        position="right"
        @update:model-value="(v) => { if (!v) closeDetail(); }"
      >
        <div v-if="detailLoading" class="svc-loading">상세 조회 중…</div>
        <div v-else-if="detail">
          <div class="svc-drawer-head">
            <InTag :type="trapCount > 0 ? 'error' : 'success'" size="sm">
              {{ trapCount > 0 ? `함정 ${trapCount}건` : '진단 OK' }}
            </InTag>
            <InButton size="sm" variant="text" @click="gotoTester(selected)">▶ 테스트</InButton>
            <InButton size="sm" variant="text" @click="copyJson(detail)">📋 JSON 복사</InButton>
          </div>

          <InTabs v-model="drawerTab" :tabs="[
            { name: 'def',      label: '정의' },
            { name: 'attrs',    label: `메시지 슬롯 (${detail.attrs?.length || 0})` },
            { name: 'funcMaps', label: `함수 매핑 (${detail.funcMaps?.length || 0})` },
            { name: 'object',   label: '소속 오브젝트' },
          ]" />

          <section v-if="drawerTab === 'def'" class="svc-section">
            <dl class="kv">
              <dt>서비스명</dt><dd>{{ detail.def.svDefNm }}</dd>
              <dt>Command</dt><dd>{{ detail.def.cmdClassNm }}</dd>
              <dt>tx / async / log</dt>
              <dd>{{ detail.def.txSupportYn }} / {{ detail.def.asyncYn }} / {{ detail.def.useLogYn }}</dd>
              <dt>비고</dt><dd>{{ detail.def.note || '—' }}</dd>
              <dt>변경</dt><dd>{{ detail.def.modUserId }} · {{ detail.def.modDate }}</dd>
            </dl>
          </section>

          <section v-else-if="drawerTab === 'attrs'" class="svc-section">
            <ul class="resource-list">
              <li v-for="a in detail.attrs" :key="a.svAttrId">
                <HealthDot
                  :tone="a.msgRef ? (a.msgRef.exists ? 'ok' : 'missing') : 'unknown'"
                  :title="a.msgRef && !a.msgRef.exists ? `메시지 ${a.valueType} 미등록` : ''"
                  size="sm"
                />
                <InTag :type="a.svAttrType === 'IN_MSG' ? 'info' : 'warning'" size="sm">{{ a.svAttrType }}</InTag>
                <code>{{ a.svAttrNm }}</code>
                <span class="muted">value_type:</span>
                <code>{{ a.valueType }}</code>
                <span v-if="a.msgRef?.msgDefNm" class="muted">— {{ a.msgRef.msgDefNm }} ({{ a.msgRef.columnCount }}col)</span>
              </li>
            </ul>
          </section>

          <section v-else-if="drawerTab === 'funcMaps'" class="svc-section">
            <ul class="resource-list">
              <li v-for="f in detail.funcMaps" :key="f.svMapId">
                <HealthDot
                  :tone="f.queryRef ? (f.queryRef.exists ? 'ok' : 'missing') : 'unknown'"
                  :title="f.queryRef && !f.queryRef.exists ? `SQL ${f.funcNm} 미등록` : ''"
                  size="sm"
                />
                <InTag size="sm">{{ f.svMapTypeCd }}</InTag>
                <code>{{ f.funcNm }}</code>
                <span class="muted">req:</span><code>{{ f.reqMsgNm }}</code>
                <span class="muted">res:</span><code>{{ f.resMsgNm }}</code>
                <pre v-if="f.queryRef?.bodyPreview" class="body-preview">{{ f.queryRef.bodyPreview }}</pre>
              </li>
            </ul>
          </section>

          <section v-else-if="drawerTab === 'object'" class="svc-section">
            <p v-if="!detail.def.objectId" class="muted">objectId 없음 (대부분 NULL — 매뉴얼 09 §6.1).</p>
            <p v-else-if="!detail.objectRef" class="muted">조회 불가</p>
            <dl v-else class="kv">
              <dt>OBJECT_ID</dt><dd>{{ detail.objectRef.objectId }}</dd>
              <dt>OBJECT_NM</dt><dd>{{ detail.objectRef.objectNm }}</dd>
              <dt>한글명</dt><dd>{{ detail.objectRef.objectDisplayNm }}</dd>
              <dt>경로</dt><dd>{{ detail.objectRef.objectLink }}</dd>
              <dt>타입</dt><dd>{{ detail.objectRef.objectType }}</dd>
            </dl>
          </section>
        </div>
      </InModal>
    </template>
  </CatalogPage>
</template>

<style scoped>
.svc-filters { display: flex; flex-direction: column; gap: 12px; }
.svc-filters__row { display: flex; gap: 12px; flex-wrap: wrap; }

.svc-name { display: inline-flex; align-items: center; gap: 6px; }
.svc-note-dot { color: var(--in-text-subtle); }
.svc-cmd { color: var(--in-text-accent); }
.muted { color: var(--in-text-subtle); }

.svc-drawer-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.svc-loading { padding: 32px; text-align: center; color: var(--in-text-subtle); }
.svc-section { padding: 12px 4px; }

.kv {
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: 8px 12px;
  margin: 0;
}
.kv dt { color: var(--in-text-subtle); font-size: var(--in-font-size-sm); }
.kv dd { margin: 0; color: var(--in-text-default); word-break: break-all; }

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
.body-preview {
  flex-basis: 100%;
  margin: 6px 0 0;
  padding: 8px;
  background: var(--in-bg-white);
  border: 1px solid var(--in-border-default);
  border-radius: var(--in-radius-xxs);
  font-family: var(--in-font-family-mono, ui-monospace);
  font-size: 11px;
  line-height: 16px;
  color: var(--in-text-accent);
  overflow-x: auto;
}
</style>
