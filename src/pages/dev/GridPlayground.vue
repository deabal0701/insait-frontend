<script setup>
// ★ (2026-05-28, dspark): InDataTable + tui-grid 시연용 dev playground.
//   운영 LNB 노출 X — URL /dev/grid 직접 진입.
//   시연 영역: CRUD (행 추가/체크 삭제/저장) + format(Integer/Ymd) + frozenCount + Excel +
//   dirty 추출 (extractDirtyForEnvelope) → envelope BODY 슬롯 형태 확인.
// ★ (2026-06-01, dspark): extractDirtyForEnvelope 가 이제 sStatus + _seq 부여 (ROW_STATUS 폐기).
//   실 entity 화면은 본 저수준 호출 대신 useEntityGrid composable 권장 (06b §3).
import { ref } from 'vue';
import { ElButton, ElMessage } from 'element-plus';
import InDataTable from '@/components/ui/InDataTable.vue';
import { extractDirtyForEnvelope } from '@/utils/grid';

const gridRef = ref(null);

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

function addRow() {
  const grid = gridRef.value?.getInstance();
  if (!grid) return;
  grid.appendRow(
    { empNo: '', name: '', dept: 'DEV', salary: 0, hireDt: '' },
    { focus: true }
  );
}
function removeChecked() {
  const grid = gridRef.value?.getInstance();
  if (!grid) return;
  const checked = grid.getCheckedRows();
  if (!checked.length) {
    ElMessage.warning('체크된 행이 없습니다.');
    return;
  }
  checked.forEach((r) => grid.removeRow(r.rowKey));
}
function save() {
  const grid = gridRef.value?.getInstance();
  if (!grid) return;
  const modified = grid.getModifiedRows();
  lastSavePayload.value = extractDirtyForEnvelope(modified);
  ElMessage.success(`dirty rows ${lastSavePayload.value.length} 건`);
}
function reset() {
  const grid = gridRef.value?.getInstance();
  if (!grid) return;
  grid.resetData([...initialData]);
  lastSavePayload.value = null;
}
function excel() {
  const grid = gridRef.value?.getInstance();
  if (!grid) return;
  if (typeof grid.export === 'function') {
    grid.export('xlsx', { fileName: 'employees' });
  } else {
    ElMessage.warning('현재 tui-grid 버전은 export() 미지원입니다.');
  }
}
</script>

<template>
  <div class="pg">
    <h2 class="pg__title">InDataTable / tui-grid playground</h2>
    <p class="pg__hint">
      운영 메뉴 노출 X. dev 검증용 — CRUD · format(Integer/Ymd) · frozen · Excel · dirty 추출 시연.
    </p>

    <div class="pg__toolbar">
      <ElButton size="small" type="primary" @click="addRow">행 추가</ElButton>
      <ElButton size="small" @click="removeChecked">체크 삭제</ElButton>
      <ElButton size="small" type="success" @click="save">저장 (dirty 추출)</ElButton>
      <ElButton size="small" @click="reset">초기화</ElButton>
      <ElButton size="small" @click="excel">Excel export</ElButton>
    </div>

    <InDataTable
      ref="gridRef"
      :columns="columns"
      :data="rows"
      :options="options"
      :height="380"
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
