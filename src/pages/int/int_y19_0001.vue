<script setup>
/**
 * int_y19_0001 — 사업장관리 (AS-IS int_y19_0001.jsp / 메뉴 OBJECT_ID = ORM9999)
 *
 * ★ (2026-06-17, dspark): Phase 1 인사 비결재 도메인 첫 업무화면 (envelope 보존 호출).
 *   - 마스터(사업장 목록) + 디테일(상위조직). 마스터 행 선택 → 디테일 로드.
 *   - 보존 서비스: 마스터 INT_Y19_0001_01_R01/_S01(ME_INT0001_02) · 디테일 INT_Y19_0001_02_R01/_S01(ME_INT0001_03).
 *     검색 IN = ME_INT0001_01 (마스터 {company_cd,base_ymd} / 디테일 {company_cd,base_ymd,biz_cd}).
 *   - HEADER.objectId = ORM9999 (serviceId 접두 INT_* 와 달라 명시 필수 — 캡쳐 전문 정합).
 *   - 권위 전문: tests/recordings/2026-05-24_orm9999_biz_sud/ (실 INSERT/UPDATE/DELETE 캡쳐).
 *   - 상태(신규/수정/삭제)·soft-delete·저장 sStatus = InDataTable :show-status 내장.
 *   - 민감정보(ceo_ctz_no 주민번호)는 AS-IS 동등 평문 유지 (메모리 project_phase1_sensitive_plaintext_defer).
 *   - 미저장 변경 가드: 조회/기준일자 변경 시 dirty 있으면 확인.
 *   - TODO(후속): 조직 picker(org_cd/org_nm) — SearchPickerModal + 조직검색 서비스 배선.
 *
 * 신규 백엔드 0 — InDataTable self-managed 모드가 /serviceBroker.h5 envelope 를 내부 조립.
 */
import { ref, onMounted } from 'vue';
import dayjs from 'dayjs';
import InDataTable from '@/components/ui/InDataTable.vue';
import InButton from '@/components/ui/InButton.vue';
import InCard from '@/components/ui/InCard.vue';
import InDatePicker from '@/components/ui/InDatePicker.vue';
import { useToast } from '@/composables/useToast';
import { useAuthStore } from '@/stores/auth';

const toast = useToast();
const auth = useAuthStore();
const grid = ref(null);     // 마스터(사업장)
const detail = ref(null);   // 디테일(상위조직)

/** 오늘 YYYYMMDD — AS-IS getStdDate() 대응 (기준일자 기본값). */
function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}
const baseYmd = ref(todayYmd());

// 선택 사업장 — 마스터 행 선택 시 세팅(디테일 조회/신규 행 biz_cd 연결).
const selBizCd = ref('');
const selBizNm = ref('');

// DATE 정규화(공통) — 조회 "2020-01-01 00:00:00.0"/8자리 → 그리드 YYYY-MM-DD(datePicker 파싱) / 저장 YYYYMMDD.
const DATE_COLS = ['sta_ymd', 'end_ymd'];
function toYmdDash(v) {
  if (v == null || v === '') return '';
  const s = String(v).trim();
  const iso = /^\d{8}$/.test(s) ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : s;
  const d = dayjs(iso);
  return d.isValid() ? d.format('YYYY-MM-DD') : s;
}
function toYmd8(v) {
  if (v == null || v === '') return '';
  const s = String(v).trim();
  if (/^\d{8}$/.test(s)) return s;
  const d = dayjs(s);
  return d.isValid() ? d.format('YYYYMMDD') : s;
}
function mapRow(row) {
  const out = { ...row };
  DATE_COLS.forEach((k) => { out[k] = toYmdDash(row[k]); });
  return out;
}
function mapSave(row) {
  const out = { ...row };
  DATE_COLS.forEach((k) => { if (k in out) out[k] = toYmd8(out[k]); });
  return out;
}

// tui-grid datePicker 에디터 — 구분자 형식(yyyy-MM-dd)이라야 기존 셀값을 파싱해 캘린더에 표시.
const DATE_EDITOR = { type: 'datePicker', options: { format: 'yyyy-MM-dd' } };

