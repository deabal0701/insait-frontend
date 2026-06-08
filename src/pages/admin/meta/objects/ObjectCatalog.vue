<script setup>
/**
 * ObjectCatalog — AUT0030 오브젝트관리 (admin lane 카탈로그 + 편집 CRUD).
 * ★ (2026-06-03, dspark): GET /api/admin/meta/objects (직접 REST). key = OBJECT_NM 또는 OBJECT_ID.
 * ★ (2026-06-05, dspark): 편집 CRUD — 공통 컴포넌트 재사용 (99 backlog #8).
 *   useMetaEditor + MetaDetailEditor + MetaChildGrid 2개 (속성 attributes + 하위관계 relations, 평면).
 *   COMPANY_CD/MOD_USER_ID 는 백엔드가 JWT 세션에서 주입.
 */
import { computed, onMounted } from 'vue';
import { adminApi } from '@/services/adminApi';
import { usePagedList } from '@/composables/usePagedList';
import { useCatalogFilter } from '@/composables/useCatalogFilter';
import { useToast } from '@/composables/useToast';
import { useMetaEditor } from '@/composables/useMetaEditor';

import CatalogPage from '@/components/feature/admin/CatalogPage.vue';
import MetaDetailEditor from '@/components/feature/admin/MetaDetailEditor.vue';
import MetaChildGrid from '@/components/feature/admin/MetaChildGrid.vue';
import MetaDefForm from '@/components/feature/admin/MetaDefForm.vue';

import InSearchField from '@/components/ui/InSearchField.vue';
import InSelect from '@/components/ui/InSelect.vue';
import InButton from '@/components/ui/InButton.vue';
import InTag from '@/components/ui/InTag.vue';
import InModal from '@/components/ui/InModal.vue';

const toast = useToast();

const list = usePagedList({
  fetcher: adminApi.meta.objects.list,
  initialSize: 50,
  initialFilter: { q: '', objectType: '', status: '', companyCd: '', hasParent: '' },
  defaultSort: ['object_nm,asc'],
  syncUrl: true,
});

const { staged, activeFilters, applyFilter, resetFilter, removeFilter } = useCatalogFilter({
  list,
  initial: { q: '', objectType: '', status: '', companyCd: '', hasParent: '' },
  chipLabels: { q: '검색', objectType: 'type', status: 'status', companyCd: 'company', hasParent: 'parent' },
});
function onSearch(v) { staged.value.q = v; }
function onType(v) { staged.value.objectType = v; }
function onParent(v) { staged.value.hasParent = v; }

// ★ (2026-06-08, dspark): AS-IS 정합 — OBJECT_TYPE 은 IST_OBJECT_TYPE 공통코드 USE_YN='Y' = view/elaform 2종뿐.
//   기존 popup/detail/dialog 는 실 데이터 0건인 임의값이라 제거(고르면 무조건 0건이던 버그).
//   실측: view 4520 · elaform 193 · (legacy fsq 3 · statis 2). [aut0030.jsp:240 listProvider="AutObjectType"]
//   ※ TODO: 장기적으로 IST_OBJECT_TYPE 공통코드 API 로 동적 로드(SSOT)하면 USE_YN 변경에 자동 추종.
const typeOptions = [
  { value: '',        label: '전체 타입' },
  { value: 'view',    label: 'view (뷰)' },
  { value: 'elaform', label: 'elaform (전자결재유형)' },
];
const parentOptions = [
  { value: '',  label: '부모 무관' },
  { value: 'Y', label: '하위 (PARENT_ID 있음)' },
  { value: 'N', label: '최상위 (PARENT_ID 없음)' },
];


const columns = [
  { field: 'objectNm',        label: 'OBJECT_NM',  sortable: true, sortKey: 'object_nm', width: 220 },
  { field: 'objectDisplayNm', label: '한글명',     sortable: true, sortKey: 'object_display_nm' },
  { field: 'objectType',      label: 'Type',       sortable: true, sortKey: 'object_type', align: 'center', width: 80 },
  { field: 'objectLink',      label: '화면 경로' },
  { field: 'parentId',        label: '부모', align: 'right', width: 100 },
  { field: 'status',          label: 'Status', sortable: true, sortKey: 'status', align: 'center', width: 80 },
];

