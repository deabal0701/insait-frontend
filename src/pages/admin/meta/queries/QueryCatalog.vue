<script setup>
/**
 * QueryCatalog — IST0010 SQL관리 (admin lane 카탈로그).
 * ★ (2026-06-03, dspark): GET /api/admin/meta/queries (직접 REST).
 *   상세 확장: ?expand=body,params,services — 본문/파라미터/역방향(이 SQL 호출 서비스).
 * ★ (2026-06-05, dspark): Phase 1 편집 CRUD — 우측 Drawer 인라인 편집 (신규/수정/삭제).
 *   부모(def)+본문(body)+자식(params) 단일 호출 저장. params 는 rowStatus I/U/D 차등.
 *   백엔드: com.win.insait.admin.meta.sql (POST/PUT/DELETE/{name}/exists).
 *   첫 도메인이라 편집 로직을 본 페이지에 인라인 — 도메인 #2(메시지) 진입 시 공통 컴포넌트로 추출 예정.
 */
import { computed, onMounted, ref } from 'vue';
import { adminApi } from '@/services/adminApi';
import { usePagedList } from '@/composables/usePagedList';
import { useCatalogFilter } from '@/composables/useCatalogFilter';
import { useToast } from '@/composables/useToast';

import CatalogPage from '@/components/feature/admin/CatalogPage.vue';

import InSearchField from '@/components/ui/InSearchField.vue';
import InSelect from '@/components/ui/InSelect.vue';
import InButton from '@/components/ui/InButton.vue';
import InTextField from '@/components/ui/InTextField.vue';
import InTag from '@/components/ui/InTag.vue';
import InModal from '@/components/ui/InModal.vue';
import InTabs from '@/components/ui/InTabs.vue';

const toast = useToast();

const list = usePagedList({
  fetcher: adminApi.meta.queries.list,
  initialSize: 50,
  initialFilter: { q: '', dataSource: '', useYn: '', status: '' },
  defaultSort: ['query_name,asc'],
  syncUrl: true,
});

const { staged, applyFilter, resetFilter, removeFilter } = useCatalogFilter({
  list,
  initial: { q: '', dataSource: '', useYn: '', status: '' },
});
function onSearch(v) { staged.value.q = v; }
function onDs(v) { staged.value.dataSource = v; }
function onUseYn(v) { staged.value.useYn = v; }

const ynOptions = [
  { value: '',  label: '전체' },
  { value: 'Y', label: 'Y' },
  { value: 'N', label: 'N' },
];

const activeFilters = computed(() => {
  const f = list.filter.value;
  const out = [];
  if (f.q) out.push({ key: 'q', label: `검색: ${f.q}` });
  if (f.dataSource) out.push({ key: 'dataSource', label: `DS: ${f.dataSource}` });
  if (f.useYn) out.push({ key: 'useYn', label: `use: ${f.useYn}` });
  if (f.status) out.push({ key: 'status', label: `status: ${f.status}` });
  return out;
});

const columns = [
  { field: 'queryName',   label: 'SQL 이름', sortable: true, sortKey: 'query_name', width: 260 },
  { field: 'displayName', label: '한글명',   sortable: true, sortKey: 'display_name' },
  { field: 'dataSource',  label: 'DataSource', sortable: true, sortKey: 'data_source', width: 140 },
  { field: 'useYn',       label: 'Use',      sortable: true, sortKey: 'use_yn',  align: 'center', width: 60 },
  { field: 'status',      label: 'Status',   sortable: true, sortKey: 'status',  align: 'center', width: 100 },
  { field: 'version',     label: 'Ver',      sortable: true, sortKey: 'version', align: 'center', width: 60 },
];

// ─────────────────────────────── 상세/편집 상태 ───────────────────────────────
// mode: '' 닫힘 | 'view' 보기 | 'create' 신규 | 'edit' 수정
const mode = ref('');
const selected = ref(null);          // 현재 보기/수정 중인 행 (catalog 하이라이트)
const detail = ref(null);            // QueryDetailResponse
const detailLoading = ref(false);
const drawerTab = ref('def');
const saving = ref(false);
const confirmDelete = ref(false);
const form = ref(blankForm());

const isEditing = computed(() => mode.value === 'create' || mode.value === 'edit');
const visibleParams = computed(() => (form.value.params || []).filter((p) => p.rowStatus !== 'D'));

