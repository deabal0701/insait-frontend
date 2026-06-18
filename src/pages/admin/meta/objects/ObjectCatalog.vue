<script setup>
/**
 * ObjectCatalog — AUT0030 오브젝트관리 (admin lane 카탈로그 + 편집 CRUD).
 * ★ (2026-06-03, dspark): GET /api/admin/meta/objects (직접 REST). key = OBJECT_NM 또는 OBJECT_ID.
 * ★ (2026-06-05, dspark): 편집 CRUD — 공통 컴포넌트 재사용 (99 backlog #8).
 *   useMetaEditor + MetaDetailEditor + MetaChildGrid 2개 (속성 attributes + 하위관계 relations, 평면).
 *   COMPANY_CD/MOD_USER_ID 는 백엔드가 JWT 세션에서 주입.
 * ★ (2026-06-18, dspark): SG 규격 전환 — CatalogPage(InTable) → SgCatalogPage(SgSearchBar + InDataTable + 서버페이징).
 *   사업장관리(ORM9999)와 동일 표현 컴포넌트. 업무 프로세스(직접 REST + 서버 페이징 + Drawer 편집)는 보존.
 *   · 그리드 = 조회 + 행클릭→Drawer 전용(인라인 편집 X). 등록/수정은 전적으로 Drawer.
 *   · 페이징 = usePagedList(서버) 그대로. 검색 = SgSearchBar(q/objectType, list filter 키 직결).
 */
import { computed, onMounted } from 'vue';
import { adminApi } from '@/services/adminApi';
import { usePagedList } from '@/composables/usePagedList';
import { useToast } from '@/composables/useToast';
import { useMetaEditor } from '@/composables/useMetaEditor';

import SgCatalogPage from '@/components/feature/admin/SgCatalogPage.vue';
import screenHelp from './ObjectCatalog.help.js';   // [DEV-HELP] 화면 도움말 — 제거 시 이 줄 + 아래 :help prop 삭제
import MetaDetailEditor from '@/components/feature/admin/MetaDetailEditor.vue';
import MetaChildGrid from '@/components/feature/admin/MetaChildGrid.vue';
import MetaDefForm from '@/components/feature/admin/MetaDefForm.vue';

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

// ★ (2026-06-08, dspark): AS-IS 정합 — OBJECT_TYPE 은 IST_OBJECT_TYPE 공통코드 USE_YN='Y' = view/elaform 2종뿐.
//   실측: view 4520 · elaform 193. [aut0030.jsp:240 listProvider="AutObjectType"]
const typeOptions = [
  { value: '',        label: '전체' },
  { value: 'view',    label: 'view (뷰)' },
  { value: 'elaform', label: 'elaform (전자결재유형)' },
];

// ── 검색 (SgSearchBar) — key = list filter 키. q(키워드) + objectType(유형) 2개 (AS-IS aut0030.jsp 검색박스 정합) ──
const searchFields = [
  { key: 'q', label: '검색', type: 'text',
    placeholder: '오브젝트명 또는 화면표시명 포함 — 예: 발령품의서 / CAM0002' },
  { key: 'objectType', label: 'Type', type: 'select', options: typeOptions, placeholder: '전체' },
];

// ── 목록 그리드 (tui-grid 컬럼) — sortKey 가 있으면 헤더 클릭 시 서버 정렬 ──
const columns = [
  { name: 'objectNm',        header: 'OBJECT_NM', width: 240, sortKey: 'object_nm' },
  { name: 'objectDisplayNm', header: '한글명',     sortKey: 'object_display_nm' },
  { name: 'objectType',      header: 'Type',       width: 110, align: 'center', sortKey: 'object_type' },
  { name: 'objectLink',      header: '화면 경로',   formatter: ({ value }) => value || '—' },
  { name: 'status',          header: 'Status',     width: 100, align: 'center', sortKey: 'status' },
];

// ── 편집 폼 옵션 / 그리드 config ──
// ★ (2026-06-08, dspark): AS-IS 편집 콤보 정합 — 뷰/전자결재유형 2종 (IST_OBJECT_TYPE USE_YN='Y').
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
  // ★ (2026-06-15, dspark): 'editcombo'(el-select) — 다크모드 네이티브 datalist 깨짐 회피. 동작 동일(드롭다운+자유입력).
  { key: 'relTypeCd',  label: '관계유형', kind: 'editcombo', width: 120, options: ['child'], placeholder: 'child' },
  // ★ (2026-06-15, dspark): 인라인 서버검색(searchcombo, G14). OBJECT_ID 저장 + 이름 표시.
  { key: 'childObjId', label: '하위 오브젝트', kind: 'searchcombo', width: 260, displayKey: 'childObjectNm',
    placeholder: '오브젝트ID/화면명 검색',
    sc: {
      fetcher: (q) => adminApi.meta.objects.list({ q, size: 50, page: 1 }).then((r) => r.content || []),
      value: (raw) => raw.objectId,
      label: (raw) => `${raw.objectNm}${raw.objectDisplayNm ? ' — ' + raw.objectDisplayNm : ''}`,
      short: (raw) => raw.objectNm,
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

// ★ (2026-06-10, dspark) 바로편집(openInEdit) — 카운트는 편집 중이면 form(rowStatus≠'D'), 아니면 detail.
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
  <SgCatalogPage
    title="오브젝트 관리"
    :subtitle="`FRM_EXECUTABLE_OBJECT · 운영 ` + (list.total.value || 0).toLocaleString() + `건`"
    :list="list"
    :columns="columns"
    :search-fields="searchFields"
    :help="screenHelp"
    grid-title="오브젝트 목록"
    row-key="objectNm"
    @row-click="openDetail"
    @create="openCreate"
    @retry="list.reload()"
  >
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
            <!-- ★ (2026-06-10, dspark) 바로편집 — 읽기전용 정보성 컬럼(OBJECT_ID/부모/Company)은 editor 위에 보존. -->
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
  </SgCatalogPage>
</template>

<style scoped>
.muted { color: var(--in-text-subtle); }
.section { padding: 12px 4px; }
.kv { display: grid; grid-template-columns: 130px 1fr; gap: 8px 12px; margin: 0; }
/* ★ (2026-06-10) 바로편집 시 editor 위 읽기전용 정보 블록 — 폼과 시각 구분 */
.kv--ro { margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid var(--in-border-subtle, var(--in-bg-default)); }
.kv dt { color: var(--in-text-subtle); font-size: var(--in-font-size-sm); }
.kv dd { margin: 0; word-break: break-all; }
.resource-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.resource-list li { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; padding: 8px 10px; background: var(--in-bg-default); border-radius: var(--in-radius-xs); }
.resource-list code { font-family: var(--in-font-family-mono, ui-monospace); font-size: var(--in-font-size-sm); }
</style>
