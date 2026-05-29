<script setup>
/**
 * Step4Entity — Save 시나리오 한정 Entity 등록 (P4 본격 구현).
 *
 * 책임:
 *  1. cmdType === 'S' (또는 entity 필요 종류) 만 활성 — 그 외는 자동 skip
 *  2. SQL + Message 에서 가져오기 — 대상 테이블 + 컬럼 매핑 자동 생성
 *  3. 컬럼 매핑 그리드 — Message 컬럼 ↔ DB 컬럼 + PK / NOT NULL / 자동주입 / 암호화
 *  4. 자동주입 정책 콤보 — NONE / SEQ (시퀀스) / SESSION_USER / SYSDATE / SESSION_COMPANY
 *  5. IST0020 메타 등록 호출 — silent no-op 차단 (응답 entity_oid 미수신 시 진행 차단)
 *
 * 매뉴얼 근거:
 *  - SUMMARY §6 — Entity 등록 단계
 *  - 99 §5.8 — silent no-op (Save = Entity 강제, MultiSave + sql 매핑은 응답 SUCCESS + DB 미반영)
 *  - 00_workflow §4 — USE_ENC_YN 자동 암복호화
 *  - 00_workflow §STEP 3 자동주입값 (시퀀스/SYSDATE/세션사용자)
 */
import { computed, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useMetaWizardStore } from '@/stores/metaWizard';
import { saveEntity, classifyMetaError, getMetaErrorGuide, META_SERVICES, extractInsertedOid } from '@/services/metaApi';
import { buildEnvelope } from '@/services/envelope';

import InButton from '@/components/ui/InButton.vue';
import InIcon from '@/components/ui/InIcon.vue';
import InMetaStepHeader from '@/components/feature/meta/InMetaStepHeader.vue';
import InMetaStepSection from '@/components/feature/meta/InMetaStepSection.vue';
import InMetaStepActions from '@/components/feature/meta/InMetaStepActions.vue';
import InMetaErrorCard from '@/components/feature/meta/InMetaErrorCard.vue';

const store = useMetaWizardStore();
const { entity, entityStep, requiresEntity, sql, message, derivedIds, currentVerifyQueries } = storeToRefs(store);

// ─── 가져오기 + 후처리 ──────────────────────────────────────────────────────
function importFromSqlAndMessage() {
  store.importEntityFromSqlAndMessage();
  refreshVerifyQueries();
}

// ─── 컬럼 매핑 그리드 helper ────────────────────────────────────────────────
function addColumn() {
  entity.value.columns.push({
    name: '',
    dbColumn: '',
    typeCd: 'string',
    mandYn: 'N',
    useEncYn: 'N',
    autoInject: null,
    pk: false,
  });
}
function removeColumn(idx) {
  entity.value.columns.splice(idx, 1);
}

// ─── 검증 SQL 패널 ──────────────────────────────────────────────────────────
function refreshVerifyQueries() {
  const name = entity.value.entityName;
  if (!name) {
    currentVerifyQueries.value = [];
    return;
  }
  currentVerifyQueries.value = [
    {
      title: 'Entity 정의 확인',
      sql: `SELECT e.entity_oid, e.entity_nm, e.db_table_nm, e.use_yn
  FROM FRM_ENTITY e
 WHERE e.entity_nm = '${name}';`,
      expectation: '1행 (db_table_nm = ' + (entity.value.dbTable || '?') + ')',
    },
    {
      title: '컬럼 매핑 확인',
      sql: `SELECT m.msg_col_nm, m.db_column_nm, m.pk_yn, m.mand_yn, m.use_enc_yn, m.auto_inject_kind
  FROM FRM_ENTITY_COLUMN_MAPPING m
  JOIN FRM_ENTITY e ON e.entity_oid = m.entity_oid
 WHERE e.entity_nm = '${name}'
 ORDER BY m.seq_order;`,
      expectation: `${entity.value.columns.length}행 (Message 컬럼 ↔ DB 컬럼)`,
    },
    {
      title: 'silent no-op 차단 검증 (수동 테스트 후)',
      sql: `-- ⑤ Service 등록 후 dry-run 호출:
-- 1) Service envelope 송신
-- 2) HEADER.resultType = SUCCESS 확인
-- 3) BODY.ME_SAVE_RESULT 에 OID 발급 확인 (← 이게 비어있으면 silent no-op)
-- 4) DB 직접 확인:
SELECT COUNT(*) FROM ${entity.value.dbTable || 'YOUR_TABLE'}
 WHERE mod_date > SYSDATE - 1/24;`,
      expectation: '실 INSERT 후 행수 1 증가 (사용자 직접 dry-run 후 비교)',
    },
  ];
}
watch([
  () => entity.value.entityName,
  () => entity.value.dbTable,
  () => entity.value.columns.length,
], refreshVerifyQueries, { immediate: true });

