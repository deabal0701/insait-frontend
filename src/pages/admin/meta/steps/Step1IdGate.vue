<script setup>
/**
 * Step1IdGate — 화면 ID 결정 (P1).
 *
 * 책임:
 *  1. 도메인 3자 prefix 콤보 (META_DOMAINS 35건, filterable + 카테고리 표시)
 *  2. 일련번호 4자 입력 + "자동 다음 번호" 추천 (AUT0030_00_R01 lookup)
 *  3. Command 종류 4 카드 (R/S/P/E) — sv_map_type / requiresEntity 표시
 *  4. 충돌검사 (debounce 400ms) — checkScreenIdAvailability 호출
 *  5. 모두 통과 시 [확정 + 다음 단계로] enable → store.completeIdGate() → step2 자동 전환
 *  6. ID lock 후 변경 시 reset 안내 (store.screenIdLocked)
 *
 * 매뉴얼 근거:
 *  - SUMMARY §1.2 — 7-char prefix 컨벤션
 *  - 99 §4-2.1 — 자동 바인딩 함정 (절대 7자 준수)
 *  - 99 §5-2.4 — TEST_* prefix 충돌 위험 (학습용 도메인 분리)
 */
import { computed, ref, watch, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useMetaWizardStore } from '@/stores/metaWizard';
import { META_DOMAINS, META_DOMAIN_CATEGORIES, findDomainByCode } from '@/constants/metaDomains';
import { META_CMD_TYPES, buildScreenId, extractDomainCode, extractSerial } from '@/utils/metaNaming';
import { checkScreenIdAvailability, callMetaService, META_SERVICES } from '@/services/metaApi';

import InSelect from '@/components/ui/InSelect.vue';
import InTextField from '@/components/ui/InTextField.vue';
import InButton from '@/components/ui/InButton.vue';
import InIcon from '@/components/ui/InIcon.vue';

const store = useMetaWizardStore();
const { screenId, cmdType, idGate, derivedIds, screenIdLocked, screenIdValidation } = storeToRefs(store);

// ─── 입력 분해: screenId(7자) ↔ domainCode(3자) + serial(4자) ────────────────
const domainCode = ref(extractDomainCode(screenId.value));
const serial = ref(extractSerial(screenId.value));

watch([domainCode, serial], () => {
  if (screenIdLocked.value) return;
  const next = buildScreenId(domainCode.value, serial.value);
  screenId.value = next;
});

// 외부에서 screenId 변경 시 양방향 sync
watch(screenId, (v) => {
  if (extractDomainCode(v) !== domainCode.value) domainCode.value = extractDomainCode(v);
  if (extractSerial(v) !== serial.value) serial.value = extractSerial(v);
});

// ─── 도메인 콤보 옵션 (카테고리별 label 그룹화) ───────────────────────────────
const domainOptions = computed(() => {
  const out = [];
  for (const cat of META_DOMAIN_CATEGORIES) {
    const doms = META_DOMAINS.filter((d) => d.category === cat.key);
    for (const d of doms) {
      out.push({
        value: d.code,
        label: `${d.code} — ${d.label}` + (d.productionUse === false ? ' [학습용]' : ''),
      });
    }
  }
  return out;
});

// ─── 충돌 검사 (debounce 400ms) ─────────────────────────────────────────────
/** @type {{ state: 'idle'|'checking'|'available'|'taken'|'unreachable', count: number, sampleIds: string[] }} */
const collision = ref({ state: 'idle', count: 0, sampleIds: [] });
let collisionTimer = null;
const collisionAbort = ref(0);

watch(screenId, (v) => {
  if (collisionTimer) { clearTimeout(collisionTimer); collisionTimer = null; }
  if (screenIdLocked.value) return;
  if (!screenIdValidation.value.valid) {
    collision.value = { state: 'idle', count: 0, sampleIds: [] };
    return;
  }
  collision.value = { state: 'checking', count: 0, sampleIds: [] };
  const myToken = ++collisionAbort.value;
  collisionTimer = setTimeout(async () => {
    try {
      const res = await checkScreenIdAvailability(v);
      if (myToken !== collisionAbort.value) return; // 이전 요청 폐기
      // ok=false → 서버 응답 실패 → unreachable (진행은 막지 않고 경고만)
      // ok=true && count===0 → available
      // ok=true && count>0 → taken
      let state;
      if (!res.ok) state = 'unreachable';
      else state = res.available ? 'available' : 'taken';
      collision.value = {
        state,
        count: res.count,
        sampleIds: (res.rows || []).slice(0, 5).map((r) => r.object_nm || r.OBJECT_NM || ''),
      };
    } catch (_e) {
      if (myToken !== collisionAbort.value) return;
      // 백엔드 미연결 / 권한 부족 등 — 진행은 막지 않고 경고
      collision.value = { state: 'unreachable', count: 0, sampleIds: [] };
    }
  }, 400);
});

