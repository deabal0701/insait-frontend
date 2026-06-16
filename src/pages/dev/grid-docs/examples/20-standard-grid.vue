<script setup>
// ★ (2026-06-16, dspark): 표준 입력 그리드 — 디자인 시스템 표준 테이블(DataDisplay/Table) 형태.
//   헤더의 필수 빨강 *(column.required) + 우측 ⋮ 컬럼메뉴(정렬/고정/필터)는 WinGrid 내장이라
//   화면 코드엔 렌더러를 쓰지 않는다 — columns 만 선언하면 모든 그리드가 같은 형태가 된다.
//   단일 Y/N 체크박스 셀도 cellType:'checkbox' 한 줄. (예: 학력 입력)
//   ※ ⋮ 메뉴를 끄려면 InDataTable 에 :column-menu="false".
import { ref } from 'vue';
import InDataTable from '@/components/ui/InDataTable.vue';

const EDU = ['학사', '석사', '박사', '전문학사', '고졸'].map((v) => ({ text: v, value: v }));
const GRAD = ['졸업', '수료', '중퇴', '재학'].map((v) => ({ text: v, value: v }));

// required:true → 헤더 빨강 *  /  cellType:'checkbox' → 단일 체크박스 셀  (둘 다 WinGrid 내장)
const columns = [
  { name: 'eduLevel', header: '학력', width: 110, required: true, editor: { type: 'select', options: { listItems: EDU } } },
  { name: 'schoolName', header: '학교명', width: 150, required: true, editor: 'text' },
  { name: 'gradType', header: '졸업구분', width: 110, required: true, editor: { type: 'select', options: { listItems: GRAD } } },
  { name: 'admDate', header: '입학년월', width: 140, required: true, align: 'center', editor: { type: 'datePicker', options: { format: 'yyyy.MM.dd' } } },
  { name: 'gradDate', header: '졸업년월', width: 140, align: 'center', editor: { type: 'datePicker', options: { format: 'yyyy.MM.dd' } } },
  { name: 'finalYn', header: '최종학력여부', width: 120, cellType: 'checkbox' },
  { name: 'faculty', header: '학과', width: 120, editor: 'text' },
  { name: 'major', header: '전공', width: 120, editor: 'text' },
  { name: 'doubleMajor', header: '복수전공', width: 120, editor: 'text' },
];

const data = ref([
  { eduLevel: '학사', schoolName: '한국대학교', gradType: '졸업', admDate: '2016.03.01', gradDate: '2020.02.20', finalYn: 'Y', faculty: '공과대학', major: '컴퓨터공학', doubleMajor: '' },
  { eduLevel: '석사', schoolName: '서울대학원', gradType: '수료', admDate: '2020.03.01', gradDate: '', finalYn: 'N', faculty: '정보과학', major: '데이터사이언스', doubleMajor: '응용통계' },
  { eduLevel: '', schoolName: '', gradType: '', admDate: '', gradDate: '', finalYn: 'N', faculty: '', major: '', doubleMajor: '' },
]);
</script>

<template>
  <InDataTable
    :columns="columns"
    :data="data"
    :height="260"
    :options="{ rowHeaders: ['checkbox'], bodyHeight: 220, columnOptions: { resizable: true } }"
  />
</template>
