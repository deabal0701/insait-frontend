<script setup>
/**
 * AuthItemCatalog — AUT0040 권한 관리 (admin lane access 차선, 직접 REST).
 * ★ (2026-06-10, dspark): 권한항목(FRM_AUTH_ITEM) + 3종 바인딩(그룹/사용자/메뉴) 편집.
 *   ★ 3 바인딩 탭 모두 공통부품 RelationEditor 재사용 (search/columns/mapResult 만 주입) → 통일 UI/UX.
 *   설계: 02-tobe/04-admin-lane/access-control/03_authority-aut0040.md.
 *   백엔드: GET/POST/PUT/DELETE /api/admin/access/auth-items (+ ?expand=groups,users,menus).
 *   바인딩 변경은 rowStatus I/D → 백엔드가 감사 로그(AUTHGROUP/AUTHUSER/AUTHMENU × GRANT/REVOKE) 동반.
 */
import { computed, onMounted } from 'vue';
import { adminApi } from '@/services/adminApi';
import { usePagedList } from '@/composables/usePagedList';
import { useCatalogFilter } from '@/composables/useCatalogFilter';
import { useToast } from '@/composables/useToast';
import { useMetaEditor } from '@/composables/useMetaEditor';

import CatalogPage from '@/components/feature/admin/CatalogPage.vue';
import MetaDetailEditor from '@/components/feature/admin/MetaDetailEditor.vue';
import MetaDefForm from '@/components/feature/admin/MetaDefForm.vue';
import RelationEditor from '@/components/feature/access/RelationEditor.vue';
import MenuBindingTree from '@/components/feature/access/MenuBindingTree.vue';

import InSearchField from '@/components/ui/InSearchField.vue';
import InButton from '@/components/ui/InButton.vue';
import InModal from '@/components/ui/InModal.vue';

const toast = useToast();

const list = usePagedList({
  fetcher: adminApi.access.authItems.list,
  initialSize: 50,
  initialFilter: { q: '' },
  defaultSort: ['auth_item_name,asc'],
  syncUrl: true,
});

const { staged, activeFilters, applyFilter, resetFilter, removeFilter } = useCatalogFilter({
  list,
  initial: { q: '' },
  chipLabels: { q: '검색' },
});
function onSearch(v) { staged.value.q = v; }

const columns = [
  { field: 'authItemName', label: '권한이름', sortable: true, sortKey: 'auth_item_name', width: 240 },
  { field: 'authItemType', label: '유형', align: 'center', width: 90 },
  { field: 'note', label: '설명' },
];
function typeText(cd) { return cd === '01' ? '01 (메뉴접근)' : (cd || '—'); }

// ── 바인딩 공통 설정 (RelationEditor 주입) ──
const groupCols = [{ key: 'usergroupId', label: '그룹ID', code: true }, { key: 'usergroupNm', label: '그룹명' }];
const userCols  = [{ key: 'loginId', label: '로그인ID', code: true }, { key: 'empNm', label: '성명' }];
// 메뉴 탭은 MenuBindingTree(트리) — menuCols 불요.

const mapGroup = (g) => ({ usergroupId: g.usergroupId, usergroupNm: g.usergroupNm });
const mapUser  = (u) => ({ userId: u.userId, loginId: u.loginId, empNm: u.userNm || u.empNm });
// 메뉴 탭은 트리(MenuBindingTree)로 처리 — 평면 검색(searchMenus/mapMenu) 불요.

async function searchGroups(q) {
  const res = await adminApi.access.userGroups.list({ q, size: 100, page: 1 });
  return (res?.data ?? res ?? {}).content ?? [];
}
async function searchUsers(q) {
  const res = await adminApi.access.users.list({ q, size: 100, page: 1 });
  return (res?.data ?? res ?? {}).content ?? [];
}

