<script setup>
/**
 * GroupCatalog — AUT0020 사용자그룹 관리 (admin lane access 차선, 직접 REST).
 * ★ (2026-06-10, dspark): AUT0010 레시피 복제 (usePagedList + useCatalogFilter + useMetaEditor
 *   + CatalogPage + MetaDetailEditor + MetaDefForm) + 멤버 탭(사용자 picker).
 *   설계: 02-tobe/04-admin-lane/access-control/02_user-group-aut0020.md.
 *   백엔드: GET/POST/PUT/DELETE /api/admin/access/user-groups (+ /exists?usergroupId).
 *   멤버 변경(추가/제거)은 PUT body members[].rowStatus(I/D) — 백엔드가 감사로그(GRANT/REVOKE) 동반.
 */
import { computed, onMounted, ref } from 'vue';
import { adminApi } from '@/services/adminApi';
import { usePagedList } from '@/composables/usePagedList';
import { useCatalogFilter } from '@/composables/useCatalogFilter';
import { useToast } from '@/composables/useToast';
import { useMetaEditor } from '@/composables/useMetaEditor';

import CatalogPage from '@/components/feature/admin/CatalogPage.vue';
import MetaDetailEditor from '@/components/feature/admin/MetaDetailEditor.vue';
import MetaDefForm from '@/components/feature/admin/MetaDefForm.vue';
import RelationEditor from '@/components/feature/access/RelationEditor.vue';

import InSearchField from '@/components/ui/InSearchField.vue';
import InSelect from '@/components/ui/InSelect.vue';
import InButton from '@/components/ui/InButton.vue';
import InModal from '@/components/ui/InModal.vue';

import screenHelp from './GroupCatalog.help.js';   // [DEV-HELP] 화면 도움말 — 제거 시 이 줄 + 아래 :help prop 삭제

const toast = useToast();

const list = usePagedList({
  fetcher: adminApi.access.userGroups.list,
  initialSize: 50,
  initialFilter: { q: '', groupType: '' },
  defaultSort: ['usergroup_id,asc'],
  syncUrl: true,
});

const { staged, activeFilters, applyFilter, resetFilter, removeFilter } = useCatalogFilter({
  list,
  initial: { q: '', groupType: '' },
  chipLabels: { q: '검색', groupType: '그룹유형' },
});
function onSearch(v) { staged.value.q = v; }
function onType(v) { staged.value.groupType = v; }

// GROUP_TYPE 실측 분포(매뉴얼 11 §4.1): 90=운영자(14)·20(4)·10(3)·51(1)·30(1). 90 만 의미 확정.
const GROUP_TYPE_LABELS = { '90': '운영자' };
function groupTypeText(cd) {
  if (cd == null || cd === '') return '—';
  return GROUP_TYPE_LABELS[cd] ? `${cd} (${GROUP_TYPE_LABELS[cd]})` : cd;
}
const groupTypeEditOptions = [
  { value: '90', label: '운영자 (90)' },
  { value: '20', label: '20' },
  { value: '10', label: '10' },
  { value: '30', label: '30' },
  { value: '51', label: '51' },
];
const groupTypeFilterOptions = [{ value: '', label: '전체 유형' }, ...groupTypeEditOptions];

const columns = [
  { field: 'usergroupId', label: '그룹ID',  sortable: true, sortKey: 'usergroup_id', width: 200 },
  { field: 'usergroupNm', label: '그룹명',  sortable: true, sortKey: 'usergroup_nm', width: 220 },
  { field: 'groupType',   label: '그룹유형', sortable: true, sortKey: 'group_type', align: 'center', width: 120 },
  { field: 'bigo',        label: '비고' },
];

