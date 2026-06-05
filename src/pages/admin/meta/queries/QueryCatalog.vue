<script setup>
/**
 * QueryCatalog — IST0010 SQL관리 (admin lane 카탈로그 + 편집 CRUD).
 * ★ (2026-06-03, dspark): GET /api/admin/meta/queries (직접 REST). 상세 expand=body,params,services.
 * ★ (2026-06-05, dspark): 편집 CRUD — 우측 Drawer 인라인.
 * ★ (2026-06-05, dspark): 공통 컴포넌트 추출 리팩터 (99 backlog #8) —
 *   useMetaEditor(상태기계) + MetaDetailEditor(모달/탭/푸터) + MetaChildGrid(파라미터) + MetaCodeEditor(본문).
 */
import { computed, onMounted } from 'vue';
import { adminApi } from '@/services/adminApi';
import { usePagedList } from '@/composables/usePagedList';
import { useCatalogFilter } from '@/composables/useCatalogFilter';
import { useToast } from '@/composables/useToast';
import { useMetaEditor } from '@/composables/useMetaEditor';
import { shortCmd } from '@/utils/metaUtils';
import { SQL_NAME_RE, YN_FILTER_OPTIONS } from '@/constants/catalogOptions';

import CatalogPage from '@/components/feature/admin/CatalogPage.vue';
import MetaDetailEditor from '@/components/feature/admin/MetaDetailEditor.vue';
import MetaChildGrid from '@/components/feature/admin/MetaChildGrid.vue';
import MetaCodeEditor from '@/components/feature/admin/MetaCodeEditor.vue';

import InSearchField from '@/components/ui/InSearchField.vue';
import InSelect from '@/components/ui/InSelect.vue';
import InButton from '@/components/ui/InButton.vue';
import InTextField from '@/components/ui/InTextField.vue';
import InTag from '@/components/ui/InTag.vue';
import InModal from '@/components/ui/InModal.vue';

const toast = useToast();

const list = usePagedList({
  fetcher: adminApi.meta.queries.list,
  initialSize: 50,
  initialFilter: { q: '', dataSource: '', useYn: '', status: '' },
  defaultSort: ['query_name,asc'],
  syncUrl: true,
});

const { staged, activeFilters, applyFilter, resetFilter, removeFilter } = useCatalogFilter({
  list,
  initial: { q: '', dataSource: '', useYn: '', status: '' },
  chipLabels: { q: '검색', dataSource: 'DS', useYn: 'use', status: 'status' },
});
function onSearch(v) { staged.value.q = v; }
function onDs(v) { staged.value.dataSource = v; }
function onUseYn(v) { staged.value.useYn = v; }


const columns = [
  { field: 'queryName',   label: 'SQL 이름', sortable: true, sortKey: 'query_name', width: 260 },
  { field: 'displayName', label: '한글명',   sortable: true, sortKey: 'display_name' },
  { field: 'dataSource',  label: 'DataSource', sortable: true, sortKey: 'data_source', width: 140 },
  { field: 'useYn',       label: 'Use',      sortable: true, sortKey: 'use_yn',  align: 'center', width: 60 },
  { field: 'status',      label: 'Status',   sortable: true, sortKey: 'status',  align: 'center', width: 100 },
  { field: 'version',     label: 'Ver',      sortable: true, sortKey: 'version', align: 'center', width: 60 },
];

// ── 편집 폼 옵션 ──
const dsOptions = [{ value: 'jdbc/h5prd', label: 'jdbc/h5prd' }];
const statusOptions = [
  { value: 'NAME', label: '이름바인딩 (NAME)' },
  { value: 'ADDR', label: '주소바인딩 (ADDR)' },
];
const useYnEditOptions = [{ value: 'Y', label: 'Y (사용)' }, { value: 'N', label: 'N (미사용)' }];

const paramColumns = [
  { key: 'queryParamSeq',       label: '순서',     kind: 'number', width: 56 },
  { key: 'queryParamName',      label: '파라미터명', kind: 'text',   placeholder: 'company_cd' },
  { key: 'queryParamType',      label: '타입',     kind: 'text',   width: 110, placeholder: '문자' },
  { key: 'queryParamInoutType', label: 'IN/OUT',   kind: 'select', width: 96,
    options: [{ value: 'IN', label: 'IN' }, { value: 'OUT', label: 'OUT' }, { value: 'INOUT', label: 'INOUT' }] },
];
function newParam(rows) {
  const maxSeq = rows.reduce((m, p) => Math.max(m, p.queryParamSeq || 0), 0);
  return { rowStatus: 'I', queryParamId: null, queryParamName: '', queryParamSeq: maxSeq + 1, queryParamType: '문자', queryParamInoutType: 'IN' };
}

