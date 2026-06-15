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
import screenHelp from './ObjectCatalog.help.js';   // [DEV-HELP] 화면 도움말 — 제거 시 이 줄 + 아래 :help prop 삭제
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
  initialFilter: { q: '', objectType: '', status: '', companyCd: '' },
  defaultSort: ['object_nm,asc'],
  syncUrl: true,
});

const { staged, activeFilters, applyFilter, resetFilter, removeFilter } = useCatalogFilter({
  list,
  initial: { q: '', objectType: '', status: '', companyCd: '' },
  chipLabels: { q: '검색', objectType: 'type', status: 'status', companyCd: 'company' },
});
function onSearch(v) { staged.value.q = v; }
function onType(v) { staged.value.objectType = v; }
// ★ (2026-06-08, dspark): parent 필터 제거 — AS-IS aut0030.jsp 검색박스엔 키워드+유형 2개뿐(parent 없음).
//   FRM_EXECUTABLE_OBJECT.PARENT_ID 는 거의 미사용 컬럼이고 실 계층은 FRM_OBJECT_RELATION 이라 의미도 약했음.

// ★ (2026-06-08, dspark): AS-IS 정합 — OBJECT_TYPE 은 IST_OBJECT_TYPE 공통코드 USE_YN='Y' = view/elaform 2종뿐.
//   기존 popup/detail/dialog 는 실 데이터 0건인 임의값이라 제거(고르면 무조건 0건이던 버그).
//   실측: view 4520 · elaform 193 · (legacy fsq 3 · statis 2). [aut0030.jsp:240 listProvider="AutObjectType"]
//   ※ TODO: 장기적으로 IST_OBJECT_TYPE 공통코드 API 로 동적 로드(SSOT)하면 USE_YN 변경에 자동 추종.
const typeOptions = [
  { value: '',        label: '전체' },   // ★ (2026-06-12, dspark): '전체 타입' → '전체' 통일 (#6)
  { value: 'view',    label: 'view (뷰)' },
  { value: 'elaform', label: 'elaform (전자결재유형)' },
];

const columns = [
  { field: 'objectNm',        label: 'OBJECT_NM',  sortable: true, sortKey: 'object_nm', width: 220 },
  { field: 'objectDisplayNm', label: '한글명',     sortable: true, sortKey: 'object_display_nm' },
  { field: 'objectType',      label: 'Type',       sortable: true, sortKey: 'object_type', align: 'center', width: 80 },
  { field: 'objectLink',      label: '화면 경로' },
  // ★ (2026-06-08, dspark): '부모(parentId)' 컬럼 제거 — AS-IS 목록엔 없고 FRM_EXECUTABLE_OBJECT.PARENT_ID 는
  //   죽은 컬럼(빈값/0). 실 계층은 상세의 '하위오브젝트(자식)' 탭(FRM_OBJECT_RELATION, 1:N)에서 다룸.
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
  // ★ (2026-06-12, dspark): placeholder POPUP → child. 사용자 실측 SELECT DISTINCT REL_TYPE_CD FROM FRM_OBJECT_RELATION = 'child' 유일 (POPUP 은 임의 예시값이었음). combo 로 표준값 제안 + 자유입력 보존
  // ★ (2026-06-15, dspark): kind 'combo'(네이티브 datalist) → 'editcombo'(el-select). 다크모드에서 네이티브 datalist 팝업이 검정으로 뜨던 문제 + 타 드롭다운(searchcombo)과 테마 불일치 해결. 동작은 동일(드롭다운+자유입력).
  { key: 'relTypeCd',  label: '관계유형', kind: 'editcombo', width: 120, options: ['child'], placeholder: 'child' },
  // ★ (2026-06-15, dspark): 숫자 직접입력 → 인라인 서버검색(searchcombo, G14). 칸에 타이핑→오브젝트 리스트→선택. OBJECT_ID 저장 + 이름 표시.
  { key: 'childObjId', label: '하위 오브젝트', kind: 'searchcombo', width: 260, displayKey: 'childObjectNm',
    placeholder: '오브젝트ID/화면명 검색',
    sc: {
      fetcher: (q) => adminApi.meta.objects.list({ q, size: 50, page: 1 }).then((r) => r.content || []),
      value: (raw) => raw.objectId,
      label: (raw) => `${raw.objectNm}${raw.objectDisplayNm ? ' — ' + raw.objectDisplayNm : ''}`,  // 드롭다운(풍부)
      short: (raw) => raw.objectNm,                                                                  // 접힌 표시값(짧게)
      apply: (raw, row) => { row.childObjId = raw.objectId; row.childObjectNm = raw.objectNm; },
    } },
];
function newRel(rows) {
  const maxSeq = rows.reduce((m, r) => Math.max(m, r.seq || 0), 0);
  return { rowStatus: 'I', objectRelId: null, relTypeCd: '', seq: maxSeq + 1, childObjId: null, childObjectNm: '' };
}

