<script setup>
/**
 * Step2Sql — SQL 본문 등록 (P2 본격 구현).
 *
 * 책임:
 *  1. SQL 본문 입력 (monospace textarea) + 실시간 파싱 (params/outColumns/targetTable)
 *  2. 파라미터 그리드 — TYPE_CD 4종 콤보 + IN/OUT/INOUT 콤보
 *  3. 바인딩 방식 (NAME 권장 / ADDR) + 사용여부 + 코멘트
 *  4. F_FRM_CODE_NM N+1 패턴 경고 (99 §3.5)
 *  5. ANSI 비호환 LIKE concat 패턴 hint (99 §2.4 — Phase 3 DB 변경 영향)
 *  6. 메타 등록 (IST0010_00_S04 envelope 송신) + OID 캡처 + 검증 SQL 채움
 *  7. ServiceDefItem race 가드 — submit 중 button disable, idempotency key (services/metaApi 내장)
 *
 * 매뉴얼 근거:
 *  - SUMMARY §5 — SQL 등록 + 파라미터·바인딩
 *  - 99 §5.1 — "상태" 라벨 정정 ("바인딩 방식")
 *  - 99 §3.5 — F_FRM_CODE_NM 행마다 호출 (9초)
 *  - 99 §2.4 — Oracle NULL concat 트릭 (Phase 3 정정 대상)
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useMetaWizardStore } from '@/stores/metaWizard';
import { saveQuery, extractInsertedOid, classifyMetaError, getMetaErrorGuide, META_SERVICES } from '@/services/metaApi';
import { buildEnvelope } from '@/services/envelope';

import InSelect from '@/components/ui/InSelect.vue';
import InTextField from '@/components/ui/InTextField.vue';
import InIcon from '@/components/ui/InIcon.vue';
import InMetaStepHeader from '@/components/feature/meta/InMetaStepHeader.vue';
import InMetaStepSection from '@/components/feature/meta/InMetaStepSection.vue';
import InMetaStepActions from '@/components/feature/meta/InMetaStepActions.vue';
import InMetaErrorCard from '@/components/feature/meta/InMetaErrorCard.vue';

const store = useMetaWizardStore();
const { sql, sqlStep, derivedIds, currentVerifyQueries } = storeToRefs(store);

// ─── 폼 상태 (store sql 외 추가 필드) ───────────────────────────────────────
const form = ref({
  displayNm: '',
  dataSourceNm: 'jdbc/h5prd',
  useYn: 'Y',
  comments: '',
});

// ─── SQL 본문 변경 → 파싱 트리거 ────────────────────────────────────────────
let parseTimer = null;
watch(() => sql.value.body, () => {
  if (parseTimer) clearTimeout(parseTimer);
  parseTimer = setTimeout(() => store.syncSqlDerivations(), 120);
});
onUnmounted(() => { if (parseTimer) clearTimeout(parseTimer); });

// 화면 ID prefix 가 확정된 후 진입 → 표시명 기본값 자동 채움 (1회)
onMounted(() => {
  if (!form.value.displayNm && derivedIds.value) {
    form.value.displayNm = `${derivedIds.value.screenId} ${store.cmdInfo?.label} SQL`;
  }
  refreshVerifyQueries();
});

// ─── 경고 검출 ──────────────────────────────────────────────────────────────
const warnings = computed(() => {
  const out = [];
  const body = sql.value.body || '';
  if (/F_FRM_CODE_NM\s*\(/i.test(body)) {
    out.push({
      tone: 'warning',
      title: 'F_FRM_CODE_NM N+1 패턴 감지',
      detail: '행마다 PL/SQL 함수 호출이 발생해 운영 4,700행 기준 9초 소요 (매뉴얼 99 §3.5). LEFT JOIN FRM_CODE 로 1회 처리 권장.',
    });
  }
  if (/'%'\s*\|\|\s*:[A-Za-z_]\w*\s*\|\|\s*'%'/.test(body)) {
    out.push({
      tone: 'info',
      title: 'ANSI 비호환 LIKE concat 패턴',
      detail: 'Oracle 의 NULL concat 트릭 — PostgreSQL/MySQL 이전 시 빈 결과 (99 §2.4). 권장: WHERE (:k IS NULL OR col LIKE \'%\' || :k || \'%\').',
    });
  }
  if (/\bSELECT\s+\*/i.test(body)) {
    out.push({
      tone: 'info',
      title: 'SELECT * 사용',
      detail: '메시지 컬럼 자동추출이 불가능합니다. 명시 컬럼 나열 또는 alias 권장.',
    });
  }
  return out;
});

