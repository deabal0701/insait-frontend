<script setup>
/**
 * MessageCatalog — IST0030 메시지관리 (admin lane 카탈로그 + 편집 CRUD).
 * ★ (2026-06-03, dspark): GET /api/admin/meta/messages (직접 REST). columns 항상 포함.
 * ★ (2026-06-05, dspark): 편집 CRUD — 우측 Drawer 인라인. 본문 없음(SQL 과 차이).
 * ★ (2026-06-05, dspark): 공통 컴포넌트 추출 리팩터 (99 backlog #8) —
 *   useMetaEditor + MetaDetailEditor + MetaChildGrid(컬럼). MOD_USER_ID 는 백엔드가 JWT 에서 주입.
 */
import { computed, onMounted, ref } from 'vue';
import { adminApi } from '@/services/adminApi';
import { usePagedList } from '@/composables/usePagedList';
import { useCatalogFilter } from '@/composables/useCatalogFilter';
import { useToast } from '@/composables/useToast';
import { useMetaEditor } from '@/composables/useMetaEditor';
import { shortCmd } from '@/utils/metaUtils';
import { MSG_NAME_RE, YN_EDIT_OPTIONS } from '@/constants/catalogOptions';

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
  fetcher: adminApi.meta.messages.list,
  initialSize: 50,
  initialFilter: { q: '', typeCd: '', allowChildYn: '', hasParent: '' },
  defaultSort: ['msg_def_id,asc'],
  syncUrl: true,
});

const { staged, activeFilters, applyFilter, resetFilter, removeFilter } = useCatalogFilter({
  list,
  initial: { q: '', typeCd: '', allowChildYn: '', hasParent: '' },
  chipLabels: { q: '검색', typeCd: 'type', allowChildYn: 'child', hasParent: 'parent' },
});
function onSearch(v) { staged.value.q = v; }
function onType(v) { staged.value.typeCd = v; }
function onParent(v) { staged.value.hasParent = v; }

// ★ (2026-06-08, dspark): #2 정합 — FRM_MSG_DEF.TYPE_CD 도메인은 DEFAULT/TREE 2종 (AS-IS 메뉴얼 03 §3.4).
//   기존 MT/ME 옵션은 'ID 접두사'를 type_cd 로 혼동한 것 → 백엔드 WHERE TYPE_CD='MT' 는 항상 0건이라 제거.
const typeOptions = [
  { value: '',        label: '전체 type' },
  { value: 'DEFAULT', label: 'DEFAULT (평면)' },
  { value: 'TREE',    label: 'TREE (계층)' },
];
const parentOptions = [
  { value: '',  label: '부모 무관' },
  { value: 'Y', label: '자식 메시지' },
  { value: 'N', label: '최상위' },
];


const columns = [
  { field: 'msgDefId',     label: '메시지 ID', sortable: true, sortKey: 'msg_def_id', width: 220 },
  { field: 'msgDefNm',     label: '한글명',   sortable: true, sortKey: 'msg_def_nm' },
  { field: 'typeCd',       label: 'Type',     sortable: true, sortKey: 'type_cd',   align: 'center', width: 80 },
  { field: 'allowChildYn', label: '자식허용', sortable: true, sortKey: 'allow_child_yn', align: 'center', width: 80 },
  { field: 'parentId',     label: '부모',     width: 160 },
  { field: 'columnCount',  label: '컬럼수',   align: 'right', width: 80 },
];

// ── 편집 폼 옵션 ──
// ★ (2026-06-08, dspark): #2 정합 — TYPE_CD 는 DEFAULT(평면)/TREE(계층·마스터디테일). MT/ME 는 메시지 ID 접두라 별개 개념.
const typeEditOptions = [
  { value: 'DEFAULT', label: 'DEFAULT (평면)' },
  { value: 'TREE', label: 'TREE (계층)' },
];