// ── 편집 상태기계 (공통) ──
const editor = useMetaEditor({
  api: adminApi.meta.objects,
  keyField: 'objectNm',
  domainLabel: '오브젝트',
  expand: ['attributes', 'children'],
  openInEdit: true,
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
        rowStatus: '', objectRelId: r.objectRelId, relTypeCd: r.relTypeCd, seq: r.seq, childObjId: r.childObjId, childObjectNm: r.childObjectNm,
      })),
    };
  },
  toPayload: (f) => ({ def: { ...f.def }, attributes: f.attributes, relations: f.relations }),
  // ★ (2026-06-12, dspark): focusField — 검증 실패 필드 자동 포커스 (#8)
  validate: (f, { setTab, focusField }) => {
    const d = f.def;
    if (!d.objectNm || !d.objectNm.trim()) { toast.error?.('OBJECT_NM 은 필수입니다.'); setTab('def'); focusField?.('objectNm'); return false; }
    if (!d.objectDisplayNm || !d.objectDisplayNm.trim()) { toast.error?.('화면표시명은 필수입니다.'); setTab('def'); focusField?.('objectDisplayNm'); return false; }
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

// ★ (2026-06-10, dspark) 바로편집(openInEdit) — mode 분기 제거, 단일 목록.
//   편집 그리드가 보기 리스트를 대체하므로 탭 이름은 편집 표준('relations')으로 통일.
//   카운트는 편집 중이면 form(rowStatus≠'D'), 아니면 detail 로 보존.
const tabItems = computed(() => {
  const attrCount = isEditing.value
    ? (form.value.attributes || []).filter((a) => a.rowStatus !== 'D').length
    : (detail.value?.attributes?.length || 0);
  const relCount = isEditing.value
    ? (form.value.relations || []).filter((r) => r.rowStatus !== 'D').length
    : (detail.value?.children?.length || 0);
  return [
    { name: 'def',        tabLabel: '정의' },
    { name: 'attributes', tabLabel: `속성 (${attrCount})` },
    { name: 'relations',  tabLabel: `하위 관계 (${relCount})` },
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
    :help="screenHelp"
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
        <InButton class="o-filters__search-btn" variant="primary" size="md" :left-icon-show="false" :right-icon-show="false" @click="applyFilter">조회</InButton>
        <InButton class="o-filters__reset-btn" variant="default" size="md" :left-icon-show="false" :right-icon-show="false" @click="resetFilter">초기화</InButton>
      </div>
    </template>

    <template #cell-objectNm="{ value }"><strong>{{ value }}</strong></template>
    <template #cell-objectType="{ value }"><InTag :label="value" :variant="value === 'view' ? 'brand' : 'default'" size="sm" /></template>
    <template #cell-objectLink="{ value }"><code class="link">{{ value || '—' }}</code></template>

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
          <!-- 순수 보기(폴백): 전체 읽기전용 dl -->
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

          <template v-else>
            <!-- ★ (2026-06-10, dspark) 바로편집 — 시스템 관리(읽기전용) 정보성 컬럼은 편집 패널에서도 보존.
                 OBJECT_ID/부모/Company 는 폼에 없고 수정 불가라 editor 위에 읽기전용 dl 로 항상 노출.
                 detail(=상세 로드본)에서 직접 읽어 저장 payload(form.def)에는 끼어들지 않음. 신규(create)에는 미표기. -->
            <dl v-if="mode === 'edit' && detail" class="kv kv--ro">
              <dt>OBJECT_ID</dt><dd>{{ detail.def.objectId }}</dd>
              <dt>부모 (PARENT_ID)</dt><dd>{{ detail.def.parentId || '—' }}</dd>
              <dt>Company (COMPANY_CD)</dt><dd>{{ detail.def.companyCd || '—' }}</dd>
            </dl>

            <MetaDefForm :model="form.def" :fields="defFields" />
          </template>
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

        <!-- 하위 관계 (편집 그리드) / 자식 (보기 리스트, 폴백) -->
        <section v-else-if="drawerTab === 'relations'" class="section">
          <MetaChildGrid
            v-if="isEditing"
            :rows="form.relations"
            :columns="relColumns"
            key-field="objectRelId"
            :new-row="newRel"
            add-label="+ 하위 추가"
            hint="이 오브젝트가 합성하는 하위 오브젝트(팝업/탭). 하위 오브젝트 칸에 이름/ID 를 타이핑하면 검색 리스트가 떠 선택할 수 있고, OBJECT_ID 가 자동 저장됩니다."
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
/* ★ (2026-06-10) 바로편집 시 editor 위 읽기전용 정보 블록 — 폼과 시각 구분 */
.kv--ro { margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid var(--in-border-subtle, var(--in-bg-default)); }
.kv dt { color: var(--in-text-subtle); font-size: var(--in-font-size-sm); }
.kv dd { margin: 0; word-break: break-all; }
.resource-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.resource-list li { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; padding: 8px 10px; background: var(--in-bg-default); border-radius: var(--in-radius-xs); }
.resource-list code { font-family: var(--in-font-family-mono, ui-monospace); font-size: var(--in-font-size-sm); }
</style>