// ─── 자동 sync — Step3 → Step4 ─────────────────────────────────────────────
// Step4 진입 시 가져오기가 한 번도 안 됐고, SQL 의 targetTable 이 채워져 있으면 자동 1회 실행
onMounted(() => {
  if (!requiresEntity.value) return;
  if (entity.value.columns.length === 0 && sql.value.targetTable) {
    importFromSqlAndMessage();
  }
});

// ─── 진행 가능 여부 ─────────────────────────────────────────────────────────
const canSubmit = computed(() => {
  if (!requiresEntity.value) return true; // Read 시나리오 — 그대로 다음
  if (entityStep.value.status === 'in_progress') return false;
  if (!entity.value.entityName) return false;
  if (!entity.value.dbTable) return false;
  if (entity.value.columns.length === 0) return false;
  if (entity.value.columns.some((c) => !c.name || !c.dbColumn)) return false;
  return true;
});

// ─── envelope payload ──────────────────────────────────────────────────────
/**
 * AS-IS IST0020_00_S01 envelope 가설 (실제 fetch 캡처 정합 TODO).
 */
function buildEntityPayload() {
  return {
    ME_IST0020_01: [{
      sStatus: 'I',
      _seq: 1,
      sDelete: '',
      entity_nm: entity.value.entityName,
      entity_dispnm: entity.value.entityNm,
      db_table_nm: entity.value.dbTable,
      use_yn: 'Y',
      company_cd: '01',
    }],
    ME_IST0020_02: entity.value.columns.map((c, i) => ({
      sStatus: 'I',
      _seq: i + 1,
      sDelete: '',
      msg_col_nm: c.name,
      db_column_nm: c.dbColumn,
      type_cd: c.typeCd,
      pk_yn: c.pk ? 'Y' : 'N',
      mand_yn: c.mandYn,
      use_enc_yn: c.useEncYn,
      auto_inject_kind: c.autoInject || null,
      seq_order: i + 1,
    })),
  };
}

// ─── 등록 실행 ──────────────────────────────────────────────────────────────
const errorGuide = ref(null);
async function onRegister() {
  errorGuide.value = null;
  entityStep.value.status = 'in_progress';

  const payload = buildEntityPayload();
  const envelopePreview = buildEnvelope(META_SERVICES.ENTITY_SAVE, payload);

  try {
    const { ok, response } = await saveEntity(payload);
    if (ok) {
      const oid = extractInsertedOid(response, 'ME_SAVE_RESULT', 'entity_oid')
        ?? extractInsertedOid(response, 'ME_SAVE_RESULT', 'object_id');
      // ★ silent no-op 차단: OID 미수신이면 등록 실패로 간주
      if (oid == null) {
        errorGuide.value = {
          category: 'SILENT_NOOP',
          title: 'Silent no-op 가능성',
          hint: '응답 HEADER 는 SUCCESS 였으나 entity_oid 가 발급되지 않았습니다. 매뉴얼 99 §5.8 의 MultiSave silent no-op 패턴 의심 — 백엔드 로그 확인 필요.',
        };
        store.markStepError('entity', errorGuide.value.title + ': ' + errorGuide.value.hint, { envelope: envelopePreview, response });
        return;
      }
      store.markStepCompleted('entity', { insertedOid: oid, envelope: envelopePreview, response });
    } else {
      const cat = classifyMetaError(response);
      errorGuide.value = { category: cat, ...getMetaErrorGuide(cat) };
      store.markStepError('entity', `${errorGuide.value.title}: ${errorGuide.value.hint}`, { envelope: envelopePreview, response });
    }
  } catch (e) {
    errorGuide.value = { category: 'NETWORK', title: '네트워크 오류', hint: e?.message || '서버 응답이 없습니다.' };
    store.markStepError('entity', errorGuide.value.title + ': ' + errorGuide.value.hint, { envelope: envelopePreview, response: null });
  }
}

