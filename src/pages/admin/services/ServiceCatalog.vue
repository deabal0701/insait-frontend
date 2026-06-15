<script setup>
/**
 * ServiceCatalog — IST0050 서비스관리 (admin lane 카탈로그 + 편집 CRUD).
 * ★ (2026-06-03, dspark): 조회 + 진단(health/paramDiff/elaInfra/msgColumns) 파일럿.
 * ★ (2026-06-05, dspark): 편집 CRUD — 공통 컴포넌트 재사용 (99 backlog #8).
 *   useMetaEditor + MetaDetailEditor + MetaChildGrid 2개 (함수매핑 + 속성, 둘 다 평면 자식).
 *   ★ 진단 6탭(def/health/attrs/funcMaps/object/elaInfra)은 view 모드에서 그대로 보존,
 *     편집 모드에서만 def 폼 + funcMaps/attrs 그리드 노출 (drawerTab 을 mode 로 분기).
 *   서비스 정의는 Waffle 풀 evict 대상 아님 (매 요청 DB → 즉시반영).
 */
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { adminApi } from '@/services/adminApi';
import { buildEnvelope } from '@/services/envelope';
import { usePagedList } from '@/composables/usePagedList';
import { useCatalogFilter } from '@/composables/useCatalogFilter';
import { useToast } from '@/composables/useToast';
import { useMetaEditor } from '@/composables/useMetaEditor';
import { shortCmd } from '@/utils/metaUtils';
import { SERVICE_NAME_RE, YN_FILTER_OPTIONS } from '@/constants/catalogOptions';

import CatalogPage from '@/components/feature/admin/CatalogPage.vue';
import screenHelp from './ServiceCatalog.help.js';   // [DEV-HELP] 화면 도움말(실행 SQL+업무주의+컬럼정보) — 제거 시 이 줄 + 아래 :help prop 삭제
import HealthDot from '@/components/feature/admin/HealthDot.vue';
import MetaDetailEditor from '@/components/feature/admin/MetaDetailEditor.vue';
import MetaChildGrid from '@/components/feature/admin/MetaChildGrid.vue';
import MetaDefForm from '@/components/feature/admin/MetaDefForm.vue';
import SearchPickerModal from '@/components/feature/admin/SearchPickerModal.vue';

import InSearchField from '@/components/ui/InSearchField.vue';
import InSelect from '@/components/ui/InSelect.vue';
import InButton from '@/components/ui/InButton.vue';
import InTag from '@/components/ui/InTag.vue';
import InModal from '@/components/ui/InModal.vue';
import InTooltip from '@/components/ui/InTooltip.vue';
import InIcon from '@/components/ui/InIcon.vue';

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

const { staged, activeFilters, applyFilter, resetFilter, removeFilter } = useCatalogFilter({
  list,
  initial: { q: '', cmdClass: '', txSupportYn: '', useLogYn: '' },
  chipLabels: { q: '검색', cmdClass: 'Cmd', txSupportYn: 'tx', useLogYn: 'log' },
});
function onSearch(v) { staged.value.q = v; }
function onCmdClass(v) { staged.value.cmdClass = v; }
function onTx(v) { staged.value.txSupportYn = v; }
function onUseLog(v) { staged.value.useLogYn = v; }

const cmdOptions = [
  { value: '', label: '전체' },   // ★ (2026-06-12, dspark): '전체 Command' → '전체' 통일 (#6)
  { value: 'MultiQuery', label: 'MultiQuery (조회)' },
  { value: 'MultiSave',  label: 'MultiSave (저장)' },
  { value: 'Procedure',  label: 'Procedure (PL/SQL)' },
  { value: 'ElaService', label: 'ElaService (전자결재)' },
];

const columns = [
  { field: 'svDefNm',    label: '서비스명',     sortable: true, sortKey: 'sv_def_nm', width: 240 },
  { field: 'cmdClassNm', label: 'Command',     sortable: true, sortKey: 'cmd_class_nm' },
  { field: 'txSupportYn',label: 'TX',          sortable: true, sortKey: 'tx_support_yn', align: 'center', width: 50 },
  { field: 'asyncYn',    label: 'Async',       sortable: true, sortKey: 'async_yn',     align: 'center', width: 60 },
  { field: 'useLogYn',   label: 'Log',         sortable: true, sortKey: 'use_log_yn',   align: 'center', width: 50 },
  { field: 'modDate',    label: '변경일',      sortable: true, sortKey: 'mod_date', width: 160 },
  { field: 'note',       label: '비고' },
  // ★ (2026-06-05, dspark): field 'actions' → 'ops'. 'actions' 는 헤더 슬롯명 'header-actions' 를
  //   생성해 CatalogPage 의 페이지 헤더 슬롯(header-actions = [+신규] 버튼)과 충돌 →
  //   [+신규] 가 이 컬럼 헤더에도 새어 들어가던 버그. 'ops' 로 회피.
  { field: 'ops',        label: '액션', align: 'center', width: 150 },
];

// ─── 편집 폼 옵션 / 그리드 config ─────────────────────────────────────────
const txAsyncLogOptions = [{ value: 'Y', label: 'Y' }, { value: 'N', label: 'N' }];
const cmdClassPresets = [
  'h5.biz.command.common.MultiQueryCommand',
  'h5.biz.command.common.MultiSaveCommand',
  'h5.biz.command.common.ProcedureCommand',
  'h5.ela.command.ElaServiceCommand',
];

