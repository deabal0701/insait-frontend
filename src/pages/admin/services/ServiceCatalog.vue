<script setup>
/**
 * ServiceCatalog — 서비스 카탈로그 페이지 (P5-B).
 *
 * 책임:
 *  - FRM_SERVICE_DEF 운영 6,200+ 서비스 리스트 (IST0050_00_R01)
 *  - 필터: 도메인(3자 prefix) multi-select + Command 종류 + 매핑 + 검색어 + 사용여부
 *  - 상단 통계 칩: 총건수 · 도메인별 분포 · Command별 분포
 *  - 행 클릭 → 우측 슬라이드오버 상세 패널 (서비스 정의 + 메시지 binding + 함수 매핑)
 *  - 행 액션: [▶ 테스트] (P5-C 로 이동) · [📋 마법사로 복제] (P5-D 부가)
 *
 * URL: /admin/ist0050 (기존 IST0050 placeholder 라우트 swap)
 *
 * 매뉴얼 근거:
 *  - 99 §5-2.10 — 검색 hint (영문 prefix vs 한글 substring)
 *  - 운영 통계: tables.csv 의 FRM_SERVICE_DEF 분포
 */
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { listServices, getServiceDetail } from '@/services/metaApi';

import InMetaStepHeader from '@/components/feature/meta/InMetaStepHeader.vue';
import InMetaFilterBar from '@/components/feature/meta/InMetaFilterBar.vue';
import InMetaStatsRow from '@/components/feature/meta/InMetaStatsRow.vue';
import InMetaDetailDrawer from '@/components/feature/meta/InMetaDetailDrawer.vue';
import InMetaResourceBadge from '@/components/feature/meta/InMetaResourceBadge.vue';
import InMetaCodeBlock from '@/components/feature/meta/InMetaCodeBlock.vue';

import InSelect from '@/components/ui/InSelect.vue';
import InTextField from '@/components/ui/InTextField.vue';
import InButton from '@/components/ui/InButton.vue';
import InIcon from '@/components/ui/InIcon.vue';

import { META_DOMAINS } from '@/constants/metaDomains';
import { META_CMD_TYPES } from '@/utils/metaNaming';

const router = useRouter();

// ─── 데이터 ──────────────────────────────────────────────────────────────────
const rows = ref([]);
const totalCount = ref(0);
const loading = ref(false);
const loadError = ref(null);
const lastLoadAt = ref(null);

// ─── 필터 상태 ───────────────────────────────────────────────────────────────
const filter = ref({
  keyword: '',
  domain: '',         // 3자 prefix 단일 (multi 는 client 측 추가 필터)
  cmdType: '',        // R/S/P/E
  useYn: '',          // Y/N/'' (전체)
});

// ─── 옵션 ────────────────────────────────────────────────────────────────────
const domainOptions = computed(() => [
  { value: '', label: '전체 도메인' },
  ...META_DOMAINS.map((d) => ({ value: d.code, label: `${d.code} — ${d.label}` })),
]);
const cmdOptions = computed(() => [
  { value: '', label: '전체 Command' },
  ...META_CMD_TYPES.map((c) => ({ value: c.code, label: `${c.code} — ${c.label}` })),
]);
const useYnOptions = [
  { value: '',  label: '전체 (사용/미사용)' },
  { value: 'Y', label: '사용 (Y)' },
  { value: 'N', label: '미사용 (N)' },
];

// ─── 클라이언트 측 필터링 (도메인 prefix / cmdType) ────────────────────────
const filteredRows = computed(() => {
  let out = rows.value;
  if (filter.value.domain) {
    const prefix = filter.value.domain;
    out = out.filter((r) => String(r.sv_def_nm || r.SV_DEF_NM || '').startsWith(prefix));
  }
  if (filter.value.cmdType) {
    const cmd = filter.value.cmdType;
    out = out.filter((r) => {
      const nm = String(r.sv_def_nm || r.SV_DEF_NM || '');
      // suffix 패턴: _R01 / _S01 / _P01 / _E01
      return new RegExp(`_${cmd}\\d+$`).test(nm);
    });
  }
  return out;
});

