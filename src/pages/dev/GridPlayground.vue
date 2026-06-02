<script setup>
// ★ (2026-06-02, dspark): InDataTable self-managed 모드 데모 — TST0002 실서비스.
//   URL /dev/grid (Playground 허브 또는 LNB 시스템관리 > Playground > Grid).
//   self-managed = retrieve/save serviceId 만 주면 InDataTable 이 조회·저장을 내부 처리.
//   :data 불필요. gridB.retrieve(body) / gridB.save() 호출.
//
//   TST0002 계약 (SCENARIO-tst0002-multiquery/multisave):
//     조회 = TST0002_00_R01  (검색 IN: ME_TST0002_01.keyword / 응답 OUT: ME_TST0002_02)
//     저장 = TST0002_00_S01  (요청 IN: ME_TST0002_02 [R01.OUT 재사용] / 응답: ME_SAVE_RESULT)
//     objectId = TST0002 · 테이블 TST_DEMO(demo_id PK auto-seq, reg_date auto sysdate)
//   ※ columns(표 뼈대)는 직접 정의. 서비스ID 가 columns 를 만들어주지 않는다.
//   ★ (2026-06-02): 케이스 A(controlled) 제거 — InDataTable 일반 사용법은 추후 별도 설명.
//                   ElButton → InButton(공통 컴포넌트) 전환. 다양한 케이스는 추후 보완 예정.
import { ref } from 'vue';
import { ElInput, ElSwitch } from 'element-plus';
import InButton from '@/components/ui/InButton.vue';
import InDataTable from '@/components/ui/InDataTable.vue';
import { useToast } from '@/composables/useToast';

// ★ (2026-06-02, dspark): ElMessage → InToast 기반 useToast 전환 (디자인시스템 정합).
const toast = useToast();

// columns — TST_DEMO 스키마. demo_id/reg_date 는 서버 자동생성이라 읽기전용. 컬럼을 지정하면 자동 매핑이 됨.
const columns = [
  { name: 'demo_id', header: 'ID(PK)', width: 90, align: 'right' },
  { name: 'demo_memo', header: '메모', editor: 'text', width: 220 },
  { name: 'reg_date', header: '등록일', width: 170 },
  { name: 'demo_name', header: '이름', editor: 'text', width: 160 },
  { name: 'reg_user', header: '등록자', editor: 'text', width: 120 },
];
const options = {
  rowHeaders: ['rowNum', 'checkbox'],
  columnOptions: { resizable: true },
  bodyHeight: 220,
};

/* ───────────── self-managed (TST0002 서비스로 내부 조회·저장) ───────────── */
const gridB = ref(null);
// TST0002 실서비스 기본값 (입력칸으로 노출 — 필요 시 다른 서비스로 바꿔 테스트 가능)
const svc = ref({
  retrieveServiceId: 'TST0002_00_R01',
  saveServiceId: 'TST0002_00_S01',
  slotName: 'ME_TST0002_02',     // 조회 응답 + 저장 요청 공통 슬롯 (CRUD 메시지 재사용)
  objectId: 'TST0002',
  autoRetrieve: false,
});
// 검색조건 body — 검증된 형태 { 슬롯: [record] } (ServiceTester:147 동일). keyword 빈값 = 전체.
const searchBody = ref('{ "ME_TST0002_01": [ { "keyword": "" } ] }');

async function bRetrieve() {
  if (!svc.value.retrieveServiceId) { toast.warning('retrieveServiceId 를 입력하세요'); return; }
  let body = {};
  try { body = JSON.parse(searchBody.value || '{}'); }
  catch (_) { toast.error('검색조건 JSON 파싱 실패'); return; }
  try {
    const rows = await gridB.value.retrieve(body);
    toast.success(`조회 ${rows?.length || 0}행 (InDataTable 이 envelope 조립·POST·파싱·반영)`);
  } catch (e) {
    toast.error(`조회 실패: ${e?.message || e}`);
  }
}
async function bSave() {
  if (!svc.value.saveServiceId) { toast.warning('saveServiceId 를 입력하세요'); return; }
  try {
    const r = await gridB.value.save();
    if (r.skipped) toast.info('변경분 0건 — 저장 호출 생략');
    else toast.success(`저장 ${r.dirty.length}건 전송 + 재조회 완료`);
  } catch (e) {
    toast.error(`저장 실패: ${e?.message || e}`);
  }
}
// 신규 INSERT: demo_id/reg_date 는 서버 자동생성 → 빈값. demo_name/demo_memo/reg_user 만 입력.
function bAddRow() {
  gridB.value?.addRow({ demo_id: '', demo_name: '신규', demo_memo: '', reg_date: '', reg_user: 'tester' });
}
// 체크 행 삭제 표시(sStatus='D'). DB 즉시 삭제 X — [저장] 시 서버가 진짜 DELETE.
function bRemoveChecked() {
  const removed = gridB.value?.removeCheckedRows() || [];
  if (!removed.length) { toast.warning('체크된 행이 없습니다.'); return; }
  toast.info(`${removed.length}행 삭제 표시 (sStatus='D') — 저장 시 서버 DELETE`);
}
</script>

