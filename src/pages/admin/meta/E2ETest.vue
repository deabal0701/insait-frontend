<script setup>
/**
 * E2ETest — 메타 등록 → envelope 조회 종단(E2E) 검증 화면.
 * ★ (2026-06-05, dspark): 04-admin-lane 5개 메타 CRUD 로 등록한 서비스(TST0007_00_R01)를
 *   실제 /serviceBroker.h5 envelope 로 호출해 조회되는지 확인하는 데모.
 *
 * 시나리오 (AS-IS SUMMARY-metadata-registration-guide.md TST0001 자기참조 패턴):
 *   - SQL(TST0007_00_R01): SELECT ... FROM FRM_EXECUTABLE_OBJECT WHERE company_cd=:company_cd AND object_nm LIKE %:keyword%
 *   - IN(MT_TST0007_01): company_cd, keyword / OUT(MT_TST0007_02): object_id, object_nm, ...
 *   - 서비스(TST0007_00_R01, MultiQueryCommand) + 오브젝트(TST0007_51, 자기참조 대상)
 *   → keyword='TST0007' 검색 시 방금 등록한 오브젝트 TST0007_51 이 결과에 나타나면 종단 성공.
 *
 * envelope 호출은 useService(=buildEnvelope + /serviceBroker.h5) 단일 창구 사용.
 */
import { ref } from 'vue';
import { useService } from '@/composables/useService';
import { parseResponse } from '@/services/envelope';
import { useToast } from '@/composables/useToast';

import InSearchField from '@/components/ui/InSearchField.vue';
import InButton from '@/components/ui/InButton.vue';
import InTable from '@/components/ui/InTable.vue';
import InCard from '@/components/ui/InCard.vue';
import InEmptyState from '@/components/ui/InEmptyState.vue';
import InTag from '@/components/ui/InTag.vue';

const SERVICE_ID = 'TST0007_00_R01';
const IN_SLOT = 'ME_TST0007_01';
const OUT_SLOT = 'ME_TST0007_02';

const toast = useToast();
const { call, loading } = useService();

const keyword = ref('TST0007');
const rows = ref([]);
const lastEnvelope = ref(null);
const ran = ref(false);

const columns = [
  { field: 'object_id', label: 'OBJECT_ID', width: 120, align: 'right' },
  { field: 'object_nm', label: 'OBJECT_NM', width: 220 },
  { field: 'object_display_nm', label: '화면표시명' },
  { field: 'object_type', label: 'Type', width: 80, align: 'center' },
  { field: 'object_link', label: 'JSP 경로', width: 240 },
];

async function runQuery() {
  ran.value = true;
  try {
    const body = { [IN_SLOT]: [{ company_cd: '01', keyword: keyword.value || '' }] };
    const resp = await call(SERVICE_ID, body, { actionType: 'retrieve', objectId: 'TST0007' });
    lastEnvelope.value = resp;
    rows.value = parseResponse(resp, OUT_SLOT) || [];
    toast.success?.(`조회 완료 — ${rows.value.length}건`);
  } catch (e) {
    rows.value = [];
    toast.error?.(e?.message || '조회 실패');
  }
}

function copyEnvelope() {
  navigator.clipboard.writeText(JSON.stringify(lastEnvelope.value, null, 2));
  toast.success?.('응답 envelope JSON 복사됨');
}
</script>

<template>
  <div class="e2e">
    <header class="e2e__head">
      <h1 class="e2e__title">E2E 테스트 — 서비스 등록 → envelope 조회</h1>
      <p class="e2e__sub">
        메타 CRUD 5화면으로 등록한 서비스 <code>{{ SERVICE_ID }}</code> 를
        실제 <code>/serviceBroker.h5</code> envelope 로 호출합니다.
        <code>FRM_EXECUTABLE_OBJECT</code> 자기참조 조회 — <strong>TST0007</strong> 검색 시 방금 등록한
        오브젝트 <code>TST0007_51</code> 이 결과에 나타나면 종단 성공.
      </p>
    </header>

    <InCard class="e2e__bar">
      <div class="e2e__search">
        <InSearchField
          :model-value="keyword"
          label="검색어 (object_nm LIKE)"
          input="예: TST0007"
          layout="vertical"
          @update:model-value="(v) => keyword = v"
          @search="runQuery"
        />
        <InButton variant="primary" size="md" :left-icon-show="false" :right-icon-show="false" :disabled="loading" @click="runQuery">
          {{ loading ? '조회 중…' : 'envelope 조회' }}
        </InButton>
      </div>
      <div class="e2e__meta">
        <InTag :label="`serviceId: ${SERVICE_ID}`" variant="brand" size="sm" />
        <InTag :label="`IN: ${IN_SLOT}`" size="sm" />
        <InTag :label="`OUT: ${OUT_SLOT}`" size="sm" />
        <InButton v-if="lastEnvelope" variant="text" size="sm" @click="copyEnvelope">📋 응답 envelope 복사</InButton>
      </div>
    </InCard>

    <section class="e2e__result">
      <div class="e2e__result-head">
        <strong>조회 결과</strong>
        <span class="muted">{{ rows.length }}건</span>
      </div>
      <InTable v-if="rows.length" :columns="columns" :data="rows" row-key="object_id">
        <template #cell-object_nm="{ value }">
          <strong :class="{ 'hit': value === 'TST0007_51' }">{{ value }}</strong>
          <InTag v-if="value === 'TST0007_51'" label="자기참조 HIT" variant="success" size="sm" />
        </template>
        <template #cell-object_link="{ value }"><code class="link">{{ value || '—' }}</code></template>
      </InTable>
      <InEmptyState
        v-else-if="ran && !loading"
        title="결과 없음"
        description="검색어를 바꾸거나, 메타(TST0007) 가 등록되어 있는지 확인하세요."
      />
      <p v-else class="muted e2e__hint">[envelope 조회] 를 눌러 등록된 서비스를 호출하세요.</p>
    </section>
  </div>
</template>

<style scoped>
.e2e { display: flex; flex-direction: column; gap: 16px; padding: 24px; font-family: var(--in-font-family-body); }
.e2e__title { margin: 0; font-size: 22px; line-height: 28px; font-weight: var(--in-font-weight-medium); color: var(--in-text-default); }
.e2e__sub { margin: 6px 0 0; font-size: var(--in-font-size-sm); line-height: var(--in-line-height-md); color: var(--in-text-subtle); }
.e2e__sub code { font-family: var(--in-font-family-mono, ui-monospace); color: var(--in-text-accent); }
.e2e__bar { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.e2e__search { display: flex; gap: 12px; align-items: flex-end; }
.e2e__search > :deep(.in-sf) { flex: 1 1 360px; max-width: 480px; }
.e2e__meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.e2e__result-head { display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px; }
.muted { color: var(--in-text-subtle); }
.e2e__hint { padding: 24px; text-align: center; }
.hit { color: var(--in-text-brand); }
.link { font-family: var(--in-font-family-mono, ui-monospace); font-size: var(--in-font-size-sm); }
</style>
