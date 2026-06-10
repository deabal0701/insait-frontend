<script setup>
/**
 * MenuBindingTree — 권한↔메뉴 바인딩 트리 (AS-IS aut0040_03_w 정합: 메뉴그룹 + 트리 + 체크박스).
 * ★ (2026-06-10, dspark): AUT0040 메뉴 탭 전용. 메뉴는 계층(트리)이라 RelationEditor(평면 검색) 대신 트리로.
 *   - 메뉴그룹 콤보(시스템총괄=SYS_ADMIN / 개인=PRIVATE_GROUP) 로 트리 전환
 *   - el-tree lazy 로드(adminApi.access.menus.children, 8090 기존 배포) + 체크박스(check-strictly: 노드 독립)
 *   - 체크=바인딩 추가(rowStatus I) / 해제=제거(기존 D, 신규 splice). 부모-자식 연쇄 없음(AS-IS auth_yn 독립).
 *
 * props : list(form.menuBindings — in-place 변형) [{rowStatus, bindingId, menuId, menuNm, useYn}]
 */
import { computed, ref } from 'vue';
import { ElTree } from 'element-plus';
import { adminApi } from '@/services/adminApi';
import InSelect from '@/components/ui/InSelect.vue';

const props = defineProps({
  list: { type: Array, required: true },
});

const menuGroup = ref('SYS_ADMIN');
const groupOptions = [
  { value: 'SYS_ADMIN', label: '시스템총괄' },
  { value: 'PRIVATE_GROUP', label: '개인' },
];
const treeKey = ref(0);   // 메뉴그룹 변경 시 트리 remount
function onGroupChange(v) { menuGroup.value = v; treeKey.value += 1; }

const treeProps = { label: 'menuNm', children: 'children', isLeaf: 'leaf' };

// 현재 바인딩된 메뉴ID (rowStatus !== 'D') — 트리 초기 체크 + 카운트
const checkedKeys = computed(() =>
  props.list.filter((x) => x.rowStatus !== 'D').map((x) => x.menuId));
const boundCount = computed(() => checkedKeys.value.length);

// lazy 로드: 루트(level 0) = 선택 메뉴그룹의 직계 자식 / 그 외 = 노드의 자식
async function loadNode(node, resolve) {
  const parentId = node.level === 0 ? menuGroup.value : node.data.menuId;
  try {
    const res = await adminApi.access.menus.children(parentId);
    const rows = res?.data ?? res ?? [];
    resolve(rows.map((r) => ({ ...r, leaf: !r.hasChildren })));
  } catch {
    resolve([]);
  }
}

// 체크 변경: 노드 단위 (check-strictly) → list rowStatus I/D 반영
function onCheckChange(data, checked) {
  const id = String(data.menuId);
  const existing = props.list.find((x) => String(x.menuId) === id);
  if (checked) {
    if (existing) { if (existing.rowStatus === 'D') existing.rowStatus = ''; }   // 되살림
    else props.list.push({ rowStatus: 'I', menuId: data.menuId, menuNm: data.menuNm, useYn: 'Y' });
  } else if (existing) {
    if (existing.rowStatus === 'I') {
      const i = props.list.indexOf(existing);
      if (i >= 0) props.list.splice(i, 1);   // 신규 추가분 제거
    } else {
      existing.rowStatus = 'D';               // 기존분 D 마크
    }
  }
}
</script>

<template>
  <div class="mbt">
    <div class="mbt__bar">
      <span class="mbt__label">메뉴 그룹</span>
      <InSelect :model-value="menuGroup" :options="groupOptions" size="sm" @update:model-value="onGroupChange" />
      <span class="mbt__count">연결된 메뉴 <b>{{ boundCount }}</b></span>
    </div>
    <p class="mbt__hint">트리를 펼쳐 메뉴를 체크하면 이 권한에 바인딩됩니다 (저장 시 감사 로그 AUTHMENU GRANT/REVOKE).</p>
    <div class="mbt__tree">
      <ElTree
        :key="treeKey"
        :props="treeProps"
        node-key="menuId"
        lazy
        :load="loadNode"
        show-checkbox
        check-strictly
        :default-checked-keys="checkedKeys"
        :expand-on-click-node="false"
        @check-change="onCheckChange"
      >
        <template #default="{ data }">
          <span class="mbt__node">
            <span class="mbt__nm">{{ data.menuNm }}</span>
            <code class="mbt__id">{{ data.menuId }}</code>
          </span>
        </template>
      </ElTree>
    </div>
  </div>
</template>

<style scoped>
.mbt { display: flex; flex-direction: column; gap: 8px; }
.mbt__bar { display: flex; align-items: center; gap: 10px; }
.mbt__label { font-size: var(--in-font-size-sm); color: var(--in-text-subtle); }
.mbt__bar :deep(.in-sel) { flex: 0 0 180px; }
.mbt__count { margin-left: auto; font-size: var(--in-font-size-sm); color: var(--in-text-subtle); }
.mbt__count b { color: var(--in-text-accent); }
.mbt__hint { margin: 0; font-size: var(--in-font-size-sm); color: var(--in-text-subtle); }
.mbt__tree {
  border: 1px solid var(--in-border-subtle, #eee); border-radius: var(--in-radius-xs);
  max-height: 420px; overflow: auto; padding: 6px;
}
.mbt__node { display: inline-flex; align-items: baseline; gap: 8px; }
.mbt__nm { font-size: var(--in-font-size-sm); color: var(--in-text-default); }
.mbt__id { font-family: var(--in-font-family-mono, ui-monospace); font-size: var(--in-font-size-xs, 11px); color: var(--in-text-subtle); }
</style>
