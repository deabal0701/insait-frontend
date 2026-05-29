<script setup>
/**
 * InMetaSidePanel — 우측 사이드 카드. 컨벤션/Envelope/검증SQL 패널의 공통 wrapper.
 *
 * Figma 노드 ID = TBD
 *
 * v2 InCard 시각 어휘 (white + border + radius-sm + shadow elev-2) 정합.
 * collapsible 토글 + 우상단 액션 슬롯 (copy 등) 지원.
 *
 * Props:
 *   title: string
 *   icon?: string (registry key)
 *   tone?: 'default'|'info'|'success'|'warning'|'error'  — 좌측 stripe 색
 *   collapsible?: boolean (default true)
 *   defaultOpen?: boolean (default true)
 *
 * Slots:
 *   default — 본문
 *   actions — 우상단 (header bar)
 */
import { ref } from 'vue';
import InIcon from '@/components/ui/InIcon.vue';

const props = defineProps({
  title: { type: String, required: true },
  icon: { type: String, default: '' },
  tone: { type: String, default: 'default', validator: (v) => ['default', 'info', 'success', 'warning', 'error'].includes(v) },
  collapsible: { type: Boolean, default: true },
  defaultOpen: { type: Boolean, default: true },
});

const open = ref(props.defaultOpen);
function toggle() {
  if (props.collapsible) open.value = !open.value;
}
</script>

<template>
  <section class="in-meta-side-panel" :class="[`in-meta-side-panel--tone-${tone}`, { 'in-meta-side-panel--closed': !open }]">
    <header class="in-meta-side-panel__header">
      <button
        type="button"
        class="in-meta-side-panel__title-btn"
        :aria-expanded="open"
        :disabled="!collapsible"
        @click="toggle"
      >
        <InIcon v-if="icon" :name="icon" :size="14" />
        <span class="in-meta-side-panel__title">{{ title }}</span>
        <InIcon
          v-if="collapsible"
          :name="open ? 'arrow-up' : 'arrow-down'"
          :size="14"
          color="subtle"
          class="in-meta-side-panel__chev"
        />
      </button>
      <div v-if="$slots.actions" class="in-meta-side-panel__actions">
        <slot name="actions" />
      </div>
    </header>
    <div v-show="open" class="in-meta-side-panel__body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.in-meta-side-panel {
  background: var(--in-surface-overlay, #ffffff);
  border: 1px solid var(--in-border-default);
  border-left-width: 3px;
  border-radius: var(--in-radius-sm);
  box-shadow: 0 2px 4px 0 rgba(86, 106, 177, 0.05);
  overflow: hidden;
  font-family: var(--in-font-family-body);
}

.in-meta-side-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  background: var(--in-surface-default, #fafafa);
  border-bottom: 1px solid var(--in-border-default);
}

.in-meta-side-panel--closed .in-meta-side-panel__header {
  border-bottom-color: transparent;
}

.in-meta-side-panel__title-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  background: transparent;
  border: none;
  cursor: pointer;
  outline: none;
  color: var(--in-text-default);
}

.in-meta-side-panel__title-btn:disabled {
  cursor: default;
}

.in-meta-side-panel__title {
  font-size: var(--in-font-size-md);
  line-height: var(--in-line-height-md);
  font-weight: var(--in-font-weight-medium);
  color: var(--in-text-accent);
  letter-spacing: var(--in-letter-spacing-md);
}

.in-meta-side-panel__chev { margin-left: 4px; }

.in-meta-side-panel__actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.in-meta-side-panel__body {
  padding: 12px;
  font-size: var(--in-font-size-sm);
  line-height: var(--in-line-height-sm);
  color: var(--in-text-default);
  max-height: 360px;
  overflow: auto;
}

/* === Tone (왼쪽 stripe 색상) === */
.in-meta-side-panel--tone-default { border-left-color: var(--in-border-default); }
.in-meta-side-panel--tone-info    { border-left-color: var(--in-brand); }
.in-meta-side-panel--tone-success { border-left-color: var(--in-text-success); }
.in-meta-side-panel--tone-warning { border-left-color: var(--in-text-warning); }
.in-meta-side-panel--tone-error   { border-left-color: var(--in-text-error); }
</style>
