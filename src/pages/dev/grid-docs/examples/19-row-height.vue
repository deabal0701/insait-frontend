<script setup>
import { ref, computed } from 'vue';
import InDataTable from '@/components/ui/InDataTable.vue';
import InButton from '@/components/ui/InButton.vue';
import { ElSwitch } from 'element-plus';

// IBSheet 행 높이 조절 대응 → tui-grid 두 가지 방식.
//   ① 자동(멀티라인): options.rowHeight:'auto' + 컬럼 whiteSpace:'normal'
//      → 각 행이 내용 길이에 맞춰 자동으로 높이 조절(긴 비고는 줄바꿈).
//   ② 수동(개별 행): 고정 rowHeight + getInstance().setRowHeight(rowKey, px)
//      → 특정 행만 원하는 높이로. (자동 모드와는 배타적 — 자동이 덮어씀)
const grid = ref(null);
const auto = ref(true);

const columns = [
  { name: 'name', header: '이름', width: 120 },
  { name: 'memo', header: '비고', width: 320, editor: 'text',
    whiteSpace: 'normal', ellipsis: false },   // 줄바꿈 허용
];
const data = ref([
  { name: '김인사', memo: '짧은 메모' },
  { name: '이개발', memo: '여러 줄로 표시되는 긴 메모입니다. 자동 모드면 내용 길이에 따라 행 높이가 늘어나고, 수동 모드면 아래 버튼으로 직접 키울 수 있습니다.' },
  { name: '박회계', memo: '중간 길이 메모' },
]);

// 자동/수동 전환 → rowHeight 옵션 변경(InDataTable 이 rebuild).
const options = computed(() => ({
  rowHeaders: ['rowNum'],
  bodyHeight: 240,
  rowHeight: auto.value ? 'auto' : 34,
  minRowHeight: 32,
}));

// 수동 모드: 2번 행(rowKey=1)을 90px 로. (자동 모드면 효과 없음)
function growRow1() { grid.value.getInstance().setRowHeight(1, 90); }
function resetRow1() { grid.value.getInstance().setRowHeight(1, 34); }
</script>

<template>
  <div>
    <div style="display:flex; gap:10px; align-items:center; margin-bottom:8px; flex-wrap:wrap;">
      <label style="display:flex; gap:6px; align-items:center; font-size:13px;">
        자동 높이(내용 맞춤) <ElSwitch v-model="auto" />
      </label>
      <template v-if="!auto">
        <InButton size="sm" variant="primary" :left-icon-show="false" :right-icon-show="false" @click="growRow1">2번 행 90px</InButton>
        <InButton size="sm" :left-icon-show="false" :right-icon-show="false" @click="resetRow1">2번 행 34px</InButton>
      </template>
      <span style="font-size:12px; color:#888;">{{ auto ? '각 행이 내용에 맞춰 자동 조절' : '고정 34px + 개별 행 setRowHeight' }}</span>
    </div>
    <InDataTable ref="grid" :columns="columns" :data="data" :height="300" :options="options" />
  </div>
</template>