// ── 편집 상태기계 (공통) ──
const editor = useMetaEditor({
  api: adminApi.meta.queries,
  keyField: 'queryName',
  domainLabel: 'SQL',
  expand: ['body', 'params', 'services'],
  defaultTab: 'def',
  reload: () => list.reload(),
  blankForm: () => ({
    def: { queryName: '', displayName: '', dataSource: 'jdbc/h5prd', useYn: 'Y', status: 'NAME', version: '', note: '' },
    body: '',
    params: [],
  }),
  toForm: (detail) => {
    const d = detail.def || {};
    return {
      def: {
        queryName: d.queryName, displayName: d.displayName, dataSource: d.dataSource || 'jdbc/h5prd',
        useYn: d.useYn || 'Y', status: d.status || 'NAME', version: d.version || '', note: d.note || '',
        bizAuthYn: d.bizAuthYn, orgAuthYn: d.orgAuthYn, decorators: d.decorators, companyCd: d.companyCd,
      },
      body: detail.body || '',
      params: (detail.params || []).map((p) => ({
        rowStatus: '', queryParamId: p.queryParamId,
        queryParamName: p.queryParamName, queryParamSeq: p.queryParamSeq,
        queryParamType: p.queryParamType, queryParamInoutType: p.queryParamInoutType || 'IN',
      })),
    };
  },
  toPayload: (f) => ({ def: { ...f.def }, body: f.body, params: f.params }),
  validate: (f, { mode, setTab }) => {
    const d = f.def;
    if (!d.displayName || !d.displayName.trim()) { toast.error?.('한글명(화면표시명)은 필수입니다.'); setTab('def'); return false; }
    if (!d.dataSource || !d.dataSource.trim()) { toast.error?.('DataSource는 필수입니다.'); setTab('def'); return false; }
    if (mode === 'create' && !SQL_NAME_RE.test((d.queryName || '').trim())) {
      toast.error?.('SQL 이름은 7-char 컨벤션을 따라야 합니다 (예: TST0009_00_R01).'); setTab('def'); return false;
    }
    return true;
  },
});
const {
  mode, selected, detail, detailLoading, drawerTab, saving, confirmDelete, form, isEditing, modalTitle,
  openDetail, openCreate, enterEdit, cancelEdit, closePanel, save, doDelete, copyJson,
} = editor;

const namePatternOk = computed(() => SQL_NAME_RE.test((form.value?.def?.queryName || '').trim()));

const tabItems = computed(() => {
  const editingCount = (form.value.params || []).filter((p) => p.rowStatus !== 'D').length;
  const items = [
    { name: 'def',    tabLabel: '정의' },
    { name: 'body',   tabLabel: 'SQL 본문' },
    { name: 'params', tabLabel: `파라미터 (${isEditing.value ? editingCount : (detail.value?.params?.length || 0)})` },
  ];
  if (mode.value !== 'create') items.push({ name: 'usages', tabLabel: `사용처 (${detail.value?.usages?.length || 0})` });
  return items;
});


onMounted(() => list.reload());
</script>