// ★ (2026-06-15, dspark): 그리드 셀 검색 picker (G18/I11) — func_nm(SQL)·value_type(MT_)·속성명(ME_)을 손입력 대신 검색→선택.
const pickerOpen = ref(false);
const pickerCol = ref(null);
const pickerRow = ref(null);
function onCellPicker({ row, col }) { pickerCol.value = col; pickerRow.value = row; pickerOpen.value = true; }
function onPickerSelect(sel) {
  const col = pickerCol.value, row = pickerRow.value;
  if (col && row) {
    const p = col.picker || {};
    if (p.apply) p.apply(sel, row);                       // 커스텀 다중 필드 write (예: MT_ 선택 → ME_+MT_ 동시)
    else {
      row[col.key] = p.valueKey ? sel[p.valueKey] : sel;
      if (col.displayKey && p.displayValueKey) row[col.displayKey] = sel[p.displayValueKey];
    }
    if (row.rowStatus !== 'I') row.rowStatus = 'U';
  }
  pickerOpen.value = false;
}
// 공통 picker 설정
const SQL_PICKER = {
  title: 'SQL 쿼리 검색', placeholder: 'SQL 이름 prefix (예: ACM0010)',
  columns: [{ key: 'queryName', label: 'SQL 이름', width: 200 }, { key: 'displayName', label: '한글명' }],
  fetcher: (q) => adminApi.meta.queries.list({ q, size: 50, page: 1 }).then((r) => r.content || []),
  rowKey: 'queryName', valueKey: 'queryName',
};
const MSG_PICKER = {
  title: '메시지 검색', placeholder: '메시지ID 앞부분 또는 한글명',
  columns: [{ key: 'msgDefId', label: '메시지ID', width: 200 }, { key: 'msgDefNm', label: '한글명' }],
  fetcher: (q) => adminApi.meta.messages.list({ q, size: 50, page: 1 }).then((r) => r.content || []),
  rowKey: 'msgDefId',
};

const funcMapColumns = [
  { key: 'seqOrder',    label: '순서', kind: 'number', width: 56 },
  { key: 'svMapTypeCd', label: '타입', kind: 'select', width: 90,
    options: [{ value: 'sql', label: 'sql' }, { value: 'entity', label: 'entity' }] },
  // ★ (2026-06-15, dspark): SQL 검색 picker (sql 타입일 때 쿼리명을 검색으로 채움). entity 명은 직접 입력도 가능하나 일단 SQL 검색 제공.
  { key: 'funcNm',      label: 'func_nm (쿼리/엔터티명)', kind: 'picker', picker: SQL_PICKER },
  { key: 'reqMsgNm',    label: 'REQ msg', kind: 'text', width: 140 },
  { key: 'resMsgNm',    label: 'RES msg', kind: 'text', width: 140 },
];
function newFuncMap(rows) {
  const maxSeq = rows.reduce((m, f) => Math.max(m, f.seqOrder || 0), 0);
  return { rowStatus: 'I', svMapId: null, svMapTypeCd: 'sql', funcNm: '', seqOrder: maxSeq + 1, reqMsgNm: '', resMsgNm: '', useTreeResult: 'N' };
}

const attrColumns = [
  // ★ (2026-06-15, dspark): 속성명(ME_) = 메시지 검색(MT_) → ME_ 자동변환 + value_type(MT_) 동시 채움. 한 번 선택으로 ME_/MT_ 페어 완성.
  { key: 'svAttrNm',     label: '속성명 (ME_*)', kind: 'picker', placeholder: 'ME_…',
    picker: { ...MSG_PICKER, apply: (sel, row) => {
      const id = sel.msgDefId || '';
      row.svAttrNm = id.replace(/^MT_/, 'ME_');
      if (!row.valueType) row.valueType = id;
    } } },
  { key: 'svAttrType',   label: '타입', kind: 'select', width: 110,
    options: [{ value: 'IN_MSG', label: 'IN_MSG' }, { value: 'OUT_MSG', label: 'OUT_MSG' }] },
  // value_type(MT_) = 메시지 검색 → msgDefId 채움.
  { key: 'valueType',    label: 'value_type (MT_*)', kind: 'picker', picker: { ...MSG_PICKER, valueKey: 'msgDefId' } },
  { key: 'defaultValue', label: '기본값', kind: 'text', width: 130 },
];
function newAttr() {
  return { rowStatus: 'I', svAttrId: null, svAttrNm: '', svAttrType: 'IN_MSG', valueType: '', defaultValue: '', note: '' };
}

