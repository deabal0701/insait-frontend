<script setup>
  import { ref } from 'vue';
  
  const MOCK_GROUPS = [
    { groupId: 'G001', groupNm: '인사팀',     useYn: 'Y', memberCnt: 12, regDate: '2026-01-05' },
    { groupId: 'G002', groupNm: '급여팀',     useYn: 'Y', memberCnt: 7,  regDate: '2026-01-08' },
    { groupId: 'G003', groupNm: '근태관리자', useYn: 'Y', memberCnt: 3,  regDate: '2026-02-01' },
    { groupId: 'G004', groupNm: '평가위원회', useYn: 'N', memberCnt: 9,  regDate: '2026-02-14' },
    { groupId: 'G005', groupNm: '교육담당',   useYn: 'Y', memberCnt: 4,  regDate: '2026-03-02' },
    { groupId: 'G006', groupNm: '시스템관리자', useYn: 'Y', memberCnt: 2, regDate: '2026-03-20' },
  ]

  const keyword = ref('') // 검색어
  const rows = ref([...MOCK_GROUPS])

</script>

<template>
   <div class="group-catalog">
    <h2> 사용자 그룹관리</h2>
    <p>현재 검색어: "{{ keyword }}"</p>    
    <p>조회건수: {{rows.length }}</p>
    <ul>
       <li v-for="g in rows" :key="g.groupId">
         {{ g.groupId }} — {{ g.groupNm }} ({{ g.useYn }}, {{ g.memberCnt }}명)
       </li>

    </ul> 

   </div>

</template>

<style scoped>
  .group-catalog{
    padding: 16px;
  }
</style>