const dsOptions = [{ value: 'jdbc/h5prd', label: 'jdbc/h5prd' }];
const statusOptions = [
  { value: 'NAME', label: '이름바인딩 (NAME)' },
  { value: 'ADDR', label: '주소바인딩 (ADDR)' },
];
const useYnEditOptions = [{ value: 'Y', label: 'Y (사용)' }, { value: 'N', label: 'N (미사용)' }];
const inoutOptions = [{ value: 'IN', label: 'IN' }, { value: 'OUT', label: 'OUT' }, { value: 'INOUT', label: 'INOUT' }];

// 7-char 컨벤션: 앞 7자(화면 ID) + '_' + 나머지 (예: TST0009_00_R01)
const NAME_RE = /^[A-Za-z0-9]{7}_[A-Za-z0-9_]+$/;
const namePatternOk = computed(() => NAME_RE.test((form.value?.def?.queryName || '').trim()));

const tabItems = computed(() => {
  const items = [
    { name: 'def',    tabLabel: '정의' },
    { name: 'body',   tabLabel: 'SQL 본문' },
    { name: 'params', tabLabel: `파라미터 (${isEditing.value ? visibleParams.value.length : (detail.value?.params?.length || 0)})` },
  ];
  if (mode.value !== 'create') {
    items.push({ name: 'usages', tabLabel: `사용처 (${detail.value?.usages?.length || 0})` });
  }
  return items;
});

const modalTitle = computed(() => {
  if (mode.value === 'create') return 'SQL 신규 등록';
  if (mode.value === 'edit')   return `SQL 수정 — ${selected.value?.queryName}`;
  return `SQL 상세 — ${selected.value?.queryName}`;
});

function blankForm() {
  return {
    def: { queryName: '', displayName: '', dataSource: 'jdbc/h5prd', useYn: 'Y', status: 'NAME', version: '', note: '' },
    body: '',
    params: [],
  };
}

function adminErrMsg(e) {
  return e?.response?.data?.error?.message || e?.message || '요청 실패';
}

async function openDetail(row) {
  selected.value = row;
  detail.value = null;
  mode.value = 'view';
  drawerTab.value = 'def';
  detailLoading.value = true;
  try {
    detail.value = await adminApi.meta.queries.detail(row.queryName, { expand: ['body', 'params', 'services'] });
  } catch (e) {
    toast.error?.(adminErrMsg(e));
  } finally {
    detailLoading.value = false;
  }
}

function openCreate() {
  selected.value = null;
  detail.value = null;
  form.value = blankForm();
  drawerTab.value = 'def';
  mode.value = 'create';
}

function enterEdit() {
  if (!detail.value) return;
  const d = detail.value.def || {};
  form.value = {
    def: {
      queryName: d.queryName, displayName: d.displayName, dataSource: d.dataSource || 'jdbc/h5prd',
      useYn: d.useYn || 'Y', status: d.status || 'NAME', version: d.version || '', note: d.note || '',
      bizAuthYn: d.bizAuthYn, orgAuthYn: d.orgAuthYn, decorators: d.decorators, companyCd: d.companyCd,
    },
    body: detail.value.body || '',
    params: (detail.value.params || []).map((p) => ({
      rowStatus: '', queryParamId: p.queryParamId,
      queryParamName: p.queryParamName, queryParamSeq: p.queryParamSeq,
      queryParamType: p.queryParamType, queryParamInoutType: p.queryParamInoutType || 'IN',
    })),
  };
  drawerTab.value = 'def';
  mode.value = 'edit';
}

function cancelEdit() {
  if (mode.value === 'edit') {
    mode.value = 'view';   // 폼 폐기, 보기 복귀 (detail 은 이미 로드됨)
    drawerTab.value = 'def';
  } else {
    closePanel();          // create 취소 → 닫기
  }
}

function closePanel() {
  mode.value = '';
  selected.value = null;
  detail.value = null;
}

// ── 파라미터 인라인 편집 (rowStatus I/U/D) ──
function touchParam(p) { if (p.rowStatus !== 'I') p.rowStatus = 'U'; }
function addParam() {
  const maxSeq = form.value.params.reduce((m, p) => Math.max(m, p.queryParamSeq || 0), 0);
  form.value.params.push({
    rowStatus: 'I', queryParamId: null, queryParamName: '',
    queryParamSeq: maxSeq + 1, queryParamType: '문자', queryParamInoutType: 'IN',
  });
}
function removeParam(p) {
  const idx = form.value.params.indexOf(p);
  if (idx < 0) return;
  if (p.rowStatus === 'I') form.value.params.splice(idx, 1);  // 신규행은 즉시 제거
  else p.rowStatus = 'D';                                     // 기존행은 D 마크 (저장 시 DELETE)
}

