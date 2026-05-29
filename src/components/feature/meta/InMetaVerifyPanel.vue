<script setup>
/**
 * InMetaVerifyPanel — 우측 사이드 패널: 현 단계 등록 결과의 DB 검증 SQL.
 *
 * 매뉴얼 §5 의 검증 SQL 세트를 마법사 내장 — Oracle SQL 도구 (DBeaver 등) 복사용.
 *
 * Figma 노드 ID = TBD
 */
import InMetaSidePanel from './InMetaSidePanel.vue';
import InMetaCodeBlock from './InMetaCodeBlock.vue';

defineProps({
  /** [{ title, sql, expectation }] */
  queries: { type: Array, default: () => [] },
});
</script>

<template>
  <InMetaSidePanel title="DB 검증 SQL" icon="help" tone="default" :default-open="false">
    <p v-if="queries.length === 0" class="in-meta-verify-panel__empty">
      해당 단계의 검증 SQL 이 없습니다.
    </p>
    <div v-else class="in-meta-verify-panel__list">
      <div v-for="(q, i) in queries" :key="i" class="in-meta-verify-panel__item">
        <h4 class="in-meta-verify-panel__h">{{ q.title }}</h4>
        <InMetaCodeBlock lang="sql" :code="q.sql" max-height="160px" />
        <p v-if="q.expectation" class="in-meta-verify-panel__expect">
          <span>기대:</span> {{ q.expectation }}
        </p>
      </div>
    </div>
  </InMetaSidePanel>
</template>

<style scoped>
.in-meta-verify-panel__empty {
  margin: 0;
  font-size: var(--in-font-size-xs);
  color: var(--in-text-subtle);
}
.in-meta-verify-panel__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.in-meta-verify-panel__item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.in-meta-verify-panel__h {
  margin: 0;
  font-size: var(--in-font-size-xs);
  line-height: var(--in-line-height-xs);
  font-weight: var(--in-font-weight-medium);
  color: var(--in-text-subtle);
  letter-spacing: 0.2px;
  text-transform: uppercase;
}
.in-meta-verify-panel__expect {
  margin: 0;
  font-size: var(--in-font-size-xs);
  line-height: var(--in-line-height-xs);
  color: var(--in-text-subtler);
}
.in-meta-verify-panel__expect span {
  color: var(--in-text-default);
  font-weight: var(--in-font-weight-medium);
  margin-right: 4px;
}
</style>
