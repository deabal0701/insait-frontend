<script setup>
/**
 * OrgAuthCatalog — AUT0060 조직권한 관리 (admin lane access 차선, 직접 REST).
 * ★ (2026-06-11, dspark): 좌 조직트리(lazy, ORM_ORG) + 우 2그리드(그룹권한/사원권한).
 *   조직 선택 → 그 조직의 그룹권한(FRM_ORM_USERGROUP_AUTH) + 사원권한(FRM_ORM_AUTH) 조회.
 *   저장 = org_id 스코프 2 entity rowStatus(I/U/D) 단일 호출 (AS-IS AUT0060_00_S01 정합).
 *   사원 추가 = 사원검색 picker (AS-IS biz:EmpSearchButton 대체). 사용자그룹 콤보 = FRM_USER_GROUP 목록.
 *   설계: 02-tobe/04-admin-lane/access-control/04_org-auth-aut0060.md. Figma 노드 ID = TBD.
 */
import { ref, computed, onMounted } from 'vue';
import dayjs from 'dayjs';
import { adminApi } from '@/services/adminApi';
import { useToast } from '@/composables/useToast';

import OrgTreeNode from '@/components/feature/access/OrgTreeNode.vue';
import MetaChildGrid from '@/components/feature/admin/MetaChildGrid.vue';
import InButton from '@/components/ui/InButton.vue';

const toast = useToast();

const baseYmdInput = ref(dayjs().format('YYYY-MM-DD'));
function ymd(s) { return (s || '').replace(/[^0-9]/g, ''); }
const baseYmd = computed(() => ymd(baseYmdInput.value));

const roots = ref([]);
const loadingTree = ref(false);
const selectedOrg = ref(null);     // { orgId, orgNm }

const groupRows = ref([]);
const empRows = ref([]);
const userGroupOptions = ref([]);
const loadingAuth = ref(false);
const saving = ref(false);

// 사원 검색 picker
const pickerOpen = ref(false);
const pickerQuery = ref('');
const pickerResults = ref([]);
const pickerLoading = ref(false);

const groupColumns = computed(() => [
  { key: 'usergroupId', label: '사용자그룹', kind: 'select', width: 260, options: userGroupOptions.value },
  { key: 'note', label: '비고', kind: 'text' },
]);
const empColumns = [
  { key: 'empNo', label: '사번', kind: 'readonly', width: 120 },
  { key: 'empNm', label: '성명', kind: 'readonly', width: 160 },
  { key: 'note', label: '비고', kind: 'text' },
];

function newGroupRow() {
  return { rowStatus: 'I', ormUsergroupAuthId: null, usergroupId: '', note: '' };
}

async function loadRoots() {
  loadingTree.value = true;
  try {
    roots.value = await adminApi.access.orgAuth.orgTree(null, baseYmd.value);
  } catch (e) {
    toast.error('조직트리 조회 실패: ' + (e?.response?.data?.error?.message || e?.message || e));
  } finally { loadingTree.value = false; }
}

async function loadUserGroups() {
  try {
    const resp = await adminApi.access.userGroups.list({ size: 500, page: 1 });
    userGroupOptions.value = (resp.content || []).map((g) => ({ value: g.usergroupId, label: g.usergroupNm }));
  } catch (e) { /* 콤보 없으면 select 빈 목록 */ }
}

async function onSelectOrg(node) {
  selectedOrg.value = { orgId: node.orgId, orgNm: node.orgNm };
  await loadAuth(node.orgId);
}

function mapResp(data) {
  groupRows.value = (data.groupAuths || []).map((r) => ({
    ormUsergroupAuthId: r.ormUsergroupAuthId, usergroupId: r.usergroupId, note: r.note || '',
  }));
  empRows.value = (data.empAuths || []).map((r) => ({
    ormAuthId: r.ormAuthId, empId: r.empId, empNo: r.empNo, empNm: r.empNm, note: r.note || '',
  }));
}

async function loadAuth(orgId) {
  loadingAuth.value = true;
  try {
    mapResp(await adminApi.access.orgAuth.find(orgId));
  } catch (e) {
    toast.error('조직권한 조회 실패: ' + (e?.response?.data?.error?.message || e?.message || e));
  } finally { loadingAuth.value = false; }
}

async function save() {
  if (!selectedOrg.value) { toast.info('조직을 먼저 선택하세요.'); return; }
  const groupAuths = groupRows.value.filter((r) => r.rowStatus).map((r) => ({
    rowStatus: r.rowStatus, ormUsergroupAuthId: r.ormUsergroupAuthId, usergroupId: r.usergroupId, note: r.note,
  }));
  const empAuths = empRows.value.filter((r) => r.rowStatus).map((r) => ({
    rowStatus: r.rowStatus, ormAuthId: r.ormAuthId, empId: r.empId, note: r.note,
  }));
  if (!groupAuths.length && !empAuths.length) { toast.info('변경된 내용이 없습니다.'); return; }
  saving.value = true;
  try {
    const data = await adminApi.access.orgAuth.save(selectedOrg.value.orgId, { groupAuths, empAuths });
    mapResp(data);
    toast.success('저장되었습니다.');
  } catch (e) {
    toast.error('저장 실패: ' + (e?.response?.data?.error?.message || e?.message || e));
  } finally { saving.value = false; }
}