// ── 편집 상태기계 (def + 3 바인딩) ──
const editor = useMetaEditor({
  api: adminApi.access.authItems,
  keyField: 'authItemId',
  domainLabel: '권한',
  expand: ['groups', 'users', 'menus'],
  defaultTab: 'def',
  openInEdit: true,   // ★ (2026-06-10, dspark) 방식1: 행 클릭 시 바로 편집(조회 단계 생략, 클릭 수 축소)
  reload: () => list.reload(),
  blankForm: () => ({
    def: { authItemName: '', note: '', authItemType: '01', etcNote: '', companyCd: '' },
    groupBindings: [], userBindings: [], menuBindings: [],
  }),
  toForm: (d) => ({
    def: {
      authItemName: d.def.authItemName, note: d.def.note,
      authItemType: d.def.authItemType, etcNote: d.def.etcNote, companyCd: '',
    },
    groupBindings: (d.groupBindings || []).map((g) => ({ rowStatus: '', bindingId: g.bindingId, usergroupId: g.usergroupId, usergroupNm: g.usergroupNm })),
    userBindings:  (d.userBindings || []).map((u) => ({ rowStatus: '', bindingId: u.bindingId, userId: u.userId, loginId: u.loginId, empNm: u.empNm })),
    menuBindings:  (d.menuBindings || []).map((m) => ({ rowStatus: '', bindingId: m.bindingId, menuId: m.menuId, menuNm: m.menuNm, useYn: m.useYn })),
  }),
  toPayload: (f) => ({
    def: f.def,
    groupBindings: f.groupBindings,
    userBindings: f.userBindings,
    menuBindings: f.menuBindings,
  }),
  validate: (f, { setTab }) => {
    if (!(f.def.authItemName || '').trim()) {
      toast.error?.('권한이름은 필수입니다.'); setTab('def'); return false;
    }
    return true;
  },
});
const {
  mode, selected, detail, detailLoading, drawerTab, saving, confirmDelete, form, isEditing, modalTitle,
  openDetail, openCreate, enterEdit, cancelEdit, closePanel, save, doDelete,
} = editor;

const defFields = computed(() => [
  { key: 'authItemName', type: 'text', label: '권한이름', input: '예: ACCESS_ADMIN_GROUP', required: true },
  { key: 'authItemType', type: 'text', label: '유형코드', input: '01', hint: '01=메뉴접근권한 (기본). 코드값.' },
  { key: 'note', type: 'text', label: '설명', input: '예: 시스템 관리자 권한' },
  { key: 'etcNote', type: 'text', label: '기타', input: '(선택)' },
]);

function vCount(arr) { return (arr || []).filter((x) => x.rowStatus !== 'D').length; }
const tabItems = computed(() => {
  const g = isEditing.value ? vCount(form.value.groupBindings) : (detail.value?.groupBindings?.length || 0);
  const u = isEditing.value ? vCount(form.value.userBindings) : (detail.value?.userBindings?.length || 0);
  const m = isEditing.value ? vCount(form.value.menuBindings) : (detail.value?.menuBindings?.length || 0);
  return [
    { name: 'def', tabLabel: '정의' },
    { name: 'groups', tabLabel: `그룹 (${g})` },
    { name: 'users', tabLabel: `사용자 (${u})` },
    { name: 'menus', tabLabel: `메뉴 (${m})` },
  ];
});

onMounted(() => list.reload());
</script>

