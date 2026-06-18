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
 * ★ (2026-06-18, dspark): SG 화면 규격(검색박스+그리드)으로 레이아웃 재구성 — 2026-06-17 기획 미팅 결정.
 *   - 상단 = 검색 카드(접기/펴기) → 리스트 헤더(건수 + 툴바) → 그리드 순.
 *   - 서버 필터 = 기준일자(base_ymd, envelope 보존). 클라이언트 필터 = 사업장명/사업장코드/주사업장여부.
 *     (사업장관리 envelope 는 base_ymd/company_cd 외 검색 파라미터가 없음 — 추가 서버검색은 메타 변경 수반이라
 *      보존 노선상 전량 로드 후 그리드 내부 필터로 처리. 기획 미팅 "전량 로드 + 그리드 내부 필터 기본" 정합.)
 *   - 클라이언트 필터는 tui-grid 네이티브 filter()(행 숨김, 데이터 보존)로 적용 → 저장(dirty) 무결성 유지.
 *     건수는 masterRows 에서 JS 로 독립 계산(applied 필터 기준).
 *
 * 신규 백엔드 0 — InDataTable self-managed 모드가 /serviceBroker.h5 envelope 를 내부 조립.
 */
import { ref, computed, onMounted } from 'vue';
import dayjs from 'dayjs';
import InDataTable from '@/components/ui/InDataTable.vue';
import InButton from '@/components/ui/InButton.vue';
import InCard from '@/components/ui/InCard.vue';
import InDatePicker from '@/components/ui/InDatePicker.vue';
import InTextField from '@/components/ui/InTextField.vue';
import InSelect from '@/components/ui/InSelect.vue';
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

// ── 검색 카드 상태 (★ 2026-06-18) ──
const filterOpen = ref(true);                  // 검색 카드 접기/펴기
// 클라이언트 필터 입력값(staged) — [조회] 클릭 시 applied 로 확정.
const fBizNm = ref('');
const fBizCd = ref('');
const fMgrYn = ref('');
// 확정 적용값(applied) — 건수 계산·그리드 필터의 단일 출처.
const aBizNm = ref('');
const aBizCd = ref('');
const aMgrYn = ref('');
const mgrOptions = [
  { value: '', label: '전체' },
  { value: 'Y', label: '주사업장' },
  { value: 'N', label: '비주사업장' },
];

// 조회 결과 전량(필터 전) — 건수 계산용. retrieve() 반환 행 보존.
const masterRows = ref([]);

const hasClientFilter = computed(() => !!(aBizNm.value || aBizCd.value || aMgrYn.value));
function matchClient(r) {
  const nm = aBizNm.value.toLowerCase();
  const cd = aBizCd.value.toLowerCase();
  return (!nm || String(r.biz_nm || '').toLowerCase().includes(nm))
      && (!cd || String(r.biz_cd || '').toLowerCase().includes(cd))
      && (!aMgrYn.value || r.mgr_biz_yn === aMgrYn.value);
}
// 화면에 보이는(필터 통과) 건수.
const masterShown = computed(() =>
  hasClientFilter.value ? masterRows.value.filter(matchClient).length : masterRows.value.length);

// 디테일 건수.
const detailRows = ref([]);

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
//   ★ (2026-06-18, dspark): 검색 카드 클라이언트 필터 대상 컬럼에 filter 옵션 부여(그리드 내부 필터 기본 스펙).
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
//   ★ (2026-06-17, dspark) sta_ymd/end_ymd/note/biz_cd 는 테이블에 없어 제거 — AS-IS 디테일 조회 ORA-00904("END_YMD") phantom 원인.
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
  applyGridFilter(g, 'biz_nm', 'contain', aBizNm.value.trim());
  applyGridFilter(g, 'biz_cd', 'contain', aBizCd.value.trim());
  applyGridFilter(g, 'mgr_biz_yn', 'eq', aMgrYn.value);
}