// ── 편집 폼 옵션 / 그리드 config ──
// ★ (2026-06-08, dspark): AS-IS 편집 콤보 정합 — 뷰/전자결재유형 2종 (이미지3, IST_OBJECT_TYPE USE_YN='Y').
//   기존 popup/report 는 공통코드 카탈로그엔 있으나 운영 비활성(USE_YN='N')·데이터 0건이라 제거.
const typeEditOptions = [
  { value: 'view',    label: 'view (뷰)' },
  { value: 'elaform', label: 'elaform (전자결재유형)' },
];
const attrColumns = [
  { key: 'attributeTypeCd', label: '타입', kind: 'text', width: 120, placeholder: 'INIT_DATA' },
  { key: 'attributeNm',     label: '속성명', kind: 'text', width: 160, placeholder: 'appl_cd' },
  { key: 'attributeValue',  label: '값', kind: 'text' },
];
function newAttr() {
  return { rowStatus: 'I', attributeId: null, attributeTypeCd: '', attributeNm: '', attributeValue: '', note: '' };
}
const relColumns = [
  { key: 'seq',        label: '순서', kind: 'number', width: 56 },
  { key: 'relTypeCd',  label: '관계유형', kind: 'text', width: 120, placeholder: 'POPUP' },
  { key: 'childObjId', label: '하위 OBJECT_ID', kind: 'number', width: 140 },
];
function newRel(rows) {
  const maxSeq = rows.reduce((m, r) => Math.max(m, r.seq || 0), 0);
  return { rowStatus: 'I', objectRelId: null, relTypeCd: '', seq: maxSeq + 1, childObjId: null };
}

// ── 편집 상태기계 (공통) ──
const editor = useMetaEditor({
  api: adminApi.meta.objects,
  keyField: 'objectNm',
  domainLabel: '오브젝트',
  expand: ['attributes', 'children'],
  defaultTab: 'def',
  createTab: 'def',
  reload: () => list.reload(),
  blankForm: () => ({
    def: { objectNm: '', objectDisplayNm: '', objectLink: '', objectType: 'view', status: '', note: '', parentId: null, companyCd: '' },
    attributes: [],
    relations: [],
  }),
  toForm: (d) => {
    const def = d.def || {};
    return {
      def: {
        objectNm: def.objectNm, objectDisplayNm: def.objectDisplayNm, objectLink: def.objectLink || '',
        objectType: def.objectType || 'view', status: def.status || '', note: def.note || '',
        parentId: def.parentId, companyCd: def.companyCd || '',
      },
      attributes: (d.attributes || []).map((a) => ({
        rowStatus: '', attributeId: a.attributeId, attributeTypeCd: a.attributeTypeCd,
        attributeNm: a.attributeNm, attributeValue: a.attributeValue || '', note: '',
      })),
      relations: (d.children || []).map((r) => ({
        rowStatus: '', objectRelId: r.objectRelId, relTypeCd: r.relTypeCd, seq: r.seq, childObjId: r.childObjId,
      })),
    };
  },
  toPayload: (f) => ({ def: { ...f.def }, attributes: f.attributes, relations: f.relations }),
  validate: (f, { setTab }) => {
    const d = f.def;
    if (!d.objectNm || !d.objectNm.trim()) { toast.error?.('OBJECT_NM 은 필수입니다.'); setTab('def'); return false; }
    if (!d.objectDisplayNm || !d.objectDisplayNm.trim()) { toast.error?.('화면표시명은 필수입니다.'); setTab('def'); return false; }
    for (const a of (f.attributes || []).filter((x) => x.rowStatus !== 'D')) {
      if (!a.attributeNm || !a.attributeNm.trim()) { toast.error?.('속성명이 빈 행이 있습니다.'); setTab('attributes'); return false; }
      if (!a.attributeTypeCd || !a.attributeTypeCd.trim()) { toast.error?.(`속성 '${a.attributeNm}'의 타입은 필수입니다.`); setTab('attributes'); return false; }
    }
    for (const r of (f.relations || []).filter((x) => x.rowStatus !== 'D')) {
      if (!r.relTypeCd || !r.relTypeCd.trim()) { toast.error?.('관계유형이 빈 행이 있습니다.'); setTab('relations'); return false; }
      if (r.childObjId == null) { toast.error?.('하위 OBJECT_ID 가 빈 행이 있습니다.'); setTab('relations'); return false; }
    }
    return true;
  },
});
const {
  mode, selected, detail, detailLoading, drawerTab, saving, confirmDelete, form, isEditing, modalTitle,
  openDetail, openCreate, enterEdit, cancelEdit, closePanel, save, doDelete,
} = editor;

