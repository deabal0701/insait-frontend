<script setup>
/**
 * AuthItemCatalog — AUT0040 권한 관리 (admin lane access 차선, 직접 REST).
 * ★ (2026-06-10, dspark): 권한항목(FRM_AUTH_ITEM) + 3종 바인딩(그룹/사용자/메뉴) 편집.
 *   ★ 그룹·사용자 바인딩 탭은 공통부품 RelationEditor 재사용, 메뉴 탭은 MenuBindingTree(트리+체크박스).
 *   설계: 02-tobe/04-admin-lane/access-control/03_authority-aut0040.md.
 *   백엔드: GET/POST/PUT/DELETE /api/admin/access/auth-items (+ ?expand=groups,users,menus).
 *   바인딩 변경은 rowStatus I/D → 백엔드가 감사 로그(AUTHGROUP/AUTHUSER/AUTHMENU × GRANT/REVOKE) 동반.
 * ★ (2026-06-19, dspark): SG 규격 전환 — CatalogPage(InTable) → SgCatalogPage(SgSearchBar + InDataTable/WinGrid
 *   + 서버페이징) + MetaCatalogDrawer. 메타관리 화면과 동일 표현 컴포넌트로 통일.
 *   업무 프로세스(직접 REST + 서버 페이징 + Drawer 편집 + 3 바인딩 탭)는 보존.
 */
import { computed, onMounted } from 'vue';
import { adminApi } from '@/services/adminApi';
import { usePagedList } from '@/composables/usePagedList';
import { useToast } from '@/composables/useToast';
import { useMetaEditor } from '@/composables/useMetaEditor';

import SgCatalogPage from '@/components/feature/admin/SgCatalogPage.vue';
import screenHelp from './AuthItemCatalog.help.js';   // [DEV-HELP] 화면 도움말 — 제거 시 이 줄 + 아래 :help prop 삭제
import MetaCatalogDrawer from '@/components/feature/admin/MetaCatalogDrawer.vue';
import MetaDefForm from '@/components/feature/admin/MetaDefForm.vue';
import RelationEditor from '@/components/feature/access/RelationEditor.vue';
import MenuBindingTree from '@/components/feature/access/MenuBindingTree.vue';

const toast = useToast();

const list = usePagedList({
  fetcher: adminApi.access.authItems.list,
  initialSize: 50,
  initialFilter: { q: '' },
  defaultSort: ['auth_item_name,asc'],
  syncUrl: true,
});

// ── 검색 (SgSearchBar) — key = list filter 키. q(권한이름/설명) ──
const searchFields = [
  { key: 'q', label: '검색', type: 'text', placeholder: '권한이름 또는 설명' },
];

// ── 목록 그리드 (tui-grid 컬럼) — sortKey 선언 컬럼은 WinGrid 기본 정렬 ──
function typeText(cd) { return cd === '01' ? '01 (메뉴접근)' : (cd || '—'); }
const columns = [
  { name: 'authItemName', header: '권한이름', width: 240, sortKey: 'auth_item_name' },
  { name: 'authItemType', header: '유형', width: 120, align: 'center',
    formatter: ({ value }) => typeText(value) },
  { name: 'note', header: '설명', formatter: ({ value }) => value || '—' },
];

// ── 바인딩 공통 설정 (RelationEditor 주입) ──
const groupCols = [{ key: 'usergroupId', label: '그룹ID', code: true }, { key: 'usergroupNm', label: '그룹명' }];
const userCols  = [{ key: 'loginId', label: '로그인ID', code: true }, { key: 'empNm', label: '성명' }];
// 메뉴 탭은 MenuBindingTree(트리) — menuCols 불요.

const mapGroup = (g) => ({ usergroupId: g.usergroupId, usergroupNm: g.usergroupNm });
const mapUser  = (u) => ({ userId: u.userId, loginId: u.loginId, empNm: u.userNm || u.empNm });

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
  openInEdit: true,   // ★ (2026-06-10, dspark) 표준: 행 클릭 시 바로 편집(조회 단계 생략, 클릭 수 축소)
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
  // ★ (2026-06-12, dspark): focusField — 검증 실패 필드 자동 포커스 (#8)
  validate: (f, { setTab, focusField }) => {
    if (!(f.def.authItemName || '').trim()) {
      toast.error?.('권한이름은 필수입니다.'); setTab('def'); focusField?.('authItemName'); return false;
    }
    return true;
  },
});
// Drawer chrome 은 MetaCatalogDrawer 가 editor 로 직접 처리 → 화면 직접 참조 상태만 구조분해.
const { mode, selected, detail, drawerTab, form, isEditing, openDetail, openCreate } = editor;

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
  <SgCatalogPage
    title="권한 관리"
    :subtitle="`FRM_AUTH_ITEM · ` + (list.total.value || 0).toLocaleString() + `개 권한`"
    :list="list"
    :columns="columns"
    :search-fields="searchFields"
    :help="screenHelp"
    grid-title="권한 목록"
    row-key="authItemId"
    @row-click="openDetail"
    @create="openCreate"
    @retry="list.reload()"
  >
    <template #drawer>
      <MetaCatalogDrawer
        :editor="editor"
        :tabs="tabItems"
        :width="880"
        delete-title="권한 삭제"
        :delete-message="`'${selected?.authItemName}' 권한을 삭제할까요? 그룹·사용자·메뉴 바인딩까지 단일 트랜잭션으로 함께 삭제됩니다.`"
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
      </MetaCatalogDrawer>
    </template>
  </SgCatalogPage>
</template>

<style scoped>
.section { padding: 12px 4px; }
.kv { display: grid; grid-template-columns: 110px 1fr; gap: 8px 12px; margin: 0; }
.kv dt { color: var(--in-text-subtle); font-size: var(--in-font-size-sm); }
.kv dd { margin: 0; color: var(--in-text-default); word-break: break-all; }
.bind-note { margin: 0 0 10px; font-size: var(--in-font-size-sm); color: var(--in-text-subtle); }
</style>
