<script setup>
/**
 * ServiceTester — 임의 서비스 즉석 테스트 (P5-C).
 *
 * 책임:
 *  1. serviceId 입력 또는 route param 으로 진입
 *  2. 메타 lookup — Service Def + IN/OUT 메시지 + 컬럼 (FRM_MSG_COL_DEF)
 *  3. REQ 폼 자동 생성 — TYPE_CD 별 위젯 (string/numeric/date/clob)
 *  4. envelope 미리보기 + 직접 편집 (raw JSON)
 *  5. 호출 → 응답 표시 (HEADER + BODY + 그리드 + 응답 시간)
 *  6. dry-run 토글 (Save 시나리오 — 트랜잭션 ROLLBACK 의도 표시)
 *  7. 이력 (localStorage, 20건) + 즐겨찾기
 *
 * URL: /admin/services/test/:serviceId?  (param 없으면 입력 UI)
 *
 * 매뉴얼 근거:
 *  - 99 §2.3 — 에러 분류 표시
 *  - 99 §5.8 — silent no-op 차단 (Save 응답 OID 검증)
 */
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  callMetaService,
  getServiceDetail,
  classifyMetaError,
  getMetaErrorGuide,
} from '@/services/metaApi';
import { buildEnvelope } from '@/services/envelope';
import { useTestHistory } from '@/composables/useTestHistory';

import InMetaStepHeader from '@/components/feature/meta/InMetaStepHeader.vue';
import InMetaStepSection from '@/components/feature/meta/InMetaStepSection.vue';
import InMetaCodeBlock from '@/components/feature/meta/InMetaCodeBlock.vue';
import InMetaErrorCard from '@/components/feature/meta/InMetaErrorCard.vue';
import InMetaResourceBadge from '@/components/feature/meta/InMetaResourceBadge.vue';

import InTextField from '@/components/ui/InTextField.vue';
import InButton from '@/components/ui/InButton.vue';
import InIcon from '@/components/ui/InIcon.vue';

import { META_CMD_TYPES } from '@/utils/metaNaming';

const route = useRoute();
const router = useRouter();
const { history, favorites, pushHistory, clearHistory, saveFavorite, removeFavorite } = useTestHistory();

// ─── 입력 state ─────────────────────────────────────────────────────────────
const serviceId = ref(route.params.serviceId || '');
const cmdSuffix = computed(() => {
  const m = String(serviceId.value || '').match(/_([RSPE])\d+$/);
  return m ? m[1] : '';
});
const cmdInfo = computed(() => META_CMD_TYPES.find((c) => c.code === cmdSuffix.value) || null);
const dryRun = ref(false);

// ─── 메타 조회 ──────────────────────────────────────────────────────────────
const meta = ref({
  loading: false,
  error: null,
  serviceDef: null,
  msgInId: '',
  msgOutId: '',
  inColumns: [],
  outColumns: [],
});

async function fetchMeta() {
  if (!serviceId.value) return;
  meta.value = { ...meta.value, loading: true, error: null };
  try {
    // ★ (2026-06-04, dspark): admin REST 단일 호출로 def + attrs(msgRef.columns) 모두 확보.
    //   - 이전: envelope IST0050_00_R02 + IST0030_00_R01 두 차례 호출 (alpha 환경 NPE).
    //   - 신규: GET /api/admin/meta/services/{name}?expand=msg,msgColumns 1회.
    //   - getMessageColumns 별도 호출 제거 — attrs[i].msgRef.columns 가 이미 채워짐.
    //   - 정책: 메타 조회 = admin REST OK. ▶ 호출만 envelope (onCall 그대로).
    const svc = await getServiceDetail(serviceId.value);
    if (!svc.ok && !svc.def) {
      meta.value = { ...meta.value, loading: false, error: '서비스 메타 조회 실패 — 백엔드 미연결 또는 권한.', serviceDef: null };
      return;
    }
    const def = svc.def || { svDefNm: serviceId.value };
    const attrs = svc.attrs || [];

    // attrs 에서 IN_MSG / OUT_MSG 분리 + msgRef.columns 즉시 추출
    const inAttr = attrs.find((a) => a.svAttrType === 'IN_MSG');
    const outAttr = attrs.find((a) => a.svAttrType === 'OUT_MSG');
    const msgInId = inAttr?.valueType || '';
    const msgOutId = outAttr?.valueType || '';
    const inColumnsRaw = inAttr?.msgRef?.columns || [];
    const outColumnsRaw = outAttr?.msgRef?.columns || [];

    meta.value = {
      loading: false,
      error: null,
      serviceDef: def,
      msgInId,
      msgOutId,
      inColumns: normalizeColsFromAdminRest(inColumnsRaw),
      outColumns: normalizeColsFromAdminRest(outColumnsRaw),
    };

    // form 초기화 — 가져온 컬럼 기반
    initForm();
  } catch (e) {
    meta.value = { ...meta.value, loading: false, error: e?.message || '오류' };
  }
}