const defFields = computed(() => [
  { key: 'objectNm', type: 'text', label: 'OBJECT_NM', input: '예: TST0001_51', required: true,
    disabled: mode.value === 'edit',
    hint: mode.value === 'edit' ? 'OBJECT_NM 은 업무키라 수정할 수 없습니다.' : undefined },
  { key: 'objectDisplayNm', type: 'text', label: '화면표시명', input: '예: [테스트] 자기참조 메타 조회', required: true },
  { key: 'objectLink', type: 'text', label: '화면 경로 (OBJECT_LINK)', input: 'TO-BE: Vue 라우트 (예: /tst/tst0008) · envelope 전용이면 비움' },
  { key: 'objectType', type: 'select', label: '오브젝트 유형', options: typeEditOptions },
  { key: 'status', type: 'text', label: 'Status', input: '(선택)' },
  { key: 'note', type: 'text', label: '비고', input: '(선택)' },
]);

const tabItems = computed(() => {
  if (isEditing.value) {
    return [
      { name: 'def',        tabLabel: '정의' },
      { name: 'attributes', tabLabel: `속성 (${(form.value.attributes || []).filter((a) => a.rowStatus !== 'D').length})` },
      { name: 'relations',  tabLabel: `하위 관계 (${(form.value.relations || []).filter((r) => r.rowStatus !== 'D').length})` },
    ];
  }
  const d = detail.value;
  return [
    { name: 'def',        tabLabel: '정의' },
    { name: 'attributes', tabLabel: `속성 (${d?.attributes?.length || 0})` },
    { name: 'children',   tabLabel: `자식 (${d?.children?.length || 0})` },
  ];
});


onMounted(() => list.reload());
</script>