// ─── 검증 SQL 패널 갱신 ─────────────────────────────────────────────────────
function refreshVerifyQueries() {
  const id = derivedIds.value?.sqlName;
  if (!id) {
    currentVerifyQueries.value = [];
    return;
  }
  currentVerifyQueries.value = [
    {
      title: '쿼리 정의 + 본문 확인',
      sql: `SELECT q.query_def_id, q.query_name, q.use_yn, q.status, b.query_string
  FROM FRM_QUERY_DEF       q
  LEFT JOIN FRM_QUERY_DEF_BODY b ON b.query_def_id = q.query_def_id
 WHERE q.query_name = '${id}';`,
      expectation: '1행, query_string 에 등록한 SQL 본문',
    },
    {
      title: '파라미터 확인',
      sql: `SELECT query_param_name, query_param_seq, query_param_type, query_param_inout_type
  FROM FRM_QUERY_DEF_PARAM
 WHERE query_def_id = (SELECT query_def_id FROM FRM_QUERY_DEF WHERE query_name = '${id}')
 ORDER BY query_param_seq;`,
      expectation: `${sql.value.params.length}행 (${sql.value.params.map((p) => p.name).join(', ') || '—'})`,
    },
  ];
}
watch([() => derivedIds.value?.sqlName, () => sql.value.params.length], refreshVerifyQueries);

// ─── envelope payload 빌더 ──────────────────────────────────────────────────
/**
 * AS-IS IST0010_00_S04 envelope BODY 구조 (SUMMARY §5.5 기반 가설).
 * TODO: 실 AS-IS fetch 캡처와 정합 확인 후 슬롯명 정정 (현재 ME_IST0010_01/02/03 가정).
 */
function buildSqlPayload() {
  const id = derivedIds.value?.sqlName;
  return {
    ME_IST0010_01: [{
      sStatus: 'I',
      _seq: 1,
      sDelete: '',
      query_name: id,
      query_display_nm: form.value.displayNm,
      use_yn: form.value.useYn,
      status: sql.value.bindType,           // NAME / ADDR — 99 §5.1 정합 라벨
      data_source_nm: form.value.dataSourceNm,
      comments: form.value.comments,
      company_cd: '01',
    }],
    ME_IST0010_02: [{
      sStatus: 'I',
      _seq: 1,
      sDelete: '',
      query_string: sql.value.body,
    }],
    ME_IST0010_03: sql.value.params.map((p, i) => ({
      sStatus: 'I',
      _seq: i + 1,
      sDelete: '',
      query_param_name: p.name,
      query_param_seq: i + 1,
      query_param_type: p.typeCd,
      query_param_inout_type: p.inout,
    })),
  };
}

// ─── 진행 가능 여부 ─────────────────────────────────────────────────────────
const canSubmit = computed(() => {
  if (sqlStep.value.status === 'in_progress') return false;
  if (!sql.value.body.trim()) return false;
  if (!form.value.displayNm.trim()) return false;
  if (!derivedIds.value?.sqlName) return false;
  return true;
});

// ─── 등록 실행 ──────────────────────────────────────────────────────────────
const errorGuide = ref(null);
async function onRegister() {
  errorGuide.value = null;
  sqlStep.value.status = 'in_progress';
  const payload = buildSqlPayload();
  const envelopePreview = buildEnvelope(META_SERVICES.QUERY_SAVE, payload);
  try {
    const { ok, response } = await saveQuery(payload);
    if (ok) {
      const oid = extractInsertedOid(response, 'ME_SAVE_RESULT', 'query_def_id')
        ?? extractInsertedOid(response, 'ME_SAVE_RESULT', 'object_id');
      store.markStepCompleted('sql', { insertedOid: oid, envelope: envelopePreview, response });
    } else {
      const cat = classifyMetaError(response);
      errorGuide.value = { category: cat, ...getMetaErrorGuide(cat) };
      store.markStepError('sql', `${errorGuide.value.title}: ${errorGuide.value.hint}`, { envelope: envelopePreview, response });
    }
  } catch (e) {
    errorGuide.value = { category: 'NETWORK', title: '네트워크 오류', hint: e?.message || '서버 응답이 없습니다. 백엔드 연결 상태를 확인하세요.' };
    store.markStepError('sql', errorGuide.value.title + ': ' + errorGuide.value.hint, { envelope: envelopePreview, response: null });
  }
}