function normalizeCols(rows) {
  return (rows || []).map((c) => ({
    id: c.msg_col_def_id || c.MSG_COL_DEF_ID,
    name: c.msg_col_def_nm || c.MSG_COL_DEF_NM || c.msg_col_def_id || c.MSG_COL_DEF_ID,
    typeCd: c.type_cd || c.TYPE_CD || 'string',
    maxLength: c.max_length || c.MAX_LENGTH || null,
    mandYn: c.mand_yn || c.MAND_YN || 'N',
    useEncYn: c.use_enc_yn || c.USE_ENC_YN || 'N',
  }));
}

// ★ (2026-06-04, dspark): admin REST 응답 컬럼 (camelCase: colId/dataType/useYn/useEncYn) 정규화.
function normalizeColsFromAdminRest(rows) {
  return (rows || []).map((c) => ({
    id: c.colId,
    name: c.colNm || c.colId,
    typeCd: c.dataType || 'string',
    maxLength: c.maxLength || null,
    mandYn: c.useYn || 'N',
    useEncYn: c.useEncYn || 'N',
  }));
}

// ─── REQ form ───────────────────────────────────────────────────────────────
const reqValues = ref({});

function initForm() {
  const obj = {};
  for (const c of meta.value.inColumns) {
    obj[c.id] = '';
  }
  reqValues.value = obj;
}

// ─── envelope preview (편집 가능) ──────────────────────────────────────────
const envelopeMode = ref('form');  // 'form' | 'json'
const rawEnvelopeText = ref('');
const rawEnvelopeError = ref('');

// ★ (2026-06-04, dspark): Command suffix 별 sStatus 기본값 자동 결정.
//   R/P/E = 'R' (의미 없음 placeholder), S = 사용자 선택 (I/U/D, 기본 'I').
//   h5 framework BusinessEntity.saveItem (line 293/392) 가 'I'/'U'/'D' equalsIgnoreCase 로 분기.
//   ★ AS-IS 매뉴얼 §3.1 표기 'C' 는 IBSheet UI 명칭 — framework key 는 'I'. 'C' 보내면 silent skip.
const SSTATUS_OPTIONS = [
  { value: 'I', label: 'I — INSERT (신규)' },
  { value: 'U', label: 'U — UPDATE (수정)' },
  { value: 'D', label: 'D — DELETE (삭제)' },
];
const reqStatus = ref('I');  // S Command 용 사용자 선택 (I/U/D)

function defaultSStatus() {
  return cmdSuffix.value === 'S' ? reqStatus.value : 'R';
}

function buildBodyFromForm() {
  const sStatus = defaultSStatus();
  if (!meta.value.msgInId) {
    return { ME_TST_01: [{ _seq: 1, sStatus, sDelete: '', ...reqValues.value }] };
  }
  // 메시지 ID 의 ME_ 변환 — MT_TST0001_01 → ME_TST0001_01
  const instance = String(meta.value.msgInId).replace(/^MT_/, 'ME_');
  return {
    [instance]: [{ _seq: 1, sStatus, sDelete: '', ...reqValues.value }],
  };
}

const envelopePreview = computed(() => {
  if (!serviceId.value) return null;
  return buildEnvelope(serviceId.value, buildBodyFromForm());
});
const envelopeJson = computed(() => JSON.stringify(envelopePreview.value, null, 2));

function switchToJsonMode() {
  rawEnvelopeText.value = envelopeJson.value;
  rawEnvelopeError.value = '';
  envelopeMode.value = 'json';
}
function switchToFormMode() {
  envelopeMode.value = 'form';
  rawEnvelopeError.value = '';
}
function validateRawEnvelope() {
  try {
    JSON.parse(rawEnvelopeText.value);
    rawEnvelopeError.value = '';
    return true;
  } catch (e) {
    rawEnvelopeError.value = e?.message || 'JSON 파싱 오류';
    return false;
  }
}