// ─── 편집 상태기계 (공통) ──────────────────────────────────────────────────
const editor = useMetaEditor({
  api: adminApi.meta.services,
  keyField: 'svDefNm',
  domainLabel: '서비스',
  expand: ['msg', 'query', 'object', 'msgColumns', 'health', 'paramDiff', 'elaInfra'],
  defaultTab: 'def',
  createTab: 'def',
  openInEdit: true,   // ★ (2026-06-10, dspark) 방식1: 행 클릭 시 바로 편집 모드(진단 콘텐츠는 합집합 탭으로 항상 노출)
  reload: () => list.reload(),
  blankForm: () => ({
    def: { svDefNm: '', cmdClassNm: 'h5.biz.command.common.MultiQueryCommand', txSupportYn: 'N', asyncYn: 'N', useLogYn: 'N', version: '', objectId: '', note: '' },
    funcMaps: [],
    attrs: [],
  }),
  toForm: (d) => {
    const def = d.def || {};
    return {
      def: {
        svDefNm: def.svDefNm, cmdClassNm: def.cmdClassNm, txSupportYn: def.txSupportYn || 'N',
        asyncYn: def.asyncYn || 'N', useLogYn: def.useLogYn || 'N', version: def.version || '',
        objectId: def.objectId || '', note: def.note || '',
      },
      funcMaps: (d.funcMaps || []).map((f) => ({
        rowStatus: '', svMapId: f.svMapId, svMapTypeCd: f.svMapTypeCd || 'sql', funcNm: f.funcNm,
        seqOrder: f.seqOrder, reqMsgNm: f.reqMsgNm || '', resMsgNm: f.resMsgNm || '', useTreeResult: f.useTreeResult || 'N',
      })),
      attrs: (d.attrs || []).map((a) => ({
        rowStatus: '', svAttrId: a.svAttrId, svAttrNm: a.svAttrNm, svAttrType: a.svAttrType || 'IN_MSG',
        valueType: a.valueType || '', defaultValue: a.defaultValue || '', note: a.note || '',
      })),
    };
  },
  toPayload: (f) => ({ def: { ...f.def }, funcMaps: f.funcMaps, attrs: f.attrs }),
  // ★ (2026-06-12, dspark): focusField — 검증 실패 필드 자동 포커스 (#8)
  validate: (f, { mode, setTab, focusField }) => {
    const d = f.def;
    if (mode === 'create' && !SERVICE_NAME_RE.test((d.svDefNm || '').trim())) {
      toast.error?.('서비스명은 7-char 컨벤션을 따라야 합니다 (예: TST0001_00_R01).'); setTab('def'); focusField?.('svDefNm'); return false;
    }
    if (!d.cmdClassNm || !d.cmdClassNm.trim()) { toast.error?.('Command 클래스(FQCN)는 필수입니다.'); setTab('def'); focusField?.('cmdClassNm'); return false; }
    for (const fm of (f.funcMaps || []).filter((x) => x.rowStatus !== 'D')) {
      if (!fm.svMapTypeCd) { toast.error?.('함수매핑 type 이 빈 행이 있습니다.'); setTab('funcMaps'); return false; }
      if (!fm.funcNm || !fm.funcNm.trim()) { toast.error?.('함수매핑 func_nm 이 빈 행이 있습니다.'); setTab('funcMaps'); return false; }
    }
    for (const a of (f.attrs || []).filter((x) => x.rowStatus !== 'D')) {
      if (!a.svAttrNm || !a.svAttrNm.trim()) { toast.error?.('속성명이 빈 행이 있습니다.'); setTab('attrs'); return false; }
      if (!a.svAttrType) { toast.error?.(`속성 '${a.svAttrNm}'의 타입은 필수입니다.`); setTab('attrs'); return false; }
    }
    return true;
  },
});
const {
  mode, selected, detail, detailLoading, drawerTab, saving, confirmDelete, form, isEditing, modalTitle,
  openDetail, openCreate, enterEdit, cancelEdit, closePanel, save, doDelete,
} = editor;

// ─── 진단 computeds (view 전용 — detail 기반, 기존 보존) ────────────────────
const defFields = computed(() => [
  { key: 'svDefNm', type: 'text', label: '서비스명', input: '예: TST0001_00_R01', required: true,
    disabled: mode.value === 'edit',
    hint: mode.value === 'edit' ? '서비스명은 업무키(JSP target)라 수정할 수 없습니다.' : undefined },
  { key: 'cmdClassNm', type: 'text', label: 'Command 클래스 (FQCN)', input: 'h5.biz.command.common.MultiQueryCommand', required: true,
    hint: `예: ${cmdClassPresets.join(' · ')}` },
  { key: 'objectId', type: 'text', label: 'objectId (소속 오브젝트)', input: '(선택, 대부분 NULL)' },
  { key: 'txSupportYn', type: 'select', label: 'TX 지원', options: txAsyncLogOptions },
  { key: 'asyncYn', type: 'select', label: 'Async', options: txAsyncLogOptions },
  { key: 'useLogYn', type: 'select', label: 'Log 사용', options: txAsyncLogOptions },
  { key: 'version', type: 'text', label: '버전', input: '(선택)' },
  { key: 'note', type: 'text', label: '비고', input: '(선택)' },
]);

const trapBreakdown = computed(() => {
  const out = { msgMissing: 0, queryMissing: 0, useYnN: 0, compatError: 0, compatWarn: 0, paramMismatch: 0, elaMissing: 0 };
  const d = detail.value;
  if (!d) return out;
  for (const a of d.attrs || []) if (a.msgRef && a.msgRef.exists === false) out.msgMissing += 1;
  for (const f of d.funcMaps || []) {
    if (f.queryRef && f.queryRef.exists === false) out.queryMissing += 1;
    if (f.reqMsgRef && f.reqMsgRef.exists === false) out.msgMissing += 1;
    if (f.resMsgRef && f.resMsgRef.exists === false) out.msgMissing += 1;
  }
  for (const a of d.attrs || []) {
    if (a.msgRef?.columns) for (const c of a.msgRef.columns) if (c.useYn !== 'Y') out.useYnN += 1;
  }
  for (const f of d.funcMaps || []) {
    for (const ref of [f.reqMsgRef, f.resMsgRef]) {
      if (ref?.columns) for (const c of ref.columns) if (c.useYn !== 'Y') out.useYnN += 1;
    }
  }
  if (d.compatibility?.reasons) {
    for (const r of d.compatibility.reasons) {
      if (r.severity === 'error') out.compatError += 1;
      else if (r.severity === 'warn') out.compatWarn += 1;
    }
  }
  for (const f of d.funcMaps || []) {
    if (f.queryRef?.paramDiff?.unmatched?.length) out.paramMismatch += f.queryRef.paramDiff.unmatched.length;
  }
  if (d.elaInfra?.summary) out.elaMissing = d.elaInfra.summary.missingCount || 0;
  return out;
});

