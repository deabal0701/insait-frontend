<script setup>
/**
 * InMetaConventionHint — 우측 사이드 패널: 7-char 자원 ID 일관 미리보기.
 *
 * Step1 ID 게이트 이후 모든 step 우측에 상주. 현 store 의 derivedIds 를 받아
 * 각 자원의 등록 상태 (pending/draft/saved/error) 를 InMetaResourceBadge 로 표시.
 *
 * Figma 노드 ID = TBD
 */
import { computed } from 'vue';
import InMetaSidePanel from './InMetaSidePanel.vue';
import InMetaResourceBadge from './InMetaResourceBadge.vue';

const props = defineProps({
  /** deriveResourceIds() 의 반환값 */
  ids: { type: Object, default: null },
  /** Step 별 status — { sql:'completed', message:'in_progress', entity:'skipped', service:'pending' } */
  stepStatuses: { type: Object, default: () => ({}) },
  /** Step 별 등록 OID — { sql: 123, message: { in: 124, out: 125 }, entity: 126, service: 127 } */
  oids: { type: Object, default: () => ({}) },
  requiresEntity: { type: Boolean, default: false },
});

function statusOf(stepId) {
  const s = props.stepStatuses[stepId];
  if (s === 'completed') return 'saved';
  if (s === 'in_progress') return 'draft';
  if (s === 'error') return 'error';
  if (s === 'skipped') return 'pending';
  return 'pending';
}

const rows = computed(() => {
  if (!props.ids) return [];
  const out = [
    { kind: 'OBJECT',  id: props.ids.object,      step: 'service', oid: props.oids.object },
    { kind: 'SQL',     id: props.ids.sqlName,     step: 'sql',     oid: props.oids.sql },
    { kind: 'MSG_IN',  id: props.ids.msgIn,       step: 'message', oid: props.oids.msgIn },
    { kind: 'MSG_OUT', id: props.ids.msgOut,      step: 'message', oid: props.oids.msgOut },
  ];
  if (props.requiresEntity && props.ids.entityName) {
    out.push({ kind: 'ENTITY', id: props.ids.entityName, step: 'entity', oid: props.oids.entity });
  }
  out.push({ kind: 'SERVICE', id: props.ids.serviceName, step: 'service', oid: props.oids.service });
  out.push({ kind: 'JSP',     id: props.ids.objectLink, step: 'service', oid: null });
  return out;
});
</script>

<template>
  <InMetaSidePanel title="자원 ID 미리보기" icon="info" tone="info">
    <p v-if="!ids" class="in-meta-conv-hint__empty">
      ① 단계에서 화면 ID 와 Command 종류를 결정하면 모든 자원 ID 가 7-char prefix 컨벤션으로 자동 생성됩니다.
    </p>
    <ul v-else class="in-meta-conv-hint__list">
      <li v-for="row in rows" :key="`${row.kind}-${row.id}`" class="in-meta-conv-hint__row">
        <InMetaResourceBadge :kind="row.kind" :resource-id="row.id" :status="statusOf(row.step)" :oid="row.oid" />
      </li>
    </ul>
    <p v-if="ids" class="in-meta-conv-hint__caption">
      <strong>7-char prefix</strong> ({{ ids.screenId }}) 가 모든 자원 ID 의 앞부분에 일치합니다 — IST0050 자동 바인딩 함정 차단 (매뉴얼 99 §4-2.1).
    </p>
  </InMetaSidePanel>
</template>

<style scoped>
.in-meta-conv-hint__empty {
  margin: 0;
  font-size: var(--in-font-size-xs);
  line-height: var(--in-line-height-xs);
  color: var(--in-text-subtle);
}
.in-meta-conv-hint__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.in-meta-conv-hint__row { display: flex; min-width: 0; }
.in-meta-conv-hint__row :deep(.in-meta-resource-badge) { width: 100%; }
.in-meta-conv-hint__caption {
  margin: 10px 0 0;
  padding-top: 10px;
  border-top: 1px dashed var(--in-border-default);
  font-size: var(--in-font-size-xs);
  line-height: var(--in-line-height-xs);
  color: var(--in-text-subtler);
}
.in-meta-conv-hint__caption strong { color: var(--in-text-accent); font-weight: var(--in-font-weight-medium); }
</style>
