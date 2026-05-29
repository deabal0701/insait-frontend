<script setup>
/**
 * InMetaResourceSummary — Service 등록 직전 자원 binding 일괄 readonly 확인.
 *
 * Figma 노드 ID = TBD
 *
 * Step5 의 핵심 UI — 마법사가 Step1~4 에서 누적한 자원 ID 들을 한 화면에서 확인하고
 * 운영자가 "이대로 IST0050 [간편입력] 호출" 확정 → 실수 방지.
 *
 * 자동 바인딩 검증 (99 §4-2.1) 결과도 본 컴포넌트에서 행 단위 상태 표시.
 *
 * Props:
 *   rows: [{
 *     kind: 'OBJECT'|'SQL'|'MSG_IN'|'MSG_OUT'|'ENTITY'|'SERVICE',
 *     label: string,        // 표시 라벨 (예: 'Service ID')
 *     id: string,           // 자원 ID 값
 *     oid?: number,         // 등록된 OID
 *     status?: 'pending'|'saved'|'error'|'verified'|'unverified',
 *     hint?: string,        // 행별 부가 설명
 *   }]
 */
import InMetaResourceBadge from './InMetaResourceBadge.vue';

defineProps({
  rows: { type: Array, required: true },
});

function badgeStatus(rowStatus) {
  if (rowStatus === 'saved' || rowStatus === 'verified') return 'saved';
  if (rowStatus === 'error' || rowStatus === 'unverified') return 'error';
  return 'pending';
}
</script>

<template>
  <dl class="in-meta-summary">
    <template v-for="row in rows" :key="`${row.kind}-${row.id}`">
      <dt class="in-meta-summary__dt">{{ row.label }}</dt>
      <dd class="in-meta-summary__dd">
        <InMetaResourceBadge
          :kind="row.kind"
          :resource-id="row.id"
          :status="badgeStatus(row.status)"
          :oid="row.oid ?? null"
        />
        <span v-if="row.hint" class="in-meta-summary__hint">{{ row.hint }}</span>
      </dd>
    </template>
  </dl>
</template>

<style scoped>
.in-meta-summary {
  display: grid;
  grid-template-columns: 130px 1fr;
  gap: 8px 12px;
  margin: 0;
  font-family: var(--in-font-family-body);
}
.in-meta-summary__dt {
  font-size: var(--in-font-size-sm);
  color: var(--in-text-subtle);
  font-weight: var(--in-font-weight-medium);
  padding-top: 4px;
}
.in-meta-summary__dd {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.in-meta-summary__hint {
  font-size: var(--in-font-size-xs);
  color: var(--in-text-subtler);
  padding-left: 2px;
}
.in-meta-summary__dd :deep(.in-meta-resource-badge) {
  align-self: flex-start;
  max-width: 100%;
}
@media (max-width: 700px) {
  .in-meta-summary { grid-template-columns: 1fr; }
  .in-meta-summary__dt { padding-top: 0; }
}
</style>
