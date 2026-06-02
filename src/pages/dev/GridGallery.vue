<script setup>
// ★ (2026-06-02, dspark): Grid 기능 카탈로그 — IBSheet 다양한 형태를 tui-grid(InDataTable)로 시연.
//   1순위 4종: 콤보 셀 · 인셀 버튼 · 마스터-디테일 · 조건부 스타일/헤더색.
//   각 케이스 = columns/data/options(+renderer) 조합. InDataTable 래퍼는 그대로, columns 의
//   editor/renderer 와 options 로 tui-grid 네이티브 기능을 호출. (AS-IS IBSheet Type 대응)
//   탭으로 한 번에 1 케이스 표시. 새 형태 추가 = CASES 에 1줄 + 섹션.
import { ref, computed } from 'vue';
import { ElInput, ElSwitch } from 'element-plus';
import InButton from '@/components/ui/InButton.vue';
import InDataTable from '@/components/ui/InDataTable.vue';
import { useToast } from '@/composables/useToast';

const toast = useToast();

const CASES = [
  { key: 'service', title: '실서비스 (TST0002)', asis: '/serviceBroker.h5 envelope · self-managed 조회/저장/삭제' },
  { key: 'combo',  title: '콤보 셀',          asis: 'IBSheet Type:Combo (107) · h5:ComboBox (2,144)' },
  { key: 'button', title: '인셀 버튼',        asis: 'IBSheet Type:Html/Popup (42) · 셀 안 버튼·팝업' },
  { key: 'master', title: '마스터-디테일',     asis: '행 클릭 → 하위 그리드 변경 (row-click 746)' },
  { key: 'style',  title: '조건부 스타일·헤더색', asis: '값 따라 행 강조 + 컬럼 헤더 색상' },
];
const active = ref('service');

/* ─────────────────────────── 케이스 0 — 실서비스 (TST0002 self-managed) ─────────────────────────── */
//   GridPlayground 페이지를 카탈로그 네이티브 탭으로 이전 (콘텐츠 전용 — 페이지 껍데기 X).
const svcGrid = ref(null);
const svc = ref({
  retrieveServiceId: 'TST0002_00_R01',
  saveServiceId: 'TST0002_00_S01',
  slotName: 'ME_TST0002_02',     // 조회 응답 + 저장 요청 공통 슬롯 (CRUD 메시지 재사용)
  objectId: 'TST0002',
  autoRetrieve: false,
});
const searchBody = ref('{ "ME_TST0002_01": [ { "keyword": "" } ] }');
const serviceColumns = [
  { name: 'demo_id', header: 'ID(PK)', width: 90, align: 'right' },
  { name: 'demo_memo', header: '메모', editor: 'text', width: 220 },
  { name: 'reg_date', header: '등록일', width: 170 },
  { name: 'demo_name', header: '이름', editor: 'text', width: 160 },
  { name: 'reg_user', header: '등록자', editor: 'text', width: 120 },
];
const serviceOptions = { rowHeaders: ['rowNum', 'checkbox'], columnOptions: { resizable: true }, bodyHeight: 220 };
async function svcRetrieve() {
  if (!svc.value.retrieveServiceId) { toast.warning('retrieveServiceId 를 입력하세요'); return; }
  let body = {};
  try { body = JSON.parse(searchBody.value || '{}'); }
  catch (_) { toast.error('검색조건 JSON 파싱 실패'); return; }
  try { const rows = await svcGrid.value.retrieve(body); toast.success(`조회 ${rows?.length || 0}행`); }
  catch (e) { toast.error(`조회 실패: ${e?.message || e}`); }
}
async function svcSave() {
  if (!svc.value.saveServiceId) { toast.warning('saveServiceId 를 입력하세요'); return; }
  try {
    const r = await svcGrid.value.save();
    if (r.skipped) toast.info('변경분 0건 — 저장 호출 생략');
    else toast.success(`저장 ${r.dirty.length}건 전송 + 재조회 완료`);
  } catch (e) { toast.error(`저장 실패: ${e?.message || e}`); }
}
function svcAddRow() {
  svcGrid.value?.addRow({ demo_id: '', demo_name: '신규', demo_memo: '', reg_date: '', reg_user: 'tester' });
}
function svcRemoveChecked() {
  const removed = svcGrid.value?.removeCheckedRows() || [];
  if (!removed.length) { toast.warning('체크된 행이 없습니다.'); return; }
  toast.info(`${removed.length}행 삭제 표시 (sStatus='D') — 저장 시 서버 DELETE`);
}

