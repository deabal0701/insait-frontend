<script setup>
/**
 * Step3Message — REQ/RES 메시지 등록 (P3 본격 구현).
 *
 * 책임:
 *  1. "SQL 에서 가져오기" — Step2 의 params/outColumns 를 REQ/RES 컬럼으로 자동 채움
 *  2. REQ/RES 2단 패널 — 좌(REQ) 우(RES) 동시 편집
 *  3. TYPE_CD 4종 콤보 강제 (string/numeric/date/clob) — 99 §4.6 자유입력 결함 해소
 *  4. USE_ENC_YN/USE_YN 라벨 정정 — UI 는 "사용/암호화전송", DB 컬럼명 hint (99 §4.3)
 *  5. 개인정보 컬럼 자동 마크 — isLikelyPiiColumn → 암호화 토글 강조 (00_workflow §4)
 *  6. 부모/자식 자동분할 송신 — 부모 (FRM_MSG_DEF) → 자식 (FRM_MSG_COL_DEF) 순차
 *     (99 §2.2 NumberFormatException 차단)
 *  7. SQL 변경 감지 시 "가져오기 다시 실행" 노란 배너
 *
 * 매뉴얼 근거:
 *  - SUMMARY §4 — 메시지 등록 단계 분할 패턴
 *  - 99 §2.2 — envelope BODY 부모-자식 순서 의존성
 *  - 99 §4.3 — USE_YN/USE_ENC_YN 라벨 역전
 *  - 99 §4.6 — TYPE_CD 자유입력 (콤보 강제)
 *  - 00_workflow §4 — USE_ENC_YN=Y 누락 시 개인정보 평문 노출
 */
import { computed, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useMetaWizardStore } from '@/stores/metaWizard';
import { saveMessagePair, classifyMetaError, getMetaErrorGuide, META_SERVICES } from '@/services/metaApi';
import { buildEnvelope } from '@/services/envelope';
import { isLikelyPiiColumn, defaultMaxLengthByTypeCd } from '@/utils/metaNaming';

import InButton from '@/components/ui/InButton.vue';
import InIcon from '@/components/ui/InIcon.vue';
import InMetaStepHeader from '@/components/feature/meta/InMetaStepHeader.vue';
import InMetaStepActions from '@/components/feature/meta/InMetaStepActions.vue';
import InMetaErrorCard from '@/components/feature/meta/InMetaErrorCard.vue';

const store = useMetaWizardStore();
const { message, messageStep, sql, sqlStep, derivedIds, currentVerifyQueries } = storeToRefs(store);

// ─── SQL 변경 감지 → 재가져오기 권유 배너 ─────────────────────────────────────
const lastImportSqlHash = ref('');
function sqlHash() {
  // 단순 hash — 본문 길이 + 첫/끝 20자 + 파라미터/컬럼 수
  const b = sql.value.body || '';
  return `${b.length}:${b.slice(0, 20)}:${b.slice(-20)}:${sql.value.params.length}:${sql.value.outColumns.length}`;
}

watch(() => message.value.importedFromSqlAt, (v) => {
  if (v) lastImportSqlHash.value = sqlHash();
});

const sqlChangedSinceImport = computed(() => {
  if (!message.value.importedFromSqlAt) return false;
  return sqlHash() !== lastImportSqlHash.value;
});

// ─── 가져오기 + 후처리 ──────────────────────────────────────────────────────
function importFromSql() {
  store.importMessagesFromSql();
  lastImportSqlHash.value = sqlHash();
  // 개인정보 자동 마크
  for (const c of message.value.in.columns) {
    if (isLikelyPiiColumn(c.msgColDefId) && c.useEncYn !== 'Y') c.useEncYn = 'Y';
  }
  for (const c of message.value.out.columns) {
    if (isLikelyPiiColumn(c.msgColDefId) && c.useEncYn !== 'Y') c.useEncYn = 'Y';
  }
  refreshVerifyQueries();
}