<template>
  <CatalogPage
    title="오브젝트 관리"
    :subtitle="`FRM_EXECUTABLE_OBJECT · 운영 ` + (list.total.value || 0).toLocaleString() + `건`"
    :list="list"
    :columns="columns"
    row-key="objectNm"
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
      <div class="o-filters">
        <InSearchField
          :model-value="staged.q"
          label="검색"
          input="오브젝트명 또는 화면표시명 포함 검색 — 예: 발령품의서 / CAM0002 (Enter 또는 [조회])"
          layout="vertical"
          :icon-clickable="false"
          @update:model-value="onSearch"
          @search="applyFilter"
        />
        <InSelect :model-value="staged.objectType" :options="typeOptions" label="Type" input="전체" layout="vertical" size="sm" @update:model-value="onType" />
        <InSelect :model-value="staged.hasParent" :options="parentOptions" label="부모" input="전체" layout="vertical" size="sm" @update:model-value="onParent" />
        <InButton class="o-filters__search-btn" variant="primary" size="md" :left-icon-show="false" :right-icon-show="false" @click="applyFilter">조회</InButton>
        <InButton class="o-filters__reset-btn" variant="default" size="md" :left-icon-show="false" :right-icon-show="false" @click="resetFilter">초기화</InButton>
      </div>
    </template>

    <template #cell-objectNm="{ value }"><strong>{{ value }}</strong></template>
    <template #cell-objectType="{ value }"><InTag :label="value" :variant="value === 'view' ? 'brand' : 'default'" size="sm" /></template>
    <template #cell-objectLink="{ value }"><code class="link">{{ value || '—' }}</code></template>
    <template #cell-parentId="{ value }"><span class="muted">{{ value || '—' }}</span></template>

    <template #drawer>
      <MetaDetailEditor
        :mode="mode"
        :title="modalTitle"
        :loading="detailLoading"
        :saving="saving"
        :tabs="tabItems"
        :active-tab="drawerTab"
        :has-content="mode === 'create' || !!detail"
        :width="940"
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
            <dt>OBJECT_ID</dt><dd>{{ detail.def.objectId }}</dd>
            <dt>OBJECT_NM</dt><dd>{{ detail.def.objectNm }}</dd>
            <dt>한글명</dt><dd>{{ detail.def.objectDisplayNm || '—' }}</dd>
            <dt>화면 경로</dt><dd><code>{{ detail.def.objectLink || '—' }}</code></dd>
            <dt>Type</dt><dd>{{ detail.def.objectType }}</dd>
            <dt>부모</dt><dd>{{ detail.def.parentId || '—' }}</dd>
            <dt>Status / Company</dt><dd>{{ detail.def.status || '—' }} / {{ detail.def.companyCd || '—' }}</dd>
            <dt>비고</dt><dd>{{ detail.def.note || '—' }}</dd>
          </dl>

          <MetaDefForm v-else :model="form.def" :fields="defFields" />
        </section>

        <!-- 속성 -->
        <section v-else-if="drawerTab === 'attributes'" class="section">
          <MetaChildGrid
            v-if="isEditing"
            :rows="form.attributes"
            :columns="attrColumns"
            key-field="attributeId"
            :new-row="newAttr"
            add-label="+ 속성 추가"
            hint="팝업·인쇄·탭 동작 등 부가 속성. ELA 는 appl_cd/authStr 등 필수."
          />
          <ul v-else-if="detail" class="resource-list">
            <li v-for="a in detail.attributes" :key="a.attributeId">
              <InTag :label="a.attributeTypeCd" size="sm" />
              <code>{{ a.attributeNm }}</code>
              <span class="muted">= {{ a.attributeValue }}</span>
            </li>
            <li v-if="!detail.attributes?.length" class="muted">속성 없음</li>
          </ul>
        </section>

        <!-- 하위 관계 (편집) / 자식 (보기) -->
        <section v-else-if="drawerTab === 'relations' || drawerTab === 'children'" class="section">
          <MetaChildGrid
            v-if="isEditing"
            :rows="form.relations"
            :columns="relColumns"
            key-field="objectRelId"
            :new-row="newRel"
            add-label="+ 하위 추가"
            hint="이 오브젝트가 합성하는 하위 오브젝트(팝업/탭). 하위 OBJECT_ID 는 대상 오브젝트의 숫자 ID."
          />
          <template v-else-if="detail">
            <p class="muted">FRM_OBJECT_RELATION (PARENT_OBJ_ID = 본 오브젝트)</p>
            <ul class="resource-list">
              <li v-for="r in detail.children" :key="r.objectRelId">
                <InTag :label="r.relTypeCd" size="sm" />
                <code>{{ r.childObjectNm || `(id=${r.childObjId})` }}</code>
                <span class="muted">seq: {{ r.seq }}</span>
              </li>
              <li v-if="!detail.children?.length" class="muted">자식 없음</li>
            </ul>
          </template>
        </section>
      </MetaDetailEditor>

      <!-- 삭제 확인 -->
      <InModal
        v-if="confirmDelete"
        :model-value="confirmDelete"
        type="confirm"
        title="오브젝트 삭제"
        :message="`'${selected?.objectNm}' 를 삭제할까요? (속성·하위관계도 함께 삭제. 메뉴/서비스가 참조 중이면 런타임 영향 주의)`"
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
.o-filters { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; }
.o-filters > :deep(.in-sf) { flex: 1 1 320px; min-width: 280px; }
.o-filters > :deep(.in-sel) { flex: 0 0 200px; }
.o-filters__search-btn, .o-filters__reset-btn { flex: 0 0 auto; align-self: flex-end; }
.muted { color: var(--in-text-subtle); }
.link { font-family: var(--in-font-family-mono, ui-monospace); font-size: var(--in-font-size-sm); color: var(--in-text-default); }
.section { padding: 12px 4px; }
.form-grid { display: flex; flex-direction: column; gap: 14px; }
.form-row { display: flex; flex-direction: column; gap: 4px; }
.hint { margin: 0; font-size: var(--in-font-size-sm); color: var(--in-text-subtle); }
.kv { display: grid; grid-template-columns: 130px 1fr; gap: 8px 12px; margin: 0; }
.kv dt { color: var(--in-text-subtle); font-size: var(--in-font-size-sm); }
.kv dd { margin: 0; word-break: break-all; }
.resource-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.resource-list li { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; padding: 8px 10px; background: var(--in-bg-default); border-radius: var(--in-radius-xs); }
.resource-list code { font-family: var(--in-font-family-mono, ui-monospace); font-size: var(--in-font-size-sm); }
</style>