/* ─────────────────────────── tui-grid 커스텀 렌더러 ─────────────────────────── */
// 인셀 버튼 (CellRenderer). column.renderer.options = { label, variant, onClick(row, rowKey) }
class ButtonCellRenderer {
  constructor(props) {
    const el = document.createElement('button');
    el.type = 'button';
    const opt = props.columnInfo.renderer.options || {};
    el.className = `gg-cellbtn gg-cellbtn--${opt.variant || 'default'}`;
    el.textContent = opt.label || '버튼';
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      opt.onClick?.(props.grid.getRow(props.rowKey), props.rowKey);
    });
    this.el = el;
  }
  getElement() { return this.el; }
  render() { /* static */ }
}
// 컬럼 헤더 색상 (header custom renderer). ★ tui-grid header renderer 는 클래스를 직접 받음
//   (cell 처럼 { type, options } 래핑 X → "not a constructor"). 색상은 컬럼명 맵으로.
const HEADER_COLORS = { stock: '#ed6c02', status: '#37ae34' };
class ColorHeaderRenderer {
  constructor(props) {
    const el = document.createElement('div');
    el.className = 'gg-colorhead';
    el.style.background = HEADER_COLORS[props.columnInfo.name] || '#13a9e9';
    el.textContent = props.columnInfo.header;
    this.el = el;
  }
  getElement() { return this.el; }
  render() {}
}

/* ─────────────────────────── 케이스 1 — 콤보 셀 ─────────────────────────── */
const DEPTS = [
  { text: '인사팀', value: 'HR' }, { text: '개발팀', value: 'DEV' },
  { text: '회계팀', value: 'ACC' }, { text: '영업팀', value: 'SALES' },
];
const deptLabel = (v) => DEPTS.find((d) => d.value === v)?.text || v || '';
const comboColumns = [
  { name: 'empNo', header: '사번', width: 90 },
  { name: 'name', header: '이름', editor: 'text', width: 120 },
  {
    name: 'dept', header: '부서', width: 130,
    editor: { type: 'select', options: { listItems: DEPTS } },
    formatter: ({ value }) => deptLabel(value),
  },
  {
    name: 'grade', header: '직급', width: 120,
    editor: { type: 'select', options: { listItems: [
      { text: '사원', value: 'S' }, { text: '대리', value: 'D' }, { text: '과장', value: 'G' },
    ] } },
    formatter: ({ value }) => ({ S: '사원', D: '대리', G: '과장' }[value] || value || ''),
  },
];
const comboData = ref([
  { empNo: 'E001', name: '김인사', dept: 'HR', grade: 'G' },
  { empNo: 'E002', name: '이개발', dept: 'DEV', grade: 'D' },
  { empNo: 'E003', name: '박회계', dept: 'ACC', grade: 'S' },
]);
const comboOptions = { rowHeaders: ['rowNum'], bodyHeight: 200 };

/* ─────────────────────────── 케이스 2 — 인셀 버튼 ─────────────────────────── */
const buttonColumns = [
  { name: 'empNo', header: '사번', width: 90 },
  { name: 'name', header: '이름', width: 120 },
  {
    name: '_view', header: '상세', width: 90, align: 'center',
    renderer: { type: ButtonCellRenderer, options: { label: '보기', variant: 'primary', onClick: (row) => toast.info(`${row.name} 상세 보기`) } },
  },
  {
    name: '_del', header: '삭제', width: 90, align: 'center',
    renderer: { type: ButtonCellRenderer, options: { label: '삭제', variant: 'danger', onClick: (row) => toast.warning(`${row.name} 삭제 요청`) } },
  },
];
const buttonData = ref([
  { empNo: 'E001', name: '김인사' },
  { empNo: 'E002', name: '이개발' },
  { empNo: 'E003', name: '박회계' },
]);
const buttonOptions = { rowHeaders: ['rowNum'], bodyHeight: 200 };