// ─── 통계 ───────────────────────────────────────────────────────────────────
const stats = computed(() => {
  const total = filteredRows.value.length;
  const cmdDist = { R: 0, S: 0, P: 0, E: 0, etc: 0 };
  const domainSet = new Set();
  for (const r of filteredRows.value) {
    const nm = String(r.sv_def_nm || r.SV_DEF_NM || '');
    const m = nm.match(/_([RSPE])\d+$/);
    if (m) cmdDist[m[1]] += 1;
    else cmdDist.etc += 1;
    if (nm.length >= 3) domainSet.add(nm.slice(0, 3));
  }
  return [
    { label: '총 서비스', value: total.toLocaleString(), tone: 'brand' },
    { label: '도메인', value: domainSet.size, tone: 'default' },
    { label: '조회 R', value: cmdDist.R, tone: 'default' },
    { label: '저장 S', value: cmdDist.S, tone: 'success' },
    { label: '프로시저 P', value: cmdDist.P, tone: 'default' },
    { label: '결재 E', value: cmdDist.E, tone: 'warning' },
  ];
});

// ─── 로딩 ───────────────────────────────────────────────────────────────────
async function loadServices() {
  loading.value = true;
  loadError.value = null;
  try {
    const { ok, rows: r, totalCount: tc } = await listServices({
      keyword: filter.value.keyword,
      useYn: filter.value.useYn,
      pageSize: 500, // P5-B: 500 행까지 일괄 로드 (도메인/cmd 클라이언트 필터링)
    });
    if (!ok) {
      loadError.value = '서버 응답 실패 — 백엔드 연결 또는 권한 확인';
      rows.value = [];
      totalCount.value = 0;
    } else {
      rows.value = r;
      totalCount.value = tc;
      lastLoadAt.value = new Date().toISOString();
    }
  } catch (e) {
    loadError.value = e?.message || '네트워크 오류';
    rows.value = [];
    totalCount.value = 0;
  } finally {
    loading.value = false;
  }
}

onMounted(loadServices);

function onResetFilter() {
  filter.value = { keyword: '', domain: '', cmdType: '', useYn: '' };
}

// ─── 행 액션 ────────────────────────────────────────────────────────────────
const drawerOpen = ref(false);
const detail = ref({ row: null, def: null, msgBindings: [], funcMap: [], loading: false, error: null });

async function onRowClick(row) {
  const svName = row.sv_def_nm || row.SV_DEF_NM;
  if (!svName) return;
  drawerOpen.value = true;
  detail.value = { row, def: null, msgBindings: [], funcMap: [], loading: true, error: null };
  try {
    const result = await getServiceDetail(svName);
    detail.value = {
      row,
      def: result.def || row,
      msgBindings: result.msgBindings || [],
      funcMap: result.funcMap || [],
      loading: false,
      error: result.ok ? null : '상세 조회 실패 — 백엔드 미연결 또는 권한',
    };
  } catch (e) {
    detail.value = { ...detail.value, loading: false, error: e?.message || '오류' };
  }
}

function onTest(row) {
  const svName = row.sv_def_nm || row.SV_DEF_NM;
  if (!svName) return;
  // P5-C 테스터 페이지 (아직 미구현). 임시 alert.
  router.push({ name: 'SERVICE_TESTER', params: { serviceId: svName } }).catch(() => {
    // 라우트 미정 시
    if (typeof window !== 'undefined') {
      window.alert(`서비스 테스터 (P5-C 예정): ${svName}`);
    }
  });
}

function onCloneToWizard(row) {
  const svName = row.sv_def_nm || row.SV_DEF_NM;
  if (typeof window !== 'undefined') {
    window.alert(`마법사로 복제 (P5-D 예정): ${svName}\n현 자원의 7-char prefix 를 새 화면 ID 로 자동 채워 마법사 진입`);
  }
}

// ─── 표시 helper ────────────────────────────────────────────────────────────
function extractDomain(svName) {
  const nm = String(svName || '');
  return nm.length >= 3 ? nm.slice(0, 3) : '—';
}
function extractCmdSuffix(svName) {
  const m = String(svName || '').match(/_([RSPE])\d+$/);
  return m ? m[1] : '?';
}
function cmdLabel(suffix) {
  const info = META_CMD_TYPES.find((c) => c.code === suffix);
  return info?.label || '—';
}

