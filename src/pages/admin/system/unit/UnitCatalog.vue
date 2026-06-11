<script setup>
/**
 * UnitCatalog — CCD0080 단위업무관리 (admin lane system-env, 직접 REST).
 * ★ (2026-06-11, dspark): FRM_BIZ_UNIT 단일 그리드 CRUD. 단위업무 = 업무기준(FRM_UNIT_STD_MGR.UNIT_CD)의 마스터.
 *   AS-IS CCD0080_00_R01/S01 정합. 백엔드 GET|PUT /api/admin/system/units (rowStatus I/U/D). Figma 노드 ID = TBD.
 */
import { ref, onMounted } from 'vue';
import { adminApi } from '@/services/adminApi';
import { useToast } from '@/composables/useToast';

import MetaChildGrid from '@/components/feature/admin/MetaChildGrid.vue';
import InButton from '@/components/ui/InButton.vue';

const toast = useToast();

const rows = ref([]);
const q = ref('');
const loading = ref(false);
const saving = ref(false);

function ymd(s) { return (s || '').replace(/[^0-9]/g, ''); }
function toDateInput(s) { const d = ymd(s); return d.length === 8 ? `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}` : ''; }

const columns = [
  { key: 'unitCd', label: '단위업무코드', kind: 'text', width: 130 },
  { key: 'unitNm', label: '단위업무명', kind: 'text', width: 180 },
  { key: 'fullNm', label: '전체명칭', kind: 'text', width: 220 },
  { key: 'ordNo', label: '순번', kind: 'number', width: 80 },
  { key: 'staYmd', label: '시작일', kind: 'date', width: 150 },
  { key: 'endYmd', label: '종료일', kind: 'date', width: 150 },
  { key: 'note', label: '비고', kind: 'text' },
];

function newRow() {
  return { rowStatus: 'I', unitId: null, unitCd: '', unitNm: '', fullNm: '', ordNo: 0, staYmd: '1900-01-01', endYmd: '2999-12-31', note: '' };
}
function mapRows(data) {
  return (data || []).map((r) => ({ ...r, staYmd: toDateInput(r.staYmd), endYmd: toDateInput(r.endYmd) }));
}

async function load() {
  loading.value = true;
  try { rows.value = mapRows(await adminApi.system.units.list(q.value)); }
  catch (e) { toast.error('조회 실패: ' + (e?.response?.data?.error?.message || e?.message || e)); }
  finally { loading.value = false; }
}

async function save() {
  const dirty = rows.value.filter((r) => r.rowStatus);
  if (!dirty.length) { toast.info('변경된 내용이 없습니다.'); return; }
  saving.value = true;
  try {
    const payload = dirty.map((r) => ({ ...r, staYmd: ymd(r.staYmd), endYmd: ymd(r.endYmd) }));
    rows.value = mapRows(await adminApi.system.units.save(payload));
    toast.success('저장되었습니다.');
  } catch (e) { toast.error('저장 실패: ' + (e?.response?.data?.error?.message || e?.message || e)); }
  finally { saving.value = false; }
}

onMounted(load);
</script>

<template>
  <div class="unit">
    <header class="unit__head">
      <h2 class="unit__title">단위업무관리</h2>
      <p class="unit__desc">업무 단위(UNIT_CD) 마스터. 업무기준(CCD0020)·옵션관리(CCD0050)가 참조하는 단위 코드를 관리합니다.</p>
    </header>
    <div class="unit__toolbar">
      <input v-model="q" type="text" class="unit__search" placeholder="단위업무코드/명" @keyup.enter="load" />
      <InButton size="sm" :left-icon-show="false" :right-icon-show="false" :disabled="loading" @click="load">조회</InButton>
      <span class="unit__spacer" />
      <InButton size="sm" variant="primary" :left-icon-show="false" :right-icon-show="false" :disabled="saving" @click="save">저장</InButton>
    </div>
    <div class="unit__panel">
      <div class="unit__count">Total {{ rows.filter(r => r.rowStatus !== 'D').length }}건</div>
      <MetaChildGrid :rows="rows" :columns="columns" key-field="unitId" :new-row="newRow" add-label="입력" show-seq show-status />
    </div>
  </div>
</template>

<style scoped>
.unit { padding: 16px 20px; }
.unit__head { margin-bottom: 12px; }
.unit__title { margin: 0 0 4px; font-size: var(--in-font-size-lg); font-weight: var(--in-font-weight-bold); color: var(--in-text-default); }
.unit__desc { margin: 0; font-size: var(--in-font-size-sm); color: var(--in-text-subtle); }
.unit__toolbar { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.unit__search { width: 200px; padding: 6px 8px; border: 1px solid var(--in-border-input); border-radius: var(--in-radius-xs); font-size: var(--in-font-size-sm); }
.unit__spacer { flex: 1; }
.unit__panel { border: 1px solid var(--in-border-default); border-radius: var(--in-radius-sm); padding: 14px 16px; background: var(--in-bg-white); }
.unit__count { font-size: var(--in-font-size-sm); color: var(--in-text-subtle); margin-bottom: 8px; }
</style>
