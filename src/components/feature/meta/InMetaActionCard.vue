<script setup>
/**
 * InMetaActionCard — 메타관리 hub / 카탈로그 진입 카드.
 *
 * 사용처:
 *  - MetaHub.vue (현재) — "신규 화면 등록", "서비스 카탈로그", 단독 편집 화면 4종 진입
 *  - 추후 P5 ServiceCatalogPage — 서비스 그룹 카드
 *  - 추후 P7 단독 편집 진입 카드
 *
 * Figma 노드 ID = TBD
 *
 * 시각: InCard 어휘 정합 (white + border + radius-sm + shadow elev-2). 단 카드 자체가
 *      클릭 가능한 액션 surface 이므로 hover state 강화 + 우상단 chevron 표시.
 *
 * Props:
 *   icon?: string (registry key)
 *   tone?: 'primary'|'default' — primary 는 강조 (신규 등록 같은 메인 액션)
 *   title: string
 *   description?: string
 *   stat?: string|number — 우측 통계 (예: 등록 자원 N건)
 *   disabled?: boolean
 *
 * Emits:
 *   click — 카드 클릭
 */
import InIcon from '@/components/ui/InIcon.vue';

defineProps({
  icon: { type: String, default: '' },
  tone: { type: String, default: 'default' },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  stat: { type: [String, Number, null], default: null },
  disabled: { type: Boolean, default: false },
});
defineEmits(['click']);
</script>

<template>
  <button
    type="button"
    class="in-meta-action"
    :class="[`in-meta-action--tone-${tone}`, { 'in-meta-action--disabled': disabled }]"
    :disabled="disabled"
    @click="$emit('click')"
  >
    <span v-if="icon" class="in-meta-action__icon">
      <InIcon :name="icon" :size="22" color="brand" colorize />
    </span>
    <span class="in-meta-action__body">
      <span class="in-meta-action__title">{{ title }}</span>
      <span v-if="description" class="in-meta-action__desc">{{ description }}</span>
    </span>
    <span v-if="stat != null" class="in-meta-action__stat">{{ stat }}</span>
    <span class="in-meta-action__chev" aria-hidden="true">
      <InIcon name="arrow-right" :size="16" color="subtle" colorize />
    </span>
  </button>
</template>

<style scoped>
.in-meta-action {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 18px 20px;
  background: var(--in-surface-overlay, #ffffff);
  border: 1px solid var(--in-border-default);
  border-radius: var(--in-radius-sm);
  box-shadow: 0 2px 4px 0 rgba(86, 106, 177, 0.05);
  font-family: var(--in-font-family-body);
  cursor: pointer;
  text-align: left;
  outline: none;
  transition: border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease, background 120ms ease;
}

.in-meta-action:hover {
  border-color: var(--in-brand);
  box-shadow: 0 4px 10px 0 rgba(0, 0, 0, 0.08);
}

.in-meta-action:focus-visible {
  outline: var(--in-focus-ring-style, solid) var(--in-focus-ring-width, 2px) var(--in-focus-ring-color, var(--in-brand));
  outline-offset: 2px;
}

.in-meta-action:active {
  transform: translateY(1px);
}

.in-meta-action--disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
.in-meta-action--disabled:hover {
  border-color: var(--in-border-default);
  box-shadow: 0 2px 4px 0 rgba(86, 106, 177, 0.05);
}

/* Tone — primary 는 신규 등록 같은 메인 액션 강조 */
.in-meta-action--tone-primary {
  background: var(--in-bg-accent-subtle, var(--in-brand-50, #e1f5fc));
  border-color: var(--in-brand);
}
.in-meta-action--tone-primary:hover {
  background: var(--in-bg-accent-subtle, var(--in-brand-50, #e1f5fc));
  border-color: var(--in-brand-bolder, var(--in-brand));
}
.in-meta-action--tone-primary .in-meta-action__title { color: var(--in-text-accent); }

/* 아이콘 박스 */
.in-meta-action__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  background: var(--in-bg-accent-subtle, var(--in-brand-50, #e1f5fc));
  border-radius: var(--in-radius-xs);
  color: var(--in-brand);
}
.in-meta-action--tone-primary .in-meta-action__icon {
  background: var(--in-surface-overlay, #ffffff);
}

/* 본문 */
.in-meta-action__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1 1 auto;
  min-width: 0;
}
.in-meta-action__title {
  font-size: var(--in-font-size-xl);
  line-height: var(--in-line-height-xl);
  font-weight: var(--in-font-weight-medium);
  color: var(--in-text-accent);
  letter-spacing: var(--in-letter-spacing-xl);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.in-meta-action__desc {
  font-size: var(--in-font-size-sm);
  line-height: var(--in-line-height-sm);
  color: var(--in-text-subtle);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* 통계 */
.in-meta-action__stat {
  padding: 2px 8px;
  border-radius: var(--in-radius-full);
  background: var(--in-surface-default, #fafafa);
  border: 1px solid var(--in-border-default);
  font-size: var(--in-font-size-sm);
  font-weight: var(--in-font-weight-medium);
  color: var(--in-text-subtle);
  white-space: nowrap;
}

.in-meta-action__chev {
  display: inline-flex;
  flex-shrink: 0;
  color: var(--in-text-subtle);
  transition: transform 120ms ease;
}
.in-meta-action:hover .in-meta-action__chev {
  transform: translateX(2px);
  color: var(--in-brand);
}
</style>
