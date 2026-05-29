<script setup>
// ★ (2026-05-29, dspark): design-system v2 InEmptyState 1:1 사본 + Plain JS 변환.
//   v2 의 IconName TS 타입 → registry key 동적 lookup. 그 외 구조·CSS·기본 텍스트 v2 와 동일.

import { computed } from 'vue';
import { ICON_REGISTRY } from '@/assets/icons/registry.js';

/**
 * InEmptyState — W4 재사용 atomic
 *
 * type 매핑:
 *   - no-data        : 회색 아이콘 + neutral 톤 (default)
 *   - no-search      : 검색 아이콘 + neutral
 *   - no-permission  : 경고 톤 (warning border + warning icon bg)
 *   - error          : error 톤 (error border + error icon bg + error title)
 *   - first-time     : brand 톤 (accent bg + brand title)
 *
 * props:
 *   type: 'no-data' | 'no-search' | 'no-permission' | 'error' | 'first-time'  (default 'no-data')
 *   icon: string                                                              (registry key | URL | emoji)
 *   title: string                                                             (override defaultTitle)
 *   description: string                                                       (override defaultDesc)
 *   minHeight: number | string                                                (default 240)
 *
 * slot:
 *   actions — CTA 버튼 영역
 */

const TYPES = ['no-data', 'no-search', 'no-permission', 'error', 'first-time'];

const props = defineProps({
  type: {
    type: String,
    default: 'no-data',
    validator: (v) => TYPES.includes(v),
  },
  icon: { type: String, default: '' },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  minHeight: { type: [Number, String], default: 240 },
});

const defaultIconKey = computed(() => {
  if (props.type === 'no-search') return 'search';
  if (props.type === 'no-permission') return 'status-warning';
  if (props.type === 'error') return 'status-error';
  if (props.type === 'first-time') return 'bookmark';
  return 'help';
});

const isRegistryKey = (s) => typeof s === 'string' && s in ICON_REGISTRY;
const isUrlLike = (s) => /^https?:|^\//.test(s);

const iconSrc = computed(() => {
  if (props.icon && isRegistryKey(props.icon)) return ICON_REGISTRY[props.icon];
  if (props.icon && isUrlLike(props.icon)) return props.icon;
  return ICON_REGISTRY[defaultIconKey.value] || null;
});

const iconEmoji = computed(() => {
  if (props.icon && !isRegistryKey(props.icon) && !isUrlLike(props.icon)) {
    return props.icon;
  }
  return null;
});

const defaultTitle = computed(() => {
  switch (props.type) {
    case 'no-data':       return '데이터가 없습니다';
    case 'no-search':     return '검색 결과가 없습니다';
    case 'no-permission': return '접근 권한이 없습니다';
    case 'error':         return '오류가 발생했습니다';
    case 'first-time':    return '시작해보세요';
    default:              return '';
  }
});

const defaultDesc = computed(() => {
  switch (props.type) {
    case 'no-data':       return '아직 등록된 항목이 없습니다.';
    case 'no-search':     return '검색어 또는 필터를 변경해보세요.';
    case 'no-permission': return '본 페이지를 보려면 관리자에게 권한 요청이 필요합니다.';
    case 'error':         return '잠시 후 다시 시도하거나 관리자에게 문의해주세요.';
    case 'first-time':    return '첫 항목을 등록하여 시작하세요.';
    default:              return '';
  }
});

const computedTitle = computed(() => props.title || defaultTitle.value);
const computedDesc  = computed(() => props.description || defaultDesc.value);

const minHeightCss = computed(() =>
  typeof props.minHeight === 'number' ? `${props.minHeight}px` : String(props.minHeight),
);
</script>

<template>
  <div
    class="in-empty"
    :class="`in-empty--${type}`"
    :style="{ minHeight: minHeightCss }"
    role="status"
  >
    <div class="in-empty__icon" aria-hidden="true">
      <span v-if="iconEmoji" class="in-empty__emoji">{{ iconEmoji }}</span>
      <img v-else-if="iconSrc" :src="iconSrc" alt="" />
    </div>
    <h3 class="in-empty__title">{{ computedTitle }}</h3>
    <p v-if="computedDesc" class="in-empty__desc">{{ computedDesc }}</p>
    <div v-if="$slots.actions" class="in-empty__actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
.in-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
  padding: 40px 24px;
  background: var(--in-bg-white);
  border: 1px solid var(--in-border-default);
  border-radius: var(--in-radius-xs);
  font-family: var(--in-font-family-body);
}

.in-empty__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: var(--in-radius-full);
  background: var(--in-bg-default);
  margin-bottom: 8px;
}
.in-empty__icon > img { width: 32px; height: 32px; display: block; }

.in-empty__emoji {
  font-size: 32px;
  line-height: 1;
}

.in-empty__title {
  margin: 0;
  font-size: var(--in-font-size-lg);
  line-height: var(--in-line-height-lg);
  font-weight: var(--in-font-weight-medium);
  color: var(--in-text-accent);
}

.in-empty__desc {
  margin: 0;
  font-size: var(--in-font-size-md);
  line-height: var(--in-line-height-md);
  color: var(--in-text-subtle);
  max-width: 360px;
}

.in-empty__actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
}

/* === type 별 강조 톤 === */
.in-empty--no-permission { border-color: var(--in-border-warning); }
.in-empty--no-permission .in-empty__icon { background: var(--in-surface-warning); }

.in-empty--error { border-color: var(--in-border-error); }
.in-empty--error .in-empty__icon { background: var(--in-surface-error); }
.in-empty--error .in-empty__title { color: var(--in-text-error); }

.in-empty--first-time { border-color: var(--in-border-brand); }
.in-empty--first-time .in-empty__icon { background: var(--in-bg-accent-subtle); }
.in-empty--first-time .in-empty__title { color: var(--in-text-brand); }
</style>