<template>
  <CatalogPage
    title="SQL 관리"
    :subtitle="`FRM_QUERY_DEF · 운영 ` + (list.total.value || 0).toLocaleString() + `건`"
    :list="list"
    :columns="columns"
    row-key="queryName"
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
          input="SQL 이름 prefix — 예: IST0050 (Enter 또는 [조회] 버튼)"
          layout="vertical"
          :icon-clickable="false"
          @update:model-value="onSearch"
          @search="applyFilter"
        />
        <InSelect
          :model-value="staged.dataSource"
          :options="[{value:'',label:'전체 DS'}, {value:'jdbc/h5prd',label:'jdbc/h5prd'}]"
          label="DataSource"
          input="전체"
          layout="vertical"
          size="sm"
          @update:model-value="onDs"
        />
        <InSelect
          :model-value="staged.useYn"
          :options="YN_FILTER_OPTIONS"
          label="Use"
          input="전체"
          layout="vertical"
          size="sm"
          @update:model-value="onUseYn"
        />
        <InButton class="q-filters__search-btn" variant="primary" size="md" :left-icon-show="false" :right-icon-show="false" @click="applyFilter">조회</InButton>
        <InButton class="q-filters__reset-btn" variant="default" size="md" :left-icon-show="false" :right-icon-show="false" @click="resetFilter">초기화</InButton>
      </div>
    </template>

    <template #cell-queryName="{ value }"><strong>{{ value }}</strong></template>
    <template #cell-useYn="{ value }">
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
        :width="900"
        @update:active-tab="(t) => { drawerTab = t; }"
        @edit="enterEdit"
        @delete="confirmDelete = true"
        @save="save"
        @cancel="cancelEdit"
        @close="closePanel"
        @copy="copyJson(detail)"
      >
        <!-- 정의 -->
        <section v-if="drawerTab === 'def'" class="section">
          <dl v-if="mode === 'view'" class="kv">
            <dt>SQL 이름</dt><dd>{{ detail.def.queryName }}</dd>
            <dt>한글명</dt><dd>{{ detail.def.displayName || '—' }}</dd>
            <dt>DataSource</dt><dd>{{ detail.def.dataSource }}</dd>
            <dt>use / status / ver</dt>
            <dd>{{ detail.def.useYn }} / {{ detail.def.status }} / {{ detail.def.version || '—' }}</dd>
            <dt>비고</dt><dd>{{ detail.def.note || '—' }}</dd>
            <dt>권한</dt><dd>biz: {{ detail.def.bizAuthYn || '—' }} · org: {{ detail.def.orgAuthYn || '—' }}</dd>
            <dt>decorators</dt><dd>{{ detail.def.decorators || '—' }}</dd>
          </dl>

          <div v-else class="form-grid">
            <div class="form-row">
              <InTextField
                v-model="form.def.queryName"
                label="SQL 이름"
                input="예: TST0009_00_R01"
                layout="vertical"
                :show-required="true"
                :disabled="mode === 'edit'"
                :status="mode === 'create' && form.def.queryName && !namePatternOk ? 'error' : 'default'"
                :message="mode === 'create' && form.def.queryName && !namePatternOk ? '7-char 컨벤션: 앞 7자 + _ + 나머지 (예: TST0009_00_R01)' : undefined"
              />
              <p v-if="mode === 'edit'" class="hint">SQL 이름은 서비스 자동바인딩 키라 수정할 수 없습니다.</p>
            </div>
            <InTextField v-model="form.def.displayName" label="한글명" input="화면표시명" layout="vertical" :show-required="true" />
            <InSelect v-model="form.def.dataSource" :options="dsOptions" label="DataSource" layout="vertical" :show-required="true" />
            <InSelect v-model="form.def.status" :options="statusOptions" label="바인딩 상태" layout="vertical" />
            <InSelect v-model="form.def.useYn" :options="useYnEditOptions" label="사용여부" layout="vertical" />
            <InTextField v-model="form.def.version" label="버전" input="예: 1" layout="vertical" />
            <InTextField v-model="form.def.note" label="비고" input="설명 (선택)" layout="vertical" />
          </div>
        </section>

        <!-- SQL 본문 -->
        <section v-else-if="drawerTab === 'body'" class="section">
          <pre v-if="mode === 'view'" class="body">{{ detail.body || '본문 없음' }}</pre>
          <MetaCodeEditor v-else v-model="form.body" placeholder="SELECT ... FROM ... WHERE col = :param" />
        </section>

        <!-- 파라미터 -->
        <section v-else-if="drawerTab === 'params'" class="section">
          <ul v-if="mode === 'view'" class="resource-list">
            <li v-for="p in detail.params" :key="p.queryParamId">
              <InTag :label="p.queryParamInoutType" size="sm" />
              <code>:{{ p.queryParamName }}</code>
              <span class="muted">type: {{ p.queryParamType }}</span>
              <span class="muted">seq: {{ p.queryParamSeq }}</span>
            </li>
            <li v-if="!detail.params?.length" class="muted">파라미터 없음</li>
          </ul>
          <MetaChildGrid v-else :rows="form.params" :columns="paramColumns" key-field="queryParamId" :new-row="newParam" />
        </section>

        <!-- 사용처 -->
        <section v-else-if="drawerTab === 'usages'" class="section">
          <p class="muted">이 SQL 을 호출하는 서비스 (FRM_SERVICE_FUNC_MAP 역방향)</p>
          <ul class="resource-list">
            <li v-for="u in detail.usages" :key="u.svDefId">
              <InTag :label="u.svMapTypeCd" variant="brand" size="sm" />
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
        title="SQL 삭제"
        :message="`'${selected?.queryName}' 를 삭제할까요? 이 SQL 을 호출하는 서비스가 있으면 차단됩니다.`"
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
.form-grid { display: flex; flex-direction: column; gap: 14px; }
.form-row { display: flex; flex-direction: column; gap: 4px; }
.hint { margin: 0; font-size: var(--in-font-size-sm); color: var(--in-text-subtle); }
.body {
  margin: 0; padding: 12px;
  background: var(--in-bg-default); border-radius: var(--in-radius-xs);
  font-family: var(--in-font-family-mono, ui-monospace);
  font-size: var(--in-font-size-sm); line-height: var(--in-line-height-sm);
  color: var(--in-text-accent); white-space: pre-wrap; word-break: break-all;
  max-height: 60vh; overflow: auto;
}
.resource-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.resource-list li {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  padding: 8px 10px; background: var(--in-bg-default); border-radius: var(--in-radius-xs);
}
.resource-list code { font-family: var(--in-font-family-mono, ui-monospace); font-size: var(--in-font-size-sm); color: var(--in-text-default); }
</style>
