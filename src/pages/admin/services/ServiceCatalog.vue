<script setup>
/**
 * ServiceCatalog — IST0050 서비스관리 (admin lane 카탈로그).
 * ★ (2026-06-03, dspark): envelope listServices → adminApi.meta.services 격상.
 *   v2 디자인시스템 정합 (InTable/InPagination/InSearchField/InChip + CatalogPage 추상).
 *
 * 한 줄로:
 *   FRM_SERVICE_DEF 6,210+ 조회·페이징·정렬·필터 + 행 클릭 상세 Drawer(확장 응답 1회).
 *
 * URL:  /admin/meta/services
 * API:  GET /api/admin/meta/services       목록
 *       GET /api/admin/meta/services/{nm}  상세 (?expand=msg,query,object)
 */
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { adminApi } from '@/services/adminApi';
import { buildEnvelope } from '@/services/envelope';
import { usePagedList } from '@/composables/usePagedList';
import { useCatalogFilter } from '@/composables/useCatalogFilter';
import { useToast } from '@/composables/useToast';

import CatalogPage from '@/components/feature/admin/CatalogPage.vue';
import HealthDot from '@/components/feature/admin/HealthDot.vue';

import InSearchField from '@/components/ui/InSearchField.vue';
import InSelect from '@/components/ui/InSelect.vue';
import InButton from '@/components/ui/InButton.vue';
import InTag from '@/components/ui/InTag.vue';
import InModal from '@/components/ui/InModal.vue';
import InTabs from '@/components/ui/InTabs.vue';
import InTooltip from '@/components/ui/InTooltip.vue';
import InIcon from '@/components/ui/InIcon.vue';

const router = useRouter();
const toast = useToast();

// ─── 목록 ───────────────────────────────────────────────────────────────
const list = usePagedList({
  fetcher: adminApi.meta.services.list,
  initialSize: 50,
  initialFilter: { q: '', cmdClass: '', txSupportYn: '', useLogYn: '' },
  defaultSort: ['sv_def_nm,asc'],
  syncUrl: true,
});

// ★ (2026-06-04, dspark): useCatalogFilter composable — 5 카탈로그 공통 staged filter.
const { staged, applyFilter, resetFilter, removeFilter } = useCatalogFilter({
  list,
  initial: { q: '', cmdClass: '', txSupportYn: '', useLogYn: '' },
});
function onSearch(v) { staged.value.q = v; }
function onCmdClass(v) { staged.value.cmdClass = v; }
function onTx(v) { staged.value.txSupportYn = v; }
function onUseLog(v) { staged.value.useLogYn = v; }

const cmdOptions = [
  { value: '', label: '전체 Command' },
  { value: 'MultiQuery', label: 'MultiQuery (조회)' },
  { value: 'MultiSave',  label: 'MultiSave (저장)' },
  { value: 'Procedure',  label: 'Procedure (PL/SQL)' },
  { value: 'ElaService', label: 'ElaService (전자결재)' },
];
const ynOptions = [
  { value: '',  label: '전체' },
  { value: 'Y', label: 'Y' },
  { value: 'N', label: 'N' },
];

const activeFilters = computed(() => {
  const f = list.filter.value;
  const out = [];
  if (f.q) out.push({ key: 'q', label: `검색: ${f.q}` });
  if (f.cmdClass) out.push({ key: 'cmdClass', label: `Cmd: ${f.cmdClass}` });
  if (f.txSupportYn) out.push({ key: 'txSupportYn', label: `tx: ${f.txSupportYn}` });
  if (f.useLogYn) out.push({ key: 'useLogYn', label: `log: ${f.useLogYn}` });
  return out;
});
// removeFilter 는 useCatalogFilter 가 제공 (chip 제거 시 staged + list 동기 reset)

const columns = [
  { field: 'svDefNm',    label: '서비스명',     sortable: true, sortKey: 'sv_def_nm', width: 240 },
  { field: 'cmdClassNm', label: 'Command',     sortable: true, sortKey: 'cmd_class_nm' },
  { field: 'txSupportYn',label: 'TX',          sortable: true, sortKey: 'tx_support_yn', align: 'center', width: 50 },
  { field: 'asyncYn',    label: 'Async',       sortable: true, sortKey: 'async_yn',     align: 'center', width: 60 },
  { field: 'useLogYn',   label: 'Log',         sortable: true, sortKey: 'use_log_yn',   align: 'center', width: 50 },
  { field: 'modDate',    label: '변경일',      sortable: true, sortKey: 'mod_date', width: 160 },
  { field: 'note',       label: '비고' },
  // ★ (2026-06-04, dspark): row 액션 컬럼 복원 (84f83ea 정합) — 테스트(arrow-right) + JSON 복사(content-copy).
  { field: 'actions',    label: '액션', align: 'center', width: 150 },
];

// ─── 상세 Drawer ─────────────────────────────────────────────────────────
const selected = ref(null);
const detail = ref(null);
const detailLoading = ref(false);
const drawerTab = ref('def');