// ─── 호출 ───────────────────────────────────────────────────────────────────
const calling = ref(false);
const result = ref(null);  // { ok, response, ms, idempotencyKey, error, errorGuide }

async function onCall() {
  if (!serviceId.value) return;
  calling.value = true;
  result.value = null;
  const start = performance.now();
  let body;

  if (envelopeMode.value === 'json') {
    if (!validateRawEnvelope()) {
      calling.value = false;
      return;
    }
    try {
      const parsed = JSON.parse(rawEnvelopeText.value);
      body = parsed?.BODY || parsed;
    } catch (e) {
      rawEnvelopeError.value = e.message;
      calling.value = false;
      return;
    }
  } else {
    body = buildBodyFromForm();
  }

  try {
    const { ok, response, idempotencyKey } = await callMetaService(serviceId.value, body, {
      suppressError: true,
    });
    const ms = Math.round(performance.now() - start);

    let errorGuide = null;
    if (!ok) {
      const cat = classifyMetaError(response);
      errorGuide = { category: cat, ...getMetaErrorGuide(cat) };
    } else if (cmdSuffix.value === 'S') {
      // ★ (2026-06-04, dspark): Save 시나리오 silent no-op 검증을 rStatus 우선으로 격상.
      //   h5 framework BusinessEntity 가 INSERT/UPDATE/DELETE 성공 시 응답 row 의
      //   rStatus 컬럼에 'OK' 박음. 'object_id' 휴리스틱은 MT_SAVE_RESULT 가 DB FRM_MSG_DEF
      //   미등록 환경에서 false positive 다수 발생. rStatus 가 진짜 시그널.
      //   1순위: rStatus='OK' → 성공. 2순위: *_id 필드 비어있지 않으면 성공.
      //   둘 다 실패 시 silent no-op 의심 (실 환경에서는 R 재조회로 확정 권장).
      const rows = response?.BODY?.ME_SAVE_RESULT;
      const firstRow = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
      const rStatus = firstRow?.rStatus;
      const oidLike = firstRow ? (
        firstRow.object_id || firstRow.OID || firstRow.oid ||
        Object.entries(firstRow).find(([k, v]) => /_id$/i.test(k) && v != null && String(v).trim() !== '')?.[1]
      ) : null;
      const isOk = rStatus === 'OK' || (oidLike != null && String(oidLike).trim() !== '');
      if (!isOk && rStatus !== 'OK') {
        errorGuide = {
          category: 'SILENT_NOOP',
          title: 'Silent no-op 가능성',
          hint: '응답 SUCCESS 였으나 rStatus="OK" 시그널이 없습니다. Entity 매핑 또는 sStatus 값 확인 (99 §5.8). R 재조회로 실제 DB 변경 여부 확정 권장.',
        };
      }
    }

    result.value = { ok, response, ms, idempotencyKey, errorGuide };
    pushHistory({
      serviceId: serviceId.value,
      serviceName: serviceId.value,
      body, response, ok, ms,
    });
  } catch (e) {
    const ms = Math.round(performance.now() - start);
    result.value = {
      ok: false,
      response: null,
      ms,
      error: e?.message || '네트워크 오류',
      errorGuide: { category: 'NETWORK', title: '네트워크 오류', hint: e?.message || '서버 응답 없음' },
    };
    pushHistory({
      serviceId: serviceId.value, serviceName: serviceId.value,
      body, response: null, ok: false, ms,
    });
  } finally {
    calling.value = false;
  }
}

// ─── 응답 BODY 슬롯별 row 표시 ─────────────────────────────────────────────
const responseSlots = computed(() => {
  const body = result.value?.response?.BODY;
  if (!body || typeof body !== 'object') return [];
  return Object.entries(body)
    .map(([slot, rows]) => ({ slot, rows: Array.isArray(rows) ? rows : [] }))
    .filter((s) => s.rows.length > 0);
});

// ─── 즐겨찾기 ───────────────────────────────────────────────────────────────
const savingFav = ref(false);
const favName = ref('');
function onSaveFavorite() {
  if (!favName.value.trim()) {
    favName.value = `${serviceId.value} preset`;
  }
  saveFavorite({
    name: favName.value.trim() || serviceId.value,
    serviceId: serviceId.value,
    body: envelopeMode.value === 'json' ? safeParse(rawEnvelopeText.value) : buildBodyFromForm(),
  });
  savingFav.value = false;
  favName.value = '';
}
function safeParse(t) {
  try { return JSON.parse(t); } catch { return {}; }
}

