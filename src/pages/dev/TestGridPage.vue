<script setup>
  import { ref } from 'vue';
  import { reactive }  from 'vue'
  import { onMounted } from 'vue';
  import { useService } from '@/composables/useService'

  import InSearchField from '@/components/ui/InSearchField.vue';
  import InButton from '@/components/ui/InButton.vue'
  import InDataTable from '@/components/ui/InDataTable.vue'

  
  // const MOCK_GROUPS = [
  //   { groupId: 'G001', groupNm: '인사팀',     useYn: 'Y', memberCnt: 12, regDate: '2026-01-05' },
  //   { groupId: 'G002', groupNm: '급여팀',     useYn: 'Y', memberCnt: 7,  regDate: '2026-01-08' },
  //   { groupId: 'G003', groupNm: '근태관리자', useYn: 'Y', memberCnt: 3,  regDate: '2026-02-01' },
  //   { groupId: 'G004', groupNm: '평가위원회', useYn: 'N', memberCnt: 9,  regDate: '2026-02-14' },
  //   { groupId: 'G005', groupNm: '교육담당',   useYn: 'Y', memberCnt: 4,  regDate: '2026-03-02' },
  //   { groupId: 'G006', groupNm: '시스템관리자', useYn: 'Y', memberCnt: 2, regDate: '2026-03-20' },
  // ]

const columns = [
  { name: 'demo_id',   header: 'ID',     width: 80,  align: 'right' },
  { name: 'demo_name', header: '이름',   width: 180 },
  { name: 'demo_memo', header: '메모',   width: 300 },
  { name: 'reg_date',  header: '등록일', width: 180, align: 'center' },
  { name: 'reg_user',  header: '등록자', width: 120, align: 'center' },
];


  // 상태
  const { call, loading } = useService(); // envelope호출도구(loading 자동 관리)
  const allGroups = ref([]);
  const keyword = ref('') // 검색어
  const rows = ref([])
  const errText = ref('');
  

  //const keyword = ref('') // 검색어
  //const rows = ref([...MOCK_GROUPS])
  const searchCount = ref(0)   // 검색 실행 횟수
  const searchState = reactive({
    lastKeyword: '', // 마지막으로 검색한 단어,
    resultCount: rows.value.length, // 마지막 결과 건수 
  })

async function fetchGroups() {
  errText.value = '';
  try {
    const resp = await call('TST0002_00_R01', {
      ME_TST0002_01: [{ _seq: '', sStatus: 'R', sDelete: '' }],
    });
    const slot = resp?.BODY || {};
    const firstKey = Object.keys(slot).find((k) => Array.isArray(slot[k]));
    allGroups.value = firstKey ? slot[firstKey] : [];   // 원본 채움
    rows.value = [...allGroups.value];                  // 표시 = 원본 전체

    console.log('TST0002 응답 rows:', allGroups.value);  // ★ F12에서 실제 키 확인용
  } catch (e) {
    errText.value = e?.message || String(e);
  }
}


onMounted(fetchGroups);

function search(){
  searchCount.value++;
  const kw = keyword.value.trim();
  if (kw === '') {
    rows.value = [...allGroups.value];
  } else {
    rows.value = allGroups.value.filter((g) =>
      String(g.demo_name ?? '').includes(kw) || String(g.demo_id ?? '').includes(kw)
    );
  }
  searchState.lastKeyword = kw;
  searchState.resultCount = rows.value.length;
}


function save(){
  alert ("save")
}

</script>

<template>
   <div class="group-catalog">
    <h2> 사용자 그룹관리</h2>
    
    <div class = "search-bar">
      <InSearchField v-model="keyword" label="그룹명" input="그룹명 또는 ID를 입력하세요" :icon-clickable="false"  @search="search" />
      <InButton variant="primary" :left-icon-show="false" :right-icon-show="false" @click="search"> 검색</InButton>
      <InButton variant="rounded" :left-icon-show="false" :right-icon-show="false" @click="search"> 검색</InButton>
      <InButton variant="primary" @click="save">저장</InButton>
    </div> 





    <p>현재 검색어: "{{ keyword }}"</p>    
    <p>조회건수: {{rows.length }}</p>
    <p>검색실행횟수: {{  searchCount  }}</p>
    <p>마지막 검색어: "{{ searchState.lastKeyword }}" / 결과 {{ searchState.resultCount }}건</p>
    <InDataTable :columns="columns" :data= "rows" :height="320" />





    <p v-if="loading">조회 중...</p>
    <p v-if="errText" style="color:red">에러: {{ errText }}</p>
    <p>조회건수: {{ rows.length }}</p>



    
   </div>
</template>

<style scoped>
  .group-catalog{
    padding: 16px;
  }
  .search-bar{
    display:flex;
    align-items: center;
    gap: 8px;
    margin-bottom:16px
  }

</style>
