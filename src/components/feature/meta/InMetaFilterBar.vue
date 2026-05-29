<script setup>
/**
 * InMetaFilterBar — 메타 카탈로그 / 테스터 공통 필터 바.
 *
 * Figma 노드 ID = TBD
 *
 * Slot 기반 — 필터 항목들을 slot 으로 받아 일관된 가로 layout + sticky 배치 제공.
 * P5-B 서비스 카탈로그 + P5-C 서비스 테스터 + P7 단독 편집 화면 4종에서 재활용 예정.
 *
 * Props:
 *   sticky?: boolean — top: 0 sticky 동작 (스크롤해도 상단 고정)
 *
 * Slots:
 *   default — 필터 컨트롤 (InSelect, InTextField 등)
 *   actions — 우측 액션 영역 ("초기화" 등)
 */
defineProps({
  sticky: { type: Boolean, default: false },
});
</script>

<template>
  <div class="in-meta-filter-bar" :class="{ 'in-meta-filter-bar--sticky': sticky }">
    <div class="in-meta-filter-bar__items">
      <slot />
    </div>
    <div v-if="$slots.actions" class="in-meta-filter-bar__actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
.in-meta-filter-bar {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
  padding: 12px 16px;
  background: var(--in-surface-overlay, #ffffff);
  border: 1px solid var(--in-border-default);
  border-radius: var(--in-radius-sm);
  font-family: var(--in-font-family-body);
}
.in-meta-filter-bar--sticky {
  position: sticky;
  top: 0;
  z-index: 5;
  box-shadow: 0 2px 4px 0 rgba(86, 106, 177, 0.05);
}
.in-meta-filter-bar__items {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
  flex: 1 1 auto;
  min-width: 0;
}
.in-meta-filter-bar__items :deep(> *) {
  min-width: 0;
}
.in-meta-filter-bar__actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
</style>