function gotoTester(row) {
  router.push({ name: 'SERVICE_TESTER', params: { serviceId: row.svDefNm } });
}
async function copyRowEnvelope(row) {
  if (!row?.svDefNm) return;
  try {
    const d = await adminApi.meta.services.detail(row.svDefNm, { expand: ['msg', 'msgColumns'] });
    const attrs = Array.isArray(d?.attrs) ? d.attrs : [];
    const inAttr = attrs.find((a) => a.svAttrType === 'IN_MSG');
    const slot = (inAttr?.valueType || '').replace(/^MT_/, 'ME_') || 'ME_REQ';
    const cols = inAttr?.msgRef?.columns || [];
    const rowTpl = { _seq: 1, sStatus: 'R', sDelete: '' };
    for (const c of cols) rowTpl[c.colId] = '';
    const envelope = buildEnvelope(row.svDefNm, { [slot]: [rowTpl] });
    await navigator.clipboard.writeText(JSON.stringify(envelope, null, 2));
    toast.success?.(`envelope JSON 복사됨 — ${row.svDefNm}`);
  } catch (e) {
    toast.error?.(e?.message || 'JSON 복사 실패');
  }
}


const tripleNameStatus = computed(() => {
  const d = detail.value;
  if (!d?.def || !d.funcMaps?.length) return null;
  const primary = d.funcMaps[0];
  if ((primary.svMapTypeCd || '').toLowerCase() !== 'sql') return null;
  const same = (primary.funcNm || '').toUpperCase() === (d.def.svDefNm || '').toUpperCase();
  return { same, funcNm: primary.funcNm };
});

const elaDispatch = computed(() => {
  const d = detail.value;
  if (!d?.def) return null;
  if (shortCmd(d.def.cmdClassNm) !== 'ElaServiceCommand') return null;
  return {
    note: '실제 envelope serviceId 가 ELA0010_SAVE_0N (1=Submit / 2=TempSave / 3=Approve / 4=Deny) 으로 sub-Command dispatch 됨',
    ref: 'SCENARIO-ela.md §5.2 #26',
  };
});

function elaRowClass(it) {
  if (it.exists === false) return it.severity === 'critical' ? 'svc-ela-row--critical-missing' : 'svc-ela-row--missing';
  return '';
}

const objectIdInterpretation = computed(() => {
  const d = detail.value;
  if (!d?.def) return null;
  const isNull = !d.def.objectId;
  const isEla = shortCmd(d.def.cmdClassNm) === 'ElaServiceCommand';
  if (!isNull) return null;
  return {
    severity: isEla ? 'warn' : 'info',
    message: isEla
      ? 'ELA Command 인데 objectId NULL — OBJECT 메타 14건 인프라 등록 누락 의심'
      : 'objectId NULL — 일반 Command 는 정상 (대부분 NULL, 매뉴얼 09 §6.1)',
    ref: isEla ? 'SCENARIO-ela.md §5.2 #14' : '매뉴얼 09 §6.1',
  };
});

// ─── 탭 (합집합 단일 목록 — 바로편집이라도 진단 콘텐츠 항상 노출) ──────────────
// ★ (2026-06-10, dspark) mode 분기 제거. def/attrs/funcMaps 는 편집 컨트롤,
//   health/object/elaInfra 는 detail 기반 읽기전용. count 는 편집 중이면 form, 아니면 detail 기준.
//   create 모드엔 detail 이 없어 진단/소속오브젝트/ELA 가 무의미 → 그 탭만 제외.
const tabItems = computed(() => {
  const d = detail.value;
  // 메시지 슬롯·함수 매핑 카운트: 편집 중(form 존재)이면 미삭제 행 수, 아니면 detail 길이
  const attrCount = isEditing.value
    ? (form.value.attrs || []).filter((a) => a.rowStatus !== 'D').length
    : (d?.attrs?.length || 0);
  const funcCount = isEditing.value
    ? (form.value.funcMaps || []).filter((f) => f.rowStatus !== 'D').length
    : (d?.funcMaps?.length || 0);

  const items = [
    { name: 'def',      tabLabel: '정의' },
    { name: 'attrs',    tabLabel: `메시지 슬롯 (${attrCount})` },
    { name: 'funcMaps', tabLabel: `함수 매핑 (${funcCount})` },
  ];

  // 진단 콘텐츠 탭 — create 에선 detail 이 없으므로 제외, 그 외(view/edit)는 항상 포함.
  if (mode.value !== 'create') {
    items.push({ name: 'health', tabLabel: `진단 ${d?.compatibility?.reasons?.length ? `(${d.compatibility.reasons.length})` : ''}` });
    items.push({ name: 'object', tabLabel: '소속 오브젝트' });
    if (d?.elaInfra) {
      items.push({ name: 'elaInfra', tabLabel: `ELA 인프라 (${d.elaInfra.summary.missingCount > 0 ? d.elaInfra.summary.okCount + '/' + (d.elaInfra.summary.okCount + d.elaInfra.summary.missingCount) : d.elaInfra.items.length})` });
    }
  }
  return items;
});