<template>
  <div class="pg3">
    <h2 class="pg3__title">InDataTable self-managed 모드 — TST0002 (dev)</h2>
    <p class="pg3__hint">
      <code>retrieve/save serviceId</code> 만 주면 InDataTable 이 조회·저장을 내부 처리한다.
      <code>:data</code> 불필요 — <code>gridB.retrieve(body)</code> / <code>gridB.save()</code> 호출.
    </p>

    <section class="case">
      <h3 class="case__h">self-managed 모드 (서비스 props) · TST0002 실배선</h3>
      <p class="case__desc">
        아래 값은 TST0002 실서비스 — <b>[조회]</b> 누르면 백엔드를 호출해 TST_DEMO 를 그린다.
        columns(표 뼈대)는 직접 정의하지만, 데이터·조회·저장은 InDataTable 이 알아서 처리한다.
      </p>
      <div class="case__form">
        <label>retrieveServiceId <ElInput v-model="svc.retrieveServiceId" size="small" /></label>
        <label>saveServiceId <ElInput v-model="svc.saveServiceId" size="small" /></label>
        <label>slotName <ElInput v-model="svc.slotName" size="small" /></label>
        <label>objectId(header) <ElInput v-model="svc.objectId" size="small" /></label>
        <label class="case__wide">검색조건 body(JSON) <ElInput v-model="searchBody" size="small" /></label>
        <label class="case__sw">auto-retrieve <ElSwitch v-model="svc.autoRetrieve" /></label>
      </div>
      <div class="case__bar">
        <InButton size="sm" variant="primary" :left-icon-show="false" :right-icon-show="false" @click="bRetrieve">조회 (retrieve)</InButton>
        <InButton size="sm" variant="default" :left-icon-show="false" :right-icon-show="false" @click="bAddRow">행 추가(INSERT)</InButton>
        <InButton size="sm" variant="default" :left-icon-show="false" :right-icon-show="false" @click="bRemoveChecked">체크 삭제(D)</InButton>
        <InButton size="sm" variant="primary" :left-icon-show="false" :right-icon-show="false" @click="bSave">저장 (save)</InButton>
        <span class="case__tag">rows: {{ gridB?.rows?.length ?? 0 }} · dirty: {{ gridB?.dirtyCount ?? 0 }} · loading: {{ gridB?.loading ? 'Y' : 'N' }}</span>
      </div>
      <!-- :data 없음 — InDataTable 이 retrieve() 로 스스로 채움 -->
      <InDataTable
        ref="gridB"
        :columns="columns"
        :options="options"
        :height="300"
        :retrieve-service-id="svc.retrieveServiceId || undefined"
        :save-service-id="svc.saveServiceId || undefined"
        :slot-name="svc.slotName || undefined"
        :header="svc.objectId ? { objectId: svc.objectId } : {}"
        :auto-retrieve="svc.autoRetrieve"
      />
      <pre class="case__code">&lt;InDataTable :columns="columns"
  retrieve-service-id="TST0002_00_R01"
  save-service-id="TST0002_00_S01"
  slot-name="ME_TST0002_02"
  :header="{ objectId: 'TST0002' }" /&gt;   // data 불필요 — gridB.retrieve() / gridB.save()</pre>
    </section>
  </div>
</template>

<style scoped>
.pg3 { padding: 16px; width: 100%; max-width: 980px; }
.pg3__title { margin: 0 0 4px; font-size: 18px; font-weight: 600; color: var(--in-text-accent, #111); }
.pg3__hint { margin: 0 0 16px; font-size: 12px; color: var(--in-text-subtle, #777); }
.pg3__hint code { padding: 1px 5px; background: var(--in-surface-default, #f3f3f3); border-radius: 4px; font-size: 11px; }
.case { margin-bottom: 28px; padding: 14px; border: 1px solid var(--in-border-default, #e2e2e2); border-radius: 8px; }
.case__h { margin: 0 0 6px; font-size: 15px; font-weight: 600; color: var(--in-text-accent, #111); }
.case__desc { margin: 0 0 12px; font-size: 12px; line-height: 1.6; color: var(--in-text-default, #565656); }
.case__desc code { padding: 1px 5px; background: var(--in-surface-default, #f3f3f3); border-radius: 4px; font-size: 11px; }
.case__bar { display: flex; gap: 8px; align-items: center; margin-bottom: 10px; flex-wrap: wrap; }
.case__tag { margin-left: auto; font-size: 11px; color: var(--in-text-subtle, #888); }
.case__form { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 16px; margin-bottom: 12px; }
.case__form label { display: flex; flex-direction: column; gap: 3px; font-size: 11px; color: var(--in-text-subtle, #777); }
.case__wide { grid-column: 1 / -1; }
.case__sw { flex-direction: row !important; align-items: center; gap: 8px; }
.case__code { margin: 10px 0 0; padding: 10px; background: var(--in-surface-default, #f5f5f5); border-radius: 6px; font-size: 11px; line-height: 1.5; color: var(--in-text-default, #333); white-space: pre-wrap; }
</style>