async function save() {
  const d = form.value.def;
  if (!d.displayName || !d.displayName.trim()) { toast.error?.('한글명(화면표시명)은 필수입니다.'); drawerTab.value = 'def'; return; }
  if (!d.dataSource || !d.dataSource.trim()) { toast.error?.('DataSource는 필수입니다.'); drawerTab.value = 'def'; return; }
  if (mode.value === 'create' && !namePatternOk.value) {
    toast.error?.('SQL 이름은 7-char 컨벤션을 따라야 합니다 (예: TST0009_00_R01).');
    drawerTab.value = 'def';
    return;
  }
  saving.value = true;
  try {
    const payload = { def: { ...d }, body: form.value.body, params: form.value.params };
    let saved;
    if (mode.value === 'create') {
      saved = await adminApi.meta.queries.create(payload);
      toast.success?.('등록되었습니다.');
    } else {
      saved = await adminApi.meta.queries.update(selected.value.queryName, payload);
      toast.success?.('수정되었습니다.');
    }
    await list.reload();
    // 저장 결과(QueryDetailResponse)로 보기 모드 복귀
    selected.value = saved.def;
    detail.value = saved;
    mode.value = 'view';
    drawerTab.value = 'def';
  } catch (e) {
    toast.error?.(adminErrMsg(e));
  } finally {
    saving.value = false;
  }
}

async function doDelete() {
  saving.value = true;
  try {
    await adminApi.meta.queries.remove(selected.value.queryName);
    toast.success?.('삭제되었습니다.');
    confirmDelete.value = false;
    closePanel();
    await list.reload();
  } catch (e) {
    confirmDelete.value = false;
    toast.error?.(adminErrMsg(e));
  } finally {
    saving.value = false;
  }
}

function shortCmd(fqcn) { return fqcn ? fqcn.split('.').pop() : ''; }
function copyJson(obj) {
  navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
  toast.success?.('JSON 복사됨');
}

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
          :options="ynOptions"
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

    <template #cell-queryName="{ value }">
      <strong>{{ value }}</strong>
    </template>
    <template #cell-useYn="{ value }">
      <InTag v-if="value === 'Y'" label="Y" variant="success" size="sm" />
      <span v-else class="muted">N</span>
    </template>

    <template #drawer>
      <InModal
        v-if="mode"
        :model-value="!!mode"
        :title="modalTitle"
        type="detail"
        :width="900"
        :close-on-overlay="!isEditing"
        @update:model-value="(v) => { if (!v) closePanel(); }"
      >
        <div v-if="detailLoading" class="loading">상세 조회 중…</div>

        <div v-else-if="mode === 'create' || detail">
          <div v-if="mode === 'view'" class="head">
            <InButton size="sm" variant="text" @click="copyJson(detail)">📋 JSON 복사</InButton>
          </div>

          <InTabs v-model="drawerTab" :items="tabItems" />

          <!-- ───────── 정의 탭 ───────── -->
          <section v-if="drawerTab === 'def'" class="section">
            <!-- 보기 -->
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

            <!-- 신규/수정 폼 -->
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

          <!-- ───────── SQL 본문 탭 ───────── -->
          <section v-else-if="drawerTab === 'body'" class="section">
            <pre v-if="mode === 'view'" class="body">{{ detail.body || '본문 없음' }}</pre>
            <textarea
              v-else
              v-model="form.body"
              class="body-edit"
              spellcheck="false"
              placeholder="SELECT ... FROM ... WHERE col = :param"
            />
          </section>

          <!-- ───────── 파라미터 탭 ───────── -->
          <section v-else-if="drawerTab === 'params'" class="section">
            <!-- 보기 -->
            <ul v-if="mode === 'view'" class="resource-list">
              <li v-for="p in detail.params" :key="p.queryParamId">
                <InTag :label="p.queryParamInoutType" size="sm" />
                <code>:{{ p.queryParamName }}</code>
                <span class="muted">type: {{ p.queryParamType }}</span>
                <span class="muted">seq: {{ p.queryParamSeq }}</span>
              </li>
              <li v-if="!detail.params?.length" class="muted">파라미터 없음</li>
            </ul>

            <!-- 편집 그리드 -->
            <div v-else>
              <div class="grid-toolbar">
                <InButton size="sm" variant="default" :left-icon-show="false" :right-icon-show="false" @click="addParam">+ 행 추가</InButton>
              </div>
              <table class="param-table">
                <thead>
                  <tr><th>순서</th><th>파라미터명</th><th>타입</th><th>IN/OUT</th><th></th></tr>
                </thead>
                <tbody>
                  <tr v-for="p in visibleParams" :key="p.queryParamId ?? `new-${p.queryParamSeq}`">
                    <td><input v-model.number="p.queryParamSeq" type="number" class="cell cell--seq" @change="touchParam(p)" /></td>
                    <td><input v-model="p.queryParamName" type="text" class="cell" placeholder="company_cd" @input="touchParam(p)" /></td>
                    <td><input v-model="p.queryParamType" type="text" class="cell" placeholder="문자" @input="touchParam(p)" /></td>
                    <td>
                      <select v-model="p.queryParamInoutType" class="cell" @change="touchParam(p)">
                        <option v-for="o in inoutOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
                      </select>
                    </td>
                    <td><button type="button" class="row-del" title="행 삭제" @click="removeParam(p)">✕</button></td>
                  </tr>
                  <tr v-if="!visibleParams.length"><td colspan="5" class="muted center">파라미터 없음 — [+ 행 추가]</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- ───────── 사용처 탭 ───────── -->
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
        </div>

        <!-- 푸터: 모드별 액션 -->
        <template #footer>
          <template v-if="isEditing">
            <InButton variant="default" :left-icon-show="false" :right-icon-show="false" :disabled="saving" @click="cancelEdit">취소</InButton>
            <InButton variant="primary" :left-icon-show="false" :right-icon-show="false" :disabled="saving" @click="save">{{ saving ? '저장 중…' : '저장' }}</InButton>
          </template>
          <template v-else>
            <InButton variant="default" :left-icon-show="false" :right-icon-show="false" @click="closePanel">닫기</InButton>
            <InButton variant="default" :left-icon-show="false" :right-icon-show="false" @click="confirmDelete = true">삭제</InButton>
            <InButton variant="primary" :left-icon-show="false" :right-icon-show="false" @click="enterEdit">수정</InButton>
          </template>
        </template>
      </InModal>

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
.center { text-align: center; }
.loading { padding: 32px; text-align: center; color: var(--in-text-subtle); }
.head { display: flex; gap: 8px; margin-bottom: 12px; }
.section { padding: 12px 4px; }
.kv { display: grid; grid-template-columns: 110px 1fr; gap: 8px 12px; margin: 0; }
.kv dt { color: var(--in-text-subtle); font-size: var(--in-font-size-sm); }
.kv dd { margin: 0; color: var(--in-text-default); word-break: break-all; }

