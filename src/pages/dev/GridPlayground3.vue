<script setup>
// ★ (2026-06-02, dspark): [옵션 1] InDataTable 2가지 사용 모드 비교 데모 — TST0002 실서비스.
//   URL /dev/grid3 직접 진입 (LNB 노출 X). 같은 columns(TST_DEMO 스키마)를 두 방식으로 사용.
//
//   ● 케이스 A — controlled 모드 (:data 직접 주입)
//     · 데이터를 개발자가 직접 구해서 :data 로 넣는다 (여기선 로컬 샘플).
//     · InDataTable 은 서버를 모름. GridPlayground2 와 동일한 옛 방식.
//
//   ● 케이스 B — self-managed 모드 (서비스 props) — TST0002 R01/S01 실배선
//     · retrieve/save serviceId 만 주면 InDataTable 이 조회·저장을 내부 처리.
//     · :data 불필요. gridB.retrieve(body) / gridB.save() 호출.
//
//   TST0002 계약 (SCENARIO-tst0002-multiquery/multisave):
//     조회 = TST0002_00_R01  (검색 IN: ME_TST0002_01.keyword / 응답 OUT: ME_TST0002_02)
//     저장 = TST0002_00_S01  (요청 IN: ME_TST0002_02 [R01.OUT 재사용] / 응답: ME_SAVE_RESULT)
//     objectId = TST0002 · 테이블 TST_DEMO(demo_id PK auto-seq, reg_date auto sysdate)
//   ※ 두 경우 모두 columns(표 뼈대)는 직접 정의. 서비스ID 가 columns 를 만들어주지 않는다.
import { ref } from 'vue';
import { ElButton, ElMessage, ElInput, ElSwitch } from 'element-plus';
import InDataTable from '@/components/ui/InDataTable.vue';

// 공통 columns — A·B 동일 (TST_DEMO 스키마). demo_id/reg_date 는 서버 자동생성이라 읽기전용.
const columns = [
  { name: 'demo_id', header: 'ID(PK)', width: 90, align: 'right' },
  { name: 'demo_name', header: '이름', editor: 'text', width: 160 },
  { name: 'demo_memo', header: '메모', editor: 'text', width: 220 },
  { name: 'reg_date', header: '등록일', width: 170 },
  { name: 'reg_user', header: '등록자', editor: 'text', width: 120 },
];
const options = {
  rowHeaders: ['rowNum', 'checkbox'],
  columnOptions: { resizable: true },
  bodyHeight: 220,
};

/* ───────────── 케이스 A — controlled (로컬 데이터 직접 주입) ───────────── */
const localRows = ref([
  { demo_id: 1, demo_name: '샘플가', demo_memo: '로컬 데이터', reg_date: '2026-05-01 09:00:00', reg_user: 'local' },
  { demo_id: 2, demo_name: '샘플나', demo_memo: '서버 안 거침', reg_date: '2026-05-02 10:00:00', reg_user: 'local' },
]);
const gridA = ref(null);
function aAddRow() {
  gridA.value?.addRow({ demo_id: '', demo_name: '', demo_memo: '', reg_date: '', reg_user: '' });
}
function aShowDirty() {
  const dirty = gridA.value?.getDirty() || [];   // controlled 모드는 dirty 를 직접 추출
  ElMessage.success(`[A] 변경분 ${dirty.length}건 (직접 추출 → 직접 저장 책임)`);
}

