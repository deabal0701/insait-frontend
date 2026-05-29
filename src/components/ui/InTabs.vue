<script setup>
import { computed, nextTick, ref, watch } from 'vue';

/**
 * InTabs — Figma 1499:43392 (Navigation/Tabs)
 *
 * 출처: design-system/v2/src/components/ui/InTabs.vue (Plain JS 변환)
 *
 * Figma 매트릭스: state(Enabled/Selected) × size(Default/Small) = 4 variants (단일 item)
 * Wrap: 10 items + gap 20 + Border/Neutral 하단 1px line
 * 시각: Default Body/xl_w500 (15/22) · Small Body/lg_w500 (14/21)
 *       Enabled text/subtler #9e9e9e · Selected text/accent #010101 + border-b 2px brand
 *       padding 10px (좌우), h-40 (item)
 *
 * W6 #3 — WAI-ARIA Tabs Pattern 정합:
 *   role=tablist / role=tab / aria-selected / aria-controls / roving tabindex
 *   Arrow Left/Right + Home/End 키보드 nav
 *   activation='automatic' (default, focus 시 즉시 select) | 'manual' (Enter/Space 필요)
 *
 * NATIVE 구현 — el-tabs 미사용. tab 헤더만 제공 (내용은 v-model 로 사용처가 직접 분기).
 *
 *   <InTabs v-model="active" :items="[{name:'a', tabLabel:'기본'}, {name:'b', tabLabel:'상세'}]" />
 *   <div v-if="active==='a'">...</div>
 *   <div v-if="active==='b'">...</div>
 */

const props = defineProps({
  modelValue: { type: [String, Number], default: undefined },
  items: {
    type: Array,
    default: () => [],
    // [{ name: string|number, tabLabel: string, disabled?: boolean }]
  },
  size: {
    type: String,
    default: 'default',
    validator: (v) => ['default', 'small'].includes(v),
  },
  activation: {
    type: String,
    default: 'automatic',
    validator: (v) => ['automatic', 'manual'].includes(v),
  },
});

const emit = defineEmits(['update:modelValue']);

const selected = computed(() => props.modelValue);

const tabEls = ref([]);
const focusIndex = ref(0);

function indexOf(name) {
  return props.items.findIndex((it) => it.name === name);
}

function isEnabled(i) {
  const it = props.items[i];
  return !!it && !it.disabled;
}
function firstEnabled() {
  for (let i = 0; i < props.items.length; i++) if (isEnabled(i)) return i;
  return 0;
}
function lastEnabled() {
  for (let i = props.items.length - 1; i >= 0; i--) if (isEnabled(i)) return i;
  return 0;
}
function nextEnabled(from) {
  const n = props.items.length;
  for (let step = 1; step <= n; step++) {
    const i = (from + step) % n;
    if (isEnabled(i)) return i;
  }
  return from;
}
function prevEnabled(from) {
  const n = props.items.length;
  for (let step = 1; step <= n; step++) {
    const i = (from - step + n) % n;
    if (isEnabled(i)) return i;
  }
  return from;
}

function focusTab(i) {
  focusIndex.value = i;
  nextTick(() => tabEls.value[i]?.focus());
  if (props.activation === 'automatic') {
    const item = props.items[i];
    if (item && !item.disabled) emit('update:modelValue', item.name);
  }
}

function select(item, idx) {
  if (item.disabled) return;
  focusIndex.value = idx;
  emit('update:modelValue', item.name);
}

function onKeydown(e) {
  if (props.items.length === 0) return;
  switch (e.key) {
    case 'ArrowRight':
      e.preventDefault();
      focusTab(nextEnabled(focusIndex.value));
      break;
    case 'ArrowLeft':
      e.preventDefault();
      focusTab(prevEnabled(focusIndex.value));
      break;
    case 'Home':
      e.preventDefault();
      focusTab(firstEnabled());
      break;
    case 'End':
      e.preventDefault();
      focusTab(lastEnabled());
      break;
    case 'Enter':
    case ' ':
      if (props.activation === 'manual') {
        const item = props.items[focusIndex.value];
        if (item && !item.disabled) {
          e.preventDefault();
          emit('update:modelValue', item.name);
        }
      }
      break;
  }
}

function setTabRef(el, idx) {
  if (el instanceof HTMLElement) tabEls.value[idx] = el;
}

watch(
  [() => props.modelValue, () => props.items.length],
  () => {
    const i = indexOf(props.modelValue);
    if (i >= 0) focusIndex.value = i;
    else if (focusIndex.value >= props.items.length) focusIndex.value = firstEnabled();
  },
  { immediate: true },
);
</script>

<template>
  <div class="in-tabs" :class="`in-tabs--${size}`" role="tablist" @keydown="onKeydown">
    <button
      v-for="(i, idx) in items"
      :key="i.name"
      :ref="(el) => setTabRef(el, idx)"
      type="button"
      role="tab"
      :id="`in-tab-${i.name}`"
      :aria-selected="selected === i.name ? 'true' : 'false'"
      :aria-controls="`in-tabpanel-${i.name}`"
      :tabindex="idx === focusIndex && !i.disabled ? 0 : -1"
      :disabled="i.disabled"
      class="in-tabs__item"
      :class="{ 'in-tabs__item--selected': selected === i.name }"
      @click="select(i, idx)"
      @focus="focusIndex = idx"
    >
      {{ i.tabLabel }}
    </button>
  </div>
</template>

<style scoped>
.in-tabs {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  border-bottom: 1px solid var(--in-border-state-disabled);
  width: 100%;
}

.in-tabs__item {
  display: inline-flex;
  align-items: center;
  height: 40px;
  padding: 0 10px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  cursor: pointer;
  font-family: var(--in-font-family-body);
  font-weight: var(--in-font-weight-medium);
  color: var(--in-text-subtler);
  white-space: nowrap;
  transition: color 120ms ease, border-color 120ms ease;
  outline: none;
}

.in-tabs__item:focus-visible {
  outline: var(--in-focus-ring-style) var(--in-focus-ring-width) var(--in-focus-ring-color);
  outline-offset: var(--in-focus-ring-offset-inset);
  border-radius: var(--in-radius-xxs);
}

.in-tabs__item:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.in-tabs__item--selected {
  color: var(--in-text-accent);
  border-bottom-color: var(--in-border-brand);
}

.in-tabs--default .in-tabs__item {
  font-size: var(--in-font-size-xl);
  line-height: var(--in-line-height-xl);
  letter-spacing: var(--in-letter-spacing-xl);
}

.in-tabs--small .in-tabs__item {
  font-size: var(--in-font-size-lg);
  line-height: var(--in-line-height-lg);
  letter-spacing: var(--in-letter-spacing-lg);
}
</style>