/* ─────────────────────────── 케이스 3 — 마스터-디테일 ─────────────────────────── */
const masterColumns = [
  { name: 'deptCd', header: '부서코드', width: 110 },
  { name: 'deptNm', header: '부서명', width: 140 },
  { name: 'cnt', header: '인원', width: 80, align: 'right' },
];
const masterData = ref([
  { deptCd: 'HR', deptNm: '인사팀', cnt: 2 },
  { deptCd: 'DEV', deptNm: '개발팀', cnt: 3 },
  { deptCd: 'ACC', deptNm: '회계팀', cnt: 1 },
]);
const ALL_EMP = [
  { deptCd: 'HR', empNo: 'E001', name: '김인사', grade: '과장' },
  { deptCd: 'HR', empNo: 'E010', name: '최채용', grade: '대리' },
  { deptCd: 'DEV', empNo: 'E002', name: '이개발', grade: '대리' },
  { deptCd: 'DEV', empNo: 'E021', name: '정프론', grade: '사원' },
  { deptCd: 'DEV', empNo: 'E022', name: '한백엔', grade: '사원' },
  { deptCd: 'ACC', empNo: 'E003', name: '박회계', grade: '사원' },
];
const detailColumns = [
  { name: 'empNo', header: '사번', width: 90 },
  { name: 'name', header: '이름', width: 120 },
  { name: 'grade', header: '직급', width: 100 },
];
const selectedDept = ref('HR');
const detailData = computed(() => ALL_EMP.filter((e) => e.deptCd === selectedDept.value));
const masterOptions = { rowHeaders: ['rowNum'], bodyHeight: 180 };
const detailOptions = { rowHeaders: ['rowNum'], bodyHeight: 180 };
function onMasterClick(ev) {
  if (ev?.rowKey == null) return;
  const row = masterData.value[ev.rowKey];
  if (row) { selectedDept.value = row.deptCd; toast.info(`${row.deptNm} 사원 ${detailData.value.length}명`); }
}

/* ─────────────────────────── 케이스 4 — 조건부 스타일·헤더색 ─────────────────────────── */
const STOCK = [
  { item: '노트북', stock: 3, status: '부족' },
  { item: '모니터', stock: 25, status: '정상' },
  { item: '키보드', stock: 8, status: '부족' },
  { item: '마우스', stock: 40, status: '정상' },
];
// 재고 < 10 행을 danger 클래스로 표시 (_attributes.className.row)
const styleData = ref(STOCK.map((r) => ({
  ...r,
  _attributes: { className: { row: r.stock < 10 ? ['gg-danger-row'] : [] } },
})));
const styleColumns = [
  { name: 'item', header: '품목', width: 140 },
  { name: 'stock', header: '재고', width: 120, align: 'right' },   // 헤더색은 styleOptions.header
  { name: 'status', header: '상태', width: 100, align: 'center' },
];
const styleOptions = {
  rowHeaders: ['rowNum'],
  bodyHeight: 200,
  // ★ header custom renderer = 클래스 직접 (cell 처럼 { type, options } 래핑 X)
  header: {
    columns: [
      { name: 'stock', renderer: ColorHeaderRenderer },
      { name: 'status', renderer: ColorHeaderRenderer },
    ],
  },
};
</script>