const colColumns = [
  { key: 'orderSeq',    label: '순서',   kind: 'number',   width: 56 },
  { key: 'msgColDefId', label: '컬럼 ID', kind: 'text',     placeholder: 'emp_id' },
  { key: 'typeCd',      label: '타입',   kind: 'text',     width: 96, placeholder: 'string' },
  { key: 'labelCd',     label: '라벨',   kind: 'text',     width: 96 },
  { key: 'formatText',  label: '포맷',   kind: 'text',     width: 96, placeholder: '예: yyyy-MM-dd' },
  { key: 'minLength',   label: '최소',   kind: 'number',   width: 56 },
  { key: 'maxLength',   label: '최대',   kind: 'number',   width: 56 },
  { key: 'mandatoryYn', label: '필수',   kind: 'checkbox' },
  // ★ (2026-06-08, dspark): #1 라벨 정합 — DB 컬럼명과 실제 의미가 반대(AS-IS 메뉴얼 03 §4.3.2, dead code).
  //   USE_ENC_YN = 실제 '사용여부' · USE_YN = 실제 '암호화'. 컬럼명 글자대로 두지 말 것(데이터 오해 누적).
  { key: 'useEncYn',    label: '사용',   kind: 'checkbox' },
  { key: 'useYn',       label: '암호화', kind: 'checkbox' },
];
function newCol(rows) {
  const maxSeq = rows.reduce((m, c) => Math.max(m, c.orderSeq || 0), 0);
  // ★ (2026-06-08, dspark): #1 정합 — useEncYn=실제'사용여부'(신규=Y), useYn=실제'암호화'(신규=N). #5 formatText 추가.
  return { rowStatus: 'I', msgColDefOid: null, msgColDefId: '', orderSeq: maxSeq + 1,
    typeCd: 'string', labelCd: '', formatText: '', minLength: null, maxLength: null, mandatoryYn: 'N', useEncYn: 'Y', useYn: 'N' };
}

// ── 편집 상태기계 (공통) ──
const editor = useMetaEditor({
  api: adminApi.meta.messages,
  keyField: 'msgDefId',
  domainLabel: '메시지',
  expand: ['children', 'services'],
  defaultTab: 'columns',
  createTab: 'def',
  reload: () => list.reload(),
  blankForm: () => ({
    def: { msgDefId: '', msgDefNm: '', typeCd: 'DEFAULT', parentId: '', allowChildYn: 'N', childColId: '', parentColId: '', validator: '', msgClassNm: '', note: '' },
    columns: [],
  }),
  toForm: (detail) => {
    const d = detail.def || {};
    return {
      def: {
        msgDefId: d.msgDefId, msgDefNm: d.msgDefNm, typeCd: d.typeCd || 'DEFAULT',
        parentId: d.parentId || '', allowChildYn: d.allowChildYn || 'N',
        childColId: d.childColId || '', parentColId: d.parentColId || '',
        validator: d.validator || '', msgClassNm: d.msgClassNm || '', note: d.note || '',
      },
      columns: (detail.columns || []).map((c) => ({
        rowStatus: '', msgColDefOid: c.msgColDefOid,
        msgColDefId: c.msgColDefId, orderSeq: c.orderSeq, typeCd: c.typeCd || 'string',
        labelCd: c.labelCd || '', formatText: c.formatText || '', minLength: c.minLength, maxLength: c.maxLength,
        mandatoryYn: c.mandatoryYn || 'N', useEncYn: c.useEncYn || 'N', useYn: c.useYn || 'Y',
      })),
    };
  },
  toPayload: (f) => ({ def: { ...f.def }, columns: f.columns }),
  validate: (f, { setTab }) => {
    const d = f.def;
    if (!d.msgDefId || !d.msgDefId.trim()) { toast.error?.('메시지 ID는 필수입니다.'); setTab('def'); return false; }
    if (!d.msgDefNm || !d.msgDefNm.trim()) { toast.error?.('한글명은 필수입니다.'); setTab('def'); return false; }
    for (const c of (f.columns || []).filter((x) => x.rowStatus !== 'D')) {
      if (!c.msgColDefId || !c.msgColDefId.trim()) { toast.error?.('컬럼 ID가 빈 행이 있습니다.'); setTab('columns'); return false; }
      if (!c.typeCd || !c.typeCd.trim()) { toast.error?.(`컬럼 '${c.msgColDefId}'의 타입은 필수입니다.`); setTab('columns'); return false; }
    }
    return true;
  },
});
const {
  mode, selected, detail, detailLoading, drawerTab, saving, confirmDelete, form, isEditing, modalTitle,
  openDetail, openCreate, enterEdit, cancelEdit, closePanel, save, doDelete,
} = editor;

