<script setup>
/**
 * EntityCatalog — IST0020 엔터티관리 (admin lane 카탈로그 + 편집 CRUD).
 * ★ (2026-06-03, dspark): GET /api/admin/meta/entities (직접 REST). 상세 expand=mappings,services.
 * ★ (2026-06-05, dspark): 편집 CRUD — 3계층(엔터티→컬럼→매핑). 공통 컴포넌트 재사용 (99 backlog #8).
 *   useMetaEditor + MetaDetailEditor + MetaChildGrid 2개 (컬럼=selectable 마스터 / 선택 컬럼의 매핑=디테일).
 *   매핑은 컬럼 객체에 중첩(c.mappings) → 백엔드가 컬럼 INSERT 후 COLUMN_ID 로 연결.
 */
import { computed, onMounted, ref, watch } from 'vue';
import { adminApi } from '@/services/adminApi';
import { usePagedList } from '@/composables/usePagedList';
import { useCatalogFilter } from '@/composables/useCatalogFilter';
import { useToast } from '@/composables/useToast';
import { useMetaEditor } from '@/composables/useMetaEditor';
import { shortCmd } from '@/utils/metaUtils';
import { YN_FILTER_OPTIONS, YN_EDIT_OPTIONS } from '@/constants/catalogOptions';

import CatalogPage from '@/components/feature/admin/CatalogPage.vue';
import MetaDetailEditor from '@/components/feature/admin/MetaDetailEditor.vue';
import MetaChildGrid from '@/components/feature/admin/MetaChildGrid.vue';

import InSearchField from '@/components/ui/InSearchField.vue';
import InSelect from '@/components/ui/InSelect.vue';
import InButton from '@/components/ui/InButton.vue';
import InTag from '@/components/ui/InTag.vue';
import InModal from '@/components/ui/InModal.vue';

const toast = useToast();

const list = usePagedList({
  fetcher: adminApi.meta.entities.list,
  initialSize: 50,
  initialFilter: { q: '', historyTypeCd: '', logYn: '', unitCd: '' },
  defaultSort: ['entity_nm,asc'],
  syncUrl: true,
});

const { staged, activeFilters, applyFilter, resetFilter, removeFilter } = useCatalogFilter({
  list,
  initial: { q: '', historyTypeCd: '', logYn: '', unitCd: '' },
  chipLabels: { q: '검색', historyTypeCd: 'history', logYn: 'log', unitCd: 'unit' },
});
function onSearch(v) { staged.value.q = v; }
function onLog(v) { staged.value.logYn = v; }


const columns = [
  { field: 'entityNm',     label: '테이블명',  sortable: true, sortKey: 'entity_nm', width: 220 },
  { field: 'displayNm',    label: '한글명',    sortable: true, sortKey: 'display_nm' },
  { field: 'historyTypeCd', label: 'History',  sortable: true, sortKey: 'history_type_cd', align: 'center', width: 100 },
  { field: 'logYn',        label: 'Log',       sortable: true, sortKey: 'log_yn',  align: 'center', width: 60 },
  { field: 'unitCd',       label: 'Unit',      sortable: true, sortKey: 'unit_cd', width: 100 },
  { field: 'columnCount',  label: '컬럼수',    align: 'right', width: 80 },
];

// ── 편집 폼 옵션 ──
const historyEditOptions = [
  { value: '', label: '(없음)' },
  { value: 'master', label: 'master' },
  { value: 'history', label: 'history' },
];

// 컬럼 그리드 config
const colColumns = [
  { key: 'columnNm',        label: '컬럼명',   kind: 'text', placeholder: 'emp_id' },
  { key: 'displayNm',       label: '한글명',   kind: 'text' },
  { key: 'keyYn',           label: 'PK',       kind: 'checkbox' },
  { key: 'useAutoInsertYn', label: '자동입력', kind: 'checkbox' },
  { key: 'useAutoUpdateYn', label: '자동수정', kind: 'checkbox' },
  { key: 'autoInsertValue', label: '입력값',   kind: 'text', width: 120 },
  { key: 'autoUpdateValue', label: '수정값',   kind: 'text', width: 120 },
];
function newCol() {
  return {
    rowStatus: 'I', columnId: null, columnNm: '', displayNm: '', keyYn: 'N',
    useAutoInsertYn: 'N', useAutoUpdateYn: 'N', autoInsertValue: '', autoUpdateValue: '',
    startDateColYn: 'N', endDateColYn: 'N', hkYn: 'N', mappings: [],
  };
}