onUnmounted(() => { if (collisionTimer) clearTimeout(collisionTimer); });

// ─── 자동 다음 번호 추천 ────────────────────────────────────────────────────
const suggestingSerial = ref(false);
async function suggestNextSerial() {
  if (!domainCode.value) return;
  suggestingSerial.value = true;
  try {
    // AUT0030_00_R01: object_nm LIKE 'XXX%' 의 최대 일련번호 → +1
    const { ok, response } = await callMetaService(
      META_SERVICES.OBJECT_LIST,
      {
        ME_AUT0030_01: [{
          _seq: 1, sStatus: 'R', sDelete: '',
          object_nm: domainCode.value, company_cd: '01',
        }],
      },
      { actionType: 'retrieve', suppressError: true },
    );
    const rows = response?.BODY?.ME_AUT0030_02 || response?.BODY?.ME_AUT0030_02_LIST || [];
    if (ok && rows.length) {
      let max = 0;
      for (const r of rows) {
        const nm = String(r.object_nm || r.OBJECT_NM || '');
        const m = nm.match(/^[A-Z]{3}(\d{4})/);
        if (m) max = Math.max(max, parseInt(m[1], 10));
      }
      const next = String(max + 1).padStart(4, '0');
      serial.value = next;
    } else {
      // 백엔드 미연결 — '0001' 부여
      serial.value = '0001';
    }
  } catch {
    serial.value = '0001';
  } finally {
    suggestingSerial.value = false;
  }
}

// ─── ID 입력 상태 표시 ──────────────────────────────────────────────────────
const idStatus = computed(() => {
  if (!screenId.value) return { tone: 'default', msg: '도메인 + 일련번호를 입력하세요.' };
  if (!screenIdValidation.value.valid) {
    return { tone: 'error', msg: screenIdValidation.value.reason };
  }
  if (collision.value.state === 'checking') return { tone: 'default', msg: '중복 검사 중…' };
  if (collision.value.state === 'available') return { tone: 'success', msg: '사용 가능합니다.' };
  if (collision.value.state === 'taken') {
    return { tone: 'error', msg: `이미 ${collision.value.count}건 등록되어 있습니다 (${collision.value.sampleIds.join(', ')}).` };
  }
  if (collision.value.state === 'unreachable') return { tone: 'warning', msg: '서버 검증 실패 — 로컬 형식만 통과. 진행 시 책임을 운영자가 짊어집니다.' };
  return { tone: 'default', msg: '' };
});

const selectedDomain = computed(() => findDomainByCode(domainCode.value));
const selectedCmdInfo = computed(() => META_CMD_TYPES.find((c) => c.code === cmdType.value));

// ─── 진행 가능 여부 ─────────────────────────────────────────────────────────
const canSubmit = computed(() => {
  if (screenIdLocked.value) return false;
  if (!screenIdValidation.value.valid) return false;
  if (!cmdType.value) return false;
  // 충돌 검사: available 또는 unreachable(서버 미연결) 시 허용. taken/checking 시 차단.
  if (collision.value.state === 'taken') return false;
  if (collision.value.state === 'checking') return false;
  return true;
});

function onSubmit() {
  store.completeIdGate();
}

function onResetLock() {
  if (!confirm('ID 잠금을 해제하면 진행 중인 모든 단계가 초기화됩니다. 계속할까요?')) return;
  store.reset();
  domainCode.value = '';
  serial.value = '';
  collision.value = { state: 'idle', count: 0, sampleIds: [] };
}
</script>