<template>
  <CatalogPage
    title="권한 관리"
    :subtitle="`FRM_AUTH_ITEM · ` + (list.total.value || 0).toLocaleString() + `개 권한`"
    :list="list"
    :columns="columns"
    row-key="authItemId"
    :active-filters="activeFilters"
    :selected-row="selected"
    @row-click="openDetail"
    @filter-remove="removeFilter"
    @retry="list.reload()"
  >
    <template #header-actions>
      <InButton variant="primary" size="md" :left-icon-show="false" :right-icon-show="false" @click="openCreate">+ 신규</InButton>
    </template>

    <template #filters>
      <div class="q-filters">
        <InSearchField
          :model-value="staged.q"
          label="검색"
          input="권한이름 또는 설명 (Enter 또는 [조회])"
          layout="vertical"
          :icon-clickable="false"
          @update:model-value="onSearch"
          @search="applyFilter"
        />
        <InButton class="q-filters__search-btn" variant="primary" size="md" :left-icon-show="false" :right-icon-show="false" @click="applyFilter">조회</InButton>
        <InButton class="q-filters__reset-btn" variant="default" size="md" :left-icon-show="false" :right-icon-show="false" @click="resetFilter">초기화</InButton>
      </div>
    </template>

    <template #cell-authItemName="{ value }"><strong>{{ value }}</strong></template>
    <template #cell-authItemType="{ value }">{{ typeText(value) }}</template>

    <template #drawer>
      <MetaDetailEditor
        :mode="mode"
        :title="modalTitle"
        :loading="detailLoading"
        :saving="saving"
        :tabs="tabItems"
        :active-tab="drawerTab"
        :has-content="mode === 'create' || !!detail"
        :width="880"
        deletable-in-edit
        @update:active-tab="(t) => { drawerTab = t; }"
        @edit="enterEdit"
        @delete="confirmDelete = true"
        @save="save"
        @cancel="cancelEdit"
        @close="closePanel"
      >
        <!-- 정의 -->
        <section v-if="drawerTab === 'def'" class="section">
          <dl v-if="mode === 'view'" class="kv">
            <dt>권한이름</dt><dd>{{ detail.def.authItemName }}</dd>
            <dt>유형</dt><dd>{{ typeText(detail.def.authItemType) }}</dd>
            <dt>설명</dt><dd>{{ detail.def.note || '—' }}</dd>
            <dt>기타</dt><dd>{{ detail.def.etcNote || '—' }}</dd>
          </dl>
          <MetaDefForm v-else :model="form.def" :fields="defFields" />
        </section>

        <!-- 그룹 바인딩 -->
        <section v-else-if="drawerTab === 'groups'" class="section">
          <RelationEditor v-if="mode === 'view'" :list="detail.groupBindings || []" id-field="usergroupId" :columns="groupCols" read-only empty-text="연결된 그룹이 없습니다." />
          <template v-else>
            <p class="bind-note">추가/제거는 저장 시 감사 로그(AUTHGROUP GRANT/REVOKE)가 기록됩니다.</p>
            <RelationEditor :list="form.groupBindings" id-field="usergroupId" :columns="groupCols"
              :search="searchGroups" :map-result="mapGroup"
              add-section-label="그룹 추가 — 사용자그룹 검색" search-placeholder="그룹ID 또는 그룹명 (Enter)"
              list-label="연결된 그룹" empty-text="연결된 그룹이 없습니다. 위에서 검색해 [+ 추가] 하세요." />
          </template>
        </section>

        <!-- 사용자 바인딩 -->
        <section v-else-if="drawerTab === 'users'" class="section">
          <RelationEditor v-if="mode === 'view'" :list="detail.userBindings || []" id-field="userId" :columns="userCols" read-only empty-text="연결된 사용자가 없습니다." />
          <template v-else>
            <p class="bind-note">추가/제거는 저장 시 감사 로그(AUTHUSER GRANT/REVOKE)가 기록됩니다.</p>
            <RelationEditor :list="form.userBindings" id-field="userId" :columns="userCols"
              :search="searchUsers" :map-result="mapUser"
              add-section-label="사용자 추가 — 사용자 검색" search-placeholder="로그인ID 또는 성명 (Enter)"
              list-label="연결된 사용자" empty-text="연결된 사용자가 없습니다. 위에서 검색해 [+ 추가] 하세요." />
          </template>
        </section>

        <!-- 메뉴 바인딩 — 보기/편집 모두 트리+체크박스(AS-IS aut0040_03_w 정합). 보기=읽기전용. -->
        <section v-else-if="drawerTab === 'menus'" class="section">
          <MenuBindingTree v-if="mode === 'view'" :list="detail.menuBindings || []" read-only />
          <MenuBindingTree v-else :list="form.menuBindings" />
        </section>
      </MetaDetailEditor>

      <!-- 삭제 확인 -->
      <InModal
        v-if="confirmDelete"
        :model-value="confirmDelete"
        type="confirm"
        title="권한 삭제"
        :message="`'${selected?.authItemName}' 권한을 삭제할까요? 그룹·사용자·메뉴 바인딩까지 단일 트랜잭션으로 함께 삭제됩니다.`"
        confirm-text="삭제"
        cancel-text="취소"
        @confirm="doDelete"
        @cancel="confirmDelete = false"
        @update:model-value="(v) => { if (!v) confirmDelete = false; }"
      />
    </template>
  </CatalogPage>
</template>

<style scoped>
.q-filters { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; }
.q-filters > :deep(.in-sf) { flex: 1 1 320px; min-width: 280px; }
.q-filters__search-btn, .q-filters__reset-btn { flex: 0 0 auto; align-self: flex-end; }
.section { padding: 12px 4px; }
.kv { display: grid; grid-template-columns: 110px 1fr; gap: 8px 12px; margin: 0; }
.kv dt { color: var(--in-text-subtle); font-size: var(--in-font-size-sm); }
.kv dd { margin: 0; color: var(--in-text-default); word-break: break-all; }
.bind-note { margin: 0 0 10px; font-size: var(--in-font-size-sm); color: var(--in-text-subtle); }
</style>