// 매핑 그리드 config
const mapColumns = [
  { key: 'targetObjectNm',     label: '타깃 오브젝트', kind: 'text', placeholder: 'EMP_MASTER' },
  { key: 'targetColumnNm',     label: '타깃 컬럼',     kind: 'text', placeholder: 'EMP_ID' },
  { key: 'targetObjectTypeCd', label: '유형',          kind: 'text', width: 100, placeholder: '엔터티' },
];
function newMapping() {
  return { rowStatus: 'I', columnMappingId: null, targetObjectNm: '', targetObjectTypeCd: '', targetColumnNm: '' };
}

// ── 편집 상태기계 (공통) ──
const editor = useMetaEditor({
  api: adminApi.meta.entities,
  keyField: 'entityNm',
  domainLabel: '엔터티',
  expand: ['mappings', 'services'],
  defaultTab: 'columns',
  createTab: 'def',
  reload: () => list.reload(),
  blankForm: () => ({
    def: { entityNm: '', displayNm: '', historyTypeCd: 'master', logYn: 'N', note: '', unitCd: '', creatorCd: 'WEB' },
    columns: [],
  }),
  toForm: (detail) => {
    const d = detail.def || {};
    return {
      def: {
        entityNm: d.entityNm, displayNm: d.displayNm, historyTypeCd: d.historyTypeCd || '',
        logYn: d.logYn || 'N', note: d.note || '', unitCd: d.unitCd || '', creatorCd: d.creatorCd || 'WEB',
      },
      columns: (detail.columns || []).map((c) => ({
        rowStatus: '', columnId: c.columnId, columnNm: c.columnNm, displayNm: c.displayNm || '',
        keyYn: c.keyYn || 'N', useAutoInsertYn: c.useAutoInsertYn || 'N', useAutoUpdateYn: c.useAutoUpdateYn || 'N',
        autoInsertValue: c.autoInsertValue || '', autoUpdateValue: c.autoUpdateValue || '',
        startDateColYn: c.startDateColYn || 'N', endDateColYn: c.endDateColYn || 'N', hkYn: c.hkYn || 'N',
        mappings: (c.mappings || []).map((m) => ({
          rowStatus: '', columnMappingId: m.columnMappingId,
          targetObjectNm: m.targetObjectNm || '', targetObjectTypeCd: m.targetObjectTypeCd || '', targetColumnNm: m.targetColumnNm || '',
        })),
      })),
    };
  },
  toPayload: (f) => ({ def: { ...f.def }, columns: f.columns }),
  validate: (f, { setTab }) => {
    const d = f.def;
    if (!d.entityNm || !d.entityNm.trim()) { toast.error?.('테이블명은 필수입니다.'); setTab('def'); return false; }
    if (!d.displayNm || !d.displayNm.trim()) { toast.error?.('한글명은 필수입니다.'); setTab('def'); return false; }
    if (!d.unitCd || !d.unitCd.trim()) { toast.error?.('단위코드(Unit)는 필수입니다.'); setTab('def'); return false; }
    for (const c of (f.columns || []).filter((x) => x.rowStatus !== 'D')) {
      if (!c.columnNm || !c.columnNm.trim()) { toast.error?.('컬럼명이 빈 행이 있습니다.'); setTab('columns'); return false; }
      if (!c.displayNm || !c.displayNm.trim()) { toast.error?.(`컬럼 '${c.columnNm}'의 한글명은 필수입니다.`); setTab('columns'); return false; }
    }
    return true;
  },
});
const {
  mode, selected, detail, detailLoading, drawerTab, saving, confirmDelete, form, isEditing, modalTitle,
  openDetail, openCreate, enterEdit, cancelEdit, closePanel, save, doDelete, copyJson,
} = editor;

// 선택된 컬럼 (매핑 디테일 그리드 대상)
const selectedColumn = ref(null);
function selectColumn(c) { selectedColumn.value = c; }
// 편집 모드 진입/탭 전환 시 선택 초기화 (visibleCols 첫 행 자동 선택)
watch([mode, drawerTab], () => { selectedColumn.value = null; });

const visibleCols = computed(() => (form.value.columns || []).filter((c) => c.rowStatus !== 'D'));

const tabItems = computed(() => {
  const editingCount = visibleCols.value.length;
  const items = [
    { name: 'columns', tabLabel: `컬럼 (${isEditing.value ? editingCount : (detail.value?.columns?.length || 0)})` },
    { name: 'def',     tabLabel: '정의' },
  ];
  if (mode.value !== 'create') items.push({ name: 'usages', tabLabel: `사용처 (${detail.value?.usages?.length || 0})` });
  return items;
});


onMounted(() => list.reload());
</script>