/* 편집 폼 */
.form-grid { display: flex; flex-direction: column; gap: 14px; }
.form-row { display: flex; flex-direction: column; gap: 4px; }
.hint { margin: 0; font-size: var(--in-font-size-sm); color: var(--in-text-subtle); }

/* 본문 (보기/편집) */
.body {
  margin: 0; padding: 12px;
  background: var(--in-bg-default); border-radius: var(--in-radius-xs);
  font-family: var(--in-font-family-mono, ui-monospace);
  font-size: var(--in-font-size-sm); line-height: var(--in-line-height-sm);
  color: var(--in-text-accent); white-space: pre-wrap; word-break: break-all;
  max-height: 60vh; overflow: auto;
}
.body-edit {
  width: 100%; min-height: 240px; resize: vertical;
  padding: 12px; border: 1px solid var(--in-border-input); border-radius: var(--in-radius-xs);
  font-family: var(--in-font-family-mono, ui-monospace);
  font-size: var(--in-font-size-sm); line-height: var(--in-line-height-sm);
  color: var(--in-text-default); background: var(--in-bg-white);
}

/* 파라미터 그리드 */
.grid-toolbar { display: flex; justify-content: flex-end; margin-bottom: 8px; }
.param-table { width: 100%; border-collapse: collapse; }
.param-table th, .param-table td {
  border-bottom: 1px solid var(--in-border-default);
  padding: 6px 8px; text-align: left; font-size: var(--in-font-size-sm);
}
.param-table th { color: var(--in-text-subtle); font-weight: var(--in-font-weight-medium); }
.cell {
  width: 100%; box-sizing: border-box; padding: 6px 8px;
  border: 1px solid var(--in-border-input); border-radius: var(--in-radius-xs);
  font-size: var(--in-font-size-sm); background: var(--in-bg-white); color: var(--in-text-default);
}
.cell--seq { width: 64px; }
.row-del {
  border: none; background: transparent; cursor: pointer;
  color: var(--in-text-subtle); font-size: 14px; padding: 4px 8px;
}
.row-del:hover { color: var(--in-text-error, #d33); }

/* 사용처/파라미터 보기 리스트 */
.resource-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.resource-list li {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  padding: 8px 10px; background: var(--in-bg-default); border-radius: var(--in-radius-xs);
}
.resource-list code {
  font-family: var(--in-font-family-mono, ui-monospace);
  font-size: var(--in-font-size-sm); color: var(--in-text-default);
}
</style>