// ─── 등록 우회 (백엔드 미연결 학습 모드) ────────────────────────────────────
function onSkipForLearning() {
  if (!confirm('백엔드 등록을 건너뛰고 다음 단계로 진행합니다 (학습 모드). 실제 DB 에 등록되지 않습니다.')) return;
  store.markStepCompleted('sql', { insertedOid: null });
}

// ─── UI helper ──────────────────────────────────────────────────────────────
const TYPE_CD_OPTS = [
  { value: 'string',  label: 'string (VARCHAR2)' },
  { value: 'numeric', label: 'numeric (NUMBER)' },
  { value: 'date',    label: 'date (DATE/TIMESTAMP)' },
  { value: 'clob',    label: 'clob (대용량 텍스트)' },
];
const INOUT_OPTS = [
  { value: 'IN',    label: 'IN — 입력 전용' },
  { value: 'OUT',   label: 'OUT — 출력 (PROCEDURE)' },
  { value: 'INOUT', label: 'INOUT — 양방향' },
];
const BIND_TYPE_OPTS = [
  { value: 'NAME', label: '이름바인딩 :name (권장)' },
  { value: 'ADDR', label: '주소바인딩 ? (positional)' },
];
const USE_YN_OPTS = [
  { value: 'Y', label: '사용' },
  { value: 'N', label: '미사용' },
];

function removeParam(name) {
  sql.value.params = sql.value.params.filter((p) => p.name !== name);
}

const sqlPlaceholder = `-- 예시: TST0001 자기참조 메타 조회
SELECT object_id
     , object_nm
     , object_display_nm
     , object_type
     , object_link
  FROM FRM_EXECUTABLE_OBJECT
 WHERE company_cd = :company_cd
   AND object_nm LIKE '%' || :keyword || '%'
 ORDER BY object_nm`;
</script>