// ── 편집 상태기계 (def + members) ──
const editor = useMetaEditor({
  api: adminApi.access.userGroups,
  keyField: 'usergroupId',
  domainLabel: '사용자그룹',
  expand: ['members'],
  defaultTab: 'def',
  openInEdit: true,   // ★ (2026-06-10, dspark) 표준: 행 클릭 시 바로 편집
  reload: () => list.reload(),
  blankForm: () => ({
    def: { usergroupId: '', usergroupNm: '', groupType: '', companyCd: '', bigo: '' },
    members: [],
  }),
  toForm: (d) => ({
    def: {
      usergroupId: d.def.usergroupId, usergroupNm: d.def.usergroupNm,
      groupType: d.def.groupType, companyCd: d.def.companyCd, bigo: d.def.bigo,
    },
    members: (d.members || []).map((m) => ({
      rowStatus: '', userId: m.userId, loginId: m.loginId, empNm: m.empNm, orgNm: m.orgNm,
    })),
  }),
  toPayload: (f) => ({
    def: f.def,
    members: f.members.map((m) => ({ rowStatus: m.rowStatus, userId: m.userId })),
  }),
  validate: (f, { mode, setTab }) => {
    if (mode === 'create' && !(f.def.usergroupId || '').trim()) {
      toast.error?.('그룹ID는 필수입니다.'); setTab('def'); return false;
    }
    if (!(f.def.usergroupNm || '').trim()) {
      toast.error?.('그룹명은 필수입니다.'); setTab('def'); return false;
    }
    return true;
  },
});
const {
  mode, selected, detail, detailLoading, drawerTab, saving, confirmDelete, form, isEditing, modalTitle,
  openDetail, openCreate, enterEdit, cancelEdit, closePanel, save, doDelete,
} = editor;

const defFields = computed(() => [
  { key: 'usergroupId', type: 'text', label: '그룹ID', input: '예: ADMIN_GROUP', required: true,
    disabled: mode.value === 'edit',
    hint: mode.value === 'edit' ? '그룹ID는 변경할 수 없습니다.' : '영문 대문자/언더스코어 권장' },
  { key: 'usergroupNm', type: 'text', label: '그룹명', input: '예: 시스템총괄', required: true },
  { key: 'groupType', type: 'select', label: '그룹유형', options: groupTypeEditOptions,
    hint: '90=운영자(관리자 화면 접근 그룹). 그 외 10/20/30/51 은 코드값.' },
  { key: 'bigo', type: 'text', label: '비고', input: '예: 전체 권한자' },
]);

// ── 멤버 (FRM_USER_GROUP_MAP) ──
const visibleMembers = computed(() =>
  (form.value.members || []).filter((m) => m.rowStatus !== 'D'));

const tabItems = computed(() => {
  const cnt = isEditing.value ? visibleMembers.value.length : (detail.value?.members?.length || 0);
  return [
    { name: 'def', tabLabel: '정의' },
    { name: 'members', tabLabel: `멤버 (${cnt})` },
  ];
});

// 멤버 = 관계편집 공통부품(RelationEditor) 으로 처리. 컬럼/검색소스/매핑만 주입.
const memberColumns = [
  { key: 'loginId', label: '로그인ID', code: true },
  { key: 'empNm',   label: '성명' },
  { key: 'orgNm',   label: '소속', muted: true },
];
// 검색결과(UserRow: userId/loginId/userNm/orgNm) → 멤버 항목(empNm 사용)으로 정규화.
function memberMapResult(u) {
  return { userId: u.userId, loginId: u.loginId, empNm: u.userNm || u.empNm, orgNm: u.orgNm };
}
async function memberSearch(q) {
  const res = await adminApi.access.users.list({ q, size: 100, page: 1 });
  const data = res?.data ?? res ?? {};
  return data.content ?? [];
}

onMounted(() => list.reload());
</script>

