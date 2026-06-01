<script setup>

  import { ref } from 'vue';
  import InDataTable from '@/components/ui/InDataTable.vue'

  const gridRef = ref(null);
  const dirty =ref("");
  const log = ref([]);
  
  const columns =[
    {name: 'empNo', header: '사번', width: 120},
    {name: 'empName', header: '이름', width: 200},
    {name: 'age', header: '나이', width: 100},
    {name: 'department', header: '부서', width: 150},
]

const rows = [
  { empNo: 1000, empName: '홍길동', age: 30, department: '개발부' },
  { empNo: 2000, empName: '박대식', age: 25, department: '인사부' },
  { empNo: 3000, empName: '지용운', age: 28, department: '재무부' },
  { empNo: 4000, empName: '강동원', age: 35, department: '개발부' }
]

const options = {
  rowHeaders: [ 'rowNum','checkbox'],
  columnOptions: { resizable: true, frozenCount: 0 },
  bodyHeight: 220,
};

function addRow(){
  gridRef.value ?.addRow({empNo: '', empName:'', age:0, department:'개발부'})
}

function removeChecked(){
  gridRef.value ?.removeCheckedRows();
}

function onEvt(name, payload){
  console.log('[grid emit]', name, payload);
  log.value.unshift({name, payload});
  if(log.value.length > 8) log.value.pop();
}

function onReady(inst){
  console.log('grid 준비완료', inst);    
}

</script>

<template>
  <div  class= "top" >
    <h2>Grid Playground2</h2>
    <div style="display:flex; gap:8px; margin:12px 0; flex-wrap:wrap">
      <button @click="addRow">행 추가</button>
      <button @click="removeChecked">체크 삭제</button>
    </div>
     <InDataTable ref="gridRef" :columns="columns" :data="rows" :options="options" :height="300" @click="onEvt('click', $event)" @instance-ready="onReady" />

    <pre v-if="dirty" style="margin-top:12px; padding:10px; background:#f5f5f5; font-size:12px">{{ JSON.stringify(dirty, null, 2) }}</pre>

  </div>
</template>

<style scoped>
  button {
    padding: 4px 12px;
    font-size: 14px;
    border: 1px solid #ccc;
    border-radius: 4px;
    background-color: #f5f5f5;
    cursor: pointer;
    transition: background-color 0.2s ease, border-color 0.2s ease;
  }
  button:hover {
    background-color: #e0e0e0;
    border-color: #999;
  }
  .top {
    padding: 12px 0;
    border-bottom: 1px solid #eee;
  }

  .bottom {
    padding: 12px 0;
    border-top: 1px solid #eee;
  }


  .top h2 {
    margin: 0 0 8px;
    font-size: 18px;
    color: #333;
    font-weight: 600;
  }

  /* style the data table wrapper (targets the component root element) */
  in-data-table {
    display: block;
    border: 1px solid #e9e9e9;
    border-radius: 6px;
    background: #fff;
    box-shadow: 0 1px 2px rgba(0,0,0,0.03);
    overflow: hidden;
  }

  /* Improve appearance of the inline control area */
  .top > div {
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  /* smaller, wrapped buttons on very small screens */
  @media (max-width: 480px) {
    button {
      padding: 6px 10px;
      font-size: 13px;
    }
    in-data-table {
      font-size: 13px;
    }
  }

  /* nicer pre block for json / dirty display */
  pre {
    white-space: pre-wrap;
    word-break: break-word;
    border-radius: 4px;
    line-height: 1.45;
    color: #222;
  }

  /* subtle utility spacing for any bottom section */
  .bottom {
    display: flex;
    gap: 12px;
    align-items: center;
  }

</style>