<script setup>
/**
 * CommonCodeCatalog — CCD0010 공통코드관리 (admin lane system-env, 직접 REST).
 * ★ (2026-06-11, dspark): 마스터-디테일. 좌 코드분류(FRM_CODE_KIND) + 우 코드(FRM_CODE).
 *   코드분류 선택 → 해당 코드 목록 조회/편집. 둘 다 rowStatus(I/U/D). 코드분류 삭제는 하위코드 역참조 가드.
 *   AS-IS CCD0010_00_R01(코드분류)/R03(코드). ⚠️ "두 얼굴": 런타임 코드조회는 envelope(캐시) — evict 별도.
 *   Figma 노드 ID = TBD.
 */
import { ref, computed, onMounted } from 'vue';
import dayjs from 'dayjs';
import { adminApi } from '@/services/adminApi';
import { useToast } from '@/composables/useToast';

import MetaChildGrid from '@/components/feature/admin/MetaChildGrid.vue';
import InButton from '@/components/ui/InButton.vue';

const toast = useToast();

function ymd(s) { return (s || '').replace(/[^0-9]/g, ''); }
function toDateInput(s) { const d = ymd(s); return d.length === 8 ? `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}` : ''; }
function mapDates(arr) { return (arr || []).map((r) => ({ ...r, staYmd: toDateInput(r.staYmd), endYmd: toDateInput(r.endYmd) })); }

const YN = [{ value: 'Y', label: 'Y' }, { value: 'N', label: 'N' }];

// ── 코드분류 (마스터) ──
const kindRows = ref([]);
const kindQ = ref('');
const selectedKindRow = ref(null);
const selectedKind = computed(() => selectedKindRow.value?.cdKind || '');
const loadingKinds = ref(false);
const savingKinds = ref(false);

const kindColumns = [
  { key: 'cdKind', label: '코드분류', kind: 'text', width: 160 },
  { key: 'cdKindNm', label: '코드분류명', kind: 'text' },
  { key: 'changeYn', label: '변경', kind: 'select', width: 70, options: YN },
];
function newKind() {
  return { rowStatus: 'I', cdKindId: null, cdKind: '', cdKindNm: '', changeYn: 'Y', staYmd: '1900-01-01', endYmd: '2999-12-31', note: '' };
}

// ── 코드 (디테일) ──
const codeRows = ref([]);
const stdDate = ref(dayjs().format('YYYY-MM-DD'));
const loadingCodes = ref(false);
const savingCodes = ref(false);

const codeColumns = [
  { key: 'cd', label: '코드', kind: 'text', width: 110 },
  { key: 'cdNm', label: '코드명', kind: 'text', width: 200 },
  { key: 'shortNm', label: '약명', kind: 'text', width: 100 },
  { key: 'ordNo', label: '순번', kind: 'text', width: 70 },
  { key: 'mainCd', label: '주코드', kind: 'text', width: 90 },
  { key: 'sysCd', label: '시스템코드', kind: 'text', width: 100 },
  { key: 'staYmd', label: '시작일', kind: 'date', width: 140 },
  { key: 'endYmd', label: '종료일', kind: 'date', width: 140 },
  { key: 'note', label: '비고', kind: 'text' },
];
function newCode() {
  return { rowStatus: 'I', cdId: null, cd: '', cdNm: '', shortNm: '', ordNo: '', mainCd: '', sysCd: '', staYmd: '1900-01-01', endYmd: '2999-12-31', note: '' };
}

async function loadKinds() {
  loadingKinds.value = true;
  try { kindRows.value = mapDates(await adminApi.system.codeKinds.list(kindQ.value)); }
  catch (e) { toast.error('코드분류 조회 실패: ' + msg(e)); }
  finally { loadingKinds.value = false; }
}

async function onSelectKind(row) {
  if (!row.cdKind || row.rowStatus === 'I') { toast.info('저장된 코드분류만 코드를 조회할 수 있습니다.'); return; }
  selectedKindRow.value = row;
  await loadCodes();
}

async function loadCodes() {
  if (!selectedKind.value) return;
  loadingCodes.value = true;
  try { codeRows.value = mapDates(await adminApi.system.codeKinds.codes(selectedKind.value, { stdDate: ymd(stdDate.value) })); }
  catch (e) { toast.error('코드 조회 실패: ' + msg(e)); }
  finally { loadingCodes.value = false; }
}

async function saveKinds() {
  const dirty = kindRows.value.filter((r) => r.rowStatus);
  if (!dirty.length) { toast.info('변경된 코드분류가 없습니다.'); return; }
  savingKinds.value = true;
  try {
    const payload = dirty.map((r) => ({ ...r, staYmd: ymd(r.staYmd), endYmd: ymd(r.endYmd) }));
    kindRows.value = mapDates(await adminApi.system.codeKinds.save(payload));
    selectedKindRow.value = null; codeRows.value = [];
    toast.success('코드분류 저장되었습니다.');
  } catch (e) { toast.error('코드분류 저장 실패: ' + msg(e)); }
  finally { savingKinds.value = false; }
}