// ── 사원 검색 picker ──
function openPicker() {
  if (!selectedOrg.value) { toast.info('조직을 먼저 선택하세요.'); return; }
  pickerOpen.value = true; pickerQuery.value = ''; pickerResults.value = [];
}
async function runPicker() {
  if (!pickerQuery.value.trim()) return;
  pickerLoading.value = true;
  try {
    pickerResults.value = await adminApi.access.orgAuth.employees(pickerQuery.value.trim());
  } catch (e) {
    toast.error('사원 검색 실패: ' + (e?.response?.data?.error?.message || e?.message || e));
  } finally { pickerLoading.value = false; }
}
function pickEmp(emp) {
  if (empRows.value.some((r) => String(r.empId) === String(emp.empId) && r.rowStatus !== 'D')) {
    toast.info('이미 추가된 사원입니다.'); return;
  }
  empRows.value.push({ rowStatus: 'I', ormAuthId: null, empId: emp.empId, empNo: emp.empNo, empNm: emp.empNm, note: '' });
  pickerOpen.value = false;
}

onMounted(async () => { await Promise.all([loadRoots(), loadUserGroups()]); });
</script>

<template>
  <div class="orgauth">
    <header class="orgauth__head">
      <h2 class="orgauth__title">조직권한 관리</h2>
      <p class="orgauth__desc">조직(부서)별 데이터 열람권한을 사용자그룹·개별사원에게 부여합니다. (메뉴 접근권한과 별개의 데이터 권한 축)</p>
    </header>

    <div class="orgauth__body">
      <!-- 좌: 기준일 + 조직트리 -->
      <aside class="orgauth__tree">
        <div class="orgauth__tree-filter">
          <label>기준일</label>
          <input v-model="baseYmdInput" type="date" class="orgauth__date" @change="loadRoots" />
        </div>
        <div class="orgauth__tree-title">조직도</div>
        <ul class="orgauth__tree-list">
          <OrgTreeNode
            v-for="r in roots"
            :key="r.orgId"
            :node="r"
            :base-ymd="baseYmd"
            :selected-org-id="selectedOrg?.orgId"
            @select="onSelectOrg"
          />
          <li v-if="!roots.length && !loadingTree" class="orgauth__tree-empty">조직 없음</li>
        </ul>
      </aside>

      <!-- 우: 2그리드 -->
      <section class="orgauth__panels">
        <div class="orgauth__panel-head">
          <div class="orgauth__sel">
            <template v-if="selectedOrg">선택 조직: <b>{{ selectedOrg.orgNm }}</b></template>
            <template v-else>← 좌측 조직을 선택하세요</template>
          </div>
          <InButton size="sm" variant="primary" :left-icon-show="false" :right-icon-show="false" :disabled="saving || !selectedOrg" @click="save">저장</InButton>
        </div>

        <div v-if="selectedOrg" class="orgauth__grids">
          <!-- 그룹권한 -->
          <div class="orgauth__grid-block">
            <div class="orgauth__grid-title">조직권한 — 사용자그룹 <span class="orgauth__count">{{ groupRows.filter(r => r.rowStatus !== 'D').length }}건</span></div>
            <MetaChildGrid
              :rows="groupRows"
              :columns="groupColumns"
              key-field="ormUsergroupAuthId"
              :new-row="newGroupRow"
              add-label="입력"
              show-seq
              show-status
            />
          </div>

          <!-- 사원권한 -->
          <div class="orgauth__grid-block">
            <div class="orgauth__grid-title">
              조직권한 — 사원 <span class="orgauth__count">{{ empRows.filter(r => r.rowStatus !== 'D').length }}명</span>
              <InButton size="sm" :left-icon-show="false" :right-icon-show="false" @click="openPicker">＋ 사원 추가</InButton>
            </div>
            <MetaChildGrid
              :rows="empRows"
              :columns="empColumns"
              key-field="ormAuthId"
              hide-add
              show-seq
              show-status
            />
          </div>
        </div>
        <div v-else class="orgauth__empty">조직을 선택하면 그룹·사원 권한이 표시됩니다.</div>
      </section>
    </div>

    <!-- 사원 검색 picker 모달 -->
    <div v-if="pickerOpen" class="orgauth__modal-mask" @click.self="pickerOpen = false">
      <div class="orgauth__modal">
        <div class="orgauth__modal-head">
          <span>사원 검색</span>
          <button type="button" class="orgauth__modal-x" @click="pickerOpen = false">✕</button>
        </div>
        <div class="orgauth__modal-search">
          <input v-model="pickerQuery" type="text" placeholder="사번 또는 성명" class="orgauth__modal-input" @keyup.enter="runPicker" />
          <InButton size="sm" :left-icon-show="false" :right-icon-show="false" :disabled="pickerLoading" @click="runPicker">검색</InButton>
        </div>
        <div class="orgauth__modal-results">
          <table class="orgauth__modal-table">
            <thead><tr><th>사번</th><th>성명</th><th>소속</th><th></th></tr></thead>
            <tbody>
              <tr v-for="e in pickerResults" :key="e.empId">
                <td>{{ e.empNo }}</td><td>{{ e.empNm }}</td><td>{{ e.orgNm }}</td>
                <td><button type="button" class="orgauth__pick" @click="pickEmp(e)">선택</button></td>
              </tr>
              <tr v-if="!pickerResults.length"><td colspan="4" class="orgauth__modal-empty">검색 결과 없음 (사번/성명 입력 후 검색)</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.orgauth { padding: 16px 20px; }