// ─── 컬럼 수동 편집 helper ──────────────────────────────────────────────────
function addColumn(side) {
  const list = message.value[side].columns;
  list.push({
    msgColDefId: '',
    msgColDefNm: '',
    typeCd: 'string',
    maxLength: defaultMaxLengthByTypeCd('string'),
    mandYn: side === 'in' ? 'Y' : 'N',
    useEncYn: 'N',
    seqOrder: list.length + 1,
  });
}
function removeColumn(side, idx) {
  message.value[side].columns.splice(idx, 1);
  // seqOrder 재계산
  message.value[side].columns.forEach((c, i) => { c.seqOrder = i + 1; });
}
function onTypeCdChange(col) {
  // type 변경 시 maxLength 기본값 자동 채움 (사용자가 명시 입력했으면 보존)
  if (col.maxLength == null || col.maxLength === '' ) {
    col.maxLength = defaultMaxLengthByTypeCd(col.typeCd);
  }
}

// ─── 검증 SQL 패널 갱신 ─────────────────────────────────────────────────────
function refreshVerifyQueries() {
  const ids = derivedIds.value;
  if (!ids) {
    currentVerifyQueries.value = [];
    return;
  }
  const inId = ids.msgIn;
  const outId = String(ids.msgOut).startsWith('MT_') ? ids.msgOut : `MT_${ids.screenId}_02`;
  currentVerifyQueries.value = [
    {
      title: '메시지 정의 + 컬럼 일괄 확인',
      sql: `SELECT 'DEF'  AS lvl, m.msg_def_oid AS oid, m.msg_def_id AS id, m.msg_def_nm AS nm
  FROM FRM_MSG_DEF m WHERE m.msg_def_id IN ('${inId}', '${outId}')
UNION ALL
SELECT 'COL', c.msg_col_def_oid, c.msg_col_def_id, c.msg_col_def_nm
  FROM FRM_MSG_COL_DEF c
 WHERE c.msg_def_oid IN (
       SELECT msg_def_oid FROM FRM_MSG_DEF
        WHERE msg_def_id IN ('${inId}', '${outId}'))
 ORDER BY 1, 2;`,
      expectation: `DEF ${2}행 + COL ${message.value.in.columns.length + message.value.out.columns.length}행`,
    },
    {
      title: '암호화 대상 컬럼 확인 (USE_ENC_YN=Y)',
      sql: `SELECT c.msg_col_def_id, c.use_enc_yn, c.type_cd, c.max_length
  FROM FRM_MSG_COL_DEF c
  JOIN FRM_MSG_DEF m ON c.msg_def_oid = m.msg_def_oid
 WHERE m.msg_def_id IN ('${inId}', '${outId}')
   AND c.use_enc_yn = 'Y'
 ORDER BY c.msg_def_oid, c.seq_order;`,
      expectation: '개인정보로 추정된 컬럼만 노출 (emp_id/jumin/email 등)',
    },
  ];
}
watch([
  () => derivedIds.value?.screenId,
  () => message.value.in.columns.length,
  () => message.value.out.columns.length,
], refreshVerifyQueries, { immediate: true });

// ─── 진행 가능 여부 ─────────────────────────────────────────────────────────
const canSubmit = computed(() => {
  if (messageStep.value.status === 'in_progress') return false;
  if (!message.value.in.msgDefId || !message.value.out.msgDefId) return false;
  if (message.value.in.columns.length === 0 && message.value.out.columns.length === 0) return false;
  // 컬럼 ID 누락 검사
  const allCols = [...message.value.in.columns, ...message.value.out.columns];
  if (allCols.some((c) => !c.msgColDefId || !c.typeCd)) return false;
  return true;
});