const detailJson = computed(() => {
  if (!detail.value.def) return '';
  return JSON.stringify(detail.value.def, null, 2);
});
</script>

<template>
  <div class="svc-cat">
    <InMetaStepHeader
      title="서비스 카탈로그"
      :code="totalCount ? `총 ${totalCount.toLocaleString()} 건` : ''"
      subtitle="운영 FRM_SERVICE_DEF 의 모든 서비스 한 화면에서 조회 · 필터 · 테스트 · 마법사 복제 진입점."
    />

    <!-- ─── 통계 ─── -->
    <InMetaStatsRow :stats="stats" />

    <!-- ─── 필터 바 ─── -->
    <InMetaFilterBar sticky>
      <div class="svc-cat__filter-field">
        <InTextField
          v-model="filter.keyword"
          label="검색어 (서비스명 / 화면 ID)"
          input="예: AUT0030 또는 인사"
          layout="vertical"
          size="md"
          show-label
          @keyup.enter="loadServices"
        />
      </div>
      <div class="svc-cat__filter-field">
        <InSelect
          v-model="filter.domain"
          :options="domainOptions"
          label="도메인 (3자)"
          layout="vertical"
          size="md"
          filterable
        />
      </div>
      <div class="svc-cat__filter-field">
        <InSelect
          v-model="filter.cmdType"
          :options="cmdOptions"
          label="Command 종류"
          layout="vertical"
          size="md"
        />
      </div>
      <div class="svc-cat__filter-field">
        <InSelect
          v-model="filter.useYn"
          :options="useYnOptions"
          label="사용여부"
          layout="vertical"
          size="md"
        />
      </div>

      <template #actions>
        <InButton
          variant="default"
          size="sm"
          :left-icon-show="false"
          :right-icon-show="false"
          @click="onResetFilter"
        >
          초기화
        </InButton>
        <InButton
          variant="primary"
          size="sm"
          :left-icon-show="false"
          :right-icon-show="false"
          :disabled="loading"
          @click="loadServices"
        >
          {{ loading ? '조회 중…' : '조회' }}
        </InButton>
      </template>
    </InMetaFilterBar>

    <!-- ─── 로딩/에러/빈상태 ─── -->
    <div v-if="loadError" class="svc-cat__error">
      <InIcon name="status-warning" :size="14" />
      <span>{{ loadError }}</span>
      <span class="svc-cat__error-hint">— 백엔드 미연결 환경에서는 빈 리스트. <code>IST0050_00_R01</code> 서비스 응답 확인.</span>
    </div>
    <div v-else-if="loading" class="svc-cat__empty">조회 중…</div>
    <div v-else-if="filteredRows.length === 0" class="svc-cat__empty">
      <InIcon name="info" :size="14" />
      <span>조건에 맞는 서비스가 없습니다. 필터를 조정하세요.</span>
    </div>

    <!-- ─── 리스트 ─── -->
    <div v-else class="svc-cat__list-wrap">
      <table class="svc-cat__table">
        <thead>
          <tr>
            <th style="width: 24%;">서비스명</th>
            <th style="width: 9%;">도메인</th>
            <th style="width: 10%;">Command</th>
            <th style="width: 22%;">CMD Class</th>
            <th style="width: 14%;">매핑 / func_nm</th>
            <th style="width: 7%;">사용</th>
            <th style="width: 14%;" class="svc-cat__th-actions">액션</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in filteredRows" :key="r.sv_def_oid || r.SV_DEF_OID || i" class="svc-cat__row" @click="onRowClick(r)">
            <td class="svc-cat__col-name">
              <code>{{ r.sv_def_nm || r.SV_DEF_NM }}</code>
            </td>
            <td>
              <span class="svc-cat__chip">{{ extractDomain(r.sv_def_nm || r.SV_DEF_NM) }}</span>
            </td>
            <td>
              <span class="svc-cat__chip svc-cat__chip--cmd" :class="`svc-cat__chip--cmd-${extractCmdSuffix(r.sv_def_nm || r.SV_DEF_NM)}`">
                {{ extractCmdSuffix(r.sv_def_nm || r.SV_DEF_NM) }} · {{ cmdLabel(extractCmdSuffix(r.sv_def_nm || r.SV_DEF_NM)) }}
              </span>
            </td>
            <td class="svc-cat__col-class"><code>{{ r.cmd_class_nm || r.CMD_CLASS_NM || '—' }}</code></td>
            <td class="svc-cat__col-map">
              <code>{{ r.func_nm || r.FUNC_NM || '—' }}</code>
              <span class="svc-cat__col-map-type">{{ r.sv_map_type_cd || r.SV_MAP_TYPE_CD || '—' }}</span>
            </td>
            <td>
              <span v-if="(r.use_yn || r.USE_YN) === 'Y'" class="svc-cat__chip svc-cat__chip--use">사용</span>
              <span v-else class="svc-cat__chip svc-cat__chip--unuse">미사용</span>
            </td>
            <td class="svc-cat__col-actions">
              <button type="button" class="svc-cat__act-btn" title="테스트" @click.stop="onTest(r)">
                <!-- ★ (2026-05-31, dspark): arrow-right(여백 0, 박스 꽉 찬 굵은 꺾쇠) → chevron-right
                     (24×24 내부 여백 보유 → 작은 꺾쇠). content-copy(복제) 와 시각 무게 정합. -->
                <InIcon name="chevron-right" :size="12" /> 테스트
              </button>
              <button type="button" class="svc-cat__act-btn" title="마법사로 복제" @click.stop="onCloneToWizard(r)">
                <InIcon name="content-copy" :size="12" /> 복제
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <p class="svc-cat__list-footer">
        총 <strong>{{ filteredRows.length.toLocaleString() }}</strong>개 표시 · 전체 <strong>{{ totalCount.toLocaleString() }}</strong>개
        <span v-if="lastLoadAt"> · 마지막 조회: {{ new Date(lastLoadAt).toLocaleString() }}</span>
      </p>
    </div>

    <!-- ─── 상세 드로어 ─── -->
    <InMetaDetailDrawer v-model:open="drawerOpen" :title="detail.row ? (detail.row.sv_def_nm || detail.row.SV_DEF_NM || '상세') : '상세'" width="480px">
      <template v-if="detail.row">
        <section class="svc-cat__detail-section">
          <h4>기본</h4>
          <dl class="svc-cat__detail-dl">
            <dt>서비스명</dt><dd><code>{{ detail.row.sv_def_nm || detail.row.SV_DEF_NM }}</code></dd>
            <dt>도메인</dt><dd>{{ extractDomain(detail.row.sv_def_nm || detail.row.SV_DEF_NM) }}</dd>
            <dt>Command 종류</dt><dd>{{ extractCmdSuffix(detail.row.sv_def_nm || detail.row.SV_DEF_NM) }} · {{ cmdLabel(extractCmdSuffix(detail.row.sv_def_nm || detail.row.SV_DEF_NM)) }}</dd>
            <dt>CMD Class</dt><dd><code>{{ detail.row.cmd_class_nm || detail.row.CMD_CLASS_NM || '—' }}</code></dd>
            <dt>매핑 종류</dt><dd><code>{{ detail.row.sv_map_type_cd || detail.row.SV_MAP_TYPE_CD || '—' }}</code></dd>
            <dt>func_nm</dt><dd><code>{{ detail.row.func_nm || detail.row.FUNC_NM || '—' }}</code></dd>
            <dt>사용여부</dt><dd>{{ detail.row.use_yn || detail.row.USE_YN || '—' }}</dd>
          </dl>
        </section>

        <section v-if="detail.msgBindings.length" class="svc-cat__detail-section">
          <h4>메시지 binding ({{ detail.msgBindings.length }})</h4>
          <ul class="svc-cat__detail-list">
            <li v-for="(b, i) in detail.msgBindings" :key="i">
              <InMetaResourceBadge
                :kind="i === 0 ? 'MSG_IN' : 'MSG_OUT'"
                :resource-id="b.sv_attr_nm || b.value_type || b.SV_ATTR_NM || '—'"
                status="saved"
              />
            </li>
          </ul>
        </section>

        <section v-if="detail.funcMap.length" class="svc-cat__detail-section">
          <h4>함수 매핑 ({{ detail.funcMap.length }})</h4>
          <ul class="svc-cat__detail-list">
            <li v-for="(f, i) in detail.funcMap" :key="i">
              <code>{{ f.func_nm || f.FUNC_NM }}</code>
              <span class="svc-cat__detail-hint">· {{ f.sv_map_type_cd || f.SV_MAP_TYPE_CD }}</span>
            </li>
          </ul>
        </section>

        <section class="svc-cat__detail-section">
          <h4>raw JSON</h4>
          <InMetaCodeBlock :code="detailJson" lang="json" max-height="240px" />
        </section>

        <p v-if="detail.error" class="svc-cat__detail-error">
          <InIcon name="status-warning" :size="12" /> {{ detail.error }}
        </p>
      </template>

      <template #footer>
        <InButton
          variant="default"
          size="sm"
          :left-icon-show="false"
          :right-icon-show="false"
          @click="onCloneToWizard(detail.row)"
        >
          마법사로 복제
        </InButton>
        <InButton
          variant="primary"
          size="sm"
          :left-icon-show="false"
          :right-icon-show="false"
          @click="onTest(detail.row)"
        >
          <!-- ★ (2026-05-31, dspark): unicode ▶ → InIcon chevron-right (테이블 행 액션과 아이콘 일관성). -->
          <InIcon name="chevron-right" :size="12" /> 테스트
        </InButton>
      </template>
    </InMetaDetailDrawer>
  </div>
