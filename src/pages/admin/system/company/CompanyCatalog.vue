<script setup>
/**
 * CompanyCatalog — CCD0040 인사영역관리 (admin lane system-env, 직접 REST).
 * ★ (2026-06-11, dspark): FRM_COMPANY 단일 그리드 CRUD. 인사영역 = COMPANY_CD 마스터(멀티테넌시 기반).
 *   AS-IS CCD0040_00_R01/S01 정합. 백엔드 GET|PUT /api/admin/system/companies (rowStatus I/U/D).
 *   Figma 노드 ID = TBD.
 */
import { ref, computed, onMounted } from 'vue';
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

const YN = [{ value: 'Y', label: 'Y' }, { value: 'N', label: 'N' }];
const columns = [
  { key: 'companyCd', label: '인사영역', kind: 'text', width: 110 },
  { key: 'companyNm', label: '인사영역명', kind: 'text', width: 200 },
  { key: 'enCompanyNm', label: '영문명', kind: 'text', width: 220 },
  { key: 'mainCompanyCd', label: '주인사영역', kind: 'text', width: 110 },
  { key: 'mainCompanyYn', label: '주여부', kind: 'select', width: 80, options: YN },
  { key: 'grCompanyCd', label: '그룹사', kind: 'text', width: 100 },
  { key: 'staYmd', label: '시작일', kind: 'date', width: 150 },
  { key: 'endYmd', label: '종료일', kind: 'date', width: 150 },
  { key: 'note', label: '비고', kind: 'text' },
];

function newRow() {
  return {
    rowStatus: 'I', companyId: null, companyCd: '', companyNm: '', enCompanyNm: '',
    mainCompanyCd: '', mainCompanyYn: 'N', grCompanyCd: '', staYmd: '1900-01-01', endYmd: '2999-12-31', note: '',
  };
}

function mapRows(data) {
  return (data || []).map((r) => ({ ...r, staYmd: toDateInput(r.staYmd), endYmd: toDateInput(r.endYmd) }));
}

async function load() {
  loading.value = true;
  try { rows.value = mapRows(await adminApi.system.companies.list(q.value)); }
  catch (e) { toast.error('조회 실패: ' + (e?.response?.data?.error?.message || e?.message || e)); }
  finally { loading.value = false; }
}

async function save() {
  const dirty = rows.value.filter((r) => r.rowStatus);
  if (!dirty.length) { toast.info('변경된 내용이 없습니다.'); return; }
  saving.value = true;
  try {
    const payload = dirty.map((r) => ({ ...r, staYmd: ymd(r.staYmd), endYmd: ymd(r.endYmd) }));
    rows.value = mapRows(await adminApi.system.companies.save(payload));
    toast.success('저장되었습니다.');
  } catch (e) { toast.error('저장 실패: ' + (e?.response?.data?.error?.message || e?.message || e)); }
  finally { saving.value = false; }
}

onMounted(load);
</script>

<template>
  <div class="company">
    <header class="company__head">
      <h2 class="company__title">인사영역관리</h2>
      <p class="company__desc">회사/법인/사업부(COMPANY_CD) 마스터. 모든 데이터의 테넌트 기준이 되는 인사영역을 관리합니다.</p>
    </header>
    <div class="company__toolbar">
      <input v-model="q" type="text" class="company__search" placeholder="인사영역/명" @keyup.enter="load" />
      <InButton size="sm" :left-icon-show="false" :right-icon-show="false" :disabled="loading" @click="load">조회</InButton>
      <span class="company__spacer" />
      <InButton size="sm" variant="primary" :left-icon-show="false" :right-icon-show="false" :disabled="saving" @click="save">저장</InButton>
    </div>
    <div class="company__panel">
      <div class="company__count">Total {{ rows.filter(r => r.rowStatus !== 'D').length }}건</div>
      <MetaChildGrid :rows="rows" :columns="columns" key-field="companyId" :new-row="newRow" add-label="입력" show-seq show-status />
    </div>
  </div>
</template>

<style scoped>
.company { padding: 16px 20px; }
.company__head { margin-bottom: 12px; }
.company__title { margin: 0 0 4px; font-size: var(--in-font-size-lg); font-weight: var(--in-font-weight-bold); color: var(--in-text-default); }
.company__desc { margin: 0; font-size: var(--in-font-size-sm); color: var(--in-text-subtle); }
.company__toolbar { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.company__search { width: 200px; padding: 6px 8px; border: 1px solid var(--in-border-input); border-radius: var(--in-radius-xs); font-size: var(--in-font-size-sm); }
.company__spacer { flex: 1; }
.company__panel { border: 1px solid var(--in-border-default); border-radius: var(--in-radius-sm); padding: 14px 16px; background: var(--in-bg-white); }
.company__count { font-size: var(--in-font-size-sm); color: var(--in-text-subtle); margin-bottom: 8px; }
</style>