<template>
  <div class="step1">
    <header class="step1__header">
      <h3 class="step1__title">① ID 게이트 — 화면 ID 결정</h3>
      <p class="step1__sub">
        화면 ID 는 정확히 7자 (도메인 3자 + 일련번호 4자). 이 값이 모든 자원 ID 의 prefix 가 되어
        IST0050 자동 바인딩 함정을 차단합니다.
      </p>
    </header>

    <!-- ─── ID 결정 ─── -->
    <section class="step1__section" :class="{ 'step1__section--locked': screenIdLocked }">
      <div class="step1__section-head">
        <span class="step1__step-no">1</span>
        <h4 class="step1__section-title">화면 ID 결정</h4>
        <span v-if="screenIdLocked" class="step1__locked-chip">
          <InIcon name="check" :size="12" /> 확정됨
        </span>
      </div>

      <div class="step1__row">
        <div class="step1__col step1__col--domain">
          <InSelect
            v-model="domainCode"
            :options="domainOptions"
            label="도메인 (3자)"
            layout="vertical"
            size="md"
            filterable
            input="검색 — 예: PHM, 인사, 결재"
            :disabled="screenIdLocked"
            :helper="selectedDomain ? selectedDomain.label : '운영 도메인 35건 + 학습용 TST'"
          />
        </div>
        <div class="step1__col step1__col--serial">
          <InTextField
            v-model="serial"
            label="일련번호 (4자)"
            layout="vertical"
            size="md"
            placeholder="0001"
            :disabled="screenIdLocked"
            :helper="serial && serial.length !== 4 ? '4자리 숫자 (예: 0001)' : '자동 다음 번호 추천 ↓'"
          />
          <InButton
            variant="text"
            size="sm"
            :left-icon-show="false"
            :right-icon-show="false"
            :disabled="!domainCode || screenIdLocked || suggestingSerial"
            @click="suggestNextSerial"
          >
            {{ suggestingSerial ? '조회 중…' : '자동 다음 번호 추천' }}
          </InButton>
        </div>
        <div class="step1__col step1__col--preview">
          <span class="step1__preview-label">화면 ID</span>
          <span class="step1__preview-value" :class="`step1__preview-value--${idStatus.tone}`">
            {{ screenId || '———————' }}
          </span>
          <span class="step1__preview-status" :class="`step1__preview-status--${idStatus.tone}`">
            <InIcon
              v-if="idStatus.tone === 'success'" name="check-circle" :size="14"
            />
            <InIcon
              v-else-if="idStatus.tone === 'error'" name="status-error" :size="14"
            />
            <InIcon
              v-else-if="idStatus.tone === 'warning'" name="status-warning" :size="14"
            />
            {{ idStatus.msg }}
          </span>
        </div>
      </div>
    </section>

    <!-- ─── Command 종류 ─── -->
    <section class="step1__section" :class="{ 'step1__section--locked': screenIdLocked }">
      <div class="step1__section-head">
        <span class="step1__step-no">2</span>
        <h4 class="step1__section-title">Command 종류</h4>
        <span v-if="cmdType" class="step1__hint">
          선택: {{ selectedCmdInfo?.label }} ({{ selectedCmdInfo?.command }})
        </span>
      </div>

      <div class="step1__cmd-grid">
        <label
          v-for="info in META_CMD_TYPES"
          :key="info.code"
          class="step1__cmd-card"
          :class="{
            'step1__cmd-card--selected': cmdType === info.code,
            'step1__cmd-card--disabled': screenIdLocked,
          }"
        >
          <input
            v-model="cmdType"
            type="radio"
            :value="info.code"
            :disabled="screenIdLocked"
            class="step1__cmd-radio"
          />
          <span class="step1__cmd-head">
            <span class="step1__cmd-code">{{ info.code }}</span>
            <span class="step1__cmd-label">{{ info.label }}</span>
            <span v-if="info.requiresEntity" class="step1__cmd-pill step1__cmd-pill--warning">
              Entity 필수
            </span>
            <span v-else class="step1__cmd-pill step1__cmd-pill--muted">
              Entity 불요
            </span>
          </span>
          <span class="step1__cmd-class">{{ info.command }}</span>
          <span class="step1__cmd-map">매핑: <code>{{ info.svMapType }}</code></span>
        </label>
      </div>
    </section>

    <!-- ─── 자원 ID Preview (인라인) ─── -->
    <section v-if="derivedIds" class="step1__section step1__section--preview-ids">
      <div class="step1__section-head">
        <span class="step1__step-no step1__step-no--secondary">i</span>
        <h4 class="step1__section-title">자동 생성되는 자원 ID</h4>
        <span class="step1__hint">우측 패널 의 "자원 ID 미리보기" 와 동기화됩니다.</span>
      </div>
      <dl class="step1__ids-dl">
        <dt>Object</dt><dd><code>{{ derivedIds.object }}</code></dd>
        <dt>SQL</dt><dd><code>{{ derivedIds.sqlName }}</code></dd>
        <dt>Msg IN</dt><dd><code>{{ derivedIds.msgIn }}</code></dd>
        <dt>Msg OUT</dt><dd><code>{{ derivedIds.msgOut }}</code></dd>
        <template v-if="derivedIds.requiresEntity">
          <dt>Entity</dt><dd><code>{{ derivedIds.entityName }}</code></dd>
        </template>
        <dt>Service</dt><dd><code>{{ derivedIds.serviceName }}</code></dd>
        <dt>JSP 경로</dt><dd><code>{{ derivedIds.objectLink }}</code></dd>
      </dl>
    </section>

    <!-- ─── 액션 ─── -->
    <div class="step1__actions">
      <InButton
        v-if="!screenIdLocked"
        variant="primary"
        size="md"
        :left-icon-show="false"
        :right-icon-show="true"
        :disabled="!canSubmit"
        @click="onSubmit"
      >
        ID 확정 + 다음 단계로
      </InButton>
      <InButton
        v-else
        variant="text"
        size="sm"
        :left-icon-show="false"
        :right-icon-show="false"
        @click="onResetLock"
      >
        ID 잠금 해제 (전체 초기화)
      </InButton>

      <span v-if="idGate.error" class="step1__error">{{ idGate.error }}</span>
    </div>
  </div>