function onSkipForLearning() {
  if (!confirm('백엔드 등록을 건너뛰고 다음 단계로 진행합니다 (학습 모드). 실제 DB 에 등록되지 않습니다.')) return;
  store.markStepCompleted('entity', { insertedOid: null });
}

function onSkipReadScenario() {
  store.markStepCompleted('entity', { insertedOid: null });
}

// ─── UI helper ──────────────────────────────────────────────────────────────
const TYPE_CD_OPTS = [
  { value: 'string',  label: 'string' },
  { value: 'numeric', label: 'numeric' },
  { value: 'date',    label: 'date' },
  { value: 'clob',    label: 'clob' },
];

const AUTO_INJECT_OPTS = [
  { value: '',                 label: '— 없음 —' },
  { value: 'SEQ',              label: 'SEQ (시퀀스)' },
  { value: 'SESSION_USER',     label: 'SESSION_USER (세션사용자)' },
  { value: 'SYSDATE',          label: 'SYSDATE (현재 시각)' },
  { value: 'SESSION_COMPANY',  label: 'SESSION_COMPANY (세션회사)' },
];

const AUTO_INJECT_LABEL = {
  SEQ: '시퀀스',
  SESSION_USER: '세션사용자',
  SYSDATE: 'SYSDATE',
  SESSION_COMPANY: '세션회사',
};
</script>