// ─── 등록 실행 ──────────────────────────────────────────────────────────────
const errorGuide = ref(null);
async function onRegister() {
  errorGuide.value = null;
  messageStep.value.status = 'in_progress';

  const payload = {
    msgInDef: {
      msg_def_id: message.value.in.msgDefId,
      msg_def_nm: message.value.in.msgDefNm,
      type_cd: message.value.in.typeCd,
      company_cd: '01',
    },
    msgInColumns: message.value.in.columns.map((c, i) => ({
      msg_col_def_id: c.msgColDefId,
      msg_col_def_nm: c.msgColDefNm || c.msgColDefId,
      type_cd: c.typeCd,
      max_length: c.maxLength,
      mand_yn: c.mandYn,
      use_enc_yn: c.useEncYn,
      seq_order: i + 1,
    })),
    msgOutDef: {
      msg_def_id: message.value.out.msgDefId,
      msg_def_nm: message.value.out.msgDefNm,
      type_cd: message.value.out.typeCd,
      company_cd: '01',
    },
    msgOutColumns: message.value.out.columns.map((c, i) => ({
      msg_col_def_id: c.msgColDefId,
      msg_col_def_nm: c.msgColDefNm || c.msgColDefId,
      type_cd: c.typeCd,
      max_length: c.maxLength,
      mand_yn: c.mandYn,
      use_enc_yn: c.useEncYn,
      seq_order: i + 1,
    })),
  };

  // envelope debug 용 미리보기 (실제 송신은 metaApi 가 4회 분할)
  const previewEnvelope = buildEnvelope(META_SERVICES.MESSAGE_DEF_SAVE, {
    ME_IST0030_05: [],
    ME_IST0030_09: [{ ...payload.msgInDef, sStatus: 'I', _seq: 1 }, { ...payload.msgOutDef, sStatus: 'I', _seq: 2 }],
  });

  try {
    const result = await saveMessagePair(payload);
    if (result.ok) {
      store.markStepCompleted('message', {
        insertedOid: { in: result.inDefOid, out: result.outDefOid },
        envelope: previewEnvelope,
        response: { ok: true, inDefOid: result.inDefOid, outDefOid: result.outDefOid },
      });
    } else {
      // 첫 에러의 분류 사용
      const firstErr = result.errors[0];
      const cat = classifyMetaError(firstErr?.response);
      errorGuide.value = {
        category: cat,
        ...getMetaErrorGuide(cat),
        phase: firstErr?.phase || 'unknown',
      };
      store.markStepError('message', `${errorGuide.value.title}: ${errorGuide.value.hint}`, {
        envelope: previewEnvelope,
        response: firstErr?.response,
      });
    }
  } catch (e) {
    errorGuide.value = { category: 'NETWORK', title: '네트워크 오류', hint: e?.message || '서버 응답이 없습니다.' };
    store.markStepError('message', errorGuide.value.title + ': ' + errorGuide.value.hint, { envelope: previewEnvelope, response: null });
  }
}

function onSkipForLearning() {
  if (!confirm('백엔드 등록을 건너뛰고 다음 단계로 진행합니다 (학습 모드). 실제 DB 에 등록되지 않습니다.')) return;
  store.markStepCompleted('message', { insertedOid: { in: null, out: null } });
}

// ─── UI helper ──────────────────────────────────────────────────────────────
const TYPE_CD_OPTS = [
  { value: 'string',  label: 'string' },
  { value: 'numeric', label: 'numeric' },
  { value: 'date',    label: 'date' },
  { value: 'clob',    label: 'clob' },
];
</script>