</template>

<style scoped>
.step1 {
  display: flex;
  flex-direction: column;
  gap: 20px;
  font-family: var(--in-font-family-body);
}

/* === Header === */
.step1__header { display: flex; flex-direction: column; gap: 4px; }
.step1__title {
  margin: 0;
  font-size: var(--in-font-size-xl);
  line-height: var(--in-line-height-xl);
  font-weight: var(--in-font-weight-medium);
  color: var(--in-text-accent);
  letter-spacing: var(--in-letter-spacing-xl);
}
.step1__sub {
  margin: 0;
  font-size: var(--in-font-size-sm);
  line-height: var(--in-line-height-sm);
  color: var(--in-text-subtle);
}

/* === Section === */
.step1__section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 18px;
  background: var(--in-surface-overlay, #ffffff);
  border: 1px solid var(--in-border-default);
  border-radius: var(--in-radius-sm);
  transition: opacity 120ms ease, border-color 120ms ease;
}
.step1__section--locked {
  opacity: 0.85;
  border-style: dashed;
}
.step1__section--preview-ids {
  background: var(--in-surface-default, #fafafa);
}

.step1__section-head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.step1__step-no {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: var(--in-radius-full);
  background: var(--in-brand);
  color: var(--in-text-white);
  font-size: var(--in-font-size-sm);
  font-weight: var(--in-font-weight-medium);
  flex-shrink: 0;
}
.step1__step-no--secondary {
  background: var(--in-surface-default, #fafafa);
  border: 1px solid var(--in-border-default);
  color: var(--in-text-subtle);
}
.step1__section-title {
  margin: 0;
  font-size: var(--in-font-size-lg);
  line-height: var(--in-line-height-lg);
  font-weight: var(--in-font-weight-medium);
  color: var(--in-text-accent);
}
.step1__hint {
  font-size: var(--in-font-size-xs);
  color: var(--in-text-subtle);
  margin-left: auto;
}
.step1__locked-chip {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: var(--in-surface-success, #e4faf0);
  color: var(--in-text-success);
  border-radius: var(--in-radius-full);
  font-size: var(--in-font-size-xs);
  font-weight: var(--in-font-weight-medium);
}

/* === Row (ID 결정) === */
.step1__row {
  display: grid;
  grid-template-columns: minmax(260px, 1.4fr) minmax(180px, 1fr) minmax(220px, 1.2fr);
  gap: 16px;
  align-items: flex-start;
}
.step1__col { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.step1__col--preview {
  padding: 12px;
  background: var(--in-surface-default, #fafafa);
  border: 1px dashed var(--in-border-default);
  border-radius: var(--in-radius-xs);
  align-items: flex-start;
}
.step1__preview-label {
  font-size: var(--in-font-size-xs);
  color: var(--in-text-subtle);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.step1__preview-value {
  font-family: 'Consolas', 'Menlo', monospace;
  font-size: 22px;
  line-height: 1.2;
  font-weight: var(--in-font-weight-medium);
  color: var(--in-text-accent);
  letter-spacing: 1px;
}
.step1__preview-value--success { color: var(--in-text-success); }
.step1__preview-value--error   { color: var(--in-text-error); }
.step1__preview-value--warning { color: var(--in-text-warning); }
.step1__preview-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--in-font-size-xs);
  line-height: var(--in-line-height-xs);
}
.step1__preview-status--success { color: var(--in-text-success); }
.step1__preview-status--error   { color: var(--in-text-error); }
.step1__preview-status--warning { color: var(--in-text-warning); }
.step1__preview-status--default { color: var(--in-text-subtle); }

@media (max-width: 900px) {
  .step1__row { grid-template-columns: 1fr; }
}

/* === Command 종류 카드 === */
.step1__cmd-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
}
.step1__cmd-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
  background: var(--in-surface-overlay, #ffffff);
  border: 1px solid var(--in-border-default);
  border-radius: var(--in-radius-xs);
  cursor: pointer;
  position: relative;
  transition: border-color 120ms ease, background 120ms ease, box-shadow 120ms ease;
}
.step1__cmd-card:hover:not(.step1__cmd-card--disabled) {
  border-color: var(--in-brand);
  box-shadow: 0 2px 6px 0 rgba(0, 0, 0, 0.06);
}
.step1__cmd-card--selected {
  border-color: var(--in-brand);
  background: var(--in-bg-accent-subtle, var(--in-brand-50, #e1f5fc));
}
.step1__cmd-card--disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.step1__cmd-radio {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 14px;
  height: 14px;
  margin: 0;
  accent-color: var(--in-brand);
}
.step1__cmd-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.step1__cmd-code {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  background: var(--in-brand);
  color: var(--in-text-white);
  border-radius: var(--in-radius-xxs);
  font-family: 'Consolas', monospace;
  font-size: var(--in-font-size-sm);
  font-weight: var(--in-font-weight-medium);
}
.step1__cmd-label {
  font-size: var(--in-font-size-md);
  font-weight: var(--in-font-weight-medium);
  color: var(--in-text-accent);
}
.step1__cmd-pill {
  padding: 1px 6px;
  border-radius: var(--in-radius-xxs);
  font-size: 10px;
  font-weight: var(--in-font-weight-medium);
  letter-spacing: 0.2px;
}
.step1__cmd-pill--warning {
  background: var(--in-surface-warning, #fffbeb);
  color: var(--in-text-warning);
}
.step1__cmd-pill--muted {
  background: var(--in-surface-default, #fafafa);
  color: var(--in-text-subtle);
}
.step1__cmd-class {
  font-family: 'Consolas', monospace;
  font-size: var(--in-font-size-xs);
  color: var(--in-text-subtle);
}
.step1__cmd-map {
  font-size: var(--in-font-size-xs);
  color: var(--in-text-subtle);
}
.step1__cmd-map code {
  font-family: 'Consolas', monospace;
  color: var(--in-text-accent);
}

/* === 자원 ID Preview === */
.step1__ids-dl {
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: 4px 12px;
  margin: 0;
}
.step1__ids-dl dt {
  font-size: var(--in-font-size-sm);
  color: var(--in-text-subtle);
  font-weight: var(--in-font-weight-medium);
}
.step1__ids-dl dd {
  margin: 0;
  font-size: var(--in-font-size-sm);
  color: var(--in-text-default);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.step1__ids-dl code {
  font-family: 'Consolas', 'Menlo', monospace;
  color: var(--in-text-accent);
}

/* === Actions === */
.step1__actions {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-top: 8px;
}
.step1__error {
  font-size: var(--in-font-size-sm);
  color: var(--in-text-error);
}
</style>