<template>
  <div class="step2">
    <InMetaStepHeader
      prefix="②"
      title="SQL 관리"
      :code="derivedIds?.sqlName || '(ID 미확정)'"
      subtitle="SQL 본문이 컬럼 SSOT 가 됩니다. ③ Message / ④ Entity 는 이 SQL 에서 자동 가져옵니다."
    />

    <!-- ─── [1] SQL 본문 ─── -->
    <InMetaStepSection step-no="1" title="SQL 본문">
      <template #hint>
        이름바인딩 권장 — <code>:param</code> 형식
      </template>

      <div class="step2__sql-editor">
        <textarea
          v-model="sql.body"
          class="step2__sql-area"
          :placeholder="sqlPlaceholder"
          rows="14"
          spellcheck="false"
        />
        <div class="step2__sql-bar">
          <span class="step2__chip" :class="{ 'step2__chip--active': sql.params.length > 0 }">
            <InIcon name="bullet-dot" :size="10" />
            파라미터 <strong>{{ sql.params.length }}</strong>
          </span>
          <span class="step2__chip" :class="{ 'step2__chip--active': sql.outColumns.length > 0 }">
            <InIcon name="bullet-dot" :size="10" />
            결과 컬럼 <strong>{{ sql.outColumns.length }}</strong>
          </span>
          <span class="step2__chip" :class="{ 'step2__chip--active': !!sql.targetTable }">
            <InIcon name="bullet-dot" :size="10" />
            대상 테이블 <strong>{{ sql.targetTable || '—' }}</strong>
          </span>
          <span class="step2__chip-sep" />
          <span class="step2__chip-meta">{{ sql.body.length }}자 · {{ sql.body.split('\n').length }}줄</span>
        </div>
      </div>

      <!-- 경고 / hint -->
      <ul v-if="warnings.length" class="step2__warnings">
        <li v-for="(w, i) in warnings" :key="i" :class="`step2__warning step2__warning--${w.tone}`">
          <InIcon
            :name="w.tone === 'warning' ? 'status-warning' : 'info'"
            :size="14"
          />
          <span>
            <strong>{{ w.title }}</strong>
            <span>{{ w.detail }}</span>
          </span>
        </li>
      </ul>
    </InMetaStepSection>

    <!-- ─── [2] 파라미터 ─── -->
    <InMetaStepSection step-no="2" :title="`파라미터 (${sql.params.length})`">
      <template #hint>SQL 본문에서 <code>:name</code> 자동 추출. TYPE_CD 는 4종 표준만 (string/numeric/date/clob).</template>

      <div v-if="sql.params.length === 0" class="step2__empty">
        SQL 본문에 <code>:param</code> 형식의 바인드 변수가 없습니다.
      </div>
      <table v-else class="step2__params-table">
        <thead>
          <tr>
            <th style="width: 32px;">#</th>
            <th>파라미터 이름</th>
            <th style="width: 200px;">TYPE_CD</th>
            <th style="width: 180px;">IN/OUT 유형</th>
            <th style="width: 60px;">삭제</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(p, i) in sql.params" :key="p.name">
            <td class="step2__params-num">{{ i + 1 }}</td>
            <td class="step2__params-name"><code>:{{ p.name }}</code></td>
            <td>
              <select v-model="p.typeCd" class="step2__select-mini">
                <option v-for="o in TYPE_CD_OPTS" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
            </td>
            <td>
              <select v-model="p.inout" class="step2__select-mini">
                <option v-for="o in INOUT_OPTS" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
            </td>
            <td>
              <button type="button" class="step2__icon-btn" :title="`:${p.name} 삭제 (SQL 에서도 제거하세요)`" @click="removeParam(p.name)">
                <InIcon name="close" :size="14" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </InMetaStepSection>

    <!-- ─── [3] 메타 옵션 ─── -->
    <InMetaStepSection step-no="3" title="메타 옵션">
      <template #hint>바인딩 방식 콤보 라벨은 99 §5.1 정합 정정 ("상태" → "바인딩 방식")</template>

      <div class="step2__opts-grid">
        <InTextField
          v-model="form.displayNm"
          label="화면표시명"
          layout="vertical"
          size="md"
          placeholder="예: TST0001 자기참조 메타 조회"
          show-required
        />
        <InSelect
          v-model="sql.bindType"
          :options="BIND_TYPE_OPTS"
          label="바인딩 방식"
          layout="vertical"
          size="md"
        />
        <InSelect
          v-model="form.useYn"
          :options="USE_YN_OPTS"
          label="사용여부"
          layout="vertical"
          size="md"
        />
        <InTextField
          v-model="form.dataSourceNm"
          label="데이터소스"
          layout="vertical"
          size="md"
          placeholder="jdbc/h5prd"
        />
        <div class="step2__opts-full">
          <label class="step2__label">코멘트</label>
          <textarea
            v-model="form.comments"
            class="step2__sql-area step2__sql-area--small"
            placeholder="용도·주의사항 등"
            rows="2"
          />
        </div>
      </div>
    </InMetaStepSection>

    <!-- ─── [4] 등록 ─── -->
    <InMetaStepActions
      submit-label="SQL 메타 등록"
      :status="sqlStep.status"
      :can-submit="canSubmit"
      :can-skip="!!sql.body.trim()"
      :success-label="`등록 완료 (OID: ${sqlStep.insertedOid || '미수신'})`"
      @submit="onRegister"
      @skip="onSkipForLearning"
    />

    <InMetaErrorCard
      v-if="errorGuide"
      :title="errorGuide.title"
      :hint="errorGuide.hint"
      :category="errorGuide.category"
      tone="error"
    />
  </div>
</template>

<style scoped>
.step2 {
  display: flex;
  flex-direction: column;
  gap: 18px;
  font-family: var(--in-font-family-body);
}

/* Header / Section / Actions / ErrorCard 공통 패턴은 InMetaStep* 으로 추출 (2026-05-29).
   본 파일은 SQL 에디터·파라미터 그리드·메타 옵션 등 화면 고유 CSS 만 유지. */