<template>
  <CatalogPage
    title="사용자그룹 관리"
    :subtitle="`FRM_USER_GROUP · ` + (list.total.value || 0).toLocaleString() + `개 그룹`"
    :list="list"
    :columns="columns"
    row-key="usergroupId"
    :active-filters="activeFilters"
    :selected-row="selected"
    :help="screenHelp"
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
          input="그룹ID 또는 그룹명 (Enter 또는 [조회])"
          layout="vertical"
          :icon-clickable="false"
          @update:model-value="onSearch"
          @search="applyFilter"
        />
        <InSelect
          :model-value="staged.groupType"
          :options="groupTypeFilterOptions"
          label="그룹유형"
          input="전체"
          layout="vertical"
          size="sm"
          @update:model-value="onType"
        />
        <InButton class="q-filters__search-btn" variant="primary" size="md" :left-icon-show="false" :right-icon-show="false" @click="applyFilter">조회</InButton>
        <InButton class="q-filters__reset-btn" variant="default" size="md" :left-icon-show="false" :right-icon-show="false" @click="resetFilter">초기화</InButton>
      </div>
    </template>

    <template #cell-usergroupId="{ value }"><strong>{{ value }}</strong></template>
    <template #cell-groupType="{ value }">{{ groupTypeText(value) }}</template>

    <template #drawer>
      <MetaDetailEditor
        :mode="mode"
        :title="modalTitle"
        :loading="detailLoading"
        :saving="saving"
        :tabs="tabItems"
        :active-tab="drawerTab"
        :has-content="mode === 'create' || !!detail"
        :width="860"
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
            <dt>그룹ID</dt><dd>{{ detail.def.usergroupId }}</dd>
            <dt>그룹명</dt><dd>{{ detail.def.usergroupNm || '—' }}</dd>
            <dt>그룹유형</dt><dd>{{ groupTypeText(detail.def.groupType) }}</dd>
            <dt>비고</dt><dd>{{ detail.def.bigo || '—' }}</dd>
          </dl>
          <MetaDefForm v-else :model="form.def" :fields="defFields" />
        </section>

        <!-- 멤버 (관계편집 공통부품 RelationEditor — 보기/편집 동일 부품) -->
        <section v-else-if="drawerTab === 'members'" class="section">
          <RelationEditor
            v-if="mode === 'view'"
            :list="detail.members || []"
            id-field="userId"
            :columns="memberColumns"
            read-only
            empty-text="멤버가 없습니다."
          />
          <template v-else>
            <p class="member-note">추가/제거는 저장 시 감사 로그(GRANT/REVOKE)가 함께 기록됩니다.</p>
            <RelationEditor
              :list="form.members"
              id-field="userId"
              :columns="memberColumns"
              :search="memberSearch"
              :map-result="memberMapResult"
              add-section-label="멤버 추가 — 사용자 검색"
              search-placeholder="로그인ID 또는 성명으로 검색 (Enter)"
              list-label="현재 멤버"
              empty-text="멤버가 없습니다. 위에서 검색해 [+ 추가] 하세요."
            />
          </template>
        </section>
      </MetaDetailEditor>

      <!-- 삭제 확인 -->
      <InModal
        v-if="confirmDelete"
        :model-value="confirmDelete"
        type="confirm"
        title="사용자그룹 삭제"
        :message="`'${selected?.usergroupId}' 그룹을 삭제할까요? 멤버까지 단일 트랜잭션으로 삭제됩니다. (권한 바인딩이 있으면 차단됩니다.)`"
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
.q-filters > :deep(.in-sel) { flex: 0 0 200px; }
.q-filters__search-btn, .q-filters__reset-btn { flex: 0 0 auto; align-self: flex-end; }
.muted { color: var(--in-text-subtle); }
.section { padding: 12px 4px; }
.kv { display: grid; grid-template-columns: 110px 1fr; gap: 8px 12px; margin: 0; }
.kv dt { color: var(--in-text-subtle); font-size: var(--in-font-size-sm); }
.kv dd { margin: 0; color: var(--in-text-default); word-break: break-all; }

/* 멤버 목록·검색은 RelationEditor(공통부품)가 담당 — 화면 고유 스타일은 안내문만 */
.member-note { margin: 0 0 10px; font-size: var(--in-font-size-sm); color: var(--in-text-subtle); }
</style>
