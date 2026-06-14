<script setup>
import { ref, computed } from 'vue';
import InDataTable from '@/components/ui/InDataTable.vue';

// 마스터-디테일 = IBSheet 행 클릭(onClick) → 하위 그리드 갱신 패턴.
//   click 이벤트의 rowKey 로 선택 행 식별 → 디테일 데이터 computed 로 필터.
const masterColumns = [
  { name: 'deptCd', header: '부서코드', width: 110 },
  { name: 'deptNm', header: '부서명',   width: 140 },
];
const masterData = ref([
  { deptCd: 'HR',  deptNm: '인사팀' },
  { deptCd: 'DEV', deptNm: '개발팀' },
]);
const ALL_EMP = [
  { deptCd: 'HR',  empNo: 'E001', name: '김인사' },
  { deptCd: 'DEV', empNo: 'E002', name: '이개발' },
  { deptCd: 'DEV', empNo: 'E021', name: '정프론' },
];
const detailColumns = [
  { name: 'empNo', header: '사번', width: 100 },
  { name: 'name',  header: '이름', width: 130 },
];
const selectedDept = ref('HR');
const detailData = computed(() => ALL_EMP.filter((e) => e.deptCd === selectedDept.value));

function onMasterClick(ev) {
  if (ev?.rowKey == null) return;
  const row = masterData.value[ev.rowKey];
  if (row) selectedDept.value = row.deptCd;
}
</script>

<template>
  <div style="display:flex; gap:12px;">
    <div style="flex:1;">
      <p style="font-size:12px;color:#888;margin:0 0 4px;">부서(클릭)</p>
      <InDataTable
        :columns="masterColumns" :data="masterData" :height="200"
        :options="{ rowHeaders: ['rowNum'], bodyHeight: 160 }"
        @click="onMasterClick"
      />
    </div>
    <div style="flex:1;">
      <p style="font-size:12px;color:#888;margin:0 0 4px;">소속 사원</p>
      <InDataTable
        :columns="detailColumns" :data="detailData" :height="200"
        :options="{ rowHeaders: ['rowNum'], bodyHeight: 160 }"
      />
    </div>
  </div>
</template>