// 마스터 — AS-IS DataGrid mySheet1 (ME_INT0001_02) 27컬럼 1:1. PK·company_cd·종사업장일련번호 숨김.
const columns = [
  { name: 'int_biz_id', header: 'int_biz_id', hidden: true },
  { name: 'company_cd', header: 'company_cd', hidden: true },
  { name: 'mgr_biz_yn', header: '주사업장여부', width: 90, align: 'center', cellType: 'checkbox' },
  { name: 'biz_cd', header: '사업장코드', width: 90, align: 'center', editor: 'text' },
  { name: 'biz_nm', header: '사업장명', width: 140, editor: 'text' },
  { name: 'tax_no', header: '사업자번호', width: 110, align: 'center', editor: 'text' },
  { name: 'tax_no_seq', header: '종사업장일련번호', hidden: true, editor: 'text' },
  { name: 'corp_no', header: '법인번호', width: 110, align: 'center', editor: 'text' },
  { name: 'corp_nm', header: '법인명', width: 110, editor: 'text' },
  { name: 'biz_eng_nm', header: '법인영문명', width: 200, editor: 'text' },
  { name: 'ceo_nm', header: '대표자명', width: 100, align: 'center', editor: 'text' },
  { name: 'ceo_eng_nm', header: '대표자영문명', width: 120, editor: 'text' },
  { name: 'ceo_ctz_no', header: '대표자주민번호', width: 130, align: 'center', editor: 'text' },
  { name: 'tel_no', header: '전화번호', width: 110, align: 'center', editor: 'text' },
  { name: 'fax_no', header: '팩스번호', width: 110, align: 'center', editor: 'text' },
  { name: 'zip_cd', header: '우편번호', width: 90, align: 'center', editor: 'text' },
  { name: 'addr1', header: '주소', width: 200, editor: 'text' },
  { name: 'addr2', header: '세부주소', width: 200, editor: 'text' },
  { name: 'eng_addr', header: '영문주소', width: 200, editor: 'text' },
  { name: 'tax_office_cd', header: '세무서코드', width: 100, align: 'center', editor: 'text' },
  { name: 'home_tax_id', header: '홈택스ID', width: 110, align: 'center', editor: 'text' },
  { name: 'org_nm', header: '담당자소속', width: 120, editor: 'text' },
  { name: 'charge_nm', header: '담당자', width: 100, align: 'center', editor: 'text' },
  { name: 'charge_tel_no', header: '담당자전화', width: 120, align: 'center', editor: 'text' },
  { name: 'sta_ymd', header: '시작일', width: 110, align: 'center', format: 'Ymd', editor: DATE_EDITOR },
  { name: 'end_ymd', header: '종료일', width: 110, align: 'center', format: 'Ymd', editor: DATE_EDITOR },
  { name: 'cc_income_tax', header: '소득세 계정코드', width: 120, editor: 'text' },
  { name: 'cc_resi_tax', header: '주민세 계정코드', width: 120, editor: 'text' },
];

// 디테일 — AS-IS DataGrid mySheet2 (ME_INT0001_03) 상위조직. PK·biz_cd 숨김.
//   org_cd/org_nm 은 현재 편집 텍스트(조직 picker 는 후속 — TODO).
const detailColumns = [
  { name: 'int_biz_org_id', header: 'int_biz_org_id', hidden: true },
  { name: 'biz_cd', header: 'biz_cd', hidden: true },
  { name: 'org_cd', header: '조직코드', width: 140, align: 'center', editor: 'text' },
  { name: 'org_nm', header: '조직명', width: 220, editor: 'text' },
  { name: 'sta_ymd', header: '시작일', width: 120, align: 'center', format: 'Ymd', editor: DATE_EDITOR },
  { name: 'end_ymd', header: '종료일', width: 120, align: 'center', format: 'Ymd', editor: DATE_EDITOR },
  { name: 'note', header: '비고', width: 240, editor: 'text' },
];

// ── 미저장 변경 가드 ──
function hasUnsaved() {
  const m = grid.value?.collectDirty?.() || [];
  const d = detail.value?.collectDirty?.() || [];
  return m.length + d.length > 0;
}
function confirmDiscard() {
  return !hasUnsaved() || window.confirm('저장하지 않은 변경분이 있습니다. 폐기하고 계속할까요?');
}