// ── 마스터 조회(서버) + 클라이언트 필터 적용 ──
async function onRetrieve() {
  if (!confirmDiscard()) return;
  try {
    const rows = await grid.value.retrieve({
      ME_INT0001_01: [{ company_cd: auth.companyCd || '01', base_ymd: baseYmd.value }],
    });
    masterRows.value = Array.isArray(rows) ? rows : [];
    selBizCd.value = ''; selBizNm.value = ''; selIntBizId.value = '';   // 재조회 시 선택·디테일 초기화
    detail.value?.clearRows?.();
    detailRows.value = [];
    applyClientFilters();   // 재조회 후 적용된 클라 필터 재적용(빈 값이면 unfilter)
    toast.success?.(`조회 ${masterShown.value}건`);
  } catch (e) {
    toast.error?.('조회 실패: ' + (e?.message || e));
  }
}
// [조회] — staged 입력을 applied 로 확정 후 조회.
function onSearch() {
  aBizNm.value = fBizNm.value.trim();
  aBizCd.value = fBizCd.value.trim();
  aMgrYn.value = fMgrYn.value;
  onRetrieve();
}
// [초기화] — 검색 입력·필터·기준일자 초기화 후 조회.
function onResetSearch() {
  fBizNm.value = ''; fBizCd.value = ''; fMgrYn.value = '';
  aBizNm.value = ''; aBizCd.value = ''; aMgrYn.value = '';
  baseYmd.value = todayYmd();
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
      ME_INT0001_01: [{ company_cd: auth.companyCd || '01', base_ymd: baseYmd.value, biz_cd: selBizCd.value }],
    });
    detailRows.value = Array.isArray(rows) ? rows : [];
  } catch (err) {
    toast.error?.('상위조직 조회 실패: ' + (err?.message || err));
  }
}

// 선택 사업장 — 마스터 행 선택 시 세팅(디테일 조회 biz_cd 필터 / 신규 행 int_biz_id 연결).
const selBizCd = ref('');
const selBizNm = ref('');
const selIntBizId = ref('');   // 상위 사업장 PK — 디테일 저장 FK(INT_Y08_BIZ_ORG.INT_BIZ_ID, biz_cd 아님)

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

onMounted(onSearch);
</script>

<template>
  <div class="sg">
    <!-- ★ (2026-06-18, dspark): 페이지 제목·식별정보는 상단 앱바로 이전(route.meta.title/objInfo).
         본문은 검색 카드부터 바로 시작 — 상단바 바로 아래 검색이 보이도록. -->

    <!-- 검색 카드 (SG 규격: 검색박스 + 그리드) -->
    <InCard class="sg__search">
      <div v-show="filterOpen" class="sg__search-body">
        <div class="sg__fields">
          <div class="sg__field">
            <label class="sg__label">기준일자</label>
            <InDatePicker
              :model-value="baseYmd"
              hide-label
              @update:model-value="(v) => (baseYmd = v || '')"
              @change="onSearch"
            />
          </div>
          <div class="sg__field">
            <label class="sg__label">사업장명</label>
            <InTextField
              :model-value="fBizNm"
              :show-label="false"
              input="사업장명 포함검색"
              @update:model-value="(v) => (fBizNm = v)"
              @keyup.enter="onSearch"
            />
          </div>
          <div class="sg__field">
            <label class="sg__label">사업장코드</label>
            <InTextField
              :model-value="fBizCd"
              :show-label="false"
              input="코드 포함검색"
              @update:model-value="(v) => (fBizCd = v)"
              @keyup.enter="onSearch"
            />
          </div>
          <div class="sg__field">
            <label class="sg__label">주사업장</label>
            <InSelect
              :model-value="fMgrYn"
              :options="mgrOptions"
              :show-label="false"
              input="전체"
              size="sm"
              @update:model-value="(v) => (fMgrYn = v)"
            />
          </div>
        </div>
        <div class="sg__search-actions">
          <InButton variant="primary" :left-icon-show="false" :right-icon-show="false" @click="onSearch">조회</InButton>
          <InButton variant="default" :left-icon-show="false" :right-icon-show="false" @click="onResetSearch">초기화</InButton>
        </div>
      </div>
      <!-- 접기/펴기 토글 (기획 미팅: 검색박스 접기) -->
      <button
        type="button"
        class="sg__toggle"
        :aria-expanded="filterOpen"
        :title="filterOpen ? '검색 접기' : '검색 펴기'"
        @click="filterOpen = !filterOpen"
      >
        <span class="sg__chev" :class="{ 'sg__chev--up': filterOpen }" aria-hidden="true" />
      </button>
    </InCard>

    <!-- 활성 필터 칩 — ★ (2026-06-18, dspark): 검색 접혔을 때만 표시(펼침 시 필드로 보여 중복).
         기획 미팅 "검색박스 접기 + 칩 표시" 정합. -->
    <div v-if="!filterOpen && hasClientFilter" class="sg__chips">
      <span v-if="aBizNm" class="sg__chip">사업장명: {{ aBizNm }}</span>
      <span v-if="aBizCd" class="sg__chip">코드: {{ aBizCd }}</span>
      <span v-if="aMgrYn" class="sg__chip">{{ aMgrYn === 'Y' ? '주사업장' : '비주사업장' }}</span>
    </div>

    <!-- 마스터: 사업장 목록 -->
    <section class="sg__grid-wrap">
      <div class="sg__list-head">
        <strong class="sg__list-title">
          사업장 목록 <span class="sg__count">총 {{ masterShown.toLocaleString() }}건</span>
          <span v-if="hasClientFilter" class="sg__count sg__count--muted">/ 전체 {{ masterRows.length.toLocaleString() }}</span>
        </strong>
        <div class="sg__btns">
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
    <section class="sg__grid-wrap">
      <div class="sg__list-head">
        <strong class="sg__list-title">
          상위조직 <span class="sg__count">총 {{ detailRows.length.toLocaleString() }}건</span>
          <span v-if="selBizCd" class="sg__sel">— {{ selBizNm }} ({{ selBizCd }})</span>
          <span v-else class="sg__sel sg__sel--muted">— 사업장을 선택하세요</span>
        </strong>
        <div class="sg__btns">
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
/* ★ (2026-06-18, dspark): 페이지 여백 상·좌·우 12px — 상단바 바로 아래 검색을 바짝 붙임.
   레이아웃(.main-layout__content)의 기본 여백 20px 을 본 화면만 음수 마진으로 상쇄 후 12px 적용
   (다른 화면은 20px 유지 — page-scoped). 하단은 레이아웃 여백 유지. */