<template>
  <div class="step4">
    <InMetaStepHeader
      prefix="④"
      title="Entity"
      :code="entity.entityName || '(Save 시나리오 한정)'"
    >
      <template #subtitle>
        <template v-if="requiresEntity">
          SQL 의 대상 테이블 + Message 컬럼을 합쳐 DB 매핑 자동 생성. <strong>Silent no-op 함정 차단의 핵심.</strong>
        </template>
        <template v-else>
          Read 시나리오는 Entity 가 필요하지 않아 자동으로 건너뜁니다.
        </template>
      </template>
    </InMetaStepHeader>

    <!-- ─── Read 시나리오 — skip ─── -->
    <div v-if="!requiresEntity" class="step4__skip">
      <InIcon name="info" :size="14" />
      <span>
        Command 종류가 <strong>R (조회)</strong> 이므로 Entity 등록이 불필요합니다.
        Save 시나리오 (S/E) 만 본 단계가 활성화됩니다.
      </span>
      <InButton variant="primary" size="md" :left-icon-show="false" :right-icon-show="false" @click="onSkipReadScenario">
        그대로 다음 단계로
      </InButton>
    </div>

    <template v-else>
      <!-- ─── 가져오기 ─── -->
      <section class="step4__import">
        <InButton
          variant="primary"
          size="md"
          :left-icon-show="false"
          :right-icon-show="false"
          :disabled="!sql.targetTable && message.out.columns.length === 0 && message.in.columns.length === 0"
          @click="importFromSqlAndMessage"
        >
          <InIcon name="download" :size="14" colorize color="white" />
          SQL + Message 에서 가져오기
        </InButton>
        <span class="step4__import-meta">
          SQL 테이블: <code>{{ sql.targetTable || '—' }}</code> ·
          Message 컬럼: {{ message.in.columns.length }} IN + {{ message.out.columns.length }} OUT
        </span>
      </section>

      <!-- ─── [1] Entity 메타 ─── -->
      <InMetaStepSection step-no="1" title="Entity 메타">
        <div class="step4__meta-grid">
          <div class="step4__field">
            <label>Entity 이름</label>
            <input v-model="entity.entityName" class="step4__input" placeholder="예: EN_TST0001" readonly />
            <span class="step4__hint">화면 ID 에서 자동 생성 (변경 불가)</span>
          </div>
          <div class="step4__field">
            <label>표시명</label>
            <input v-model="entity.entityNm" class="step4__input" placeholder="예: TST0001 엔터티" />
          </div>
          <div class="step4__field">
            <label>대상 DB 테이블</label>
            <input v-model="entity.dbTable" class="step4__input" placeholder="예: FRM_EXECUTABLE_OBJECT" />
            <span class="step4__hint">SQL 의 FROM / INSERT INTO 에서 자동 추출</span>
          </div>
        </div>
      </InMetaStepSection>

      <!-- ─── [2] 컬럼 매핑 ─── -->
      <InMetaStepSection step-no="2" :title="`컬럼 매핑 (${entity.columns.length})`">
        <template #hint>
          Message 컬럼 ↔ DB 컬럼 매핑. PK / NOT NULL / 자동주입값 / 암호화 설정.
        </template>

        <div v-if="entity.columns.length === 0" class="step4__empty">
          상단 "SQL + Message 에서 가져오기" 또는 [+ 컬럼 추가] 클릭.
        </div>
        <table v-else class="step4__cols-table">
          <thead>
            <tr>
              <th style="width: 32px;">#</th>
              <th>Message 컬럼</th>
              <th>DB 컬럼</th>
              <th style="width: 100px;">TYPE_CD</th>
              <th style="width: 50px;" class="step4__col-center">PK</th>
              <th style="width: 70px;" class="step4__col-center">NOT NULL</th>
              <th style="width: 70px;" class="step4__col-center">암호화</th>
              <th style="width: 180px;">자동주입</th>
              <th style="width: 50px;"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(c, i) in entity.columns" :key="i">
              <td class="step4__col-num">{{ i + 1 }}</td>
              <td>
                <input v-model="c.name" class="step4__input step4__input--code" placeholder="msg_col_nm" />
              </td>
              <td>
                <input v-model="c.dbColumn" class="step4__input step4__input--code" placeholder="DB_COLUMN_NM" />
              </td>
              <td>
                <select v-model="c.typeCd" class="step4__select-mini">
                  <option v-for="o in TYPE_CD_OPTS" :key="o.value" :value="o.value">{{ o.label }}</option>
                </select>
              </td>
              <td class="step4__col-center">
                <input v-model="c.pk" type="checkbox" class="step4__check" />
              </td>
              <td class="step4__col-center">
                <input v-model="c.mandYn" type="checkbox" true-value="Y" false-value="N" class="step4__check" />
              </td>
              <td class="step4__col-center">
                <input v-model="c.useEncYn" type="checkbox" true-value="Y" false-value="N" class="step4__check" />
              </td>
              <td>
                <select v-model="c.autoInject" class="step4__select-mini">
                  <option v-for="o in AUTO_INJECT_OPTS" :key="o.value || 'none'" :value="o.value || null">{{ o.label }}</option>
                </select>
              </td>
              <td class="step4__col-center">
                <button type="button" class="step4__icon-btn" :title="`${c.name || '컬럼'} 삭제`" @click="removeColumn(i)">
                  <InIcon name="close" :size="12" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <button type="button" class="step4__add-col" @click="addColumn">
          <InIcon name="add" :size="12" />
          컬럼 추가
        </button>

        <!-- 시각 요약 칩 -->
        <div v-if="entity.columns.length > 0" class="step4__chips">
          <span class="step4__chip" :class="{ 'step4__chip--active': entity.columns.some((c) => c.pk) }">
            PK <strong>{{ entity.columns.filter((c) => c.pk).length }}</strong>
          </span>
          <span class="step4__chip" :class="{ 'step4__chip--active': entity.columns.some((c) => c.mandYn === 'Y') }">
            NOT NULL <strong>{{ entity.columns.filter((c) => c.mandYn === 'Y').length }}</strong>
          </span>
          <span class="step4__chip step4__chip--enc" :class="{ 'step4__chip--enc-active': entity.columns.some((c) => c.useEncYn === 'Y') }">
            암호화 <strong>{{ entity.columns.filter((c) => c.useEncYn === 'Y').length }}</strong>
          </span>
          <span class="step4__chip step4__chip--auto" :class="{ 'step4__chip--auto-active': entity.columns.some((c) => c.autoInject) }">
            자동주입 <strong>{{ entity.columns.filter((c) => c.autoInject).length }}</strong>
          </span>
        </div>
      </InMetaStepSection>

      <!-- ─── silent no-op 차단 안내 ─── -->
      <div class="step4__silent-info">
        <InIcon name="status-warning" :size="14" />
        <span>
          <strong>Silent no-op 차단:</strong>
          MultiSave 호출 시 Entity 매핑이 없으면 응답 SUCCESS + DB 미반영 (99 §5.8 운영 13년 누적 함정).
          본 단계가 등록 응답에서 <code>entity_oid</code> 발급을 강제 검증하여 차단합니다.
        </span>
      </div>

      <!-- ─── 등록 ─── -->
      <InMetaStepActions
        submit-label="Entity 메타 등록"
        :status="entityStep.status"
        :can-submit="canSubmit"
        :can-skip="!!entity.columns.length"
        :success-label="`등록 완료 (entity_oid: ${entityStep.insertedOid || '미수신'})`"
        @submit="onRegister"
        @skip="onSkipForLearning"
      />

      <InMetaErrorCard
        v-if="errorGuide"
        :title="errorGuide.title"
        :hint="errorGuide.hint"
        :category="errorGuide.category"
        :tone="errorGuide.category === 'SILENT_NOOP' ? 'warning' : 'error'"
      />
    </template>
  </div>