const namePatternOk = computed(() => MSG_NAME_RE.test((form.value?.def?.msgDefId || '').trim()));

// ★ (2026-06-08, dspark): #3 SQL→컬럼 자동채움 — 등록 SQL 의 출력 컬럼을 컬럼 그리드에 추가.
//   AS-IS [SQL로부터 읽어오기] 이식. describe(비실행) 결과를 신규('I') 행으로 append, 기존 컬럼 ID 는 중복 제외.
const sqlLoadId = ref('');
const sqlLoading = ref(false);

// ★ (2026-06-08, dspark): el-autocomplete 제안 — SQL관리(IST0010) prefix 검색(queries.list q). 잘못된 이름 입력 방지.
async function querySqlSuggestions(queryString, cb) {
  const qs = (queryString || '').trim();
  if (!qs) { cb([]); return; }
  try {
    const res = await adminApi.meta.queries.list({ q: qs, page: 1, size: 10 });
    cb((res?.content || []).map((r) => ({ value: r.queryName, displayName: r.displayName })));
  } catch {
    cb([]);   // 제안 실패는 조용히 — 사용자는 직접 입력 후 [불러오기] 가능
  }
}

async function loadColumnsFromSql() {
  const qid = (sqlLoadId.value || '').trim();
  if (!qid) { toast.warning?.('SQL 이름(쿼리 ID)을 입력하세요.'); return; }
  if (!isEditing.value) { toast.warning?.('편집 모드에서만 컬럼을 불러올 수 있습니다.'); return; }
  sqlLoading.value = true;
  try {
    const cols = await adminApi.meta.queries.describeColumns(qid);
    if (!Array.isArray(cols) || !cols.length) { toast.warning?.('컬럼을 찾지 못했습니다.'); return; }
    const rows = form.value.columns;
    const existing = new Set(rows.filter((c) => c.rowStatus !== 'D').map((c) => (c.msgColDefId || '').toLowerCase()));
    let maxSeq = rows.reduce((m, c) => Math.max(m, c.orderSeq || 0), 0);
    let added = 0, skipped = 0;
    for (const col of cols) {
      const id = (col.name || '').toLowerCase();
      if (!id || existing.has(id)) { skipped += 1; continue; }
      existing.add(id);
      rows.push({
        rowStatus: 'I', msgColDefOid: null,
        msgColDefId: id, orderSeq: (maxSeq += 1),
        typeCd: col.typeCd || 'string', labelCd: col.label || '', formatText: '',
        minLength: null, maxLength: col.length ?? null,
        mandatoryYn: col.nullable ? 'N' : 'Y',
        useEncYn: 'Y', useYn: 'N',   // #1 정합: useEncYn=실제'사용여부'(Y), useYn=실제'암호화'(N)
      });
      added += 1;
    }
    drawerTab.value = 'columns';
    if (added) toast.success?.(`${added}개 컬럼 추가${skipped ? ` (${skipped}개 중복 제외)` : ''}`);
    else toast.warning?.(`추가된 컬럼이 없습니다 (${skipped}개 모두 중복).`);
  } catch (e) {
    toast.error?.(e?.response?.data?.error?.message || e?.message || 'SQL 컬럼 읽기 실패');
  } finally {
    sqlLoading.value = false;
  }
}

