<script setup>
/**
 * InMetaResourceBadge — 메타 자원 ID 표시용 칩 (등록 상태 + 자원 종류).
 *
 * 자원 종류: OBJECT / SQL / MSG_IN / MSG_OUT / ENTITY / SERVICE / MENU / AUTH
 * 상태: pending / draft / saved / error
 *
 * Figma 노드 ID = TBD
 *
 * v2 InTag/InBadge 시각 어휘 정합 (radius-xxs + 토큰 색상).
 */
import { computed } from 'vue';
import InIcon from '@/components/ui/InIcon.vue';

const KIND_INFO = {
  OBJECT:  { label: 'Object',  icon: 'home',         color: 'brand' },
  SQL:     { label: 'SQL',     icon: 'edit',         color: 'success' },
  MSG_IN:  { label: 'MsgIn',   icon: 'arrow-right',  color: 'info' },
  MSG_OUT: { label: 'MsgOut',  icon: 'arrow-left',   color: 'info' },
  ENTITY:  { label: 'Entity',  icon: 'card-id',      color: 'warning' },
  SERVICE: { label: 'Service', icon: 'settings',     color: 'brand' },
  MENU:    { label: 'Menu',    icon: 'lnb-bento',    color: 'subtle' },
  AUTH:    { label: 'Auth',    icon: 'person',       color: 'subtle' },
  JSP:     { label: 'JSP',     icon: 'edit',         color: 'subtle' },
};

const STATUS_INFO = {
  pending: { label: '대기', icon: '' },
  draft:   { label: '편집', icon: 'edit' },
  saved:   { label: '저장', icon: 'check' },
  error:   { label: '오류', icon: 'error' },
};

const props = defineProps({
  // validator 는 string 형식만 검사 (KIND_INFO 참조 불가 — defineProps hoist 제약)
  kind: { type: String, required: true },
  resourceId: { type: String, required: true },
  status: { type: String, default: 'pending' },
  oid: { type: [String, Number, null], default: null },
});

const kindInfo = computed(() => KIND_INFO[props.kind] || KIND_INFO.OBJECT);
const statusInfo = computed(() => STATUS_INFO[props.status] || STATUS_INFO.pending);
</script>

<template>
  <span class="in-meta-resource-badge" :class="[`in-meta-resource-badge--${status}`, `in-meta-resource-badge--c-${kindInfo.color}`]">
    <span class="in-meta-resource-badge__kind">{{ kindInfo.label }}</span>
    <span class="in-meta-resource-badge__id" :title="resourceId">{{ resourceId }}</span>
    <span class="in-meta-resource-badge__status">
      <InIcon v-if="statusInfo.icon" :name="statusInfo.icon" :size="11" />
      <span>{{ statusInfo.label }}</span>
      <span v-if="oid != null" class="in-meta-resource-badge__oid" :title="`OID ${oid}`">#{{ oid }}</span>
    </span>
  </span>
</template>

<style scoped>
.in-meta-resource-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 6px 2px 0;
  font-family: var(--in-font-family-body);
  font-size: var(--in-font-size-xs);
  line-height: var(--in-line-height-xs);
  letter-spacing: var(--in-letter-spacing-xs);
  border: 1px solid var(--in-border-default);
  border-radius: var(--in-radius-xs);
  background: var(--in-surface-overlay, #ffffff);
  color: var(--in-text-default);
  max-width: 100%;
  min-width: 0;
}

.in-meta-resource-badge__kind {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  background: var(--in-surface-default, #fafafa);
  border-right: 1px solid var(--in-border-default);
  font-weight: var(--in-font-weight-medium);
  color: var(--in-text-subtle);
  font-size: 10px;
  letter-spacing: 0.2px;
  text-transform: uppercase;
  border-radius: var(--in-radius-xs) 0 0 var(--in-radius-xs);
}

.in-meta-resource-badge__id {
  font-family: 'Consolas', 'Menlo', monospace;
  font-size: var(--in-font-size-xs);
  color: var(--in-text-accent);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.in-meta-resource-badge__status {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin-left: auto;
  padding-left: 6px;
  color: var(--in-text-subtle);
  font-size: 10px;
  letter-spacing: 0.2px;
}

.in-meta-resource-badge__oid {
  margin-left: 2px;
  font-family: 'Consolas', 'Menlo', monospace;
  color: var(--in-text-subtler);
}

/* Status colors */
.in-meta-resource-badge--saved   { border-color: var(--in-text-success); }
.in-meta-resource-badge--saved .in-meta-resource-badge__status { color: var(--in-text-success); }
.in-meta-resource-badge--error   { border-color: var(--in-text-error); }
.in-meta-resource-badge--error .in-meta-resource-badge__status { color: var(--in-text-error); }
.in-meta-resource-badge--draft   { border-color: var(--in-brand); }
.in-meta-resource-badge--draft .in-meta-resource-badge__status { color: var(--in-brand); }

/* Kind tint (좌측 라벨) */
.in-meta-resource-badge--c-brand   .in-meta-resource-badge__kind { color: var(--in-brand); }
.in-meta-resource-badge--c-success .in-meta-resource-badge__kind { color: var(--in-text-success); }
.in-meta-resource-badge--c-info    .in-meta-resource-badge__kind { color: var(--in-text-info, var(--in-brand)); }
.in-meta-resource-badge--c-warning .in-meta-resource-badge__kind { color: var(--in-text-warning); }
.in-meta-resource-badge--c-subtle  .in-meta-resource-badge__kind { color: var(--in-text-subtle); }
</style>
