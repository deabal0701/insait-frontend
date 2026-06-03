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
    // ★ (2026-06-03, dspark): expand 보강 — msgColumns (use_yn/use_enc_yn 가시화) + health (호환성 평가).
    //   근거: command-scenarios 4건 (multiquery §3.1 / multisave §5 #1 / procedure §5.2 #13 / ela §5.2 #25).
    detail.value = await adminApi.meta.services.detail(row.svDefNm, { expand: ['msg', 'query', 'object', 'msgColumns', 'health'] });
    drawerTab.value = 'def';
  } catch (e) {
    toast.error?.(e?.message || '상세 조회 실패');
  } finally {
    detailLoading.value = false;
  }
}
function closeDetail() { selected.value = null; detail.value = null; }

// ★ (2026-06-03, dspark): trapCount breakdown — 함정 카테고리별 분포 표시.
//   command-scenarios 4건의 첫 함정 카테고리 5종.
const trapBreakdown = computed(() => {
  const out = { msgMissing: 0, queryMissing: 0, useYnN: 0, compatError: 0, compatWarn: 0 };
  const d = detail.value;
  if (!d) return out;
  // 메시지 미등록 (자동 바인딩 함정)
  for (const a of d.attrs || []) if (a.msgRef && a.msgRef.exists === false) out.msgMissing += 1;
  for (const f of d.funcMaps || []) {
    if (f.queryRef && f.queryRef.exists === false) out.queryMissing += 1;
    if (f.reqMsgRef && f.reqMsgRef.exists === false) out.msgMissing += 1;
    if (f.resMsgRef && f.resMsgRef.exists === false) out.msgMissing += 1;
  }
  // 메시지 컬럼 use_yn=N (procedure §5.2 #13, ela §5.2 #1)
  for (const a of d.attrs || []) {
    if (a.msgRef?.columns) {
      for (const c of a.msgRef.columns) if (c.useYn !== 'Y') out.useYnN += 1;
    }
  }
  for (const f of d.funcMaps || []) {
    for (const ref of [f.reqMsgRef, f.resMsgRef]) {
      if (ref?.columns) for (const c of ref.columns) if (c.useYn !== 'Y') out.useYnN += 1;
    }
  }
  // 호환성 평가 (sv_map_type × cmd_class)
  if (d.compatibility?.reasons) {
    for (const r of d.compatibility.reasons) {
      if (r.severity === 'error') out.compatError += 1;
      else if (r.severity === 'warn') out.compatWarn += 1;
    }
  }
  return out;
});

const trapCount = computed(() => {
  const b = trapBreakdown.value;
  return b.msgMissing + b.queryMissing + b.useYnN + b.compatError + b.compatWarn;
});