async function saveCodes() {
  if (!selectedKind.value) { toast.info('코드분류를 먼저 선택하세요.'); return; }
  const dirty = codeRows.value.filter((r) => r.rowStatus);
  if (!dirty.length) { toast.info('변경된 코드가 없습니다.'); return; }
  savingCodes.value = true;
  try {
    const body = { stdDate: ymd(stdDate.value), rows: dirty.map((r) => ({ ...r, staYmd: ymd(r.staYmd), endYmd: ymd(r.endYmd) })) };
    codeRows.value = mapDates(await adminApi.system.codeKinds.saveCodes(selectedKind.value, body));
    toast.success('코드 저장되었습니다.');
  } catch (e) { toast.error('코드 저장 실패: ' + msg(e)); }
  finally { savingCodes.value = false; }
}

function msg(e) { return e?.response?.data?.error?.message || e?.message || e; }

onMounted(loadKinds);
</script>

<template>
  <div class="code">
    <header class="code__head">
      <h2 class="code__title">공통코드관리</h2>
      <p class="code__desc">코드분류(CD_KIND)별 공통코드를 관리합니다. 전 화면의 콤보·코드값 원천.</p>
    </header>

    <div class="code__body">
      <!-- 좌: 코드분류 마스터 -->
      <section class="code__kinds">
        <div class="code__panel-head">
          <span class="code__panel-title">코드분류</span>
          <div class="code__panel-actions">
            <input v-model="kindQ" type="text" class="code__search" placeholder="분류/명" @keyup.enter="loadKinds" />
            <InButton size="sm" :left-icon-show="false" :right-icon-show="false" @click="loadKinds">조회</InButton>
            <InButton size="sm" variant="primary" :left-icon-show="false" :right-icon-show="false" :disabled="savingKinds" @click="saveKinds">저장</InButton>
          </div>
        </div>
        <MetaChildGrid
          :rows="kindRows"
          :columns="kindColumns"
          key-field="cdKindId"
          :new-row="newKind"
          add-label="입력"
          show-seq
          show-status
          selectable
          :selected-row="selectedKindRow"
          @row-select="onSelectKind"
          hint="행 좌측 ○ 선택 시 우측에 해당 분류의 코드가 표시됩니다."
        />
      </section>

      <!-- 우: 코드 디테일 -->
      <section class="code__codes">
        <div class="code__panel-head">
          <span class="code__panel-title">
            코드 <template v-if="selectedKind">— <b>{{ selectedKind }}</b></template>
          </span>
          <div class="code__panel-actions">
            <label>기준일</label>
            <input v-model="stdDate" type="date" class="code__date" :disabled="!selectedKind" @change="loadCodes" />
            <InButton size="sm" variant="primary" :left-icon-show="false" :right-icon-show="false" :disabled="savingCodes || !selectedKind" @click="saveCodes">저장</InButton>
          </div>
        </div>
        <div v-if="!selectedKind" class="code__empty">← 좌측 코드분류를 선택하세요.</div>
        <MetaChildGrid
          v-else
          :rows="codeRows"
          :columns="codeColumns"
          key-field="cdId"
          :new-row="newCode"
          add-label="입력"
          show-seq
          show-status
        />
      </section>
    </div>
  </div>
</template>

<style scoped>
.code { padding: 16px 20px; }
.code__head { margin-bottom: 12px; }
.code__title { margin: 0 0 4px; font-size: var(--in-font-size-lg); font-weight: var(--in-font-weight-bold); color: var(--in-text-default); }
.code__desc { margin: 0; font-size: var(--in-font-size-sm); color: var(--in-text-subtle); }
.code__body { display: flex; gap: 16px; align-items: flex-start; }
.code__kinds { flex: 0 0 460px; border: 1px solid var(--in-border-default); border-radius: var(--in-radius-sm); padding: 14px 16px; background: var(--in-bg-white); }
.code__codes { flex: 1 1 auto; min-width: 0; border: 1px solid var(--in-border-default); border-radius: var(--in-radius-sm); padding: 14px 16px; background: var(--in-bg-white); }
.code__panel-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; gap: 10px; }
.code__panel-title { font-weight: var(--in-font-weight-bold); color: var(--in-text-default); }
.code__panel-actions { display: flex; align-items: center; gap: 6px; }
.code__panel-actions label { font-size: var(--in-font-size-sm); color: var(--in-text-subtle); }
.code__search { width: 120px; padding: 5px 8px; border: 1px solid var(--in-border-input); border-radius: var(--in-radius-xs); font-size: var(--in-font-size-sm); }
.code__date { width: 150px; padding: 5px 8px; border: 1px solid var(--in-border-input); border-radius: var(--in-radius-xs); font-size: var(--in-font-size-sm); }
.code__empty { color: var(--in-text-subtle); font-size: var(--in-font-size-sm); padding: 24px; text-align: center; }
</style>