// ── 마스터 ──
async function onRetrieve() {
  if (!confirmDiscard()) return;
  try {
    const rows = await grid.value.retrieve({
      ME_INT0001_01: [{ company_cd: auth.companyCd || '01', base_ymd: baseYmd.value }],
    });
    selBizCd.value = ''; selBizNm.value = '';   // 재조회 시 선택·디테일 초기화
    detail.value?.clearRows?.();
    toast.success?.(`조회 ${rows?.length || 0}건`);
  } catch (e) {
    toast.error?.('조회 실패: ' + (e?.message || e));
  }
}
function onAdd() {
  grid.value.addRow({
    int_biz_id: '', company_cd: auth.companyCd || '01', mgr_biz_yn: 'N',
    biz_cd: '', biz_nm: '', sta_ymd: dayjs().format('YYYY-MM-DD'), end_ymd: '9999-12-31',
  });
}
function onDeleteChecked() {
  const removed = grid.value.markDeleteChecked();
  if (!removed.length) toast.info?.('선택된 행이 없습니다');
}
function onRestoreChecked() { grid.value.restoreChecked(); }
async function onSave() {
  try {
    const r = await grid.value.save();
    if (r.skipped) toast.info?.('변경분 0건');
    else toast.success?.(`저장 ${r.dirty.length}건 + 재조회`);
  } catch (e) {
    toast.error?.('저장 실패: ' + (e?.message || e));
  }
}

// ── 마스터 행 선택 → 디테일(상위조직) 로드 ──
async function onMasterClick(e) {
  const g = grid.value?.getInstance?.();
  if (!g || e?.rowKey == null) return;
  const row = g.getRow(e.rowKey) || {};
  selBizCd.value = row.biz_cd || '';
  selBizNm.value = row.biz_nm || '';
  if (!selBizCd.value) { detail.value?.clearRows?.(); return; }   // 신규/미저장 행 — 디테일 비움
  try {
    await detail.value.retrieve({
      ME_INT0001_01: [{ company_cd: auth.companyCd || '01', base_ymd: baseYmd.value, biz_cd: selBizCd.value }],
    });
  } catch (err) {
    toast.error?.('상위조직 조회 실패: ' + (err?.message || err));
  }
}

// ── 디테일(상위조직) ──
function onDetailAdd() {
  if (!selBizCd.value) { toast.info?.('사업장을 먼저 선택하세요'); return; }
  detail.value.addRow({
    int_biz_org_id: '', biz_cd: selBizCd.value, org_cd: '', org_nm: '',
    sta_ymd: dayjs().format('YYYY-MM-DD'), end_ymd: '9999-12-31', note: '',
  });
}
function onDetailDelete() {
  const removed = detail.value.markDeleteChecked();
  if (!removed.length) toast.info?.('선택된 행이 없습니다');
}
function onDetailRestore() { detail.value.restoreChecked(); }
async function onDetailSave() {
  if (!selBizCd.value) { toast.info?.('사업장을 먼저 선택하세요'); return; }
  try {
    const r = await detail.value.save();   // 저장 후 직전 조회(해당 biz_cd) 자동 재조회
    if (r.skipped) toast.info?.('변경분 0건');
    else toast.success?.(`상위조직 저장 ${r.dirty.length}건`);
  } catch (e) {
    toast.error?.('저장 실패: ' + (e?.message || e));
  }
}

onMounted(onRetrieve);
</script>

