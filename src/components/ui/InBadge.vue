<script setup>
// ★ (2026-05-29, dspark): design-system v2 InBadge (Figma 1169:15297) 1:1 사본 + Plain JS 변환.
//   v2 의 lang="ts" + withDefaults<TypeProps> → defineProps + validator 패턴.
//   Standard(label) / Dot 두 스타일 × 8 state. CSS 토큰·class 명·구조 v2 와 동일.

/**
 * InBadge — Figma 1169:15297
 *
 * props:
 *   state: 'primary' | 'error' | 'warning' | 'success' | 'online' | 'offline' | 'seat-vacancy' | 'self'
 *   badgeStyle: 'standard' | 'dot'
 *   label: string (default "99+", standard 전용)
 *
 * 사용 예:
 *   <InBadge state="error" :label="String(unread)" />
 *   <InBadge state="online" badge-style="dot" />
 */

// Note: defineProps() hoists outside setup(), so validators must inline arrays
// (cannot reference locally-declared const). Vue 3.5 strict SFC compiler rule.
defineProps({
  state: {
    type: String,
    default: 'primary',
    validator: (v) => ['primary', 'error', 'warning', 'success', 'online', 'offline', 'seat-vacancy', 'self'].includes(v),
  },
  badgeStyle: {
    type: String,
    default: 'standard',
    validator: (v) => ['standard', 'dot'].includes(v),
  },
  label: { type: String, default: '99+' },
});
</script>

<template>
  <span
    class="in-badge"
    :class="[`in-badge--${state}`, `in-badge--${badgeStyle}`]"
    role="status"
  >
    <span v-if="badgeStyle === 'standard'" class="in-badge__label">{{ label }}</span>
  </span>
</template>

<style scoped>
.in-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--in-radius-full);
  font-family: var(--in-font-family-body);
  font-weight: var(--in-font-weight-medium);
  letter-spacing: var(--in-letter-spacing-xs);
  line-height: var(--in-line-height-xs);
  font-size: var(--in-font-size-xs);
  color: var(--in-text-white);
}

/* === Standard (label) === */
.in-badge--standard {
  min-width: 14px;
  padding: 0 3px;
  height: 14px;
}
.in-badge__label { white-space: nowrap; }

.in-badge--standard.in-badge--primary       { background: var(--in-brand); }
.in-badge--standard.in-badge--error         { background: var(--in-text-error); }
.in-badge--standard.in-badge--warning       { background: var(--in-text-warning); }
.in-badge--standard.in-badge--success       { background: var(--in-text-success); }
.in-badge--standard.in-badge--online        { background: var(--in-text-success); }
.in-badge--standard.in-badge--offline       { background: var(--in-border-input); }
.in-badge--standard.in-badge--seat-vacancy  { background: var(--in-icon-subtle); }
.in-badge--standard.in-badge--self          { background: var(--in-icon-info-accent); }

/* === Dot === */
.in-badge--dot {
  width: 8px;
  height: 8px;
  padding: 0;
}
.in-badge--dot.in-badge--primary  { background: var(--in-brand); }
.in-badge--dot.in-badge--error    { background: var(--in-text-error); }
.in-badge--dot.in-badge--warning  { background: var(--in-text-warning); }
.in-badge--dot.in-badge--success  { background: var(--in-text-success); }

/* User status 4종 Dot — 10px (Figma 정합) */
.in-badge--dot.in-badge--online,
.in-badge--dot.in-badge--offline,
.in-badge--dot.in-badge--seat-vacancy,
.in-badge--dot.in-badge--self {
  width: 10px;
  height: 10px;
}
.in-badge--dot.in-badge--online       { background: var(--in-icon-white); border: 1px solid var(--in-text-success); }
.in-badge--dot.in-badge--offline      { background: var(--in-icon-white); border: 2px solid var(--in-border-input); }
.in-badge--dot.in-badge--seat-vacancy { background: var(--in-icon-subtle); }
.in-badge--dot.in-badge--self         { background: var(--in-icon-info-accent); }
</style>