/* === SQL 에디터 === */
.step2__sql-editor { display: flex; flex-direction: column; gap: 0; }
.step2__sql-area {
  font-family: 'Consolas', 'Menlo', 'Source Code Pro', monospace;
  font-size: var(--in-font-size-sm);
  line-height: 1.5;
  padding: 12px 14px;
  border: 1px solid var(--in-border-input, var(--in-border-default));
  border-radius: var(--in-radius-xs) var(--in-radius-xs) 0 0;
  resize: vertical;
  width: 100%;
  background: var(--in-surface-default, #fafafa);
  color: var(--in-text-accent);
  tab-size: 2;
  min-height: 240px;
  outline: none;
}
.step2__sql-area:focus {
  border-color: var(--in-brand);
  background: var(--in-surface-overlay, #ffffff);
}
.step2__sql-area--small {
  border-radius: var(--in-radius-xs);
  min-height: 60px;
}
.step2__sql-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 6px 10px;
  background: var(--in-surface-default, #fafafa);
  border: 1px solid var(--in-border-input, var(--in-border-default));
  border-top: none;
  border-radius: 0 0 var(--in-radius-xs) var(--in-radius-xs);
}
.step2__chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: var(--in-radius-full);
  background: var(--in-surface-overlay, #ffffff);
  border: 1px solid var(--in-border-default);
  font-size: var(--in-font-size-xs);
  color: var(--in-text-subtle);
}
.step2__chip strong {
  color: var(--in-text-accent);
  font-weight: var(--in-font-weight-medium);
  margin-left: 2px;
}
.step2__chip--active {
  border-color: var(--in-brand);
  background: var(--in-bg-accent-subtle, var(--in-brand-50, #e1f5fc));
  color: var(--in-brand);
}
.step2__chip--active strong { color: var(--in-brand); }
.step2__chip-sep { flex: 1 0 0; }
.step2__chip-meta {
  font-size: var(--in-font-size-xs);
  color: var(--in-text-subtler);
  font-family: 'Consolas', monospace;
}

/* === 경고 === */
.step2__warnings {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.step2__warning {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 12px;
  border-radius: var(--in-radius-xs);
  font-size: var(--in-font-size-sm);
  line-height: var(--in-line-height-sm);
}
.step2__warning strong {
  font-weight: var(--in-font-weight-medium);
  margin-right: 6px;
}
.step2__warning--warning {
  background: var(--in-surface-warning, #fffbeb);
  color: var(--in-text-warning);
}
.step2__warning--info {
  background: var(--in-bg-accent-subtle, var(--in-brand-50, #e1f5fc));
  color: var(--in-brand);
}

/* === Empty === */
.step2__empty {
  padding: 16px;
  background: var(--in-surface-default, #fafafa);
  border: 1px dashed var(--in-border-default);
  border-radius: var(--in-radius-xs);
  font-size: var(--in-font-size-sm);
  color: var(--in-text-subtle);
  text-align: center;
}
.step2__empty code {
  font-family: 'Consolas', monospace;
  color: var(--in-text-default);
}

/* === 파라미터 테이블 === */
.step2__params-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--in-font-size-sm);
}
.step2__params-table thead th {
  text-align: left;
  padding: 8px 10px;
  background: var(--in-surface-default, #fafafa);
  border-bottom: 1px solid var(--in-border-default);
  font-weight: var(--in-font-weight-medium);
  color: var(--in-text-subtle);
  font-size: var(--in-font-size-xs);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.step2__params-table tbody td {
  padding: 6px 10px;
  border-bottom: 1px solid var(--in-border-default);
  vertical-align: middle;
}
.step2__params-table tbody tr:last-child td { border-bottom: none; }
.step2__params-num {
  font-family: 'Consolas', monospace;
  color: var(--in-text-subtler);
}
.step2__params-name code {
  font-family: 'Consolas', monospace;
  color: var(--in-text-accent);
  font-size: var(--in-font-size-sm);
}
.step2__select-mini {
  width: 100%;
  padding: 4px 8px;
  border: 1px solid var(--in-border-input, var(--in-border-default));
  border-radius: var(--in-radius-xs);
  font-family: var(--in-font-family-body);
  font-size: var(--in-font-size-sm);
  background: var(--in-surface-overlay, #ffffff);
  color: var(--in-text-default);
  outline: none;
}
.step2__select-mini:focus { border-color: var(--in-brand); }
.step2__icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--in-radius-xs);
  cursor: pointer;
  color: var(--in-text-subtle);
}
.step2__icon-btn:hover {
  background: var(--in-surface-default, #fafafa);
  color: var(--in-text-error);
}

/* === 메타 옵션 그리드 === */
.step2__opts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}
.step2__opts-full { grid-column: 1 / -1; display: flex; flex-direction: column; gap: 4px; }
.step2__label {
  font-size: var(--in-font-size-md);
  color: var(--in-text-accent);
  font-weight: var(--in-font-weight-regular);
}

/* Actions / Error card — InMetaStepActions + InMetaErrorCard 로 추출됨 */
</style>