</template>

<style scoped>
.step4 {
  display: flex;
  flex-direction: column;
  gap: 18px;
  font-family: var(--in-font-family-body);
}

/* Header / Section / Actions / ErrorCard 공통 패턴은 InMetaStep* 으로 추출 (2026-05-29). */

/* === Read skip === */
.step4__skip {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--in-surface-default, #fafafa);
  border: 1px dashed var(--in-border-default);
  border-radius: var(--in-radius-sm);
  font-size: var(--in-font-size-sm);
  color: var(--in-text-default);
}
.step4__skip span { flex: 1; }
.step4__skip strong { color: var(--in-text-accent); font-weight: var(--in-font-weight-medium); }

/* === Import === */
.step4__import {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 12px 16px;
  background: var(--in-surface-overlay, #ffffff);
  border: 1px solid var(--in-border-default);
  border-radius: var(--in-radius-sm);
}
.step4__import-meta {
  font-size: var(--in-font-size-xs);
  color: var(--in-text-subtle);
}
.step4__import-meta code {
  font-family: 'Consolas', monospace;
  color: var(--in-text-accent);
}

/* === Entity 메타 grid === */
.step4__meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}
.step4__field { display: flex; flex-direction: column; gap: 4px; }
.step4__field label {
  font-size: var(--in-font-size-sm);
  color: var(--in-text-default);
  font-weight: var(--in-font-weight-medium);
}
.step4__hint {
  font-size: var(--in-font-size-xs);
  color: var(--in-text-subtler);
}