<template>
  <div class="biz">
    <header class="biz__head">
      <h1 class="biz__title">사업장관리</h1>
      <p class="biz__sub">
        사업장 정보 조회·등록·수정·삭제 — <code>ORM9999</code> · envelope
        <code>INT_Y19_0001</code>
      </p>
    </header>

    <InCard class="biz__bar">
      <div class="biz__search">
        <label class="biz__label">기준일자</label>
        <InDatePicker
          :model-value="baseYmd"
          hide-label
          class="biz__ymd"
          @update:model-value="(v) => (baseYmd = v || '')"
          @change="onRetrieve"
        />
        <InButton variant="primary" :left-icon-show="false" :right-icon-show="false" @click="onRetrieve">
          조회
        </InButton>
      </div>
    </InCard>

    <!-- 마스터: 사업장 목록 -->
    <section class="biz__grid-wrap">
      <div class="biz__actions">
        <strong class="biz__grid-title">사업장 목록</strong>
        <div class="biz__btns">
          <InButton size="sm" :left-icon-show="false" :right-icon-show="false" @click="onAdd">입력</InButton>
          <InButton size="sm" variant="danger" :left-icon-show="false" :right-icon-show="false" @click="onDeleteChecked">삭제</InButton>
          <InButton size="sm" :left-icon-show="false" :right-icon-show="false" @click="onRestoreChecked">복원</InButton>
          <InButton size="sm" variant="primary" :left-icon-show="false" :right-icon-show="false" @click="onSave">저장</InButton>
        </div>
      </div>
      <InDataTable
        ref="grid"
        :columns="columns"
        :height="420"
        :options="{ rowHeaders: ['rowNum', 'checkbox'], bodyHeight: 360 }"
        retrieve-service-id="INT_Y19_0001_01_R01"
        save-service-id="INT_Y19_0001_01_S01"
        slot-name="ME_INT0001_02"
        :header="{ objectId: 'ORM9999' }"
        :row-mapper="mapRow"
        :save-mapper="mapSave"
        show-status
        @click="onMasterClick"
      />
    </section>

    <!-- 디테일: 상위조직 (선택 사업장) -->
    <section class="biz__grid-wrap">
      <div class="biz__actions">
        <strong class="biz__grid-title">
          상위조직
          <span v-if="selBizCd" class="biz__sel">— {{ selBizNm }} ({{ selBizCd }})</span>
          <span v-else class="biz__sel biz__sel--muted">— 사업장을 선택하세요</span>
        </strong>
        <div class="biz__btns">
          <InButton size="sm" :left-icon-show="false" :right-icon-show="false" :disabled="!selBizCd" @click="onDetailAdd">입력</InButton>
          <InButton size="sm" variant="danger" :left-icon-show="false" :right-icon-show="false" @click="onDetailDelete">삭제</InButton>
          <InButton size="sm" :left-icon-show="false" :right-icon-show="false" @click="onDetailRestore">복원</InButton>
          <InButton size="sm" variant="primary" :left-icon-show="false" :right-icon-show="false" :disabled="!selBizCd" @click="onDetailSave">저장</InButton>
        </div>
      </div>
      <InDataTable
        ref="detail"
        :columns="detailColumns"
        :height="300"
        :options="{ rowHeaders: ['rowNum', 'checkbox'], bodyHeight: 240 }"
        retrieve-service-id="INT_Y19_0001_02_R01"
        save-service-id="INT_Y19_0001_02_S01"
        slot-name="ME_INT0001_03"
        :header="{ objectId: 'ORM9999' }"
        :row-mapper="mapRow"
        :save-mapper="mapSave"
        show-status
      />
    </section>
  </div>
</template>

<style scoped>
.biz { display: flex; flex-direction: column; gap: 16px; padding: 24px; font-family: var(--in-font-family-body); }
.biz__title { margin: 0; font-size: 22px; line-height: 28px; font-weight: var(--in-font-weight-medium); color: var(--in-text-default); }
.biz__sub { margin: 6px 0 0; font-size: var(--in-font-size-sm); color: var(--in-text-subtle); }
.biz__sub code { font-family: var(--in-font-family-mono, ui-monospace); color: var(--in-text-accent); }
.biz__bar { padding: 16px; }
.biz__search { display: flex; gap: 12px; align-items: center; }
.biz__label { font-size: var(--in-font-size-sm); color: var(--in-text-default); white-space: nowrap; }
.biz__ymd { width: 160px; }
.biz__grid-wrap { display: flex; flex-direction: column; gap: 8px; }
.biz__actions { display: flex; align-items: center; justify-content: space-between; }
.biz__grid-title { font-size: var(--in-font-size-md); color: var(--in-text-default); }
.biz__sel { font-size: var(--in-font-size-sm); font-weight: var(--in-font-weight-regular); color: var(--in-text-brand); margin-left: 4px; }
.biz__sel--muted { color: var(--in-text-subtle); }
.biz__btns { display: flex; gap: 6px; }
</style>
