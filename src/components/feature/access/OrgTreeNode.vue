<script setup>
/**
 * OrgTreeNode — 조직 lazy 트리 노드 (재귀). AUT0060 조직권한 관리 좌측.
 * ★ (2026-06-11, dspark): ORM_ORG self-FK. hasChildren=true 인 노드만 펼침 가능,
 *   펼칠 때 직계자식을 adminApi.access.orgAuth.orgTree(orgId, baseYmd) 로 lazy 로드.
 *   Figma 노드 ID = TBD.
 */
import { ref } from 'vue';
import { adminApi } from '@/services/adminApi';

const props = defineProps({
  node: { type: Object, required: true },     // { orgId, orgNm, hasChildren }
  baseYmd: { type: String, required: true },  // YYYYMMDD
  selectedOrgId: { type: [Number, String], default: null },
  depth: { type: Number, default: 0 },
});
const emit = defineEmits(['select']);

const expanded = ref(false);
const loaded = ref(false);
const loading = ref(false);
const children = ref([]);

async function toggle() {
  if (!props.node.hasChildren) return;
  if (!expanded.value && !loaded.value) {
    loading.value = true;
    try {
      children.value = await adminApi.access.orgAuth.orgTree(props.node.orgId, props.baseYmd);
      loaded.value = true;
    } catch (e) { /* keep collapsed on error */ } finally { loading.value = false; }
  }
  expanded.value = !expanded.value;
}
</script>

<template>
  <li class="orgtree__item">
    <div
      class="orgtree__row"
      :class="{ 'is-sel': String(node.orgId) === String(selectedOrgId) }"
      :style="{ paddingLeft: depth * 16 + 8 + 'px' }"
    >
      <button
        v-if="node.hasChildren"
        type="button"
        class="orgtree__toggle"
        :aria-expanded="expanded"
        @click.stop="toggle"
      >{{ loading ? '…' : (expanded ? '−' : '+') }}</button>
      <span v-else class="orgtree__leaf-dot">·</span>
      <span class="orgtree__name" @click="emit('select', node)">{{ node.orgNm }}</span>
    </div>
    <ul v-if="expanded" class="orgtree__children">
      <OrgTreeNode
        v-for="c in children"
        :key="c.orgId"
        :node="c"
        :base-ymd="baseYmd"
        :selected-org-id="selectedOrgId"
        :depth="depth + 1"
        @select="emit('select', $event)"
      />
    </ul>
  </li>
</template>

<style scoped>
.orgtree__item { list-style: none; }
.orgtree__children { list-style: none; margin: 0; padding: 0; }
.orgtree__row { display: flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: var(--in-radius-xs); cursor: default; }
.orgtree__row.is-sel { background: var(--in-bg-brand-subtle, var(--in-bg-default)); }
.orgtree__row:hover { background: var(--in-bg-default); }
.orgtree__toggle { width: 18px; height: 18px; border: 1px solid var(--in-border-default); background: var(--in-bg-white); border-radius: 3px; cursor: pointer; font-size: 12px; line-height: 1; color: var(--in-text-subtle); display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; }
.orgtree__leaf-dot { width: 18px; text-align: center; color: var(--in-text-subtle); flex: 0 0 auto; }
.orgtree__name { cursor: pointer; font-size: var(--in-font-size-sm); color: var(--in-text-default); }
.orgtree__name:hover { text-decoration: underline; }
</style>