async function openDetail(row) {
  selected.value = row;
  detail.value = null;
  detailLoading.value = true;
  try {
    // ★ (2026-06-03, dspark): expand 보강 — msgColumns/health/paramDiff/elaInfra.
    //   근거: command-scenarios 4건 + ela §2.A.1 14건 인프라.
    detail.value = await adminApi.meta.services.detail(row.svDefNm, { expand: ['msg', 'query', 'object', 'msgColumns', 'health', 'paramDiff', 'elaInfra'] });
    drawerTab.value = 'def';
  } catch (e) {
    toast.error?.(e?.message || '상세 조회 실패');
  } finally {
    detailLoading.value = false;
  }
}
function closeDetail() { selected.value = null; detail.value = null; }

// ★ (2026-06-03, dspark): trapCount breakdown — 함정 카테고리별 분포 표시.
//   command-scenarios 4건의 첫 함정 카테고리 5종.
const trapBreakdown = computed(() => {
  const out = { msgMissing: 0, queryMissing: 0, useYnN: 0, compatError: 0, compatWarn: 0, paramMismatch: 0, elaMissing: 0 };
  const d = detail.value;
  if (!d) return out;
  // 메시지 미등록 (자동 바인딩 함정)
  for (const a of d.attrs || []) if (a.msgRef && a.msgRef.exists === false) out.msgMissing += 1;
  for (const f of d.funcMaps || []) {
    if (f.queryRef && f.queryRef.exists === false) out.queryMissing += 1;
    if (f.reqMsgRef && f.reqMsgRef.exists === false) out.msgMissing += 1;
    if (f.resMsgRef && f.resMsgRef.exists === false) out.msgMissing += 1;
  }
  // 메시지 컬럼 use_yn=N (procedure §5.2 #13, ela §5.2 #1)
  for (const a of d.attrs || []) {
    if (a.msgRef?.columns) {
      for (const c of a.msgRef.columns) if (c.useYn !== 'Y') out.useYnN += 1;
    }
  }
  for (const f of d.funcMaps || []) {
    for (const ref of [f.reqMsgRef, f.resMsgRef]) {
      if (ref?.columns) for (const c of ref.columns) if (c.useYn !== 'Y') out.useYnN += 1;
    }
  }
  // 호환성 평가 (sv_map_type × cmd_class)
  if (d.compatibility?.reasons) {
    for (const r of d.compatibility.reasons) {
      if (r.severity === 'error') out.compatError += 1;
      else if (r.severity === 'warn') out.compatWarn += 1;
    }
  }
  // ★ (2026-06-03, dspark) #4: Procedure SQL bind name 미매칭
  for (const f of d.funcMaps || []) {
    if (f.queryRef?.paramDiff?.unmatched?.length) out.paramMismatch += f.queryRef.paramDiff.unmatched.length;
  }
  // ★ (2026-06-03, dspark) #5: ELA 14건 인프라 missing
  if (d.elaInfra?.summary) out.elaMissing = d.elaInfra.summary.missingCount || 0;
  return out;
});

const trapCount = computed(() => {
  const b = trapBreakdown.value;
  return b.msgMissing + b.queryMissing + b.useYnN + b.compatError + b.compatWarn;
});

function gotoTester(row) {
  // ★ (2026-06-03, dspark): 라우트 이름 + param 정합 — router/routes/admin.js 의 `SERVICE_TESTER` (path param) 사용.
  router.push({ name: 'SERVICE_TESTER', params: { serviceId: row.svDefNm } });
}
// ★ (2026-06-04, dspark): row 액션 — envelope template 빌드 후 클립보드 복사 (84f83ea 정합).
//   메타 fetch 1회 → attrs[IN_MSG].msgRef.columns 기반 envelope 본문 자동 채움.
async function copyRowEnvelope(row) {
  if (!row?.svDefNm) return;
  try {
    const d = await adminApi.meta.services.detail(row.svDefNm, { expand: ['msg', 'msgColumns'] });
    const attrs = Array.isArray(d?.attrs) ? d.attrs : [];
    const inAttr = attrs.find((a) => a.svAttrType === 'IN_MSG');
    const slot = (inAttr?.valueType || '').replace(/^MT_/, 'ME_') || 'ME_REQ';
    const cols = inAttr?.msgRef?.columns || [];
    const rowTpl = { _seq: 1, sStatus: 'R', sDelete: '' };
    for (const c of cols) rowTpl[c.colId] = '';
    const envelope = buildEnvelope(row.svDefNm, { [slot]: [rowTpl] });
    await navigator.clipboard.writeText(JSON.stringify(envelope, null, 2));
    toast.success?.(`envelope JSON 복사됨 — ${row.svDefNm}`);
  } catch (e) {
    toast.error?.(e?.message || 'JSON 복사 실패');
  }
}