<template>
  <div class="gg">
    <header class="gg__head">
      <h2 class="gg__title">Grid 기능 카탈로그</h2>
      <p class="gg__sub">IBSheet 다양한 형태를 tui-grid(InDataTable)로 시연. 1순위 4종.</p>
    </header>

    <nav class="gg__tabs">
      <button
        v-for="c in CASES"
        :key="c.key"
        type="button"
        class="gg__tab"
        :class="{ 'is-active': active === c.key }"
        @click="active = c.key"
      >{{ c.title }}</button>
    </nav>

    <p class="gg__asis">
      AS-IS 대응: <b>{{ CASES.find((c) => c.key === active)?.asis }}</b>
    </p>

    <!-- 케이스 0 — 실서비스 (TST0002 self-managed) -->
    <section v-if="active === 'service'" class="gg__case">
      <p class="gg__desc">
        <code>retrieve/save serviceId</code> 만 주면 InDataTable 이 조회·저장을 내부 처리. <code>:data</code> 불필요 —
        <code>svcGrid.retrieve(body)</code> / <code>svcGrid.save()</code>. [조회] → 백엔드 호출(TST_DEMO).
      </p>
      <div class="gg__form">
        <label>retrieveServiceId <ElInput v-model="svc.retrieveServiceId" size="small" /></label>
        <label>saveServiceId <ElInput v-model="svc.saveServiceId" size="small" /></label>
        <label>slotName <ElInput v-model="svc.slotName" size="small" /></label>
        <label>objectId(header) <ElInput v-model="svc.objectId" size="small" /></label>
        <label class="gg__form-wide">검색조건 body(JSON) <ElInput v-model="searchBody" size="small" /></label>
        <label class="gg__form-sw">auto-retrieve <ElSwitch v-model="svc.autoRetrieve" /></label>
      </div>
      <div class="gg__bar">
        <InButton size="sm" variant="primary" :left-icon-show="false" :right-icon-show="false" @click="svcRetrieve">조회</InButton>
        <InButton size="sm" variant="default" :left-icon-show="false" :right-icon-show="false" @click="svcAddRow">행 추가(INSERT)</InButton>
        <InButton size="sm" variant="default" :left-icon-show="false" :right-icon-show="false" @click="svcRemoveChecked">체크 삭제(D)</InButton>
        <InButton size="sm" variant="primary" :left-icon-show="false" :right-icon-show="false" @click="svcSave">저장</InButton>
        <span class="gg__tag">rows: {{ svcGrid?.rows?.length ?? 0 }} · dirty: {{ svcGrid?.dirtyCount ?? 0 }} · loading: {{ svcGrid?.loading ? 'Y' : 'N' }}</span>
      </div>
      <InDataTable
        ref="svcGrid"
        :columns="serviceColumns"
        :options="serviceOptions"
        :height="300"
        :retrieve-service-id="svc.retrieveServiceId || undefined"
        :save-service-id="svc.saveServiceId || undefined"
        :slot-name="svc.slotName || undefined"
        :header="svc.objectId ? { objectId: svc.objectId } : {}"
        :auto-retrieve="svc.autoRetrieve"
      />
    </section>

    <!-- 케이스 1 — 콤보 셀 -->
    <section v-if="active === 'combo'" class="gg__case">
      <p class="gg__desc">부서·직급 셀을 더블클릭하면 <b>콤보(select)</b>로 편집. <code>editor: { type: 'select', options: { listItems } }</code></p>
      <InDataTable :columns="comboColumns" :data="comboData" :options="comboOptions" :height="260" />
    </section>

    <!-- 케이스 2 — 인셀 버튼 -->
    <section v-if="active === 'button'" class="gg__case">
      <p class="gg__desc">셀 안에 <b>버튼</b>(tui-grid CellRenderer). [보기]/[삭제] 클릭 → 토스트. <code>renderer: { type: ButtonCellRenderer, options: { label, onClick } }</code></p>
      <InDataTable :columns="buttonColumns" :data="buttonData" :options="buttonOptions" :height="260" />
    </section>

    <!-- 케이스 3 — 마스터-디테일 -->
    <section v-if="active === 'master'" class="gg__case">
      <p class="gg__desc">왼쪽 <b>부서(마스터)</b> 행을 클릭하면 오른쪽 <b>사원(디테일)</b>이 바뀐다. <code>@click → selectedDept → detail 필터</code></p>
      <div class="gg__md">
        <div class="gg__md-col">
          <h4 class="gg__md-h">부서 (마스터)</h4>
          <InDataTable :columns="masterColumns" :data="masterData" :options="masterOptions" :height="240" @click="onMasterClick" />
        </div>
        <div class="gg__md-col">
          <h4 class="gg__md-h">사원 (디테일) — {{ selectedDept }}</h4>
          <InDataTable :columns="detailColumns" :data="detailData" :options="detailOptions" :height="240" />
        </div>
      </div>
    </section>

    <!-- 케이스 4 — 조건부 스타일·헤더색 -->
    <section v-if="active === 'style'" class="gg__case gg-style-scope">
      <p class="gg__desc">재고 <b>10 미만 행은 빨강 강조</b>(<code>_attributes.className.row</code>) + <b>헤더 색상</b>(재고=주황, 상태=초록, 헤더 커스텀 렌더러).</p>
      <InDataTable :columns="styleColumns" :data="styleData" :options="styleOptions" :height="260" />
    </section>
  </div>