.orgauth__head { margin-bottom: 14px; }
.orgauth__title { margin: 0 0 4px; font-size: var(--in-font-size-lg); font-weight: var(--in-font-weight-bold); color: var(--in-text-default); }
.orgauth__desc { margin: 0; font-size: var(--in-font-size-sm); color: var(--in-text-subtle); }
.orgauth__body { display: flex; gap: 16px; align-items: flex-start; }

.orgauth__tree { flex: 0 0 300px; border: 1px solid var(--in-border-default); border-radius: var(--in-radius-sm); padding: 12px; background: var(--in-bg-white); }
.orgauth__tree-filter { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.orgauth__tree-filter label { font-size: var(--in-font-size-sm); color: var(--in-text-subtle); }
.orgauth__date { width: 150px; padding: 5px 8px; border: 1px solid var(--in-border-input); border-radius: var(--in-radius-xs); font-size: var(--in-font-size-sm); }
.orgauth__tree-title { font-size: var(--in-font-size-sm); font-weight: var(--in-font-weight-bold); color: var(--in-text-subtle); margin-bottom: 6px; }
.orgauth__tree-list { list-style: none; margin: 0; padding: 0; max-height: 600px; overflow: auto; }
.orgauth__tree-empty { color: var(--in-text-subtle); font-size: var(--in-font-size-sm); padding: 8px; }

.orgauth__panels { flex: 1 1 auto; min-width: 0; border: 1px solid var(--in-border-default); border-radius: var(--in-radius-sm); padding: 14px 16px; background: var(--in-bg-white); }
.orgauth__panel-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.orgauth__sel { font-size: var(--in-font-size-sm); color: var(--in-text-default); }
.orgauth__grids { display: flex; flex-direction: column; gap: 18px; }
.orgauth__grid-title { font-weight: var(--in-font-weight-bold); color: var(--in-text-default); margin-bottom: 8px; display: flex; align-items: center; gap: 10px; }
.orgauth__count { font-size: var(--in-font-size-sm); color: var(--in-text-subtle); font-weight: var(--in-font-weight-regular); }
.orgauth__empty { color: var(--in-text-subtle); font-size: var(--in-font-size-sm); padding: 24px; text-align: center; }

.orgauth__modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 9000; }
.orgauth__modal { width: 520px; max-width: 92vw; background: var(--in-bg-white); border-radius: var(--in-radius-md); box-shadow: 0 12px 40px rgba(0,0,0,.2); overflow: hidden; }
.orgauth__modal-head { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--in-border-default); font-weight: var(--in-font-weight-bold); }
.orgauth__modal-x { border: none; background: transparent; cursor: pointer; font-size: 16px; color: var(--in-text-subtle); }
.orgauth__modal-search { display: flex; gap: 8px; padding: 12px 16px; }
.orgauth__modal-input { flex: 1; padding: 6px 10px; border: 1px solid var(--in-border-input); border-radius: var(--in-radius-xs); font-size: var(--in-font-size-sm); }
.orgauth__modal-results { max-height: 360px; overflow: auto; padding: 0 16px 16px; }
.orgauth__modal-table { width: 100%; border-collapse: collapse; font-size: var(--in-font-size-sm); }
.orgauth__modal-table th, .orgauth__modal-table td { border-bottom: 1px solid var(--in-border-default); padding: 6px 8px; text-align: left; }
.orgauth__modal-table th { color: var(--in-text-subtle); }
.orgauth__pick { border: 1px solid var(--in-border-default); background: var(--in-bg-white); border-radius: var(--in-radius-xs); padding: 3px 10px; cursor: pointer; font-size: var(--in-font-size-sm); }
.orgauth__pick:hover { background: var(--in-bg-brand-subtle, var(--in-bg-default)); }
.orgauth__modal-empty { text-align: center; color: var(--in-text-subtle); padding: 16px; }
</style>