<template>
  <CatalogPage
    title="엔터티 관리"
    :subtitle="`FRM_ENTITY · 운영 ` + (list.total.value || 0).toLocaleString() + `건`"
    :list="list"
    :columns="columns"
    row-key="entityNm"
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
      <div class="e-filters">
        <InSearchField
          :model-value="staged.q"
          label="검색"
          input="테이블명 prefix — 예: PHM_ (Enter 또는 [조회] 버튼)"
          layout="vertical"
          :icon-clickable="false"
          @update:model-value="onSearch"
          @search="applyFilter"
        />
        <InSelect :model-value="staged.logYn" :options="ynOptions" label="Log" input="전체" layout="vertical" size="sm" @update:model-value="onLog" />
        <InButton class="e-filters__search-btn" variant="primary" size="md" :left-icon-show="false" :right-icon-show="false" @click="applyFilter">조회</InButton>
        <InButton class="e-filters__reset-btn" variant="default" size="md" :left-icon-show="false" :right-icon-show="false" @click="resetFilter">초기화</InButton>
      </div>
    </template>

    <template #cell-entityNm="{ value }"><strong>{{ value }}</strong></template>
    <template #cell-logYn="{ value }">
      <InTag v-if="value === 'Y'" label="Y" variant="success" size="sm" />
      <span v-else class="muted">N</span>
    </template>

    <template #drawer>
      <MetaDetailEditor
        :mode="mode"
        :title="modalTitle"
        :loading="detailLoading"
        :saving="saving"
        :tabs="tabItems"
        :active-tab="drawerTab"
        :has-content="mode === 'create' || !!detail"
        :width="1040"
        @update:active-tab="(t) => { drawerTab = t; }"
        @edit="enterEdit"
        @delete="confirmDelete = true"
        @save="save"
        @cancel="cancelEdit"
        @close="closePanel"
        @copy="copyJson(detail)"
      >
        <!-- 컬럼 (+ 선택 컬럼의 매핑) -->
        <section v-if="drawerTab === 'columns'" class="section">
          <!-- 보기 -->
          <ul v-if="mode === 'view'" class="resource-list">
            <li v-for="c in detail.columns" :key="c.columnId" class="col-row">
              <InTag v-if="c.keyYn === 'Y'" label="PK" variant="error" size="sm" />
              <code>{{ c.columnNm }}</code>
              <span class="muted">{{ c.displayNm || '' }}</span>
              <InTag v-if="c.useAutoInsertYn === 'Y'" label="+ins" variant="brand" size="sm" />
              <InTag v-if="c.useAutoUpdateYn === 'Y'" label="+upd" variant="warning" size="sm" />
              <code v-if="c.autoInsertValue" class="auto-val">ins: {{ c.autoInsertValue }}</code>
              <code v-if="c.autoUpdateValue" class="auto-val">upd: {{ c.autoUpdateValue }}</code>
              <details v-if="c.mappings?.length" class="mappings">
                <summary>매핑 {{ c.mappings.length }}건</summary>
                <ul>
                  <li v-for="m in c.mappings" :key="m.columnMappingId">
                    → {{ m.targetObjectNm }}.{{ m.targetColumnNm }} <span class="muted">({{ m.targetObjectTypeCd }})</span>
                  </li>
                </ul>
              </details>
            </li>
            <li v-if="!detail.columns?.length" class="muted">컬럼 없음</li>
          </ul>

          <!-- 편집: 컬럼 그리드(마스터) + 선택 컬럼 매핑 그리드(디테일) -->
          <div v-else>
            <h4 class="grid-title">컬럼</h4>
            <MetaChildGrid
              :rows="form.columns"
              :columns="colColumns"
              key-field="columnId"
              :new-row="newCol"
              selectable
              :selected-row="selectedColumn"
              @row-select="selectColumn"
            />
            <div class="map-section">
              <h4 class="grid-title">
                매핑
                <span v-if="selectedColumn" class="muted">— 컬럼 «{{ selectedColumn.columnNm || '(새 컬럼)' }}»</span>
              </h4>
              <MetaChildGrid
                v-if="selectedColumn"
                :rows="selectedColumn.mappings"
                :columns="mapColumns"
                key-field="columnMappingId"
                :new-row="newMapping"
                add-label="+ 매핑 추가"
                hint="엔터티 컬럼 → 실제 DB 테이블.컬럼 매핑. 저장(MultiSave)이 동작하려면 PK·매핑 필요."
              />
              <p v-else class="muted map-empty">왼쪽 컬럼 그리드에서 ◉ 선택하면 해당 컬럼의 매핑을 편집합니다.</p>
            </div>
          </div>
        </section>

        <!-- 정의 -->
        <section v-else-if="drawerTab === 'def'" class="section">
          <dl v-if="mode === 'view'" class="kv">
            <dt>테이블명</dt><dd>{{ detail.def.entityNm }}</dd>
            <dt>한글명</dt><dd>{{ detail.def.displayNm || '—' }}</dd>
            <dt>History</dt><dd>{{ detail.def.historyTypeCd || '—' }}</dd>
            <dt>Log</dt><dd>{{ detail.def.logYn }}</dd>
            <dt>Unit / Creator</dt><dd>{{ detail.def.unitCd || '—' }} / {{ detail.def.creatorCd || '—' }}</dd>
            <dt>비고</dt><dd>{{ detail.def.note || '—' }}</dd>
          </dl>

          <div v-else class="form-grid">
            <div class="form-row">
              <InTextField
                v-model="form.def.entityNm"
                label="테이블명 (ENTITY_NM)"
                input="예: EN_TST_DEMO"
                layout="vertical"
                :show-required="true"
                :disabled="mode === 'edit'"
              />
              <p v-if="mode === 'edit'" class="hint">테이블명은 업무키라 수정할 수 없습니다.</p>
            </div>
            <InTextField v-model="form.def.displayNm" label="한글명" input="엔터티 설명" layout="vertical" :show-required="true" />
            <InTextField v-model="form.def.unitCd" label="단위코드 (Unit)" input="예: TST" layout="vertical" :show-required="true" />
            <InSelect v-model="form.def.historyTypeCd" :options="historyEditOptions" label="History 유형" layout="vertical" />
            <InSelect v-model="form.def.logYn" :options="YN_EDIT_OPTIONS" label="Log 사용" layout="vertical" />
            <InTextField v-model="form.def.creatorCd" label="Creator 코드" input="기본 WEB" layout="vertical" />
            <InTextField v-model="form.def.note" label="비고" input="(선택)" layout="vertical" />
          </div>
        </section>

        <!-- 사용처 (view) -->
        <section v-else-if="drawerTab === 'usages'" class="section">
          <p class="muted">이 엔터티를 사용하는 서비스 (MultiSaveCommand)</p>
          <ul class="resource-list">
            <li v-for="u in detail.usages" :key="u.svDefId">
              <code>{{ u.svDefNm }}</code>
              <span class="muted">{{ shortCmd(u.cmdClassNm) }}</span>
            </li>
            <li v-if="!detail.usages?.length" class="muted">사용처 없음</li>
          </ul>
        </section>
      </MetaDetailEditor>

      <!-- 삭제 확인 -->
      <InModal
        v-if="confirmDelete"
        :model-value="confirmDelete"
        type="confirm"
        title="엔터티 삭제"
        :message="`'${selected?.entityNm}' 를 삭제할까요? 사용하는 서비스가 있으면 차단됩니다. (컬럼·매핑도 함께 삭제)`"
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
.e-filters { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; }
.e-filters > :deep(.in-sf) { flex: 1 1 320px; min-width: 280px; }
.e-filters > :deep(.in-sel) { flex: 0 0 200px; }
.e-filters__search-btn, .e-filters__reset-btn { flex: 0 0 auto; align-self: flex-end; }
.muted { color: var(--in-text-subtle); }
.section { padding: 12px 4px; }
.kv { display: grid; grid-template-columns: 110px 1fr; gap: 8px 12px; margin: 0; }
.kv dt { color: var(--in-text-subtle); font-size: var(--in-font-size-sm); }
.kv dd { margin: 0; word-break: break-all; }
.form-grid { display: flex; flex-direction: column; gap: 14px; }
.form-row { display: flex; flex-direction: column; gap: 4px; }
.hint { margin: 0; font-size: var(--in-font-size-sm); color: var(--in-text-subtle); }
.grid-title { margin: 0 0 8px; font-size: var(--in-font-size-md); font-weight: var(--in-font-weight-medium); color: var(--in-text-accent); }
.map-section { margin-top: 20px; padding-top: 12px; border-top: 1px dashed var(--in-border-default); }
.map-empty { padding: 12px; text-align: center; }
.resource-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.resource-list li {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  padding: 8px 10px; background: var(--in-bg-default); border-radius: var(--in-radius-xs);
}
.resource-list code { font-family: var(--in-font-family-mono, ui-monospace); font-size: var(--in-font-size-sm); }
.auto-val { background: var(--in-bg-white); padding: 1px 6px; border-radius: var(--in-radius-xxs); border: 1px solid var(--in-border-default); }
.mappings { flex-basis: 100%; margin-top: 6px; }
.mappings summary { cursor: pointer; color: var(--in-text-subtle); font-size: var(--in-font-size-sm); }
.mappings ul { list-style: none; padding: 6px 0 0 16px; margin: 0; }
.mappings li { padding: 2px 0; font-size: var(--in-font-size-sm); }
</style>