</template>

<style scoped>
.gg { padding: 18px; width: 100%; max-width: 980px; }
.gg__head { margin-bottom: 14px; }
.gg__title { margin: 0 0 4px; font-size: 20px; font-weight: 700; color: var(--in-text-accent, #111); }
.gg__sub { margin: 0; font-size: 12px; color: var(--in-text-subtle, #777); }

.gg__tabs { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
.gg__tab {
  padding: 6px 14px; font-size: 13px; border: 1px solid var(--in-border-default, #e2e2e2);
  background: var(--in-bg-white, #fff); border-radius: 999px; cursor: pointer; color: var(--in-text-default, #565656);
}
.gg__tab.is-active { background: var(--in-brand, #13a9e9); border-color: var(--in-brand, #13a9e9); color: #fff; }

.gg__asis { margin: 0 0 12px; font-size: 11px; color: var(--in-text-subtle, #888); }
.gg__desc { margin: 0 0 10px; font-size: 12px; line-height: 1.6; color: var(--in-text-default, #565656); }
.gg__desc code { padding: 1px 5px; background: var(--in-surface-default, #f3f3f3); border-radius: 4px; font-size: 11px; }

.gg__md { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.gg__md-h { margin: 0 0 6px; font-size: 12px; font-weight: 600; color: var(--in-text-accent, #111); }

/* 실서비스 케이스 — 서비스 폼 + 액션바 */
.gg__form { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 16px; margin-bottom: 12px; }
.gg__form label { display: flex; flex-direction: column; gap: 3px; font-size: 11px; color: var(--in-text-subtle, #777); }
.gg__form-wide { grid-column: 1 / -1; }
.gg__form-sw { flex-direction: row !important; align-items: center; gap: 8px; }
.gg__bar { display: flex; gap: 8px; align-items: center; margin-bottom: 10px; flex-wrap: wrap; }
.gg__tag { margin-left: auto; font-size: 11px; color: var(--in-text-subtle, #888); }

/* 인셀 버튼 */
:deep(.gg-cellbtn) {
  padding: 2px 10px; font-size: 12px; border-radius: 4px; cursor: pointer;
  border: 1px solid var(--in-border-default, #d6d6d6); background: #fff; color: var(--in-text-default, #565656);
}
:deep(.gg-cellbtn--primary) { border-color: var(--in-brand, #13a9e9); color: var(--in-brand, #13a9e9); }
:deep(.gg-cellbtn--danger) { border-color: #e33131; color: #e33131; }

/* 헤더 색상 렌더러 */
:deep(.gg-colorhead) {
  height: 100%; display: flex; align-items: center; justify-content: center;
  color: #fff; font-weight: 600; font-size: 13px;
}

/* 조건부 행 색상 — tui-grid 가 row className 을 각 td 에 적용 */
.gg-style-scope :deep(.gg-danger-row) { background: #fdecec !important; color: #c0341d; font-weight: 600; }
</style>