</template>

<style scoped>
.svc-cat {
  display: flex;
  flex-direction: column;
  gap: 14px;
  font-family: var(--in-font-family-body);
}

.svc-cat__filter-field { flex: 1 1 200px; min-width: 0; }

/* === Error / Empty === */
.svc-cat__error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--in-surface-warning, #fffbeb);
  border: 1px solid var(--in-text-warning);
  border-radius: var(--in-radius-xs);
  font-size: var(--in-font-size-sm);
  color: var(--in-text-warning);
}
.svc-cat__error-hint { color: var(--in-text-default); font-size: var(--in-font-size-xs); }
.svc-cat__error-hint code { font-family: 'Consolas', monospace; }

.svc-cat__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 16px;
  background: var(--in-surface-default, #fafafa);
  border: 1px dashed var(--in-border-default);
  border-radius: var(--in-radius-sm);
  font-size: var(--in-font-size-sm);
  color: var(--in-text-subtle);
}

/* === Table === */
.svc-cat__list-wrap {
  background: var(--in-surface-overlay, #ffffff);
  border: 1px solid var(--in-border-default);
  border-radius: var(--in-radius-sm);
  overflow: hidden;
}
.svc-cat__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--in-font-size-sm);
}
.svc-cat__table thead th {
  text-align: left;
  padding: 10px 12px;
  background: var(--in-surface-default, #fafafa);
  border-bottom: 1px solid var(--in-border-default);
  font-weight: var(--in-font-weight-medium);
  color: var(--in-text-subtle);
  font-size: var(--in-font-size-xs);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  white-space: nowrap;
}
.svc-cat__th-actions { text-align: right; }
.svc-cat__row {
  cursor: pointer;
  transition: background 80ms ease;
}
.svc-cat__row:hover {
  background: var(--in-bg-accent-subtle, var(--in-brand-50, #e1f5fc));
}
.svc-cat__row td {
  /* ★ (2026-05-31, dspark): 8px → 5px 행 높이 콤팩트화 (리스트 사이즈 축소 요청). */
  padding: 5px 12px;
  border-bottom: 1px solid var(--in-border-default);
  vertical-align: middle;
}
.svc-cat__row:last-child td { border-bottom: none; }

.svc-cat__col-name code {
  font-family: 'Consolas', 'Menlo', monospace;
  color: var(--in-text-accent);
  font-weight: var(--in-font-weight-medium);
  /* ★ (2026-05-31, dspark): 서비스명 폰트 sm → xs (리스트 사이즈 축소 요청). */
  font-size: var(--in-font-size-xs);
}
.svc-cat__col-class code,
.svc-cat__col-map code {
  font-family: 'Consolas', monospace;
  color: var(--in-text-default);
  font-size: var(--in-font-size-xs);
}
.svc-cat__col-map { display: flex; flex-direction: column; gap: 2px; }
.svc-cat__col-map-type {
  font-size: 10px;
  color: var(--in-text-subtle);
  font-family: 'Consolas', monospace;
  text-transform: uppercase;
}

.svc-cat__chip {
  display: inline-flex;
  align-items: center;
  /* ★ (2026-05-31, dspark): 좁은 칸(사용 등)에서 "미사용" 두 줄 줄바꿈 방지. */
  white-space: nowrap;
  padding: 2px 8px;
  border-radius: var(--in-radius-full);
  background: var(--in-surface-default, #fafafa);
  border: 1px solid var(--in-border-default);
  font-size: var(--in-font-size-xs);
  color: var(--in-text-subtle);
  font-family: 'Consolas', monospace;
}
.svc-cat__chip--cmd {
  font-family: var(--in-font-family-body);
}
.svc-cat__chip--cmd-R { background: var(--in-bg-accent-subtle, var(--in-brand-50, #e1f5fc)); border-color: var(--in-brand); color: var(--in-brand); }
.svc-cat__chip--cmd-S { background: var(--in-surface-success, #e4faf0); border-color: var(--in-text-success); color: var(--in-text-success); }
.svc-cat__chip--cmd-P { background: var(--in-surface-default, #fafafa); border-color: var(--in-border-default); color: var(--in-text-default); }
.svc-cat__chip--cmd-E { background: var(--in-surface-warning, #fffbeb); border-color: var(--in-text-warning); color: var(--in-text-warning); }

.svc-cat__chip--use { background: var(--in-surface-success, #e4faf0); border-color: var(--in-text-success); color: var(--in-text-success); }
.svc-cat__chip--unuse { background: var(--in-surface-default, #fafafa); border-color: var(--in-border-default); color: var(--in-text-subtler); }

.svc-cat__col-actions { text-align: right; white-space: nowrap; }
.svc-cat__act-btn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 8px;
  margin-left: 4px;
  border: 1px solid var(--in-border-default);
  border-radius: var(--in-radius-xs);
  background: var(--in-surface-overlay, #ffffff);
  color: var(--in-text-default);
  font-size: var(--in-font-size-xs);
  cursor: pointer;
  transition: border-color 120ms ease, color 120ms ease;
}
.svc-cat__act-btn:hover {
  border-color: var(--in-brand);
  color: var(--in-brand);
}

.svc-cat__list-footer {
  margin: 0;
  padding: 8px 14px;
  background: var(--in-surface-default, #fafafa);
  border-top: 1px solid var(--in-border-default);
  font-size: var(--in-font-size-xs);
  color: var(--in-text-subtle);
}
.svc-cat__list-footer strong { color: var(--in-text-accent); font-weight: var(--in-font-weight-medium); }

/* === Detail drawer === */
.svc-cat__detail-section { display: flex; flex-direction: column; gap: 6px; }
.svc-cat__detail-section h4 {
  margin: 0;
  font-size: var(--in-font-size-xs);
  color: var(--in-text-subtle);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  font-weight: var(--in-font-weight-medium);
}
.svc-cat__detail-dl {
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: 4px 10px;
  margin: 0;
}
.svc-cat__detail-dl dt {
  font-size: var(--in-font-size-xs);
  color: var(--in-text-subtle);
}
.svc-cat__detail-dl dd {
  margin: 0;
  font-size: var(--in-font-size-sm);
  color: var(--in-text-default);
}
.svc-cat__detail-dl code {
  font-family: 'Consolas', monospace;
  color: var(--in-text-accent);
}
.svc-cat__detail-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.svc-cat__detail-list code {
  font-family: 'Consolas', monospace;
  color: var(--in-text-accent);
}
.svc-cat__detail-hint {
  font-size: var(--in-font-size-xs);
  color: var(--in-text-subtle);
  margin-left: 4px;
}
.svc-cat__detail-error {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--in-font-size-xs);
  color: var(--in-text-warning);
}
</style>