.step4__input {
  padding: 6px 10px;
  border: 1px solid var(--in-border-input, var(--in-border-default));
  border-radius: var(--in-radius-xs);
  font-family: var(--in-font-family-body);
  font-size: var(--in-font-size-sm);
  outline: none;
  background: var(--in-surface-overlay, #ffffff);
  color: var(--in-text-default);
}
.step4__input--code {
  font-family: 'Consolas', monospace;
  color: var(--in-text-accent);
}
.step4__input:focus { border-color: var(--in-brand); }
.step4__input[readonly] {
  background: var(--in-surface-default, #fafafa);
  color: var(--in-text-subtle);
}

/* === Empty === */
.step4__empty {
  padding: 16px;
  background: var(--in-surface-default, #fafafa);
  border: 1px dashed var(--in-border-default);
  border-radius: var(--in-radius-xs);
  font-size: var(--in-font-size-sm);
  color: var(--in-text-subtle);
  text-align: center;
}

/* === Columns table === */
.step4__cols-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--in-font-size-sm);
}
.step4__cols-table thead th {
  text-align: left;
  padding: 8px 8px;
  background: var(--in-surface-default, #fafafa);
  border-bottom: 1px solid var(--in-border-default);
  font-weight: var(--in-font-weight-medium);
  color: var(--in-text-subtle);
  font-size: var(--in-font-size-xs);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.step4__col-center { text-align: center !important; }
.step4__cols-table tbody td {
  padding: 4px 6px;
  border-bottom: 1px solid var(--in-border-default);
  vertical-align: middle;
}
.step4__cols-table tbody td:nth-child(1) { padding-left: 8px; }
.step4__cols-table tbody tr:last-child td { border-bottom: none; }
.step4__col-num {
  font-family: 'Consolas', monospace;
  color: var(--in-text-subtler);
  text-align: right;
}
.step4__select-mini {
  width: 100%;
  padding: 4px 6px;
  border: 1px solid var(--in-border-input, var(--in-border-default));
  border-radius: var(--in-radius-xs);
  font-family: var(--in-font-family-body);
  font-size: var(--in-font-size-sm);
  background: var(--in-surface-overlay, #ffffff);
  color: var(--in-text-default);
  outline: none;
}
.step4__check { width: 14px; height: 14px; margin: 0; accent-color: var(--in-brand); }

.step4__icon-btn {
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
}
.step4__icon-btn:hover { background: var(--in-surface-default, #fafafa); color: var(--in-text-error); }

.step4__add-col {
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
.step4__add-col:hover { border-color: var(--in-brand); color: var(--in-brand); }

/* === Chips === */
.step4__chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 4px;
}
.step4__chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: var(--in-radius-full);
  background: var(--in-surface-overlay, #ffffff);
  border: 1px solid var(--in-border-default);
  font-size: var(--in-font-size-xs);
  color: var(--in-text-subtle);
}
.step4__chip strong { color: var(--in-text-accent); font-weight: var(--in-font-weight-medium); }
.step4__chip--active {
  border-color: var(--in-brand);
  background: var(--in-bg-accent-subtle, var(--in-brand-50, #e1f5fc));
  color: var(--in-brand);
}
.step4__chip--active strong { color: var(--in-brand); }
.step4__chip--enc-active {
  border-color: var(--in-text-warning);
  background: var(--in-surface-warning, #fffbeb);
  color: var(--in-text-warning);
}
.step4__chip--enc-active strong { color: var(--in-text-warning); }
.step4__chip--auto-active {
  border-color: var(--in-text-success);
  background: var(--in-surface-success, #e4faf0);
  color: var(--in-text-success);
}
.step4__chip--auto-active strong { color: var(--in-text-success); }

/* === Silent no-op info === */
.step4__silent-info {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  background: var(--in-surface-warning, #fffbeb);
  border: 1px solid var(--in-text-warning);
  border-radius: var(--in-radius-xs);
  font-size: var(--in-font-size-sm);
  color: var(--in-text-default);
}
.step4__silent-info strong { color: var(--in-text-warning); margin-right: 4px; }
.step4__silent-info code {
  font-family: 'Consolas', monospace;
  color: var(--in-text-warning);
  font-size: var(--in-font-size-xs);
}

/* Actions / Error card — InMetaStepActions + InMetaErrorCard 로 추출됨 */
</style>
