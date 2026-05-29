<script setup>
/**
 * InMetaStatsRow — 통계 칩 한 줄. 카탈로그/대시보드 상단 요약.
 *
 * Figma 노드 ID = TBD
 *
 * Props:
 *   stats: [{
 *     label: string,
 *     value: string|number,
 *     tone?: 'default'|'brand'|'success'|'warning'|'error',
 *     hint?: string,
 *   }]
 */
defineProps({
  stats: { type: Array, required: true },
});
</script>

<template>
  <ul class="in-meta-stats" role="list">
    <li
      v-for="(s, i) in stats"
      :key="i"
      class="in-meta-stats__item"
      :class="[`in-meta-stats__item--tone-${s.tone || 'default'}`]"
      :title="s.hint || ''"
    >
      <span class="in-meta-stats__label">{{ s.label }}</span>
      <span class="in-meta-stats__value">{{ s.value }}</span>
    </li>
  </ul>
</template>

<style scoped>
.in-meta-stats {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  font-family: var(--in-font-family-body);
}
.in-meta-stats__item {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  padding: 6px 12px;
  background: var(--in-surface-overlay, #ffffff);
  border: 1px solid var(--in-border-default);
  border-radius: var(--in-radius-full);
}
.in-meta-stats__label {
  font-size: var(--in-font-size-xs);
  color: var(--in-text-subtle);
}
.in-meta-stats__value {
  font-size: var(--in-font-size-md);
  font-weight: var(--in-font-weight-medium);
  color: var(--in-text-accent);
}

/* Tone variants */
.in-meta-stats__item--tone-brand {
  background: var(--in-bg-accent-subtle, var(--in-brand-50, #e1f5fc));
  border-color: var(--in-brand);
}
.in-meta-stats__item--tone-brand .in-meta-stats__value { color: var(--in-brand); }

.in-meta-stats__item--tone-success {
  background: var(--in-surface-success, #e4faf0);
  border-color: var(--in-text-success);
}
.in-meta-stats__item--tone-success .in-meta-stats__value { color: var(--in-text-success); }

.in-meta-stats__item--tone-warning {
  background: var(--in-surface-warning, #fffbeb);
  border-color: var(--in-text-warning);
}
.in-meta-stats__item--tone-warning .in-meta-stats__value { color: var(--in-text-warning); }

.in-meta-stats__item--tone-error {
  background: var(--in-surface-error, #fef2f2);
  border-color: var(--in-text-error);
}
.in-meta-stats__item--tone-error .in-meta-stats__value { color: var(--in-text-error); }
</style>