function loadFavorite(fav) {
  serviceId.value = fav.serviceId;
  // body 로 form 채우기 시도 — 첫 슬롯의 첫 row 의 필드를 form 으로
  if (fav.body && typeof fav.body === 'object') {
    const firstSlot = Object.values(fav.body)[0];
    if (Array.isArray(firstSlot) && firstSlot[0]) {
      const row = firstSlot[0];
      const next = {};
      for (const k of Object.keys(row)) {
        if (!['_seq', 'sStatus', 'sDelete'].includes(k)) next[k] = row[k];
      }
      reqValues.value = next;
    }
  }
}

function loadHistory(h) {
  serviceId.value = h.serviceId;
  if (h.body) {
    const firstSlot = Object.values(h.body)[0];
    if (Array.isArray(firstSlot) && firstSlot[0]) {
      const row = firstSlot[0];
      const next = {};
      for (const k of Object.keys(row)) {
        if (!['_seq', 'sStatus', 'sDelete'].includes(k)) next[k] = row[k];
      }
      reqValues.value = next;
    }
  }
}

// ─── 입력 위젯 helper ───────────────────────────────────────────────────────
function widgetTypeFor(typeCd) {
  switch (typeCd) {
    case 'numeric': return 'number';
    case 'date':    return 'date';
    case 'clob':    return 'textarea';
    default:        return 'text';
  }
}

// ─── 초기 로드 ──────────────────────────────────────────────────────────────
onMounted(() => {
  if (serviceId.value) fetchMeta();
});
watch(() => route.params.serviceId, (v) => {
  if (v && v !== serviceId.value) {
    serviceId.value = v;
    fetchMeta();
    result.value = null;
  }
});

// ★ (2026-06-04, dspark): 돌아가기 — history back 우선 + 카탈로그 fallback.
//   사용자 피드백: "돌아갈 방법이 없다". 직접 URL 진입(새 탭/북마크) 시도 history 없음
//   → router.push 로 LNB 정합 META_SERVICES (/admin/meta/services) 라우트.
function goToCatalog() {
  if (window.history.length > 1 && document.referrer && document.referrer.includes(window.location.host)) {
    router.back();
  } else {
    router.push({ name: 'META_SERVICES' });
  }
}

function formatCell(v) {
  if (v == null) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  const s = String(v);
  return s.length > 60 ? s.slice(0, 60) + '…' : s;
}
</script>