.sg {
  display: flex; flex-direction: column; gap: 12px;
  margin: -20px -20px 0;
  padding: 12px;
  font-family: var(--in-font-family-body);
}

/* 검색 카드 */
.sg__search { padding: 16px 20px 0; position: relative; margin-bottom: 8px; }  /* 하단 토글 칩 돌출분 여유 */
.sg__search-body { display: flex; align-items: flex-start; gap: 24px; flex-wrap: wrap; padding-bottom: 12px; }
.sg__fields {
  flex: 1 1 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px 28px;
}
.sg__field { display: grid; grid-template-columns: 72px 1fr; align-items: center; gap: 10px; }
.sg__label { text-align: right; font-size: var(--in-font-size-sm); color: var(--in-text-default); white-space: nowrap; }
.sg__search-actions { flex: 0 0 auto; display: flex; gap: 8px; align-items: flex-start; }

/* 접기/펴기 토글 — ★ (2026-06-18, dspark): 별도 전체폭 바 폐기 → 카드 하단 가장자리에 걸친
   작은 둥근 칩(두 번째 이미지 "모든 구성원" 정합). 절대배치로 카드 하단 경계 중앙에 반쯤 겹침. */
.sg__toggle {
  position: absolute; left: 50%; bottom: 0; transform: translate(-50%, 50%);
  display: inline-flex; align-items: center; justify-content: center;
  width: 46px; height: 20px; padding: 0; z-index: 1;
  /* ★ (2026-06-18, dspark): 회색 테두리+그림자가 너무 튀어 → 연한 하늘색으로 톤다운(테마 토큰). */
  border: 1px solid var(--in-border-brand, #36c1e8); border-radius: 999px;
  background: var(--in-bg-accent-brand, #e1f5fc99); color: var(--in-brand, #0ea1da);
  cursor: pointer;
}
.sg__toggle:hover { border-color: var(--in-brand, #0ea1da); color: var(--in-brand-bolder, #0b7fac); }
.sg__chev {
  width: 0; height: 0;
  border-left: 5px solid transparent; border-right: 5px solid transparent;
  border-top: 6px solid currentColor; transition: transform 0.15s;
}
.sg__chev--up { transform: rotate(180deg); }

/* 활성 필터 칩 */
.sg__chips { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.sg__chip {
  display: inline-flex; align-items: center; height: 24px; padding: 0 10px;
  font-size: var(--in-font-size-sm); color: var(--in-text-accent);
  background: var(--in-bg-default); border: 1px solid var(--in-border-subtle, #e5e7eb); border-radius: 999px;
}

/* 리스트 헤더 (건수 + 툴바) */
.sg__grid-wrap { display: flex; flex-direction: column; gap: 8px; }
.sg__list-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.sg__list-title { font-size: var(--in-font-size-md); color: var(--in-text-default); }
.sg__count { margin-left: 6px; font-size: var(--in-font-size-sm); font-weight: var(--in-font-weight-regular); color: var(--in-text-brand); }
.sg__count--muted { color: var(--in-text-subtle); }
.sg__sel { font-size: var(--in-font-size-sm); font-weight: var(--in-font-weight-regular); color: var(--in-text-brand); margin-left: 4px; }
.sg__sel--muted { color: var(--in-text-subtle); }
.sg__btns { display: flex; gap: 6px; }
</style>