function shortCmd(fqcn) {
  if (!fqcn) return '';
  return fqcn.split('.').pop();
}

// ★ (2026-06-03, dspark): 시나리오 정합 헬퍼.

/** 3중 동명 (sv_def_nm == primary funcMap.func_nm). sql 매핑일 때만 의미. */
const tripleNameStatus = computed(() => {
  const d = detail.value;
  if (!d?.def || !d.funcMaps?.length) return null;
  const primary = d.funcMaps[0];
  if ((primary.svMapTypeCd || '').toLowerCase() !== 'sql') return null;   // entity 면 EN_* 매핑이라 의미 없음
  const same = (primary.funcNm || '').toUpperCase() === (d.def.svDefNm || '').toUpperCase();
  return { same, funcNm: primary.funcNm };
});

/** ELA dispatch — cmd_class 가 ElaServiceCommand 면 envelope 실 serviceId 가 ELA0010_SAVE_0N 으로 변형. */
const elaDispatch = computed(() => {
  const d = detail.value;
  if (!d?.def) return null;
  const short = shortCmd(d.def.cmdClassNm);
  if (short !== 'ElaServiceCommand') return null;
  // SCENARIO-ela.md §5.2 #26: Submit/TempSave/Approve/Deny → ELA0010_SAVE_01..04
  return {
    note: '실제 envelope serviceId 가 ELA0010_SAVE_0N (1=Submit / 2=TempSave / 3=Approve / 4=Deny) 으로 sub-Command dispatch 됨',
    ref: 'SCENARIO-ela.md §5.2 #26',
  };
});

/** ELA 인프라 행 색 — critical missing 빨강 / important missing 노랑 / OK 없음 / unknown 없음. */
function elaRowClass(it) {
  if (it.exists === false) {
    return it.severity === 'critical' ? 'svc-ela-row--critical-missing' : 'svc-ela-row--missing';
  }
  return '';
}

/** objectId NULL 의미 — 일반 Command 는 NULL 정상, ELA Command 는 NULL=등록 누락 의심. */
const objectIdInterpretation = computed(() => {
  const d = detail.value;
  if (!d?.def) return null;
  const isNull = !d.def.objectId;
  const isEla = shortCmd(d.def.cmdClassNm) === 'ElaServiceCommand';
  if (!isNull) return null;
  return {
    severity: isEla ? 'warn' : 'info',
    message: isEla
      ? 'ELA Command 인데 objectId NULL — OBJECT 메타 14건 인프라 등록 누락 의심'
      : 'objectId NULL — 일반 Command 는 정상 (대부분 NULL, 매뉴얼 09 §6.1)',
    ref: isEla ? 'SCENARIO-ela.md §5.2 #14' : '매뉴얼 09 §6.1',
  };
});

onMounted(() => list.reload());
</script>