onMounted(() => list.reload());
</script>

<template>
  <CatalogPage
    title="서비스관리"
    :subtitle="`FRM_SERVICE_DEF · 운영 ` + (list.total.value || 0).toLocaleString() + `건`"
    :list="list"
    :columns="columns"
    :help="screenHelp"
    row-key="svDefNm"
    :active-filters="activeFilters"
    :selected-row="selected"
    @row-click="openDetail"
    @filter-remove="removeFilter"
    @retry="list.reload()"
  >
    <template #header-actions>
      <InButton variant="primary" size="md" :left-icon-show="false" :right-icon-show="false" @click="openCreate">+ 신규</InButton>
    </template>

    <template #filters>
      <div class="svc-filters">
        <InSearchField
          :model-value="staged.q"
          label="검색"
          input="서비스명 prefix — 예: IST0050 (Enter 또는 [조회] 버튼)"
          layout="vertical"
          :icon-clickable="false"
          @update:model-value="onSearch"
          @search="applyFilter"
        />
        <InSelect :model-value="staged.cmdClass" :options="cmdOptions" label="Command" input="전체" layout="vertical" size="sm" @update:model-value="onCmdClass" />
        <InSelect :model-value="staged.txSupportYn" :options="YN_FILTER_OPTIONS" label="TX" input="전체" layout="vertical" size="sm" @update:model-value="onTx" />
        <InSelect :model-value="staged.useLogYn" :options="YN_FILTER_OPTIONS" label="Log" input="전체" layout="vertical" size="sm" @update:model-value="onUseLog" />
        <InButton class="svc-filters__search-btn" variant="primary" size="md" :left-icon-show="false" :right-icon-show="false" @click="applyFilter">조회</InButton>
        <InButton class="svc-filters__reset-btn" variant="default" size="md" :left-icon-show="false" :right-icon-show="false" @click="resetFilter">초기화</InButton>
      </div>
    </template>

    <template #cell-svDefNm="{ value, row }">
      <span class="svc-name">
        <strong>{{ value }}</strong>
        <InTooltip v-if="row.note" :text="row.note"><span class="svc-note-dot">·</span></InTooltip>
      </span>
    </template>
    <template #cell-cmdClassNm="{ value }"><span class="svc-cmd">{{ shortCmd(value) }}</span></template>
    <template #cell-txSupportYn="{ value }">
      <InTag v-if="value === 'Y'" label="Y" variant="success" size="sm" /><span v-else class="muted">N</span>
    </template>
    <template #cell-asyncYn="{ value }">
      <InTag v-if="value === 'Y'" label="Y" variant="warning" size="sm" /><span v-else class="muted">N</span>
    </template>
    <template #cell-useLogYn="{ value }">
      <InTag v-if="value === 'Y'" label="Y" variant="brand" size="sm" /><span v-else class="muted">N</span>
    </template>
    <template #cell-modDate="{ value }"><span class="muted">{{ (value || '').slice(0, 10) }}</span></template>
    <template #cell-ops="{ row }">
      <span class="svc-row-actions" @click.stop>
        <InButton variant="text" size="sm" :left-icon-show="true" :right-icon-show="false" @click="gotoTester(row)">
          <template #prefix><InIcon name="chevron-right" :size="14" /></template>테스트
        </InButton>
        <InButton variant="text" size="sm" :left-icon-show="true" :right-icon-show="false" @click="copyRowEnvelope(row)">
          <template #prefix><InIcon name="content-copy" :size="14" /></template>JSON
        </InButton>
      </span>
    </template>

    <template #drawer>
      <MetaDetailEditor
        :mode="mode"
        :title="modalTitle"
        :loading="detailLoading"
        :saving="saving"
        :tabs="tabItems"
        :active-tab="drawerTab"
        :has-content="mode === 'create' || !!detail"
        :width="940"
        deletable-in-edit
        @update:active-tab="(t) => { drawerTab = t; }"
        @edit="enterEdit"
        @delete="confirmDelete = true"
        @save="save"
        @cancel="cancelEdit"
        @close="closePanel"
      >
        <!-- 진단 배지 — 바로편집이라도 항상 표시 (detail 존재 시. create 엔 detail 없어 자연히 안 뜸) -->
        <div v-if="detail" class="svc-drawer-head">
          <InTag v-if="detail.compatibility"
                 :label="detail.compatibility.level === 'ok' ? '진단 OK' : detail.compatibility.level === 'error' ? '운영 위험' : '주의'"
                 :variant="detail.compatibility.level === 'ok' ? 'success' : detail.compatibility.level === 'error' ? 'error' : 'warning'" size="sm" />
          <InTag v-if="trapBreakdown.compatError > 0"  :label="`호환성 ${trapBreakdown.compatError}건`" variant="error"   size="sm" />
          <InTag v-if="trapBreakdown.compatWarn > 0"   :label="`주의 ${trapBreakdown.compatWarn}건`"   variant="warning" size="sm" />
          <InTag v-if="trapBreakdown.msgMissing > 0"   :label="`메시지 미등록 ${trapBreakdown.msgMissing}건`"   variant="error" size="sm" />
          <InTag v-if="trapBreakdown.queryMissing > 0" :label="`SQL 미등록 ${trapBreakdown.queryMissing}건`"     variant="error" size="sm" />
          <InTag v-if="trapBreakdown.useYnN > 0"       :label="`use_yn=N ${trapBreakdown.useYnN}건`"             variant="warning" size="sm" />
          <InTag v-if="trapBreakdown.paramMismatch > 0" :label="`SQL bind 미매칭 ${trapBreakdown.paramMismatch}건`" variant="error" size="sm" />
          <InTag v-if="trapBreakdown.elaMissing > 0"   :label="`ELA 인프라 ${trapBreakdown.elaMissing}건`"        variant="error" size="sm" />
        </div>

        <!-- ───────── 정의 ───────── -->
        <section v-if="drawerTab === 'def'" class="svc-section">
          <!-- 편집 폼 -->
          <MetaDefForm v-if="isEditing" :model="form.def" :fields="defFields" />

          <!-- 보기 (진단 포함, 기존 보존) -->
          <dl v-else-if="detail" class="kv">
            <dt>서비스명</dt><dd>{{ detail.def.svDefNm }}</dd>
            <dt>Command</dt>
            <dd><code>{{ shortCmd(detail.def.cmdClassNm) }}</code> <span class="muted">— {{ detail.def.cmdClassNm }}</span></dd>
            <dt>tx / async / log</dt>
            <dd>{{ detail.def.txSupportYn }} / {{ detail.def.asyncYn }} / {{ detail.def.useLogYn }}</dd>
            <dt>objectId</dt>
            <dd>
              <span v-if="detail.def.objectId"><code>{{ detail.def.objectId }}</code></span>
              <span v-else class="muted">NULL</span>
              <InTag v-if="objectIdInterpretation" class="svc-def-chip"
                     :label="objectIdInterpretation.severity === 'warn' ? '등록 누락 의심' : '정상 (NULL 통상)'"
                     :variant="objectIdInterpretation.severity === 'warn' ? 'warning' : 'success'" size="sm" />
              <InTooltip v-if="objectIdInterpretation" :text="`${objectIdInterpretation.message} (근거: ${objectIdInterpretation.ref})`">
                <span class="svc-def-help">ⓘ</span>
              </InTooltip>
            </dd>
            <template v-if="tripleNameStatus">
              <dt>3중 동명</dt>
              <dd>
                <InTag :label="tripleNameStatus.same ? '정합' : '불일치'" :variant="tripleNameStatus.same ? 'success' : 'warning'" size="sm" />
                <span class="muted">func_nm = <code>{{ tripleNameStatus.funcNm }}</code></span>
                <InTooltip text="sv_def_nm = func_nm = query_name 이 일치해야 framework 자동 바인딩 정상 (multiquery §2). sql 매핑일 때만 의미.">
                  <span class="svc-def-help">ⓘ</span>
                </InTooltip>
              </dd>
            </template>
            <template v-if="elaDispatch">
              <dt>실 dispatch</dt>
              <dd>
                <InTag label="ELA sub-Command" variant="brand" size="sm" />
                <span class="muted">{{ elaDispatch.note }}</span>
                <span class="muted svc-def-ref">— {{ elaDispatch.ref }}</span>
              </dd>
            </template>
            <dt>비고</dt><dd>{{ detail.def.note || '—' }}</dd>
            <dt>변경</dt><dd>{{ detail.def.modUserId }} · {{ detail.def.modDate }}</dd>
          </dl>
        </section>

        <!-- ───────── 진단 (view) ───────── -->
        <section v-else-if="drawerTab === 'health'" class="svc-section">
          <div v-if="!detail || !detail.compatibility" class="muted">진단 정보 없음 (expand=health 미적용)</div>
          <div v-else>
            <div class="svc-health-summary" :class="`svc-health-summary--${detail.compatibility.level}`">
              <strong>전체 등급</strong>:
              <InTag :label="detail.compatibility.level === 'ok' ? 'OK' : detail.compatibility.level === 'error' ? 'ERROR' : 'WARN'"
                     :variant="detail.compatibility.level === 'ok' ? 'success' : detail.compatibility.level === 'error' ? 'error' : 'warning'" size="sm" />
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
          </div>
        </section>

        <!-- ───────── 속성/메시지 슬롯 ───────── -->
        <section v-else-if="drawerTab === 'attrs'" class="svc-section">
          <MetaChildGrid
            v-if="isEditing"
            :rows="form.attrs"
            :columns="attrColumns"
            key-field="svAttrId"
            :new-row="newAttr"
            add-label="+ 속성 추가"
            hint="속성명·value_type 칸의 🔍 로 메시지를 검색→선택하면 ME_/MT_ 가 자동 채워집니다. (IN_MSG/OUT_MSG 슬롯)"
            @cell-picker="onCellPicker"
          />
          <ul v-else-if="detail" class="resource-list">
            <li v-for="a in detail.attrs" :key="a.svAttrId" class="svc-attr-row">
              <div class="svc-attr-row__head">
                <HealthDot :tone="a.msgRef ? (a.msgRef.exists ? 'ok' : 'missing') : 'unknown'"
                           :title="a.msgRef && !a.msgRef.exists ? `메시지 ${a.valueType} 미등록` : ''" size="sm" />
                <InTag :label="a.svAttrType" :variant="a.svAttrType === 'IN_MSG' ? 'brand' : 'warning'" size="sm" />
                <code>{{ a.svAttrNm }}</code>
                <span class="muted">value_type:</span><code>{{ a.valueType }}</code>
                <span v-if="a.msgRef?.msgDefNm" class="muted">— {{ a.msgRef.msgDefNm }} ({{ a.msgRef.columnCount }}col · {{ a.msgRef.typeCd }})</span>
              </div>
              <table v-if="a.msgRef?.columns?.length" class="svc-msg-columns">
                <thead><tr><th>#</th><th>COL_ID</th><th>한글명</th><th>타입</th><th>USE</th><th>ENC</th></tr></thead>
                <tbody>
                  <tr v-for="c in a.msgRef.columns" :key="c.seqNo" :class="{ 'svc-msg-columns__off': c.useYn !== 'Y' }">
                    <td class="muted">{{ c.seqNo }}</td><td><code>{{ c.colId }}</code></td><td>{{ c.colNm }}</td><td class="muted">{{ c.dataType }}</td>
                    <td><InTag v-if="c.useYn === 'Y'" label="Y" variant="success" size="sm" /><InTag v-else label="N" variant="error" size="sm" /></td>
                    <td><InTag v-if="c.useEncYn === 'Y'" label="ENC" variant="brand" size="sm" /><span v-else class="muted">—</span></td>
                  </tr>
                </tbody>
              </table>
            </li>
          </ul>
        </section>

        <!-- ───────── 함수 매핑 ───────── -->
        <section v-else-if="drawerTab === 'funcMaps'" class="svc-section">
          <MetaChildGrid
            v-if="isEditing"
            :rows="form.funcMaps"
            :columns="funcMapColumns"
            key-field="svMapId"
            :new-row="newFuncMap"
            add-label="+ 매핑 추가"
            hint="sql=쿼리명(조회/프로시저) / entity=엔터티명(저장). func_nm 칸의 🔍 로 SQL 쿼리를 검색→선택할 수 있습니다."
            @cell-picker="onCellPicker"
          />
          <ul v-else-if="detail" class="resource-list">
            <li v-for="f in detail.funcMaps" :key="f.svMapId" class="svc-attr-row">
              <div class="svc-attr-row__head">
                <HealthDot :tone="f.queryRef ? (f.queryRef.exists ? 'ok' : 'missing') : 'unknown'"
                           :title="f.queryRef && !f.queryRef.exists ? `SQL ${f.funcNm} 미등록` : ''" size="sm" />
                <InTag :label="f.svMapTypeCd" size="sm" />
                <code>{{ f.funcNm }}</code>
                <span class="muted">req:</span><code>{{ f.reqMsgNm }}</code>
                <span class="muted">res:</span><code>{{ f.resMsgNm }}</code>
                <InTag v-if="f.queryRef?.paramDiff?.unmatched?.length" :label="`bind 미매칭 ${f.queryRef.paramDiff.unmatched.length}건`" variant="error" size="sm" />
                <InTag v-else-if="f.queryRef?.paramDiff && f.queryRef.paramDiff.sqlBindNames?.length" label="bind 정합" variant="success" size="sm" />
              </div>
              <pre v-if="f.queryRef?.bodyPreview" class="body-preview">{{ f.queryRef.bodyPreview }}</pre>
            </li>
          </ul>
        </section>

        <!-- ───────── 소속 오브젝트 (view) ───────── -->
        <section v-else-if="drawerTab === 'object'" class="svc-section">
          <p v-if="!detail || !detail.def.objectId" class="muted">objectId 없음 (대부분 NULL — 매뉴얼 09 §6.1).</p>
          <p v-else-if="!detail.objectRef" class="muted">조회 불가</p>
          <dl v-else class="kv">
            <dt>OBJECT_ID</dt><dd>{{ detail.objectRef.objectId }}</dd>
            <dt>OBJECT_NM</dt><dd>{{ detail.objectRef.objectNm }}</dd>
            <dt>한글명</dt><dd>{{ detail.objectRef.objectDisplayNm }}</dd>
            <dt>경로</dt><dd>{{ detail.objectRef.objectLink }}</dd>
            <dt>타입</dt><dd>{{ detail.objectRef.objectType }}</dd>
          </dl>
        </section>

        <!-- ───────── ELA 인프라 (view) ───────── -->
        <section v-else-if="drawerTab === 'elaInfra'" class="svc-section">
          <div v-if="!detail || !detail.elaInfra" class="muted">ELA 인프라 정보 없음</div>
          <div v-else>
            <div class="svc-health-summary" :class="detail.elaInfra.summary.missingCount > 0 ? 'svc-health-summary--error' : 'svc-health-summary--ok'">
              <strong>applCd</strong>:
              <code v-if="detail.elaInfra.applCd">{{ detail.elaInfra.applCd }}</code>
              <span v-else class="muted">미등록 (OBJECT 속성 appl_cd 없음 — 모든 평가 skip)</span>
              <span class="muted svc-def-ref">· OK {{ detail.elaInfra.summary.okCount }} · 미등록 {{ detail.elaInfra.summary.missingCount }} · 자동평가 외 {{ detail.elaInfra.summary.unknownCount }}</span>
            </div>
            <table class="svc-ela-table">
              <thead><tr><th>#</th><th>코드</th><th>라벨</th><th>테이블</th><th>등록</th><th>안내</th></tr></thead>
              <tbody>
                <tr v-for="it in detail.elaInfra.items" :key="it.seq" :class="elaRowClass(it)">
                  <td class="muted">{{ it.seq }}</td><td><code>{{ it.code }}</code></td><td>{{ it.label }}</td><td class="muted">{{ it.table }}</td>
                  <td>
                    <InTag v-if="it.exists === true"  label="OK"    variant="success" size="sm" />
                    <InTag v-else-if="it.exists === false" label="미등록" variant="error" size="sm" />
                    <InTag v-else label="—" variant="default" size="sm" />
                  </td>
                  <td class="svc-ela-hint"><span>{{ it.hint }}</span> <span class="muted svc-def-ref">— {{ it.ref }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </MetaDetailEditor>

      <!-- 삭제 확인 -->
      <InModal
        v-if="confirmDelete"
        :model-value="confirmDelete"
        type="confirm"
        title="서비스 삭제"
        :message="`'${selected?.svDefNm}' 를 삭제할까요? (함수매핑·속성도 함께 삭제)`"
        confirm-text="삭제"
        cancel-text="취소"
        @confirm="doDelete"
        @cancel="confirmDelete = false"
        @update:model-value="(v) => { if (!v) confirmDelete = false; }"
      />

      <!-- ★ (2026-06-15) 그리드 셀 검색 picker (func_nm SQL / ME_·MT_ 메시지) -->
      <SearchPickerModal
        v-if="pickerCol"
        :open="pickerOpen"
        :title="pickerCol.picker.title"
        :placeholder="pickerCol.picker.placeholder"
        :columns="pickerCol.picker.columns"
        :fetcher="pickerCol.picker.fetcher"
        :row-key="pickerCol.picker.rowKey"
        @update:open="pickerOpen = $event"
        @select="onPickerSelect"
      />
    </template>
  </CatalogPage>
</template>

<style scoped>
.svc-filters { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; }
.svc-filters > :deep(.in-sf) { flex: 1 1 320px; min-width: 280px; }
.svc-filters > :deep(.in-sel) { flex: 0 0 160px; }
.svc-filters__search-btn, .svc-filters__reset-btn { flex: 0 0 auto; align-self: flex-end; margin-bottom: 0; }

.svc-name { display: inline-flex; align-items: center; gap: 6px; }
.svc-note-dot { color: var(--in-text-subtle); }
.svc-row-actions { display: inline-flex; gap: 6px; align-items: center; justify-content: center; flex-wrap: nowrap; white-space: nowrap; }
.svc-row-actions :deep(.in-btn) { padding: 2px 6px; }
.svc-cmd { color: var(--in-text-accent); }
.muted { color: var(--in-text-subtle); }
.hint { margin: 0; font-size: var(--in-font-size-sm); }

.svc-drawer-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.svc-def-chip { margin-left: 8px; }
.svc-def-help { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; margin-left: 4px; border-radius: 50%; color: var(--in-text-subtle); cursor: help; font-size: 11px; }
.svc-def-ref { font-size: var(--in-font-size-sm); margin-left: 4px; }

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

.svc-attr-row { padding: 8px 0; border-bottom: 1px solid var(--in-border-default); }
.svc-attr-row:last-child { border-bottom: none; }
.svc-attr-row__head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; }
.svc-msg-columns { width: 100%; border-collapse: collapse; font-size: var(--in-font-size-sm); margin-top: 4px; }
.svc-msg-columns th { text-align: left; padding: 4px 8px; background: var(--in-surface-state-default); font-weight: var(--in-font-weight-medium); color: var(--in-text-subtle); }
.svc-msg-columns td { padding: 4px 8px; border-top: 1px solid var(--in-border-default); }
.svc-msg-columns__off td { opacity: 0.65; background: var(--in-surface-accent-warning, #fffbeb); }

.svc-ela-table { width: 100%; border-collapse: collapse; font-size: var(--in-font-size-sm); margin-top: 12px; }
.svc-ela-table th { text-align: left; padding: 6px 8px; background: var(--in-surface-state-default); color: var(--in-text-subtle); font-weight: var(--in-font-weight-medium); }
.svc-ela-table td { padding: 6px 8px; border-top: 1px solid var(--in-border-default); vertical-align: top; }
.svc-ela-row--critical-missing td { background: var(--in-surface-accent-error, #fef2f2); }
.svc-ela-row--missing td { background: var(--in-surface-accent-warning, #fffbeb); }
.svc-ela-hint { color: var(--in-text-default); }
.svc-section { padding: 12px 4px; }

.form-grid { display: flex; flex-direction: column; gap: 14px; }
.form-row { display: flex; flex-direction: column; gap: 4px; }

.kv { display: grid; grid-template-columns: 110px 1fr; gap: 8px 12px; margin: 0; }
.kv dt { color: var(--in-text-subtle); font-size: var(--in-font-size-sm); }
.kv dd { margin: 0; color: var(--in-text-default); word-break: break-all; }
.resource-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.resource-list code { font-family: var(--in-font-family-mono, ui-monospace); font-size: var(--in-font-size-sm); color: var(--in-text-default); }
.body-preview {
  flex-basis: 100%; margin: 6px 0 0; padding: 8px;
  background: var(--in-bg-white); border: 1px solid var(--in-border-default); border-radius: var(--in-radius-xxs);
  font-family: var(--in-font-family-mono, ui-monospace); font-size: 11px; line-height: 16px; color: var(--in-text-accent); overflow-x: auto;
}
</style>