const defFields = computed(() => [
  { key: 'msgDefId', type: 'text', label: '메시지 ID', input: '예: MT_TST0009_01', required: true,
    disabled: mode.value === 'edit',
    hint: mode.value === 'edit' ? '메시지 ID는 업무키라 수정할 수 없습니다.'
      : (form.value.def.msgDefId && !namePatternOk.value) ? '권장: MT_<화면7자>_NN (예: MT_TST0009_01)' : undefined },
  { key: 'msgDefNm', type: 'text', label: '한글명', input: '메시지 설명', required: true },
  { key: 'typeCd', type: 'select', label: 'Type', options: typeEditOptions },
  { key: 'allowChildYn', type: 'select', label: '자식 허용', options: YN_EDIT_OPTIONS },
  { key: 'parentId', type: 'text', label: '부모 메시지 ID', input: '자기참조 (선택)' },
  { key: 'childColId', type: 'text', label: 'child col', input: '(선택)' },
  { key: 'parentColId', type: 'text', label: 'parent col', input: '(선택)' },
  { key: 'validator', type: 'text', label: '유효성검사기', input: 'Validator 클래스 FQCN (선택)' },
  { key: 'msgClassNm', type: 'text', label: '메시지클래스', input: 'MSG_CLASS_NM (선택)' },
  { key: 'note', type: 'text', label: '비고', input: '(선택)' },
]);

const tabItems = computed(() => {
  const editingCount = (form.value.columns || []).filter((c) => c.rowStatus !== 'D').length;
  const items = [
    { name: 'columns', tabLabel: `컬럼 (${isEditing.value ? editingCount : (detail.value?.columns?.length || 0)})` },
    { name: 'def',     tabLabel: '정의' },
  ];
  if (mode.value !== 'create') {
    items.push({ name: 'children', tabLabel: `자식 (${detail.value?.children?.length || 0})` });
    items.push({ name: 'usages',   tabLabel: `사용처 (${detail.value?.usages?.length || 0})` });
  }
  return items;
});


onMounted(() => list.reload());
</script>