<template>
  <div class="svc-tst">
    <!-- ★ (2026-06-04, dspark): 페이지 본문 헤더 — 좌측 InMetaStepHeader + 우측 끝 [< 뒤로] 버튼.
         사용자 피드백: "헤더에는 메뉴뎁스같은 것이 있어야 한다. 뒤로 액션은 본문 헤더 우측에." -->
    <div class="svc-tst__page-header">
      <InMetaStepHeader
        :title="serviceId || '신규 호출'"
        :code="cmdInfo?.label || ''"
        subtitle="임의 서비스 즉석 호출. 메타 lookup → REQ 폼 자동 생성 → envelope 송신 → 응답 분석."
      >
      <template #subtitle>
        <span>임의 서비스 즉석 호출. 메타 lookup → REQ 폼 자동 생성 → envelope 송신 → 응답 분석.</span>
        <span v-if="cmdInfo">
          · Command 종류: <strong>{{ cmdInfo.label }}</strong> ({{ cmdInfo.command }})
        </span>
      </template>
      </InMetaStepHeader>
      <InButton
        class="svc-tst__page-back"
        variant="default"
        size="md"
        :left-icon-show="true"
        :right-icon-show="false"
        @click="goToCatalog"
      >
        <template #prefix><InIcon name="chevron-left" :size="14" /></template>
        뒤로
      </InButton>
    </div>

    <!-- ─── 서비스 ID 입력 ─── -->
    <InMetaStepSection step-no="1" title="서비스 ID">
      <template #hint>
        ID 입력 후 [메타 조회] → 컬럼 자동 추출 + REQ 폼 생성
      </template>
      <!-- ★ (2026-06-04, dspark): Step 1 #actions 의 중복 [서비스 카탈로그로] 제거.
           페이지 최상단 nav 의 [뒤로] 가 단일 진입점. -->

      <div class="svc-tst__id-row">
        <InTextField
          v-model="serviceId"
          label="서비스 ID"
          placeholder="예: AUT0030_00_R01"
          layout="vertical"
          size="md"
          show-required
        />
        <InButton
          variant="primary"
          size="md"
          :left-icon-show="false"
          :right-icon-show="false"
          :disabled="!serviceId || meta.loading"
          @click="fetchMeta"
        >
          {{ meta.loading ? '조회 중…' : '메타 조회' }}
        </InButton>
      </div>

      <div v-if="meta.error" class="svc-tst__hint svc-tst__hint--warning">
        <InIcon name="status-warning" :size="12" /> {{ meta.error }} <span>— 메타 없이 generic JSON 으로도 송신 가능합니다.</span>
      </div>
      <div v-else-if="meta.serviceDef" class="svc-tst__meta-row">
        <InMetaResourceBadge kind="SERVICE" :resource-id="meta.serviceDef.sv_def_nm || meta.serviceDef.SV_DEF_NM" status="saved" />
        <InMetaResourceBadge v-if="meta.msgInId" kind="MSG_IN" :resource-id="meta.msgInId" status="saved" />
        <InMetaResourceBadge v-if="meta.msgOutId" kind="MSG_OUT" :resource-id="meta.msgOutId" status="saved" />
      </div>
    </InMetaStepSection>

    <!-- ─── REQ 폼 + envelope ─── -->
    <InMetaStepSection step-no="2" title="REQ + Envelope">
      <template #hint>
        폼 / JSON 직접 편집 전환
      </template>
      <template #actions>
        <button
          type="button"
          class="svc-tst__mode-btn"
          :class="{ 'svc-tst__mode-btn--active': envelopeMode === 'form' }"
          @click="switchToFormMode"
        >폼</button>
        <button
          type="button"
          class="svc-tst__mode-btn"
          :class="{ 'svc-tst__mode-btn--active': envelopeMode === 'json' }"
          @click="switchToJsonMode"
        >JSON</button>
      </template>

      <!-- 폼 모드 -->
      <div v-if="envelopeMode === 'form'">
        <!-- ★ (2026-06-04, dspark): S Command 한정 sStatus 선택 (C/U/D). 그 외 Command 는 'R' 자동. -->
        <div v-if="cmdSuffix === 'S'" class="svc-tst__sstatus-row">
          <label class="svc-tst__label">
            sStatus <span class="svc-tst__req-mark">*</span>
            <span class="svc-tst__field-hint"><code>MultiSaveCommand</code> 행 상태 (C=INSERT / U=UPDATE / D=DELETE)</span>
          </label>
          <select v-model="reqStatus" class="svc-tst__input">
            <option v-for="o in SSTATUS_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </div>
        <div v-if="meta.inColumns.length === 0" class="svc-tst__empty">
          IN 메시지 컬럼 메타가 없습니다. JSON 모드로 직접 편집하세요.
        </div>
        <div v-else class="svc-tst__form-grid">
          <div v-for="c in meta.inColumns" :key="c.id" class="svc-tst__field">
            <label class="svc-tst__label">
              {{ c.name }}
              <span v-if="c.mandYn === 'Y'" class="svc-tst__req-mark">*</span>
              <span class="svc-tst__field-hint">
                <code>{{ c.typeCd }}</code><span v-if="c.maxLength">({{ c.maxLength }})</span>
                <span v-if="c.useEncYn === 'Y'" class="svc-tst__enc-mark">🔒 enc</span>
              </span>
            </label>
            <textarea
              v-if="widgetTypeFor(c.typeCd) === 'textarea'"
              v-model="reqValues[c.id]"
              class="svc-tst__textarea"
              rows="3"
              :placeholder="`:${c.id}`"
            />
            <input
              v-else
              v-model="reqValues[c.id]"
              :type="widgetTypeFor(c.typeCd)"
              :placeholder="`:${c.id}`"
              class="svc-tst__input"
              :maxlength="c.maxLength || undefined"
            />
          </div>
        </div>

        <details class="svc-tst__envelope-details">
          <summary>송신될 envelope 미리보기</summary>
          <InMetaCodeBlock :code="envelopeJson" lang="json" max-height="200px" />
        </details>
      </div>

      <!-- JSON 직접 편집 -->
      <div v-else>
        <textarea
          v-model="rawEnvelopeText"
          class="svc-tst__textarea svc-tst__textarea--json"
          rows="14"
          spellcheck="false"
          @blur="validateRawEnvelope"
        />
        <p v-if="rawEnvelopeError" class="svc-tst__hint svc-tst__hint--error">
          <InIcon name="status-error" :size="12" /> {{ rawEnvelopeError }}
        </p>
      </div>
    </InMetaStepSection>

    <!-- ─── 호출 액션 ─── -->
    <InMetaStepSection step-no="3" title="호출">
      <template #hint>
        Idempotency key 자동 부여 (race 차단)
      </template>

      <div class="svc-tst__call-row">
        <InButton
          variant="primary"
          size="md"
          :left-icon-show="false"
          :right-icon-show="false"
          :disabled="!serviceId || calling"
          @click="onCall"
        >
          <InIcon name="arrow-right" :size="12" colorize color="white" />
          {{ calling ? '호출 중…' : `▶ 호출 (${cmdInfo?.label || '?'})` }}
        </InButton>

        <label v-if="cmdSuffix === 'S'" class="svc-tst__dry-toggle">
          <input v-model="dryRun" type="checkbox" />
          <span>dry-run (트랜잭션 ROLLBACK 의도)</span>
          <span class="svc-tst__dry-hint">※ 현재 클라이언트 표시만. 백엔드 지원 후 envelope HEADER 에 반영 예정.</span>
        </label>

        <span v-if="result" class="svc-tst__result-meta">
          <InIcon :name="result.ok ? 'check-circle' : 'status-error'" :size="14" />
          {{ result.ok ? 'SUCCESS' : (result.errorGuide?.title || 'FAIL') }} · {{ result.ms }}ms
        </span>
      </div>

      <InMetaErrorCard
        v-if="result?.errorGuide"
        :title="result.errorGuide.title"
        :hint="result.errorGuide.hint"
        :category="result.errorGuide.category"
        :tone="result.errorGuide.category === 'SILENT_NOOP' ? 'warning' : 'error'"
      />
    </InMetaStepSection>

    <!-- ─── 응답 ─── -->
    <InMetaStepSection v-if="result?.response" step-no="4" title="응답">
      <template #hint>
        수신 전문 (envelope 전체) + HEADER + BODY 슬롯별 표시
      </template>

      <div class="svc-tst__resp-grid">
        <!-- ★ (2026-06-04, dspark): 수신 전문 전체 (envelope HEADER + BODY 통째) 최상단에 표시.
             AS-IS JSP success_response.jsp 가 보낸 raw 본문 그대로 확인 가능. -->
        <section>
          <h5 class="svc-tst__sub-h">수신 전문 (envelope 전체)</h5>
          <InMetaCodeBlock :code="JSON.stringify(result.response, null, 2)" lang="json" max-height="320px" />
        </section>
        <section>
          <h5 class="svc-tst__sub-h">HEADER</h5>
          <InMetaCodeBlock :code="JSON.stringify(result.response.HEADER || {}, null, 2)" lang="json" max-height="180px" />
        </section>
        <section v-for="(s, i) in responseSlots" :key="i" class="svc-tst__slot">
          <h5 class="svc-tst__sub-h">{{ s.slot }} ({{ s.rows.length }} 행)</h5>
          <div class="svc-tst__rows-wrap">
            <table class="svc-tst__rows-table">
              <thead>
                <tr>
                  <th v-for="k in Object.keys(s.rows[0] || {})" :key="k">{{ k }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, ri) in s.rows.slice(0, 50)" :key="ri">
                  <td v-for="k in Object.keys(s.rows[0] || {})" :key="k">
                    <code>{{ formatCell(r[k]) }}</code>
                  </td>
                </tr>
              </tbody>
            </table>
            <p v-if="s.rows.length > 50" class="svc-tst__rows-note">
              상위 50행 표시 (전체 {{ s.rows.length }}행). 전체 JSON 은 수신 전문 영역 참조.
            </p>
          </div>
        </section>

        <details class="svc-tst__resp-details">
          <summary>raw BODY JSON</summary>
          <InMetaCodeBlock :code="JSON.stringify(result.response.BODY || {}, null, 2)" lang="json" max-height="300px" />
        </details>
      </div>
    </InMetaStepSection>

    <!-- ─── 이력 ─── -->
    <InMetaStepSection v-if="history.length > 0" step-no="i" title="최근 호출 이력" tone="muted">
      <template #hint>
        최근 {{ history.length }}건 (최대 20) · localStorage persist
      </template>
      <template #actions>
        <button type="button" class="svc-tst__mode-btn" @click="clearHistory">전체 삭제</button>
      </template>

      <ul class="svc-tst__history">
        <li v-for="h in history.slice(0, 10)" :key="h.id" class="svc-tst__history-item">
          <InIcon :name="h.ok ? 'check-circle' : 'status-error'" :size="12" />
          <code class="svc-tst__history-id">{{ h.serviceName }}</code>
          <span class="svc-tst__history-meta">{{ new Date(h.at).toLocaleTimeString() }} · {{ h.ms }}ms</span>
          <button type="button" class="svc-tst__mode-btn" @click="loadHistory(h)">불러오기</button>
        </li>
      </ul>
    </InMetaStepSection>

    <!-- ─── 즐겨찾기 ─── -->
    <InMetaStepSection v-if="favorites.length > 0 || savingFav" step-no="i" title="즐겨찾기" tone="muted">
      <template #actions>
        <button v-if="!savingFav" type="button" class="svc-tst__mode-btn" :disabled="!serviceId" @click="savingFav = true">
          현재 입력 저장
        </button>
      </template>

      <div v-if="savingFav" class="svc-tst__fav-save">
        <input v-model="favName" class="svc-tst__input" placeholder="프리셋 이름" />
        <InButton variant="primary" size="sm" :left-icon-show="false" :right-icon-show="false" @click="onSaveFavorite">저장</InButton>
        <InButton variant="text" size="sm" :left-icon-show="false" :right-icon-show="false" @click="savingFav = false">취소</InButton>
      </div>

      <ul class="svc-tst__history">
        <li v-for="f in favorites" :key="f.id" class="svc-tst__history-item">
          <InIcon name="bookmark" :size="12" />
          <span class="svc-tst__history-id">{{ f.name }}</span>
          <code class="svc-tst__history-meta">{{ f.serviceId }}</code>
          <button type="button" class="svc-tst__mode-btn" @click="loadFavorite(f)">불러오기</button>
          <button type="button" class="svc-tst__mode-btn" @click="removeFavorite(f.id)">삭제</button>
        </li>
      </ul>
    </InMetaStepSection>
  </div>
