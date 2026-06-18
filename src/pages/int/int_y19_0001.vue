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
 *   - TODO(후속): 조직 picker(org_cd/org_nm) — SearchPickerModal + 조직검색 서비스 배선.
 *
 * ★ (2026-06-18, dspark): SG 규격 컴포넌트로 재구성 — 검색=SgSearchBar / 목록·툴바=SgGridSection (components/common/).
 *   페이지는 config(searchFields/columns) + 핸들러 + 그리드 props 만 보유, CSS 는 페이지 컨테이너(.sg) 1개로 최소화.
 *   - 서버 필터 = 기준일자(base_ymd, envelope 보존). 클라이언트 필터 = 사업장명/사업장코드/주사업장여부.
 *     (사업장관리 envelope 는 base_ymd/company_cd 외 검색 파라미터 없음 → 전량 로드 후 그리드 내부 필터. 미팅 정합.)
 *   - 클라이언트 필터는 tui-grid 네이티브 filter()(행 숨김, 데이터 보존) → 저장(dirty) 무결성 유지. 건수는 JS 독립 계산.
 *
 * 신규 백엔드 0 — InDataTable self-managed 모드가 /serviceBroker.h5 envelope 를 내부 조립.
 */
import { ref, computed, onMounted } from 'vue';
import dayjs from 'dayjs';
import InDataTable from '@/components/ui/InDataTable.vue';
import SgSearchBar from '@/components/common/SgSearchBar.vue';
import SgGridSection from '@/components/common/SgGridSection.vue';
import { useToast } from '@/composables/useToast';
import { useAuthStore } from '@/stores/auth';

const toast = useToast();
const auth = useAuthStore();
const grid = ref(null);     // 마스터(사업장)
const detail = ref(null);   // 디테일(상위조직)

// 선택 사업장 — 마스터 행 선택 시 세팅(디테일 조회 biz_cd 필터 / 신규 행 int_biz_id 연결).
const selBizCd = ref('');
const selBizNm = ref('');
const selIntBizId = ref('');   // 상위 사업장 PK — 디테일 저장 FK(INT_Y08_BIZ_ORG.INT_BIZ_ID, biz_cd 아님)

/** 오늘 YYYYMMDD — AS-IS getStdDate() 대응 (기준일자 기본값). */
function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

// ── 검색 (SgSearchBar) ──
const searchFields = [
  { key: 'baseYmd', label: '기준일자', type: 'date', chip: false },
  { key: 'bizNm', label: '사업장명', type: 'text', placeholder: '사업장명 포함검색' },
  { key: 'bizCd', label: '사업장코드', type: 'text', placeholder: '코드 포함검색' },
  { key: 'mgrYn', label: '주사업장', type: 'select', placeholder: '전체',
    options: [{ value: '', label: '전체' }, { value: 'Y', label: '주사업장' }, { value: 'N', label: '비주사업장' }] },
];
const search = ref({ baseYmd: todayYmd(), bizNm: '', bizCd: '', mgrYn: '' });   // v-model (staged)
const appliedFilter = ref({ bizNm: '', bizCd: '', mgrYn: '' });                  // [조회] 확정 — 건수·그리드필터 출처

// 조회 결과 전량(필터 전) — 건수 계산용. retrieve() 반환 행 보존.
const masterRows = ref([]);
const detailRows = ref([]);