/* ───────────── 케이스 B — self-managed (TST0002 서비스로 내부 조회·저장) ───────────── */
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
  if (!svc.value.retrieveServiceId) { ElMessage.warning('retrieveServiceId 를 입력하세요'); return; }
  let body = {};
  try { body = JSON.parse(searchBody.value || '{}'); }
  catch (_) { ElMessage.error('검색조건 JSON 파싱 실패'); return; }
  try {
    const rows = await gridB.value.retrieve(body);
    ElMessage.success(`[B] 조회 ${rows?.length || 0}행 (InDataTable 이 envelope 조립·POST·파싱·반영)`);
  } catch (e) {
    ElMessage.error(`[B] 조회 실패: ${e?.message || e}`);
  }
}
async function bSave() {
  if (!svc.value.saveServiceId) { ElMessage.warning('saveServiceId 를 입력하세요'); return; }
  try {
    const r = await gridB.value.save();
    if (r.skipped) ElMessage.info('[B] 변경분 0건 — 저장 호출 생략');
    else ElMessage.success(`[B] 저장 ${r.dirty.length}건 전송 + 재조회 완료`);
  } catch (e) {
    ElMessage.error(`[B] 저장 실패: ${e?.message || e}`);
  }
}
// 신규 INSERT: demo_id/reg_date 는 서버 자동생성 → 빈값. demo_name/demo_memo/reg_user 만 입력.
function bAddRow() {
  gridB.value?.addRow({ demo_id: '', demo_name: '신규', demo_memo: '', reg_date: '', reg_user: 'tester' });
}
</script>

<template>
  <div class="pg3">
    <h2 class="pg3__title">InDataTable 사용 모드 비교 — TST0002 (dev)</h2>
    <p class="pg3__hint">
      같은 columns(TST_DEMO 스키마)를 두 방식으로 사용. <b>표 뼈대(columns)는 두 경우 모두 직접 정의</b> —
      서비스ID 가 columns 를 만들어 주지 않는다. 차이는 오직 <b>data(값)를 누가 채우나</b>.
    </p>

    <!-- ───── 케이스 A ───── -->
    <section class="case">
      <h3 class="case__h">케이스 A — controlled 모드 <code>:data</code> 직접 주입</h3>
      <p class="case__desc">
        개발자가 데이터를 직접 구해서 <code>:data="localRows"</code> 로 넣는다. InDataTable 은 서버를
        모름. 저장도 개발자 책임(<code>getDirty()</code> 추출 후 직접 전송). = 옛 방식 / GridPlayground2.
      </p>
      <div class="case__bar">
        <ElButton size="small" type="primary" @click="aAddRow">행 추가</ElButton>
        <ElButton size="small" @click="aShowDirty">변경분 추출(직접 저장책임)</ElButton>
        <span class="case__tag">data: 로컬 {{ localRows.length }}행 (서버 안 거침)</span>
      </div>
      <InDataTable ref="gridA" :columns="columns" :data="localRows" :options="options" :height="300" />
      <pre class="case__code">&lt;InDataTable :columns="columns" :data="localRows" /&gt;   // data 필요</pre>
    </section>

    <!-- ───── 케이스 B ───── -->
    <section class="case">
      <h3 class="case__h">케이스 B — self-managed 모드 (서비스 props) · TST0002 실배선</h3>
      <p class="case__desc">
        <code>retrieve/save serviceId</code> 만 주면 InDataTable 이 조회·저장을 내부 처리.
        <code>:data</code> 불필요. <code>gridB.retrieve(body)</code> / <code>gridB.save()</code> 호출.
        아래 값은 TST0002 실서비스 — <b>[조회]</b> 누르면 백엔드를 호출해 TST_DEMO 를 그린다.
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
        <ElButton size="small" type="success" @click="bRetrieve">조회 (retrieve)</ElButton>
        <ElButton size="small" @click="bAddRow">행 추가(INSERT)</ElButton>
        <ElButton size="small" type="warning" @click="bSave">저장 (save)</ElButton>
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
.case { margin-bottom: 28px; padding: 14px; border: 1px solid var(--in-border-default, #e2e2e2); border-radius: 8px; }
.case__h { margin: 0 0 6px; font-size: 15px; font-weight: 600; color: var(--in-text-accent, #111); }
.case__h code { font-size: 13px; color: var(--in-brand, #13a9e9); }
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