<template>
  <div class="step3">
    <InMetaStepHeader prefix="③" title="메시지">
      <template #subtitle>
        SQL 의 파라미터 → REQ, 결과컬럼 → RES 로 자동 매핑. TYPE_CD 는 4종 표준 (string/numeric/date/clob).
        개인정보 추정 컬럼은 자동으로 암호화 마크.
        <br />
        IN <code>{{ derivedIds?.msgIn }}</code> · OUT <code>{{ derivedIds?.msgOut }}</code>
      </template>
    </InMetaStepHeader>

    <!-- ─── SQL 가져오기 액션 + diff 배너 ─── -->
    <section class="step3__import">
      <InButton
        variant="primary"
        size="md"
        :left-icon-show="false"
        :right-icon-show="false"
        :disabled="!sql.params.length && !sql.outColumns.length"
        @click="importFromSql"
      >
        <InIcon name="download" :size="14" colorize color="white" />
        SQL 에서 가져오기 ({{ sql.params.length }} IN + {{ sql.outColumns.length }} OUT)
      </InButton>
      <span v-if="message.importedFromSqlAt" class="step3__import-stamp">
        마지막 가져오기: {{ new Date(message.importedFromSqlAt).toLocaleTimeString() }}
      </span>
      <span v-else class="step3__import-empty">먼저 가져오면 좌·우 패널이 자동 채워집니다.</span>

      <div v-if="sqlChangedSinceImport" class="step3__diff-banner">
        <InIcon name="status-warning" :size="14" />
        <strong>SQL 변경 감지</strong>
        <span>가져오기 후 SQL 본문이 변경되었습니다. 다시 가져오기를 권장합니다.</span>
        <InButton variant="text" size="sm" :left-icon-show="false" :right-icon-show="false" @click="importFromSql">
          다시 가져오기
        </InButton>
      </div>
    </section>

    <!-- ─── REQ/RES 2단 패널 ─── -->
    <div class="step3__panels">
      <!-- ─── REQ ─── -->
      <section class="step3__panel step3__panel--in">
        <header class="step3__panel-head">
          <span class="step3__panel-badge step3__panel-badge--in">REQ</span>
          <h4 class="step3__panel-title">{{ message.in.msgDefId || '—' }}</h4>
          <span class="step3__panel-count">{{ message.in.columns.length }}개 컬럼</span>
        </header>

        <div class="step3__panel-meta">
          <label>메시지명</label>
          <input v-model="message.in.msgDefNm" class="step3__panel-input" placeholder="예: TST0001 조회 요청" />
        </div>

        <div v-if="message.in.columns.length === 0" class="step3__panel-empty">
          상단 "SQL 에서 가져오기" 또는 [+ 컬럼 추가] 클릭.
        </div>
        <ul v-else class="step3__cols">
          <li v-for="(c, i) in message.in.columns" :key="i" class="step3__col">
            <div class="step3__col-line1">
              <input v-model="c.msgColDefId" class="step3__col-input step3__col-input--id" placeholder="컬럼 ID" />
              <select v-model="c.typeCd" class="step3__col-select" @change="onTypeCdChange(c)">
                <option v-for="o in TYPE_CD_OPTS" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
              <input
                v-model.number="c.maxLength"
                class="step3__col-input step3__col-input--len"
                type="number"
                min="0"
                placeholder="길이"
                :disabled="c.typeCd === 'date' || c.typeCd === 'clob'"
              />
              <button type="button" class="step3__icon-btn" :title="`${c.msgColDefId || '컬럼'} 삭제`" @click="removeColumn('in', i)">
                <InIcon name="close" :size="12" />
              </button>
            </div>
            <div class="step3__col-line2">
              <label class="step3__col-toggle">
                <input v-model="c.mandYn" type="checkbox" true-value="Y" false-value="N" />
                <span>필수</span>
                <span class="step3__col-hint">(DB: mand_yn)</span>
              </label>
              <label class="step3__col-toggle" :class="{ 'step3__col-toggle--pii': isLikelyPiiColumn(c.msgColDefId) }">
                <input v-model="c.useEncYn" type="checkbox" true-value="Y" false-value="N" />
                <span>암호화 전송</span>
                <span class="step3__col-hint">(DB: use_enc_yn)</span>
                <span v-if="isLikelyPiiColumn(c.msgColDefId)" class="step3__col-pii">개인정보 추정</span>
              </label>
            </div>
          </li>
        </ul>

        <button type="button" class="step3__add-col" @click="addColumn('in')">
          <InIcon name="add" :size="12" />
          컬럼 추가
        </button>
      </section>

      <!-- ─── RES ─── -->
      <section class="step3__panel step3__panel--out">
        <header class="step3__panel-head">
          <span class="step3__panel-badge step3__panel-badge--out">RES</span>
          <h4 class="step3__panel-title">{{ message.out.msgDefId || '—' }}</h4>
          <span class="step3__panel-count">{{ message.out.columns.length }}개 컬럼</span>
        </header>

        <div class="step3__panel-meta">
          <label>메시지명</label>
          <input v-model="message.out.msgDefNm" class="step3__panel-input" placeholder="예: TST0001 조회 응답" />
        </div>

        <div v-if="message.out.columns.length === 0" class="step3__panel-empty">
          상단 "SQL 에서 가져오기" 또는 [+ 컬럼 추가] 클릭.
        </div>
        <ul v-else class="step3__cols">
          <li v-for="(c, i) in message.out.columns" :key="i" class="step3__col">
            <div class="step3__col-line1">
              <input v-model="c.msgColDefId" class="step3__col-input step3__col-input--id" placeholder="컬럼 ID" />
              <select v-model="c.typeCd" class="step3__col-select" @change="onTypeCdChange(c)">
                <option v-for="o in TYPE_CD_OPTS" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
              <input
                v-model.number="c.maxLength"
                class="step3__col-input step3__col-input--len"
                type="number"
                min="0"
                placeholder="길이"
                :disabled="c.typeCd === 'date' || c.typeCd === 'clob'"
              />
              <button type="button" class="step3__icon-btn" :title="`${c.msgColDefId || '컬럼'} 삭제`" @click="removeColumn('out', i)">
                <InIcon name="close" :size="12" />
              </button>
            </div>
            <div class="step3__col-line2">
              <label class="step3__col-toggle">
                <input v-model="c.mandYn" type="checkbox" true-value="Y" false-value="N" />
                <span>필수</span>
                <span class="step3__col-hint">(DB: mand_yn)</span>
              </label>
              <label class="step3__col-toggle" :class="{ 'step3__col-toggle--pii': isLikelyPiiColumn(c.msgColDefId) }">
                <input v-model="c.useEncYn" type="checkbox" true-value="Y" false-value="N" />
                <span>암호화 전송</span>
                <span class="step3__col-hint">(DB: use_enc_yn)</span>
                <span v-if="isLikelyPiiColumn(c.msgColDefId)" class="step3__col-pii">개인정보 추정</span>
              </label>
            </div>
          </li>
        </ul>

        <button type="button" class="step3__add-col" @click="addColumn('out')">
          <InIcon name="add" :size="12" />
          컬럼 추가
        </button>
      </section>
    </div>

    <!-- ─── 안전 송신 안내 ─── -->
    <div class="step3__safe-info">
      <InIcon name="info" :size="14" />
      <span>
        <strong>안전 송신:</strong>
        부모 (FRM_MSG_DEF) → 자식 (FRM_MSG_COL_DEF) 순차 envelope 4회 분할 송신.
        AS-IS 의 NumberFormatException (99 §2.2) 자동 회피.
      </span>
    </div>

    <!-- ─── 등록 ─── -->
    <InMetaStepActions
      submit-label="메시지 메타 등록"
      :status="messageStep.status"
      :can-submit="canSubmit"
      :can-skip="!!(message.in.columns.length || message.out.columns.length)"
      :success-label="`등록 완료 (IN OID: ${messageStep.insertedOid?.in || '—'} · OUT OID: ${messageStep.insertedOid?.out || '—'})`"
      @submit="onRegister"
      @skip="onSkipForLearning"
    />

    <InMetaErrorCard
      v-if="errorGuide"
      :title="errorGuide.title"
      :hint="errorGuide.hint"
      :category="errorGuide.category"
      :phase="errorGuide.phase"
      tone="error"
    />
  </div>