function gotoTester(row) {
  // ★ (2026-06-03, dspark): 라우트 이름 + param 정합 — router/routes/admin.js 의 `SERVICE_TESTER` (path param) 사용.
  router.push({ name: 'SERVICE_TESTER', params: { serviceId: row.svDefNm } });
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
      <!-- ★ (2026-06-03, dspark): 검색 + 콤보 3개 한 줄 배치 + layout=vertical (라벨 위, 콤보 아래).
           InSelect placeholder prop 명은 `input` 이며 'placeholder' 는 무시됨 (디자인시스템 v2 정합).
           ★ '조회' 버튼 명시 인접 배치 — InSearchField suffix 아이콘만으로는 시각 식별 약함 (사용자 피드백). -->
      <div class="svc-filters">
        <InSearchField
          :model-value="list.filter.value.q"
          label="검색"
          input="서비스명 prefix — 예: IST0050 (Enter 또는 [조회] 버튼)"
          layout="vertical"
          @update:model-value="onSearch"
          @search="onSearch"
        />
        <InSelect
          :model-value="list.filter.value.cmdClass"
          :options="cmdOptions"
          label="Command"
          input="전체"
          layout="vertical"
          size="sm"
          @update:model-value="onCmdClass"
        />
        <InSelect
          :model-value="list.filter.value.txSupportYn"
          :options="ynOptions"
          label="TX"
          input="전체"
          layout="vertical"
          size="sm"
          @update:model-value="onTx"
        />
        <InSelect
          :model-value="list.filter.value.useLogYn"
          :options="ynOptions"
          label="Log"
          input="전체"
          layout="vertical"
          size="sm"
          @update:model-value="onUseLog"
        />
        <InButton class="svc-filters__search-btn" variant="primary" size="md" :left-icon-show="false" :right-icon-show="false" @click="list.reload()">조회</InButton>
        <InButton class="svc-filters__reset-btn" variant="default" size="md" :left-icon-show="false" :right-icon-show="false" @click="list.resetFilter()">초기화</InButton>
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
      <InTag v-if="value === 'Y'" label="Y" variant="success" size="sm" />
      <span v-else class="muted">N</span>
    </template>
    <template #cell-asyncYn="{ value }">
      <InTag v-if="value === 'Y'" label="Y" variant="warning" size="sm" />
      <span v-else class="muted">N</span>
    </template>
    <template #cell-useLogYn="{ value }">
      <InTag v-if="value === 'Y'" label="Y" variant="brand" size="sm" />
      <span v-else class="muted">N</span>
    </template>

    <template #cell-modDate="{ value }">
      <span class="muted">{{ (value || '').slice(0, 10) }}</span>
    </template>

    <template #drawer>
      <InModal
        v-if="selected"
        :model-value="!!selected"
        type="detail"
        :title="`서비스 상세 — ${selected.svDefNm}`"
        :width="900"
        @update:model-value="(v) => { if (!v) closeDetail(); }"
      >
        <div v-if="detailLoading" class="svc-loading">상세 조회 중…</div>
        <div v-else-if="detail">
          <div class="svc-drawer-head">
            <!-- ★ (2026-06-03, dspark): 단일 trapCount → 호환성 + 카테고리 breakdown 으로 격상. -->
            <InTag
              v-if="detail.compatibility"
              :label="detail.compatibility.level === 'ok' ? '진단 OK' : detail.compatibility.level === 'error' ? '운영 위험' : '주의'"
              :variant="detail.compatibility.level === 'ok' ? 'success' : detail.compatibility.level === 'error' ? 'error' : 'warning'"
              size="sm"
            />
            <InTag v-if="trapBreakdown.compatError > 0"  :label="`호환성 ${trapBreakdown.compatError}건`" variant="error"   size="sm" />
            <InTag v-if="trapBreakdown.compatWarn > 0"   :label="`주의 ${trapBreakdown.compatWarn}건`"   variant="warning" size="sm" />
            <InTag v-if="trapBreakdown.msgMissing > 0"   :label="`메시지 미등록 ${trapBreakdown.msgMissing}건`"   variant="error" size="sm" />
            <InTag v-if="trapBreakdown.queryMissing > 0" :label="`SQL 미등록 ${trapBreakdown.queryMissing}건`"     variant="error" size="sm" />
            <InTag v-if="trapBreakdown.useYnN > 0"       :label="`use_yn=N ${trapBreakdown.useYnN}건`"             variant="warning" size="sm" />
            <InButton size="sm" variant="text" @click="gotoTester(selected)">▶ 테스트</InButton>
            <InButton size="sm" variant="text" @click="copyJson(detail)">📋 JSON 복사</InButton>
          </div>

          <InTabs v-model="drawerTab" :items="[
            { name: 'def',      tabLabel: '정의' },
            { name: 'health',   tabLabel: `진단 ${detail.compatibility?.reasons?.length ? `(${detail.compatibility.reasons.length})` : ''}` },
            { name: 'attrs',    tabLabel: `메시지 슬롯 (${detail.attrs?.length || 0})` },
            { name: 'funcMaps', tabLabel: `함수 매핑 (${detail.funcMaps?.length || 0})` },
            { name: 'object',   tabLabel: '소속 오브젝트' },
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

          <!-- ★ (2026-06-03, dspark): 진단 탭 신설 — compatibility.reasons 가 운영자에게 보이는 1차 정보. -->
          <section v-else-if="drawerTab === 'health'" class="svc-section">
            <div v-if="!detail.compatibility" class="muted">진단 정보 없음 (expand=health 미적용)</div>
            <div v-else>
              <div class="svc-health-summary" :class="`svc-health-summary--${detail.compatibility.level}`">
                <strong>전체 등급</strong>:
                <InTag
                  :label="detail.compatibility.level === 'ok' ? 'OK' : detail.compatibility.level === 'error' ? 'ERROR' : 'WARN'"
                  :variant="detail.compatibility.level === 'ok' ? 'success' : detail.compatibility.level === 'error' ? 'error' : 'warning'"
                  size="sm"
                />
                <span class="muted">{{ detail.compatibility.reasons.length }}건 사유</span>
              </div>
              <ul v-if="detail.compatibility.reasons.length" class="svc-reasons">
                <li v-for="(r, i) in detail.compatibility.reasons" :key="i" :class="`svc-reason--${r.severity}`">
                  <InTag :label="r.severity === 'error' ? 'ERROR' : 'WARN'" :variant="r.severity === 'error' ? 'error' : 'warning'" size="sm" />
                  <code class="svc-reason__code">{{ r.code }}</code>
                  <span class="svc-reason__msg">{{ r.message }}</span>
                  <span class="muted svc-reason__ref">— {{ r.ref }}</span>
                </li>
              </ul>
              <p v-else class="muted">모든 검증 통과.</p>
              <p class="muted svc-health-note">
                근거: AS-IS 매뉴얼 <code>01-asis/manuals/01-meta-management/dev-tools/command-scenarios/</code> 4건 (multiquery·multisave·procedure·ela).
              </p>
            </div>
          </section>

          <section v-else-if="drawerTab === 'attrs'" class="svc-section">
            <!-- ★ (2026-06-03, dspark): 메시지 슬롯 → 메시지 + 컬럼 (use_yn/use_enc_yn) 가시화.
                 근거: SCENARIO-procedure.md §5.2 #13 (use_yn=N → IN NULL) + SCENARIO-multiquery.md §3.1 자동 바인딩. -->
            <ul class="resource-list">
              <li v-for="a in detail.attrs" :key="a.svAttrId" class="svc-attr-row">
                <div class="svc-attr-row__head">
                  <HealthDot
                    :tone="a.msgRef ? (a.msgRef.exists ? 'ok' : 'missing') : 'unknown'"
                    :title="a.msgRef && !a.msgRef.exists ? `메시지 ${a.valueType} 미등록` : ''"
                    size="sm"
                  />
                  <InTag :label="a.svAttrType" :variant="a.svAttrType === 'IN_MSG' ? 'brand' : 'warning'" size="sm" />
                  <code>{{ a.svAttrNm }}</code>
                  <span class="muted">value_type:</span>
                  <code>{{ a.valueType }}</code>
                  <span v-if="a.msgRef?.msgDefNm" class="muted">— {{ a.msgRef.msgDefNm }} ({{ a.msgRef.columnCount }}col · {{ a.msgRef.typeCd }})</span>
                </div>
                <table v-if="a.msgRef?.columns?.length" class="svc-msg-columns">
                  <thead>
                    <tr><th>#</th><th>COL_ID</th><th>한글명</th><th>타입</th><th>USE</th><th>ENC</th><th>VALUE_TYPE</th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="c in a.msgRef.columns" :key="c.seqNo" :class="{ 'svc-msg-columns__off': c.useYn !== 'Y' }">
                      <td class="muted">{{ c.seqNo }}</td>
                      <td><code>{{ c.colId }}</code></td>
                      <td>{{ c.colNm }}</td>
                      <td class="muted">{{ c.dataType }}</td>
                      <td>
                        <InTag v-if="c.useYn === 'Y'" label="Y" variant="success" size="sm" />
                        <InTag v-else label="N" variant="error" size="sm" />
                      </td>
                      <td>
                        <InTag v-if="c.useEncYn === 'Y'" label="ENC" variant="warning" size="sm" />
                        <span v-else class="muted">—</span>
                      </td>
                      <td class="muted">{{ c.valueType || '—' }}</td>
                    </tr>
                  </tbody>
                </table>
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
                <InTag :label="f.svMapTypeCd" size="sm" />
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
/* ★ (2026-06-03, dspark): 한 줄 배치 — 검색 textbox 가 grow, 콤보 3개는 고정 폭. */
.svc-filters { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; }
.svc-filters > :deep(.in-sf) { flex: 1 1 320px; min-width: 280px; }
.svc-filters > :deep(.in-sel) { flex: 0 0 160px; }
.svc-filters__search-btn,
.svc-filters__reset-btn { flex: 0 0 auto; align-self: flex-end; margin-bottom: 0; }

.svc-name { display: inline-flex; align-items: center; gap: 6px; }
.svc-note-dot { color: var(--in-text-subtle); }
.svc-cmd { color: var(--in-text-accent); }
.muted { color: var(--in-text-subtle); }

.svc-drawer-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }

