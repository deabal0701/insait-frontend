<script setup>
// ★ (2026-05-28, dspark): InDataTable + tui-grid 시연용 dev playground.
//   운영 LNB 노출 X — URL /dev/grid 직접 진입.
//   시연 영역: CRUD (행 추가/체크 삭제/저장) + format(Integer/Ymd) + frozenCount + Excel +
//   dirty 추출 (extractDirtyForEnvelope) → envelope BODY 슬롯 형태 확인.
// ★ (2026-06-01, dspark): extractDirtyForEnvelope 가 이제 sStatus + _seq 부여 (ROW_STATUS 폐기).
// ★ (2026-06-02, dspark): [옵션 1 — 단일 창구] 실 entity 화면은 useEntityGrid 를 직접 import 하지
//   않는다. InDataTable 에 service props 만 주면 조회·저장이 내부 처리된다 (IBSheet sheet 객체 패턴):
//
//     <InDataTable ref="grid" :columns="columns"
//                  retrieve-service-id="ORM9999_01_R01"
//                  save-service-id="INT_Y19_0001_01_S01"
//                  slot-name="ME_INT0001_02"
//                  :header="{ objectId: 'ORM9999' }"
//                  auto-retrieve />
//     // 조회: grid.value.retrieve({ ...검색조건 })   /  저장: grid.value.save()
//     // grid.value.rows / grid.value.dirtyCount / grid.value.loading 도 노출.
//
//   ↓ 아래 데모는 서버 없이 로컬 데이터로 CRUD·format·Excel·dirty 추출만 보이는 controlled 모드.
import { ref } from 'vue';
import { ElButton, ElMessage } from 'element-plus';
import InDataTable from '@/components/ui/InDataTable.vue';

const gridRef = ref(null);
const fileRef = ref(null);

// 우클릭 컨텍스트 메뉴 항목 (#1)
const contextMenuItems = [
  { key: 'add-below', label: '아래에 행 추가' },
  { key: 'delete-row', label: '이 행 삭제' },
  { divider: true },
  { key: 'export', label: 'Excel 내보내기' },
];

const columns = [
  { name: 'empNo', header: '사번', width: 90, sortable: true },
  { name: 'name', header: '이름', editor: 'text', width: 110 },
  {
    name: 'dept', header: '부서', width: 110,
    editor: {
      type: 'select',
      options: {
        listItems: [
          { text: '인사팀', value: 'HR' },
          { text: '개발팀', value: 'DEV' },
          { text: '회계팀', value: 'ACC' },
        ],
      },
    },
    formatter: ({ value }) => ({ HR: '인사팀', DEV: '개발팀', ACC: '회계팀' }[value] || value || ''),
  },
  { name: 'salary', header: '연봉', editor: 'text', format: 'Integer', align: 'right', width: 130 },
  { name: 'hireDt', header: '입사일', editor: 'text', format: 'Ymd', width: 130 },
];

const initialData = [
  { empNo: 'E001', name: '김인사', dept: 'HR', salary: 52000000, hireDt: '20210315' },
  { empNo: 'E002', name: '이개발', dept: 'DEV', salary: 71000000, hireDt: '20220801' },
  { empNo: 'E003', name: '박회계', dept: 'ACC', salary: 48000000, hireDt: '20230110' },
];
const rows = ref([...initialData]);
const lastSavePayload = ref(null);

const options = {
  rowHeaders: ['checkbox'],
  columnOptions: { resizable: true, frozenCount: 1 },
  bodyHeight: 320,
};

// ★ (2026-06-01, dspark): 저수준 getInstance() 대신 InDataTable 래퍼 메서드(#3) 사용.
function addRow() {
  gridRef.value?.addRow({ empNo: '', name: '', dept: 'DEV', salary: 0, hireDt: '' });
}
function removeChecked() {
  const removed = gridRef.value?.removeCheckedRows() || [];
  if (!removed.length) ElMessage.warning('체크된 행이 없습니다.');
}
function save() {
  lastSavePayload.value = gridRef.value?.getDirty() || [];   // finishEditing + sStatus/_seq (#3)
  ElMessage.success(`dirty rows ${lastSavePayload.value.length} 건`);
}
function reset() {
  rows.value = [...initialData];
  lastSavePayload.value = null;
}

// #1 결손기능 시연 — Excel 다운/업 + 인쇄
function excelExport() {
  gridRef.value?.exportExcel({ fileName: 'employees', sheetName: '직원' });
}
function excelImportClick() { fileRef.value?.click(); }
async function onExcelFile(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const rows2 = await gridRef.value?.importExcel(file);
  ElMessage.success(`Excel ${rows2?.length || 0}행 로드`);
  e.target.value = '';
}
function printIt() {
  gridRef.value?.printGrid({ title: '직원 목록' });
}

// #1 컨텍스트 메뉴 액션
function onContextAction({ key, rowKey }) {
  const grid = gridRef.value?.getInstance();
  if (key === 'add-below') gridRef.value?.addRow({ empNo: '', name: '', dept: 'DEV', salary: 0, hireDt: '' }, { at: (rowKey ?? -1) + 1 });
  else if (key === 'delete-row' && rowKey != null && grid) grid.removeRow(rowKey);
  else if (key === 'export') excelExport();
}
</script>

<template>
  <div class="pg">
    <h2 class="pg__title">InDataTable / tui-grid playground</h2>
    <p class="pg__hint">
      운영 메뉴 노출 X. dev 검증용 — CRUD · format(Integer/Ymd) · frozen · Excel · dirty 추출 시연.
    </p>

    <div class="pg__toolbar">
      <ElButton size="small" type="primary" @click="addRow">행 추가(선택 행 다음)</ElButton>
      <ElButton size="small" @click="removeChecked">체크 삭제</ElButton>
      <ElButton size="small" type="success" @click="save">저장 (dirty 추출)</ElButton>
      <ElButton size="small" @click="reset">초기화</ElButton>
      <ElButton size="small" @click="excelExport">Excel 내보내기</ElButton>
      <ElButton size="small" @click="excelImportClick">Excel 불러오기</ElButton>
      <ElButton size="small" @click="printIt">인쇄</ElButton>
      <input ref="fileRef" type="file" accept=".xlsx,.xls" style="display:none" @change="onExcelFile" />
    </div>
    <p class="pg__hint">우클릭 → 컨텍스트 메뉴 (아래에 행 추가 / 삭제 / Excel).</p>

    <InDataTable
      ref="gridRef"
      :columns="columns"
      :data="rows"
      :options="options"
      :height="380"
      :context-menu-items="contextMenuItems"
      @context-action="onContextAction"
    />

    <div v-if="lastSavePayload" class="pg__payload">
      <h3>envelope BODY 슬롯 형태 (sStatus + _seq — 백엔드 BusinessEntity 계약)</h3>
      <pre>{{ JSON.stringify(lastSavePayload, null, 2) }}</pre>
    </div>
  </div>
</template>

<style scoped>
.pg { padding: 16px; width: 100%; }
.pg__title {
  margin: 0 0 4px;
  font-size: 18px;
  font-weight: 600;
  color: var(--in-text-accent);
}
.pg__hint {
  margin: 0 0 16px;
  color: var(--in-text-subtle);
  font-size: 12px;
}
.pg__toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.pg__payload {
  margin-top: 16px;
  padding: 12px;
  background: var(--in-surface-default, #f5f5f5);
  border-radius: 6px;
}
.pg__payload h3 {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--in-text-accent);
}
.pg__payload pre {
  margin: 0;
  font-size: 11px;
  max-height: 280px;
  overflow: auto;
  color: var(--in-text-default);
}
</style>