</template>

<style scoped>
.svc-tst {
  display: flex;
  flex-direction: column;
  gap: 14px;
  font-family: var(--in-font-family-body);
}

/* ★ (2026-06-04, dspark): 페이지 본문 헤더 — 좌측 InMetaStepHeader + 우측 끝 [< 뒤로]. */
.svc-tst__page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.svc-tst__page-header > :first-child { flex: 1 1 auto; min-width: 0; }
.svc-tst__page-back { flex: 0 0 auto; align-self: flex-start; margin-top: 2px; }

/* === ID input row === */
.svc-tst__id-row {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}
.svc-tst__id-row :deep(.in-tx) { flex: 1 1 280px; min-width: 0; }

.svc-tst__meta-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.svc-tst__hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--in-font-size-xs);
  margin: 0;
}
.svc-tst__hint--warning { color: var(--in-text-warning); }
.svc-tst__hint--error { color: var(--in-text-error); }
.svc-tst__hint span { color: var(--in-text-subtle); }

/* === Mode toggle === */
.svc-tst__mode-btn {
  padding: 3px 10px;
  border: 1px solid var(--in-border-default);
  border-radius: var(--in-radius-xs);
  background: var(--in-surface-overlay, #ffffff);
  color: var(--in-text-default);
  font-size: var(--in-font-size-xs);
  cursor: pointer;
  font-family: var(--in-font-family-body);
}
.svc-tst__mode-btn:hover {
  border-color: var(--in-brand);
  color: var(--in-brand);
}
.svc-tst__mode-btn--active {
  border-color: var(--in-brand);
  background: var(--in-bg-accent-subtle, var(--in-brand-50, #e1f5fc));
  color: var(--in-brand);
  font-weight: var(--in-font-weight-medium);
}
.svc-tst__mode-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* === Form grid === */
.svc-tst__empty {
  padding: 16px;
  background: var(--in-surface-default, #fafafa);
  border: 1px dashed var(--in-border-default);
  border-radius: var(--in-radius-xs);
  font-size: var(--in-font-size-sm);
  color: var(--in-text-subtle);
  text-align: center;
}
.svc-tst__form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}
.svc-tst__field { display: flex; flex-direction: column; gap: 4px; }
.svc-tst__label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--in-font-size-sm);
  color: var(--in-text-default);
  font-weight: var(--in-font-weight-medium);
  flex-wrap: wrap;
}
.svc-tst__req-mark { color: var(--in-text-error); }
.svc-tst__field-hint {
  margin-left: auto;
  font-size: 10px;
  color: var(--in-text-subtler);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.svc-tst__field-hint code { font-family: 'Consolas', monospace; }
.svc-tst__enc-mark { color: var(--in-text-warning); }

.svc-tst__input,
.svc-tst__textarea {
  padding: 6px 10px;
  border: 1px solid var(--in-border-input, var(--in-border-default));
  border-radius: var(--in-radius-xs);
  font-family: var(--in-font-family-body);
  font-size: var(--in-font-size-sm);
  outline: none;
  background: var(--in-surface-overlay, #ffffff);
  color: var(--in-text-default);
}
.svc-tst__input:focus,
.svc-tst__textarea:focus { border-color: var(--in-brand); }
.svc-tst__textarea {
  font-family: 'Consolas', monospace;
  resize: vertical;
  min-height: 60px;
}
.svc-tst__textarea--json {
  width: 100%;
  min-height: 220px;
  background: var(--in-surface-default, #fafafa);
  color: var(--in-text-accent);
}

.svc-tst__envelope-details {
  margin-top: 10px;
  border-top: 1px dashed var(--in-border-default);
  padding-top: 8px;
}
.svc-tst__envelope-details summary {
  font-size: var(--in-font-size-xs);
  color: var(--in-text-subtle);
  cursor: pointer;
  user-select: none;
  padding: 4px 0;
}
.svc-tst__envelope-details summary:hover { color: var(--in-brand); }

/* === Call row === */
.svc-tst__call-row {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.svc-tst__dry-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--in-font-size-sm);
  color: var(--in-text-default);
  flex-wrap: wrap;
}
.svc-tst__dry-toggle input { width: 14px; height: 14px; margin: 0; accent-color: var(--in-text-warning); }
.svc-tst__dry-hint {
  font-size: 10px;
  color: var(--in-text-subtler);
  margin-left: 4px;
}

.svc-tst__result-meta {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--in-font-size-sm);
  font-weight: var(--in-font-weight-medium);
}

/* === Response === */
.svc-tst__resp-grid { display: flex; flex-direction: column; gap: 12px; }
.svc-tst__sub-h {
  margin: 0 0 4px;
  font-size: var(--in-font-size-xs);
  font-weight: var(--in-font-weight-medium);
  color: var(--in-text-subtle);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.svc-tst__rows-wrap {
  border: 1px solid var(--in-border-default);
  border-radius: var(--in-radius-xs);
  overflow: auto;
  max-height: 280px;
}
.svc-tst__rows-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--in-font-size-xs);
}
.svc-tst__rows-table thead th {
  position: sticky;
  top: 0;
  padding: 6px 8px;
  background: var(--in-surface-default, #fafafa);
  border-bottom: 1px solid var(--in-border-default);
  font-weight: var(--in-font-weight-medium);
  color: var(--in-text-subtle);
  text-align: left;
  white-space: nowrap;
}
.svc-tst__rows-table tbody td {
  padding: 4px 8px;
  border-bottom: 1px solid var(--in-border-default);
  vertical-align: top;
}
.svc-tst__rows-table tbody td code {
  font-family: 'Consolas', monospace;
  color: var(--in-text-default);
}
.svc-tst__rows-note {
  margin: 4px 8px;
  font-size: 10px;
  color: var(--in-text-subtler);
}

.svc-tst__resp-details summary {
  font-size: var(--in-font-size-xs);
  color: var(--in-text-subtle);
  cursor: pointer;
  user-select: none;
  padding: 4px 0;
}

/* === History / Favorites === */
.svc-tst__history {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.svc-tst__history-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: var(--in-surface-overlay, #ffffff);
  border: 1px solid var(--in-border-default);
  border-radius: var(--in-radius-xs);
  font-size: var(--in-font-size-sm);
  flex-wrap: wrap;
}
.svc-tst__history-id {
  font-family: 'Consolas', monospace;
  color: var(--in-text-accent);
  flex: 1 1 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.svc-tst__history-meta {
  font-family: 'Consolas', monospace;
  font-size: var(--in-font-size-xs);
  color: var(--in-text-subtle);
}
.svc-tst__fav-save {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}
</style>