/* ★ (2026-06-03, dspark): 진단 탭 + msg 컬럼 표. */
.svc-health-summary { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 4px; margin-bottom: 12px; }
.svc-health-summary--ok    { background: var(--in-surface-accent-success, #f0f9ff); }
.svc-health-summary--warn  { background: var(--in-surface-accent-warning, #fffbeb); }
.svc-health-summary--error { background: var(--in-surface-accent-error,   #fef2f2); }
.svc-reasons { list-style: none; padding: 0; margin: 8px 0; display: flex; flex-direction: column; gap: 8px; }
.svc-reasons li { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 8px 12px; border-left: 3px solid var(--in-border-default); }
.svc-reason--error { border-left-color: var(--in-text-info-error, #dc2626); }
.svc-reason--warn  { border-left-color: var(--in-text-warning, #d97706); }
.svc-reason__code { font-size: var(--in-font-size-sm); color: var(--in-text-subtle); }
.svc-reason__msg { flex: 1 1 auto; }
.svc-reason__ref { font-size: var(--in-font-size-sm); }
.svc-health-note { font-size: var(--in-font-size-sm); margin-top: 16px; }

.svc-attr-row { padding: 8px 0; border-bottom: 1px solid var(--in-border-default); }
.svc-attr-row:last-child { border-bottom: none; }
.svc-attr-row__head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; }
.svc-msg-columns { width: 100%; border-collapse: collapse; font-size: var(--in-font-size-sm); margin-top: 4px; }
.svc-msg-columns th { text-align: left; padding: 4px 8px; background: var(--in-surface-state-default); font-weight: var(--in-font-weight-medium); color: var(--in-text-subtle); }
.svc-msg-columns td { padding: 4px 8px; border-top: 1px solid var(--in-border-default); }
.svc-msg-columns__off td { opacity: 0.55; background: var(--in-surface-accent-error, #fef2f2); }
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