<template>
  <CatalogPage
    title="메시지 관리"
    :subtitle="`FRM_MSG_DEF · 운영 ` + (list.total.value || 0).toLocaleString() + `건`"
    :list="list"
    :columns="columns"
    row-key="msgDefId"
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
      <div class="m-filters">
        <InSearchField
          :model-value="staged.q"
          label="검색"
          input="메시지 ID prefix — 예: MT_IST0050 (Enter 또는 [조회] 버튼)"
          layout="vertical"
          :icon-clickable="false"
          @update:model-value="onSearch"
          @search="applyFilter"
        />
        <InSelect :model-value="staged.typeCd" :options="typeOptions" label="Type" input="전체" layout="vertical" size="sm" @update:model-value="onType" />
        <InSelect :model-value="staged.hasParent" :options="parentOptions" label="부모" input="전체" layout="vertical" size="sm" @update:model-value="onParent" />
        <InButton class="m-filters__search-btn" variant="primary" size="md" :left-icon-show="false" :right-icon-show="false" @click="applyFilter">조회</InButton>
        <InButton class="m-filters__reset-btn" variant="default" size="md" :left-icon-show="false" :right-icon-show="false" @click="resetFilter">초기화</InButton>
      </div>
    </template>

    <template #cell-msgDefId="{ value }"><strong>{{ value }}</strong></template>
    <template #cell-typeCd="{ value }">
      <InTag :label="value" :variant="value === 'TREE' ? 'brand' : 'default'" size="sm" />
    </template>
    <template #cell-allowChildYn="{ value }">
      <span :class="value === 'Y' ? '' : 'muted'">{{ value || '—' }}</span>
    </template>
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
        :width="980"
        @update:active-tab="(t) => { drawerTab = t; }"
        @edit="enterEdit"
        @delete="confirmDelete = true"
        @save="save"
        @cancel="cancelEdit"
        @close="closePanel"
      >
        <!-- 컬럼 -->
        <section v-if="drawerTab === 'columns'" class="section">
          <ul v-if="mode === 'view'" class="resource-list">
            <li v-for="c in detail.columns" :key="c.msgColDefOid" class="col-row">
              <span class="seq">{{ c.orderSeq }}</span>
              <code>{{ c.msgColDefId }}</code>
              <InTag :label="c.typeCd" size="sm" />
              <span v-if="c.mandatoryYn === 'Y'" class="req">필수</span>
              <InTag v-if="c.useYn === 'Y'" label="암호화" variant="warning" size="sm" />
              <span class="muted">len: {{ c.minLength ?? '?' }}~{{ c.maxLength ?? '?' }}</span>
              <span v-if="c.labelCd" class="muted">label: {{ c.labelCd }}</span>
              <InTag v-if="c.useEncYn !== 'Y'" label="미사용" variant="default" size="sm" />
            </li>
            <li v-if="!detail.columns?.length" class="muted">컬럼 없음</li>
          </ul>
          <template v-else>
            <!-- ★ (2026-06-08, dspark): #3 [SQL에서 컬럼 읽기] — 등록 SQL 출력 컬럼 자동 채움 (AS-IS [SQL로부터 읽어오기] 이식)
                 ★ (2026-06-08, dspark): SQL관리(IST0010) prefix 검색 자동완성 — 잘못된 이름(404) 혼동 방지. queries.list(q) 재사용 -->
            <div class="sql-load">
              <div class="sql-load__field">
                <label class="sql-load__label">SQL 에서 컬럼 읽기</label>
                <el-autocomplete
                  v-model="sqlLoadId"
                  class="sql-load__ac"
                  :fetch-suggestions="querySqlSuggestions"
                  :trigger-on-focus="false"
                  clearable
                  placeholder="SQL관리에 등록된 쿼리 이름 — 입력 시 자동완성 (예: ACM0010_00_R01)"
                  @select="(it) => { sqlLoadId = it.value; loadColumnsFromSql(); }"
                  @keyup.enter="loadColumnsFromSql"
                >
                  <template #default="{ item }">
                    <div class="sql-ac-item">
                      <span class="sql-ac-item__name">{{ item.value }}</span>
                      <span v-if="item.displayName" class="sql-ac-item__desc">{{ item.displayName }}</span>
                    </div>
                  </template>
                </el-autocomplete>
              </div>
              <InButton
                class="sql-load__btn"
                variant="default" size="md"
                :left-icon-show="false" :right-icon-show="false"
                :disabled="sqlLoading"
                @click="loadColumnsFromSql"
              >{{ sqlLoading ? '읽는 중…' : '불러오기' }}</InButton>
            </div>
            <p class="sql-load__hint">
              SQL관리(IST0010)에 등록된 쿼리의 출력 컬럼을 가져옵니다. 메시지 ID·서비스 ID 가 아니라
              <strong>SQL 쿼리 이름</strong>을 입력하세요 (없는 이름은 “찾을 수 없음”).
            </p>
            <MetaChildGrid
              :rows="form.columns"
              :columns="colColumns"
              key-field="msgColDefOid"
              :new-row="newCol"
              hint="타입: string / numeric / date / clob (또는 value-type MT_*). 개인정보 컬럼은 암호화 체크."
            />
          </template>
        </section>

        <!-- 정의 -->
        <section v-else-if="drawerTab === 'def'" class="section">
          <dl v-if="mode === 'view'" class="kv">
            <dt>메시지 ID</dt><dd>{{ detail.def.msgDefId }}</dd>
            <dt>한글명</dt><dd>{{ detail.def.msgDefNm || '—' }}</dd>
            <dt>Type</dt><dd>{{ detail.def.typeCd }}</dd>
            <dt>부모</dt><dd>{{ detail.def.parentId || '—' }}</dd>
            <dt>자식허용</dt><dd>{{ detail.def.allowChildYn }}</dd>
            <dt>child/parent col</dt><dd>{{ detail.def.childColId || '—' }} / {{ detail.def.parentColId || '—' }}</dd>
            <dt>유효성검사기</dt><dd>{{ detail.def.validator || '—' }}</dd>
            <dt>메시지클래스</dt><dd>{{ detail.def.msgClassNm || '—' }}</dd>
            <dt>비고</dt><dd>{{ detail.def.note || '—' }}</dd>
          </dl>

          <MetaDefForm v-else :model="form.def" :fields="defFields" />
        </section>

        <!-- 자식 (view) -->
        <section v-else-if="drawerTab === 'children'" class="section">
          <ul class="resource-list">
            <li v-for="ch in detail.children" :key="ch.msgDefOid">
              <code>{{ ch.msgDefId }}</code>
              <span class="muted">{{ ch.msgDefNm }}</span>
              <span class="muted">{{ ch.columnCount }}col</span>
            </li>
            <li v-if="!detail.children?.length" class="muted">자식 없음</li>
          </ul>
        </section>

        <!-- 사용처 (view) -->
        <section v-else-if="drawerTab === 'usages'" class="section">
          <p class="muted">이 메시지를 사용하는 서비스</p>
          <ul class="resource-list">
            <li v-for="u in detail.usages" :key="u.svDefId + '-' + u.usage">
              <InTag :label="u.usage" variant="brand" size="sm" />
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
        title="메시지 삭제"
        :message="`'${selected?.msgDefId}' 를 삭제할까요? 사용하는 서비스나 자식 메시지가 있으면 차단됩니다.`"
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
.m-filters { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; }
.m-filters > :deep(.in-sf) { flex: 1 1 320px; min-width: 280px; }
.m-filters > :deep(.in-sel) { flex: 0 0 200px; }
.m-filters__search-btn, .m-filters__reset-btn { flex: 0 0 auto; align-self: flex-end; }
.muted { color: var(--in-text-subtle); }
.section { padding: 12px 4px; }
.sql-load { display: flex; gap: 8px; align-items: flex-end; }
.sql-load__field { flex: 1 1 auto; min-width: 0; }
.sql-load__label { display: block; font-size: var(--in-font-size-sm); color: var(--in-text-subtle); margin-bottom: 4px; }
.sql-load__ac { width: 100%; display: block; }
.sql-load__ac :deep(.el-input) { width: 100%; }
.sql-load__btn { flex: 0 0 auto; align-self: flex-end; }
.sql-load__hint { margin: 6px 0 12px; font-size: var(--in-font-size-sm); color: var(--in-text-subtle); }
.sql-ac-item { display: flex; flex-direction: column; line-height: 1.3; padding: 2px 0; }
.sql-ac-item__name { font-weight: var(--in-font-weight-medium); }
.sql-ac-item__desc { font-size: var(--in-font-size-sm); color: var(--in-text-subtle); }
.kv { display: grid; grid-template-columns: 130px 1fr; gap: 8px 12px; margin: 0; }
.kv dt { color: var(--in-text-subtle); font-size: var(--in-font-size-sm); }
.kv dd { margin: 0; word-break: break-all; }
.form-grid { display: flex; flex-direction: column; gap: 14px; }
.form-row { display: flex; flex-direction: column; gap: 4px; }
.hint { margin: 6px 0 0; font-size: var(--in-font-size-sm); color: var(--in-text-subtle); }
.resource-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.resource-list li {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  padding: 8px 10px; background: var(--in-bg-default); border-radius: var(--in-radius-xs);
}
.resource-list code { font-family: var(--in-font-family-mono, ui-monospace); font-size: var(--in-font-size-sm); }
.col-row .seq { display: inline-block; min-width: 24px; text-align: right; color: var(--in-text-subtle); font-size: var(--in-font-size-sm); }
.col-row .req { color: var(--in-text-error); font-size: var(--in-font-size-sm); }
</style>