<template>
  <CatalogPage
    title="서비스관리"
    :subtitle="`FRM_SERVICE_DEF · 운영 ` + (list.total.value || 0).toLocaleString() + `건`"
    :list="list"
    :columns="columns"
    row-key="svDefNm"
    :active-filters="activeFilters"
    :selected-row="selected"
    @row-click="openDetail"
    @filter-remove="removeFilter"
    @retry="list.reload()"
  >
    <template #filters>
      <!-- ★ (2026-06-03, dspark): 검색 + 콤보 3개 한 줄 배치 + layout=vertical (라벨 위, 콤보 아래).
           InSelect placeholder prop 명은 `input` 이며 'placeholder' 는 무시됨 (디자인시스템 v2 정합).
           ★ '조회' 버튼 명시 인접 배치 — InSearchField suffix 아이콘만으로는 시각 식별 약함 (사용자 피드백). -->
      <div class="svc-filters">
        <InSearchField
          :model-value="staged.q"
          label="검색"
          input="서비스명 prefix — 예: IST0050 (Enter 또는 [조회] 버튼)"
          layout="vertical"
          @update:model-value="onSearch"
          @search="applyFilter"
        />
        <InSelect
          :model-value="staged.cmdClass"
          :options="cmdOptions"
          label="Command"
          input="전체"
          layout="vertical"
          size="sm"
          @update:model-value="onCmdClass"
        />
        <InSelect
          :model-value="staged.txSupportYn"
          :options="ynOptions"
          label="TX"
          input="전체"
          layout="vertical"
          size="sm"
          @update:model-value="onTx"
        />
        <InSelect
          :model-value="staged.useLogYn"
          :options="ynOptions"
          label="Log"
          input="전체"
          layout="vertical"
          size="sm"
          @update:model-value="onUseLog"
        />
        <InButton class="svc-filters__search-btn" variant="primary" size="md" :left-icon-show="false" :right-icon-show="false" @click="applyFilter">조회</InButton>
        <InButton class="svc-filters__reset-btn" variant="default" size="md" :left-icon-show="false" :right-icon-show="false" @click="resetFilter">초기화</InButton>
      </div>
    </template>

    <template #cell-svDefNm="{ value, row }">
      <span class="svc-name">
        <strong>{{ value }}</strong>
        <InTooltip v-if="row.note" :text="row.note">
          <span class="svc-note-dot">·</span>
        </InTooltip>
      </span>
    </template>

    <template #cell-cmdClassNm="{ value }">
      <span class="svc-cmd">{{ shortCmd(value) }}</span>
    </template>

    <template #cell-txSupportYn="{ value }">
      <InTag v-if="value === 'Y'" label="Y" variant="success" size="sm" />
      <span v-else class="muted">N</span>
    </template>
    <template #cell-asyncYn="{ value }">
      <InTag v-if="value === 'Y'" label="Y" variant="warning" size="sm" />
      <span v-else class="muted">N</span>
    </template>
    <template #cell-useLogYn="{ value }">
      <InTag v-if="value === 'Y'" label="Y" variant="brand" size="sm" />
      <span v-else class="muted">N</span>
    </template>

    <template #cell-modDate="{ value }">
      <span class="muted">{{ (value || '').slice(0, 10) }}</span>
    </template>

    <!-- ★ (2026-06-04, dspark): row 액션 — 84f83ea 정합. chevron-right (작은 ">", 테스트) + content-copy (JSON).
         사용자 피드백: "큰 > 가 아니라 작은 '>' 였다" — registry chevron-right 가 정확한 작은 꺽쇠 (Material, 여백 보유).
         "세로로 두개가 나온다" → svc-row-actions CSS 에 display:flex + gap. -->
    <template #cell-actions="{ row }">
      <span class="svc-row-actions" @click.stop>
        <InButton variant="text" size="sm" :left-icon-show="true" :right-icon-show="false" @click="gotoTester(row)">
          <template #prefix><InIcon name="chevron-right" :size="14" /></template>
          테스트
        </InButton>
        <InButton variant="text" size="sm" :left-icon-show="true" :right-icon-show="false" @click="copyRowEnvelope(row)">
          <template #prefix><InIcon name="content-copy" :size="14" /></template>
          JSON
        </InButton>
      </span>
    </template>

    <template #drawer>
      <InModal
        v-if="selected"
        :model-value="!!selected"
        type="detail"
        :title="`서비스 상세 — ${selected.svDefNm}`"
        :width="900"
        @update:model-value="(v) => { if (!v) closeDetail(); }"
      >
        <div v-if="detailLoading" class="svc-loading">상세 조회 중…</div>
        <div v-else-if="detail">
          <div class="svc-drawer-head">
            <!-- ★ (2026-06-03, dspark): 단일 trapCount → 호환성 + 카테고리 breakdown 으로 격상. -->
            <InTag
              v-if="detail.compatibility"
              :label="detail.compatibility.level === 'ok' ? '진단 OK' : detail.compatibility.level === 'error' ? '운영 위험' : '주의'"
              :variant="detail.compatibility.level === 'ok' ? 'success' : detail.compatibility.level === 'error' ? 'error' : 'warning'"
              size="sm"
            />
            <InTag v-if="trapBreakdown.compatError > 0"  :label="`호환성 ${trapBreakdown.compatError}건`" variant="error"   size="sm" />
            <InTag v-if="trapBreakdown.compatWarn > 0"   :label="`주의 ${trapBreakdown.compatWarn}건`"   variant="warning" size="sm" />
            <InTag v-if="trapBreakdown.msgMissing > 0"   :label="`메시지 미등록 ${trapBreakdown.msgMissing}건`"   variant="error" size="sm" />
            <InTag v-if="trapBreakdown.queryMissing > 0" :label="`SQL 미등록 ${trapBreakdown.queryMissing}건`"     variant="error" size="sm" />
            <InTag v-if="trapBreakdown.useYnN > 0"       :label="`use_yn=N ${trapBreakdown.useYnN}건`"             variant="warning" size="sm" />
            <InTag v-if="trapBreakdown.paramMismatch > 0" :label="`SQL bind 미매칭 ${trapBreakdown.paramMismatch}건`" variant="error" size="sm" />
            <InTag v-if="trapBreakdown.elaMissing > 0"   :label="`ELA 인프라 ${trapBreakdown.elaMissing}건`"        variant="error" size="sm" />
            <!-- ★ (2026-06-04, dspark): Drawer 의 ▶ 테스트 / 📋 JSON 복사 제거.
                 row 액션 ([테스트] [JSON]) 으로 단일화 — 사용자 피드백. -->
          </div>

          <InTabs v-model="drawerTab" :items="[
            { name: 'def',      tabLabel: '정의' },
            { name: 'health',   tabLabel: `진단 ${detail.compatibility?.reasons?.length ? `(${detail.compatibility.reasons.length})` : ''}` },
            { name: 'attrs',    tabLabel: `메시지 슬롯 (${detail.attrs?.length || 0})` },
            { name: 'funcMaps', tabLabel: `함수 매핑 (${detail.funcMaps?.length || 0})` },
            { name: 'object',   tabLabel: '소속 오브젝트' },
            // ★ (2026-06-03, dspark) #5: ELA Command 한정 인프라 탭
            ...(detail.elaInfra ? [{ name: 'elaInfra', tabLabel: `ELA 인프라 (${detail.elaInfra.summary.missingCount > 0 ? detail.elaInfra.summary.okCount + '/' + (detail.elaInfra.summary.okCount + detail.elaInfra.summary.missingCount) : detail.elaInfra.items.length})` }] : []),
          ]" />

          <section v-if="drawerTab === 'def'" class="svc-section">
            <dl class="kv">
              <dt>서비스명</dt><dd>{{ detail.def.svDefNm }}</dd>
              <dt>Command</dt>
              <dd>
                <code>{{ shortCmd(detail.def.cmdClassNm) }}</code>
                <span class="muted">— {{ detail.def.cmdClassNm }}</span>
              </dd>
              <dt>tx / async / log</dt>
              <dd>{{ detail.def.txSupportYn }} / {{ detail.def.asyncYn }} / {{ detail.def.useLogYn }}</dd>
              <dt>objectId</dt>
              <dd>
                <span v-if="detail.def.objectId"><code>{{ detail.def.objectId }}</code></span>
                <span v-else class="muted">NULL</span>
                <!-- ★ (2026-06-03, dspark) #8: objectId NULL 의미 분기. -->
                <InTag
                  v-if="objectIdInterpretation"
                  class="svc-def-chip"
                  :label="objectIdInterpretation.severity === 'warn' ? '등록 누락 의심' : '정상 (NULL 통상)'"
                  :variant="objectIdInterpretation.severity === 'warn' ? 'warning' : 'success'"
                  size="sm"
                />
                <InTooltip v-if="objectIdInterpretation" :text="`${objectIdInterpretation.message} (근거: ${objectIdInterpretation.ref})`">
                  <span class="svc-def-help">ⓘ</span>
                </InTooltip>
              </dd>
              <!-- ★ (2026-06-03, dspark) #10: 3중 동명 (sv_def_nm == func_nm) chip. sql 매핑일 때만. -->
              <template v-if="tripleNameStatus">
                <dt>3중 동명</dt>
                <dd>
                  <InTag
                    :label="tripleNameStatus.same ? '정합' : '불일치'"
                    :variant="tripleNameStatus.same ? 'success' : 'warning'"
                    size="sm"
                  />
                  <span class="muted">func_nm = <code>{{ tripleNameStatus.funcNm }}</code></span>
                  <InTooltip text="sv_def_nm = func_nm = query_name 이 일치해야 framework 자동 바인딩 정상 (multiquery §2). sql 매핑일 때만 의미.">
                    <span class="svc-def-help">ⓘ</span>
                  </InTooltip>
                </dd>
              </template>
              <!-- ★ (2026-06-03, dspark) #7: ELA Command 의 sub-Command dispatch 안내. -->
              <template v-if="elaDispatch">
                <dt>실 dispatch</dt>
                <dd>
                  <InTag label="ELA sub-Command" variant="brand" size="sm" />
                  <span class="muted">{{ elaDispatch.note }}</span>
                  <span class="muted svc-def-ref">— {{ elaDispatch.ref }}</span>
                </dd>
              </template>
              <dt>비고</dt><dd>{{ detail.def.note || '—' }}</dd>
              <dt>변경</dt><dd>{{ detail.def.modUserId }} · {{ detail.def.modDate }}</dd>
            </dl>
          </section>

          <!-- ★ (2026-06-03, dspark): 진단 탭 신설 — compatibility.reasons 가 운영자에게 보이는 1차 정보. -->
          <section v-else-if="drawerTab === 'health'" class="svc-section">
            <div v-if="!detail.compatibility" class="muted">진단 정보 없음 (expand=health 미적용)</div>
            <div v-else>
              <div class="svc-health-summary" :class="`svc-health-summary--${detail.compatibility.level}`">
                <strong>전체 등급</strong>:
                <InTag
                  :label="detail.compatibility.level === 'ok' ? 'OK' : detail.compatibility.level === 'error' ? 'ERROR' : 'WARN'"
                  :variant="detail.compatibility.level === 'ok' ? 'success' : detail.compatibility.level === 'error' ? 'error' : 'warning'"
                  size="sm"
                />
                <span class="muted">{{ detail.compatibility.reasons.length }}건 사유</span>
              </div>
              <ul v-if="detail.compatibility.reasons.length" class="svc-reasons">
                <li v-for="(r, i) in detail.compatibility.reasons" :key="i" :class="`svc-reason--${r.severity}`">
                  <InTag :label="r.severity === 'error' ? 'ERROR' : 'WARN'" :variant="r.severity === 'error' ? 'error' : 'warning'" size="sm" />
                  <code class="svc-reason__code">{{ r.code }}</code>
                  <span class="svc-reason__msg">{{ r.message }}</span>
                  <span class="muted svc-reason__ref">— {{ r.ref }}</span>
                </li>
              </ul>
              <p v-else class="muted">모든 검증 통과.</p>
              <p class="muted svc-health-note">
                근거: AS-IS 매뉴얼 <code>01-asis/manuals/01-meta-management/dev-tools/command-scenarios/</code> 4건 (multiquery·multisave·procedure·ela).
              </p>
            </div>
          </section>

          <section v-else-if="drawerTab === 'attrs'" class="svc-section">
            <!-- ★ (2026-06-03, dspark): 메시지 슬롯 → 메시지 + 컬럼 (use_yn/use_enc_yn) 가시화.
                 근거: SCENARIO-procedure.md §5.2 #13 (use_yn=N → IN NULL) + SCENARIO-multiquery.md §3.1 자동 바인딩. -->
            <ul class="resource-list">
              <li v-for="a in detail.attrs" :key="a.svAttrId" class="svc-attr-row">
                <div class="svc-attr-row__head">
                  <HealthDot
                    :tone="a.msgRef ? (a.msgRef.exists ? 'ok' : 'missing') : 'unknown'"
                    :title="a.msgRef && !a.msgRef.exists ? `메시지 ${a.valueType} 미등록` : ''"
                    size="sm"
                  />
                  <InTag :label="a.svAttrType" :variant="a.svAttrType === 'IN_MSG' ? 'brand' : 'warning'" size="sm" />
                  <code>{{ a.svAttrNm }}</code>
                  <span class="muted">value_type:</span>
                  <code>{{ a.valueType }}</code>
                  <span v-if="a.msgRef?.msgDefNm" class="muted">— {{ a.msgRef.msgDefNm }} ({{ a.msgRef.columnCount }}col · {{ a.msgRef.typeCd }})</span>
                </div>
                <table v-if="a.msgRef?.columns?.length" class="svc-msg-columns">
                  <thead>
                    <tr><th>#</th><th>COL_ID</th><th>한글명</th><th>타입</th><th>USE</th><th>ENC</th><th>VALUE_TYPE</th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="c in a.msgRef.columns" :key="c.seqNo" :class="{ 'svc-msg-columns__off': c.useYn !== 'Y' }">
                      <td class="muted">{{ c.seqNo }}</td>
                      <td><code>{{ c.colId }}</code></td>
                      <td>{{ c.colNm }}</td>
                      <td class="muted">{{ c.dataType }}</td>
                      <td>
                        <InTag v-if="c.useYn === 'Y'" label="Y" variant="success" size="sm" />
                        <InTag v-else label="N" variant="error" size="sm" />
                      </td>
                      <td>
                        <!-- ★ (2026-06-03, dspark): ENC 는 정보성 (ARIA 자동 암복호 정상 동작). brand 톤. -->
                        <InTag v-if="c.useEncYn === 'Y'" label="ENC" variant="brand" size="sm" />
                        <span v-else class="muted">—</span>
                      </td>
                      <td class="muted">{{ c.valueType || '—' }}</td>
                    </tr>
                  </tbody>
                </table>
              </li>
            </ul>
          </section>

          <section v-else-if="drawerTab === 'funcMaps'" class="svc-section">
            <ul class="resource-list">
              <li v-for="f in detail.funcMaps" :key="f.svMapId" class="svc-attr-row">
                <div class="svc-attr-row__head">
                  <HealthDot
                    :tone="f.queryRef ? (f.queryRef.exists ? 'ok' : 'missing') : 'unknown'"
                    :title="f.queryRef && !f.queryRef.exists ? `SQL ${f.funcNm} 미등록` : ''"
                    size="sm"
                  />
                  <InTag :label="f.svMapTypeCd" size="sm" />
                  <code>{{ f.funcNm }}</code>
                  <span class="muted">req:</span><code>{{ f.reqMsgNm }}</code>
                  <span class="muted">res:</span><code>{{ f.resMsgNm }}</code>
                  <!-- ★ (2026-06-03, dspark) #4: paramDiff 결과 — bind 미매칭 / orphan 컬럼 -->
                  <InTag v-if="f.queryRef?.paramDiff?.unmatched?.length"
                         :label="`bind 미매칭 ${f.queryRef.paramDiff.unmatched.length}건`"
                         variant="error" size="sm" />
                  <InTag v-else-if="f.queryRef?.paramDiff && f.queryRef.paramDiff.sqlBindNames?.length"
                         label="bind 정합" variant="success" size="sm" />
                </div>
                <pre v-if="f.queryRef?.bodyPreview" class="body-preview">{{ f.queryRef.bodyPreview }}</pre>
                <!-- paramDiff 상세 (Procedure 한정, expand=paramDiff 응답 시에만) -->
                <div v-if="f.queryRef?.paramDiff" class="svc-param-diff">
                  <div v-if="f.queryRef.paramDiff.unmatched?.length" class="svc-param-diff__row svc-param-diff__row--error">
                    <strong>SQL bind 미매칭:</strong>
                    <code v-for="n in f.queryRef.paramDiff.unmatched" :key="`u-${n}`">{{ n }}</code>
                    <span class="muted">— SCENARIO-procedure.md §5.2 #8 (IN NULL 위험)</span>
                  </div>
                  <div v-if="f.queryRef.paramDiff.orphanColumns?.length" class="svc-param-diff__row svc-param-diff__row--info">
                    <strong>orphan 컬럼:</strong>
                    <code v-for="n in f.queryRef.paramDiff.orphanColumns" :key="`o-${n}`">{{ n }}</code>
                    <span class="muted">— SQL 이 안 쓰는 메시지 컬럼 (정보성)</span>
                  </div>
                </div>
              </li>
            </ul>
          </section>

          <section v-else-if="drawerTab === 'object'" class="svc-section">
            <p v-if="!detail.def.objectId" class="muted">objectId 없음 (대부분 NULL — 매뉴얼 09 §6.1).</p>
            <p v-else-if="!detail.objectRef" class="muted">조회 불가</p>
            <dl v-else class="kv">
              <dt>OBJECT_ID</dt><dd>{{ detail.objectRef.objectId }}</dd>
              <dt>OBJECT_NM</dt><dd>{{ detail.objectRef.objectNm }}</dd>
              <dt>한글명</dt><dd>{{ detail.objectRef.objectDisplayNm }}</dd>
              <dt>경로</dt><dd>{{ detail.objectRef.objectLink }}</dd>
              <dt>타입</dt><dd>{{ detail.objectRef.objectType }}</dd>
            </dl>
          </section>

          <!-- ★ (2026-06-03, dspark) #5: ELA 14건 인프라 checklist 탭 -->
          <section v-else-if="drawerTab === 'elaInfra'" class="svc-section">
            <div v-if="!detail.elaInfra" class="muted">ELA 인프라 정보 없음</div>
            <div v-else>
              <div class="svc-health-summary" :class="detail.elaInfra.summary.missingCount > 0 ? 'svc-health-summary--error' : 'svc-health-summary--ok'">
                <strong>applCd</strong>:
                <code v-if="detail.elaInfra.applCd">{{ detail.elaInfra.applCd }}</code>
                <span v-else class="muted">미등록 (OBJECT 속성 appl_cd 없음 — 모든 평가 skip)</span>
                <span class="muted svc-def-ref">
                  · OK {{ detail.elaInfra.summary.okCount }}
                  · 미등록 {{ detail.elaInfra.summary.missingCount }}
                  · 자동평가 외 {{ detail.elaInfra.summary.unknownCount }}
                </span>
              </div>
              <table class="svc-ela-table">
                <thead>
                  <tr><th>#</th><th>코드</th><th>라벨</th><th>테이블</th><th>등록</th><th>안내</th></tr>
                </thead>
                <tbody>
                  <tr v-for="it in detail.elaInfra.items" :key="it.seq" :class="elaRowClass(it)">
                    <td class="muted">{{ it.seq }}</td>
                    <td><code>{{ it.code }}</code></td>
                    <td>{{ it.label }}</td>
                    <td class="muted">{{ it.table }}</td>
                    <td>
                      <InTag v-if="it.exists === true"  label="OK"    variant="success" size="sm" />
                      <InTag v-else-if="it.exists === false" label="미등록" variant="error" size="sm" />
                      <InTag v-else label="—" variant="default" size="sm" />
                    </td>
                    <td class="svc-ela-hint">
                      <span>{{ it.hint }}</span>
                      <span class="muted svc-def-ref">— {{ it.ref }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </InModal>
    </template>
  </CatalogPage>
</template>

<style scoped>
/* ★ (2026-06-03, dspark): 한 줄 배치 — 검색 textbox 가 grow, 콤보 3개는 고정 폭. */
.svc-filters { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; }
.svc-filters > :deep(.in-sf) { flex: 1 1 320px; min-width: 280px; }
.svc-filters > :deep(.in-sel) { flex: 0 0 160px; }
.svc-filters__search-btn,
.svc-filters__reset-btn { flex: 0 0 auto; align-self: flex-end; margin-bottom: 0; }

.svc-name { display: inline-flex; align-items: center; gap: 6px; }
.svc-note-dot { color: var(--in-text-subtle); }

/* ★ (2026-06-04, dspark): row 액션 — 가로 한 줄 배치. */
.svc-row-actions { display: inline-flex; gap: 6px; align-items: center; justify-content: center; flex-wrap: nowrap; white-space: nowrap; }
.svc-row-actions :deep(.in-btn) { padding: 2px 6px; }
.svc-cmd { color: var(--in-text-accent); }
.muted { color: var(--in-text-subtle); }

.svc-drawer-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }

/* ★ (2026-06-03, dspark): def 탭 chip + tooltip 보조. */
.svc-def-chip { margin-left: 8px; }
.svc-def-help { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; margin-left: 4px; border-radius: 50%; color: var(--in-text-subtle); cursor: help; font-size: 11px; }
.svc-def-ref  { font-size: var(--in-font-size-sm); margin-left: 4px; }

/* ★ (2026-06-03, dspark): 진단 탭 + msg 컬럼 표. */
.svc-health-summary { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 4px; margin-bottom: 12px; }
.svc-health-summary--ok    { background: var(--in-surface-accent-success, #f0f9ff); }
.svc-health-summary--warn  { background: var(--in-surface-accent-warning, #fffbeb); }
.svc-health-summary--error { background: var(--in-surface-accent-error,   #fef2f2); }
.svc-reasons { list-style: none; padding: 0; margin: 8px 0; display: flex; flex-direction: column; gap: 8px; }
.svc-reasons li { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 8px 12px; border-left: 3px solid var(--in-border-default); }
.svc-reason--error { border-left-color: var(--in-text-info-error, #dc2626); }
.svc-reason--warn  { border-left-color: var(--in-text-warning, #d97706); }
.svc-reason__code { font-size: var(--in-font-size-sm); color: var(--in-text-subtle); }
.svc-reason__msg { flex: 1 1 auto; }
.svc-reason__ref { font-size: var(--in-font-size-sm); }
.svc-health-note { font-size: var(--in-font-size-sm); margin-top: 16px; }

.svc-attr-row { padding: 8px 0; border-bottom: 1px solid var(--in-border-default); }
.svc-attr-row:last-child { border-bottom: none; }
.svc-attr-row__head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; }
.svc-msg-columns { width: 100%; border-collapse: collapse; font-size: var(--in-font-size-sm); margin-top: 4px; }
.svc-msg-columns th { text-align: left; padding: 4px 8px; background: var(--in-surface-state-default); font-weight: var(--in-font-weight-medium); color: var(--in-text-subtle); }
.svc-msg-columns td { padding: 4px 8px; border-top: 1px solid var(--in-border-default); }
/* ★ (2026-06-03, dspark): use_yn=N 행 — dimming + subtle 노랑 (warning 톤). 빨강은 진단 탭의 ERROR 전용. */
.svc-msg-columns__off td { opacity: 0.65; background: var(--in-surface-accent-warning, #fffbeb); }

/* ★ (2026-06-03, dspark) #4: paramDiff 결과 표시. */
.svc-param-diff { margin-top: 8px; display: flex; flex-direction: column; gap: 4px; font-size: var(--in-font-size-sm); }
.svc-param-diff__row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 6px 10px; border-left: 3px solid var(--in-border-default); }
.svc-param-diff__row--error { border-left-color: var(--in-text-info-error, #dc2626); background: var(--in-surface-accent-error, #fef2f2); }
.svc-param-diff__row--info  { border-left-color: var(--in-text-subtle); background: var(--in-surface-state-default); }

/* ★ (2026-06-03, dspark) #5: ELA 인프라 14건 표. */
.svc-ela-table { width: 100%; border-collapse: collapse; font-size: var(--in-font-size-sm); margin-top: 12px; }
.svc-ela-table th { text-align: left; padding: 6px 8px; background: var(--in-surface-state-default); color: var(--in-text-subtle); font-weight: var(--in-font-weight-medium); }
.svc-ela-table td { padding: 6px 8px; border-top: 1px solid var(--in-border-default); vertical-align: top; }
.svc-ela-row--critical-missing td { background: var(--in-surface-accent-error, #fef2f2); }
.svc-ela-row--missing td { background: var(--in-surface-accent-warning, #fffbeb); }
.svc-ela-hint { color: var(--in-text-default); }
.svc-loading { padding: 32px; text-align: center; color: var(--in-text-subtle); }
.svc-section { padding: 12px 4px; }

.kv {
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: 8px 12px;
  margin: 0;
}
.kv dt { color: var(--in-text-subtle); font-size: var(--in-font-size-sm); }
.kv dd { margin: 0; color: var(--in-text-default); word-break: break-all; }

.resource-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.resource-list li {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  padding: 8px 10px;
  background: var(--in-bg-default);
  border-radius: var(--in-radius-xs);
}
.resource-list code {
  font-family: var(--in-font-family-mono, ui-monospace);
  font-size: var(--in-font-size-sm);
  color: var(--in-text-default);
}
.body-preview {
  flex-basis: 100%;
  margin: 6px 0 0;
  padding: 8px;
  background: var(--in-bg-white);
  border: 1px solid var(--in-border-default);
  border-radius: var(--in-radius-xxs);
  font-family: var(--in-font-family-mono, ui-monospace);
  font-size: 11px;
  line-height: 16px;
  color: var(--in-text-accent);
  overflow-x: auto;
}
</style>
