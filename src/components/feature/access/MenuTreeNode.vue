<script setup>
/**
 * MenuTreeNode — 메뉴 lazy 트리 노드 (재귀). AUT0050 메뉴관리 좌측.
 * ★ (2026-06-11, dspark): FRM_MENU self-FK. hasChildren=true 만 펼침,
 *   펼칠 때 직계자식을 adminApi.access.menus.children(menuId, menuGroup) lazy 로드.
 *   refreshKey 변경 시 로드 상태 초기화(상위 CRUD 후 재조회). Figma 노드 ID = TBD.
 */
import { ref, watch } from 'vue';
import { adminApi } from '@/services/adminApi';

const props = defineProps({
  node: { type: Object, required: true },     // { menuId, menuNm, hasChildren }
  menuGroup: { type: String, default: '' },
  selectedMenuId: { type: String, default: null },
  depth: { type: Number, default: 0 },
  refreshKey: { type: Number, default: 0 },   // 변경 시 자식 캐시 무효화
});
const emit = defineEmits(['select']);

const expanded = ref(false);
const loaded = ref(false);
const loading = ref(false);
const children = ref([]);

async function loadChildren() {
  loading.value = true;
  try {
    children.value = await adminApi.access.menus.children(props.node.menuId, props.menuGroup);
    loaded.value = true;
  } catch (e) { /* keep collapsed */ } finally { loading.value = false; }
}

async function toggle() {
  if (!props.node.hasChildren) return;
  if (!expanded.value && !loaded.value) await loadChildren();
  expanded.value = !expanded.value;
}

// 상위에서 refreshKey 증가 시 (CRUD 후) 펼쳐진 노드 자식 재조회
watch(() => props.refreshKey, async () => {
  if (expanded.value && loaded.value) await loadChildren();
});
</script>

<template>
  <li class="menutree__item">
    <div
      class="menutree__row"
      :class="{ 'is-sel': String(node.menuId) === String(selectedMenuId) }"
      :style="{ paddingLeft: depth * 16 + 8 + 'px' }"
    >
      <button v-if="node.hasChildren" type="button" class="menutree__toggle" :aria-expanded="expanded" @click.stop="toggle">
        {{ loading ? '…' : (expanded ? '−' : '+') }}
      </button>
      <span v-else class="menutree__leaf-dot">·</span>
      <span class="menutree__name" @click="emit('select', node)">
        {{ node.menuNm }} <span class="menutree__id">{{ node.menuId }}</span>
      </span>
    </div>
    <ul v-if="expanded" class="menutree__children">
      <MenuTreeNode
        v-for="c in children"
        :key="c.menuId"
        :node="c"
        :menu-group="menuGroup"
        :selected-menu-id="selectedMenuId"
        :depth="depth + 1"
        :refresh-key="refreshKey"
        @select="emit('select', $event)"
      />
    </ul>
  </li>
</template>

<style scoped>
.menutree__item { list-style: none; }
.menutree__children { list-style: none; margin: 0; padding: 0; }
.menutree__row { display: flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: var(--in-radius-xs); }
.menutree__row.is-sel { background: var(--in-bg-brand-subtle, var(--in-bg-default)); }
.menutree__row:hover { background: var(--in-bg-default); }
.menutree__toggle { width: 18px; height: 18px; border: 1px solid var(--in-border-default); background: var(--in-bg-white); border-radius: 3px; cursor: pointer; font-size: 12px; line-height: 1; color: var(--in-text-subtle); display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; }
.menutree__leaf-dot { width: 18px; text-align: center; color: var(--in-text-subtle); flex: 0 0 auto; }
.menutree__name { cursor: pointer; font-size: var(--in-font-size-sm); color: var(--in-text-default); }
.menutree__name:hover { text-decoration: underline; }
.menutree__id { color: var(--in-text-subtle); font-size: var(--in-font-size-xs); margin-left: 4px; }
</style>