</template>

<style scoped>
.step3 {
  display: flex;
  flex-direction: column;
  gap: 18px;
  font-family: var(--in-font-family-body);
}

/* Header / Actions / ErrorCard 공통 패턴은 InMetaStep* 으로 추출 (2026-05-29). */

/* === Import action === */
.step3__import {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 12px 16px;
  background: var(--in-surface-overlay, #ffffff);
  border: 1px solid var(--in-border-default);
  border-radius: var(--in-radius-sm);
}
.step3__import-stamp { font-size: var(--in-font-size-xs); color: var(--in-text-subtle); }
.step3__import-empty { font-size: var(--in-font-size-xs); color: var(--in-text-subtler); }

.step3__diff-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1 1 100%;
  padding: 6px 10px;
  background: var(--in-surface-warning, #fffbeb);
  border: 1px solid var(--in-text-warning);
  border-radius: var(--in-radius-xs);
  color: var(--in-text-warning);
  font-size: var(--in-font-size-sm);
}
.step3__diff-banner strong { font-weight: var(--in-font-weight-medium); }
.step3__diff-banner span { color: var(--in-text-default); }

/* === REQ/RES 2단 ── */
.step3__panels {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  align-items: start;
}
@media (max-width: 900px) {
  .step3__panels { grid-template-columns: 1fr; }
}

.step3__panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
  background: var(--in-surface-overlay, #ffffff);
  border: 1px solid var(--in-border-default);
  border-radius: var(--in-radius-sm);
  min-width: 0;
}
.step3__panel--in { border-left: 3px solid var(--in-brand); }
.step3__panel--out { border-left: 3px solid var(--in-text-success); }

.step3__panel-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.step3__panel-badge {
  padding: 2px 8px;
  border-radius: var(--in-radius-xxs);
  font-size: var(--in-font-size-xs);
  font-weight: var(--in-font-weight-medium);
  letter-spacing: 0.3px;
}
.step3__panel-badge--in {
  background: var(--in-bg-accent-subtle, var(--in-brand-50, #e1f5fc));
  color: var(--in-brand);
}
.step3__panel-badge--out {
  background: var(--in-surface-success, #e4faf0);
  color: var(--in-text-success);
}
.step3__panel-title {
  margin: 0;
  font-family: 'Consolas', monospace;
  font-size: var(--in-font-size-md);
  font-weight: var(--in-font-weight-medium);
  color: var(--in-text-accent);
}
.step3__panel-count {
  margin-left: auto;
  font-size: var(--in-font-size-xs);
  color: var(--in-text-subtle);
}

.step3__panel-meta { display: flex; align-items: center; gap: 8px; }
.step3__panel-meta label {
  font-size: var(--in-font-size-xs);
  color: var(--in-text-subtle);
  flex-shrink: 0;
  width: 64px;
}
.step3__panel-input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid var(--in-border-input, var(--in-border-default));
  border-radius: var(--in-radius-xs);
  font-family: var(--in-font-family-body);
  font-size: var(--in-font-size-sm);
  outline: none;
}
.step3__panel-input:focus { border-color: var(--in-brand); }

.step3__panel-empty {
  padding: 16px;
  background: var(--in-surface-default, #fafafa);
  border: 1px dashed var(--in-border-default);
  border-radius: var(--in-radius-xs);
  font-size: var(--in-font-size-xs);
  color: var(--in-text-subtle);
  text-align: center;
}

/* === Column rows === */
.step3__cols {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.step3__col {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  background: var(--in-surface-default, #fafafa);
  border: 1px solid var(--in-border-default);
  border-radius: var(--in-radius-xs);
}
.step3__col-line1 {
  display: flex;
  gap: 6px;
  align-items: center;
}
.step3__col-input {
  padding: 4px 8px;
  border: 1px solid var(--in-border-input, var(--in-border-default));
  border-radius: var(--in-radius-xs);
  font-family: 'Consolas', monospace;
  font-size: var(--in-font-size-sm);
  color: var(--in-text-accent);
  background: var(--in-surface-overlay, #ffffff);
  outline: none;
  min-width: 0;
}
.step3__col-input--id { flex: 1; }
.step3__col-input--len { width: 64px; flex-shrink: 0; }
.step3__col-input:focus { border-color: var(--in-brand); }
.step3__col-input:disabled { background: var(--in-surface-default, #fafafa); color: var(--in-text-subtler); }
.step3__col-select {
  padding: 4px 6px;
  border: 1px solid var(--in-border-input, var(--in-border-default));
  border-radius: var(--in-radius-xs);
  font-family: var(--in-font-family-body);
  font-size: var(--in-font-size-sm);
  background: var(--in-surface-overlay, #ffffff);
  width: 90px;
  flex-shrink: 0;
  outline: none;
}

.step3__col-line2 {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  padding-left: 4px;
}
.step3__col-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--in-font-size-xs);
  color: var(--in-text-default);
  cursor: pointer;
}
.step3__col-toggle input { width: 14px; height: 14px; margin: 0; accent-color: var(--in-brand); }
.step3__col-hint { color: var(--in-text-subtler); font-family: 'Consolas', monospace; }
.step3__col-toggle--pii { color: var(--in-text-warning); }
.step3__col-pii {
  margin-left: 4px;
  padding: 0 4px;
  background: var(--in-surface-warning, #fffbeb);
  border-radius: var(--in-radius-xxs);
  color: var(--in-text-warning);
  font-size: 10px;
  font-weight: var(--in-font-weight-medium);
}

.step3__icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--in-radius-xs);
  cursor: pointer;
  color: var(--in-text-subtle);
  flex-shrink: 0;
}
.step3__icon-btn:hover {
  background: var(--in-surface-default, #fafafa);
  color: var(--in-text-error);
}

.step3__add-col {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  align-self: flex-start;
  padding: 4px 10px;
  background: transparent;
  border: 1px dashed var(--in-border-default);
  border-radius: var(--in-radius-xs);
  font-size: var(--in-font-size-xs);
  color: var(--in-text-subtle);
  cursor: pointer;
}
.step3__add-col:hover { border-color: var(--in-brand); color: var(--in-brand); }

/* === Safe info === */
.step3__safe-info {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 12px;
  background: var(--in-bg-accent-subtle, var(--in-brand-50, #e1f5fc));
  border-radius: var(--in-radius-xs);
  font-size: var(--in-font-size-sm);
  color: var(--in-text-default);
}
.step3__safe-info strong { color: var(--in-brand); margin-right: 4px; }

/* Actions / Error card — InMetaStepActions + InMetaErrorCard 로 추출됨 */
</style>