const hasClientFilter = computed(() => !!(appliedFilter.value.bizNm || appliedFilter.value.bizCd || appliedFilter.value.mgrYn));
function matchClient(r) {
  const { bizNm, bizCd, mgrYn } = appliedFilter.value;
  return (!bizNm || String(r.biz_nm || '').toLowerCase().includes(bizNm.toLowerCase()))
      && (!bizCd || String(r.biz_cd || '').toLowerCase().includes(bizCd.toLowerCase()))
      && (!mgrYn || r.mgr_biz_yn === mgrYn);
}
const masterShown = computed(() =>
  hasClientFilter.value ? masterRows.value.filter(matchClient).length : masterRows.value.length);

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
//   클라이언트 필터 대상 컬럼에 filter 옵션 부여(그리드 내부 필터 기본 스펙).
const columns = [
  { name: 'int_biz_id', header: 'int_biz_id', hidden: true },
  { name: 'company_cd', header: 'company_cd', hidden: true },
  { name: 'mgr_biz_yn', header: '주사업장여부', width: 90, align: 'center', cellType: 'checkbox', filter: 'text' },
  { name: 'biz_cd', header: '사업장코드', width: 90, align: 'center', editor: 'text', filter: 'text' },
  { name: 'biz_nm', header: '사업장명', width: 140, editor: 'text', filter: 'text' },
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

// 디테일 — 사업장조직(INT_Y08_BIZ_ORG). 실 테이블 컬럼 = INT_BIZ_ORG_ID(PK)·INT_BIZ_ID(상위 사업장 FK)·ORG_CD 뿐.
//   ★ (2026-06-17, dspark) sta_ymd/end_ymd/note/biz_cd 는 테이블에 없어 제거 — AS-IS 디테일 조회 ORA-00904 phantom 원인.
//     저장 키 = int_biz_id. org_nm 은 표시용(조직 마스터 조인/picker 는 후속 — TODO).
const detailColumns = [
  { name: 'int_biz_org_id', header: 'int_biz_org_id', hidden: true },
  { name: 'int_biz_id', header: 'int_biz_id', hidden: true },
  { name: 'org_cd', header: '조직코드', width: 160, align: 'center', editor: 'text' },
  { name: 'org_nm', header: '조직명', width: 260, editor: 'text' },
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

// ── 클라이언트 필터 → tui-grid 네이티브 filter()(행 숨김, 데이터/dirty 보존) ──
function applyGridFilter(g, col, code, value) {
  if (!g) return;
  if (value === '' || value == null) g.unfilter?.(col);
  else g.filter?.(col, [{ code, value }]);
}
function applyClientFilters() {
  const g = grid.value?.getInstance?.();
  if (!g) return;
  applyGridFilter(g, 'biz_nm', 'contain', appliedFilter.value.bizNm);
  applyGridFilter(g, 'biz_cd', 'contain', appliedFilter.value.bizCd);
  applyGridFilter(g, 'mgr_biz_yn', 'eq', appliedFilter.value.mgrYn);
}

// ── 마스터 조회(서버) + 클라이언트 필터 적용 ──
async function onRetrieve() {
  if (!confirmDiscard()) return;
  try {
    const rows = await grid.value.retrieve({
      ME_INT0001_01: [{ company_cd: auth.companyCd || '01', base_ymd: search.value.baseYmd }],
    });
    masterRows.value = Array.isArray(rows) ? rows : [];
    selBizCd.value = ''; selBizNm.value = ''; selIntBizId.value = '';   // 재조회 시 선택·디테일 초기화
    detail.value?.clearRows?.();
    detailRows.value = [];
    applyClientFilters();
    toast.success?.(`조회 ${masterShown.value}건`);
  } catch (e) {
    toast.error?.('조회 실패: ' + (e?.message || e));
  }
}
// [조회] — staged 입력을 applied 로 확정 후 조회.
function onSearch(values) {
  appliedFilter.value = {
    bizNm: (values.bizNm || '').trim(), bizCd: (values.bizCd || '').trim(), mgrYn: values.mgrYn || '',
  };
  onRetrieve();
}
// [초기화] — 검색 입력·필터·기준일자 초기화 후 조회.
function onResetSearch() {
  search.value = { baseYmd: todayYmd(), bizNm: '', bizCd: '', mgrYn: '' };
  appliedFilter.value = { bizNm: '', bizCd: '', mgrYn: '' };
  onRetrieve();
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
  selIntBizId.value = row.int_biz_id || '';
  if (!selBizCd.value) { detail.value?.clearRows?.(); detailRows.value = []; return; }   // 신규/미저장 행 — 디테일 비움
  try {
    const rows = await detail.value.retrieve({
      ME_INT0001_01: [{ company_cd: auth.companyCd || '01', base_ymd: search.value.baseYmd, biz_cd: selBizCd.value }],
    });
    detailRows.value = Array.isArray(rows) ? rows : [];
  } catch (err) {
    toast.error?.('상위조직 조회 실패: ' + (err?.message || err));
  }
}

// ── 디테일(상위조직) ──
function onDetailAdd() {
  if (!selBizCd.value) { toast.info?.('사업장을 먼저 선택하세요'); return; }
  // 실 테이블 컬럼만 — 저장 키는 int_biz_id(상위 사업장 FK). sta/end_ymd·note 없음.
  detail.value.addRow({ int_biz_org_id: '', int_biz_id: selIntBizId.value, org_cd: '', org_nm: '' });
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

onMounted(() => onSearch(search.value));
</script>

<template>
  <div class="sg">
    <!-- 검색 (SG 규격) — 제목·식별정보는 상단 앱바(route.meta) -->
    <SgSearchBar :fields="searchFields" v-model="search" @search="onSearch" @reset="onResetSearch" />

    <!-- 마스터: 사업장 목록 -->
    <SgGridSection
      title="사업장 목록"
      :count="masterShown"
      :sub="hasClientFilter ? `/ 전체 ${masterRows.length.toLocaleString()}` : ''"
      @add="onAdd"
      @delete="onDeleteChecked"
      @restore="onRestoreChecked"
      @save="onSave"
    >
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
    </SgGridSection>

    <!-- 디테일: 상위조직 (선택 사업장) -->
    <SgGridSection
      title="상위조직"
      :count="detailRows.length"
      :subtitle="selBizCd ? `— ${selBizNm} (${selBizCd})` : '— 사업장을 선택하세요'"
      :subtitle-muted="!selBizCd"
      :disabled="!selBizCd"
      @add="onDetailAdd"
      @delete="onDetailDelete"
      @restore="onDetailRestore"
      @save="onDetailSave"
    >
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
    </SgGridSection>
  </div>
</template>

<style scoped>
/* ★ (2026-06-18, dspark): 페이지 여백 상·좌·우 12px — 상단바 바로 아래 검색을 바짝 붙임.
   레이아웃(.main-layout__content)의 기본 여백 20px 을 본 화면만 음수 마진으로 상쇄 후 12px 적용
   (다른 화면은 20px 유지 — page-scoped). 검색/목록 스타일은 SgSearchBar/SgGridSection 가 보유. */
.sg {
  display: flex; flex-direction: column; gap: 12px;
  margin: -20px -20px 0;
  padding: 12px;
  font-family: var(--in-font-family-body);
}
</style>
