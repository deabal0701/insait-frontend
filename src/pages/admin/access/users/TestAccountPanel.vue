<script setup>
/**
 * TestAccountPanel — ★ TEMP (2026-06-09, dspark): 발령확정 전 "테스트 계정" 생성/관리 패널.
 *
 * grep 키: "TEMP (2026-06-09".  ※ 제거 시: 이 파일 삭제 + UserCatalog.vue 의 버튼 1줄·import 제거
 *   + adminApi.js 의 testAccounts 항목 제거 + 백엔드 TestAccount* 4파일 제거.
 *
 * 배경: AS-IS 는 채용발령(CAM0050) 확정 시에만 로그인 가능한 사용자가 생성된다
 *   (P_CAM_EMP_NO_CREATE → P_FRM_USER_CREATE). 본 패널은 그 발령 체인을 재사용해
 *   발령확정 전 단계에서 로그인 가능한 테스트 계정을 편의상 선(先)생성한다.
 *   - 입력 최소화: 이름만(기본값 "테스트계정"), 나머지(부서·직위·직급…)는 재직자 코드세트 자동 차용.
 *   - 'S9' 공용사번 + PRIVATE_GROUP 기본권한 자동. 비번 = 더미 주민번호 뒷 7자리(1회 표시).
 *   - 삭제: 9개 인사/계정 테이블 한 번에 정리. [전체 삭제] = 모든 테스트 계정 일괄.
 */
import { computed, ref, watch } from 'vue';
import { adminApi } from '@/services/adminApi';
import { useToast } from '@/composables/useToast';
import { adminErrMsg } from '@/composables/useMetaEditor';

import InModal from '@/components/ui/InModal.vue';
import InButton from '@/components/ui/InButton.vue';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
});
const emit = defineEmits(['update:modelValue', 'changed']);

const toast = useToast();

const name = ref('테스트계정');
const creating = ref(false);
const result = ref(null);          // { empId, loginId, password, message }
const createdName = ref('');       // 방금 생성한 이름 (생성 내역 표시용)

// 발령 체인이 실제로 만든 9개 테이블 (어떤 테이블에 무엇이) — 그룹화 + result 실제 값.
const breakdown = computed(() => {
  const r = result.value;
  const id = r ? r.loginId : '—';
  const eid = r ? r.empId : '—';
  const nm = createdName.value || '—';
  const pw = r ? r.password : '—';
  return [
    { group: '① 로그인 · 계정 (3)', rows: [
      { t: 'FRM_USER',           c: `LOGIN_ID=${id} · PASSWORD=SHA(${pw}) · STATUS_CD=Y · INIT_YN=N · TRY_CNT=0` },
      { t: 'FRM_USER_EMP_MAP',   c: `USER_ID=${eid} · EMP_ID=${eid} · BINDING_TYPE_CD=EMP` },
      { t: 'FRM_USER_GROUP_MAP', c: `USERGROUP_ID=PRIVATE_GROUP (개인 메뉴 기본권한)` },
    ]},
    { group: '② 인사정보 (4)', rows: [
      { t: 'PHM_EMP',        c: `EMP_NO=${id} · IN_OFFI_YN=Y(보정) · GENDER/BIRTH(주민 파생) · 부서·직위·직급·직책·호칭·직군·호봉(차용)` },
      { t: 'PHM_PRIVATE',    c: `CTZ_NO(ARIA 암호화) · 성별 · 생년월일 · NATION_CD=KR` },
      { t: 'PHM_NAME',       c: `LAST_NM(성) · FIRST_NM(이름) = ${nm}` },
      { t: 'PHM_EMP_LOCALE', c: `EMP_NM=${nm} · LOCALE_CD=KO` },
    ]},
    { group: '③ 발령 (2)', rows: [
      { t: 'CAM_PRE',    c: `발령대상자 · TYPE_CD=A00(채용) · EMP_ID=${eid} · 발령일=오늘` },
      { t: 'CAM_EMP_NO', c: `발령 임시테이블 · NOTE='TEST'(삭제 가드 키) · EMP_NO=${id}` },
    ]},
  ];
});
const accounts = ref([]);
const loading = ref(false);
const busyId = ref(null);          // 삭제 중인 empId
const deletingAll = ref(false);

function close() {
  emit('update:modelValue', false);
}

async function reload() {
  loading.value = true;
  try {
    const res = await adminApi.access.testAccounts.list();
    accounts.value = res?.data ?? res ?? [];
  } catch (e) {
    toast.error?.(adminErrMsg(e));
  } finally {
    loading.value = false;
  }
}

async function create() {
  creating.value = true;
  result.value = null;
  const usedName = (name.value || '').trim() || '테스트계정';
  try {
    const res = await adminApi.access.testAccounts.create({ name: usedName });
    result.value = res?.data ?? res;
    createdName.value = usedName;
    toast.success?.(`테스트 계정 생성: ${result.value.loginId}`);
    await reload();
    emit('changed');
  } catch (e) {
    toast.error?.(adminErrMsg(e));
  } finally {
    creating.value = false;
  }
}

async function removeOne(empId) {
  busyId.value = empId;
  try {
    await adminApi.access.testAccounts.remove(empId);
    toast.success?.('삭제되었습니다.');
    if (result.value && result.value.empId === empId) result.value = null;
    await reload();
    emit('changed');
  } catch (e) {
    toast.error?.(adminErrMsg(e));
  } finally {
    busyId.value = null;
  }
}

async function removeAll() {
  if (!accounts.value.length) return;
  if (!window.confirm(`테스트 계정 ${accounts.value.length}건을 모두 삭제할까요? (각 계정당 9개 인사/계정 테이블 정리)`)) return;
  deletingAll.value = true;
  try {
    const res = await adminApi.access.testAccounts.removeAll();
    const n = (res?.data ?? res)?.deleted ?? 0;
    toast.success?.(`${n}건 삭제 완료`);
    result.value = null;
    await reload();
    emit('changed');
  } catch (e) {
    toast.error?.(adminErrMsg(e));
  } finally {
    deletingAll.value = false;
  }
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success?.('복사되었습니다.');
  } catch {
    toast.error?.('복사 실패 — 수동으로 선택해 주세요.');
  }
}

// 열릴 때 목록 로드 + 입력 초기화
watch(() => props.modelValue, (v) => {
  if (v) {
    name.value = '테스트계정';
    result.value = null;
    reload();
  }
});
</script>

<template>
  <InModal
    :model-value="modelValue"
    type="form"
    title="🧪 테스트 계정 (임시)"
    :width="820"
    @update:model-value="(v) => { if (!v) close(); }"
    @close="close"
  >
    <div class="ta">
      <p class="ta__note">
        AS-IS 는 채용발령 확정 시에만 사용자가 생성됩니다. 본 기능은 <b>발령확정 전</b> 로그인 가능한
        테스트 계정을 편의상 만들어 줍니다(임시). 부서·직위 등은 자동 차용, <b>이름만</b> 입력하세요.
      </p>

      <!-- 생성 폼 -->
      <div class="ta__create">
        <label class="ta__label" for="ta-name">이름</label>
        <input
          id="ta-name"
          v-model="name"
          class="ta__input"
          type="text"
          placeholder="테스트계정"
          maxlength="20"
          @keyup.enter="create"
        />
        <InButton variant="primary" size="md" :left-icon-show="false" :right-icon-show="false"
                  :disabled="creating" @click="create">
          {{ creating ? '생성 중…' : '계정 생성' }}
        </InButton>
      </div>

      <!-- 방금 생성 결과 (1회 표시) -->
      <div v-if="result" class="ta__result">
        <div class="ta__result-row">
          <span class="ta__k">로그인ID</span>
          <code class="ta__v">{{ result.loginId }}</code>
          <button type="button" class="ta__copy" @click="copy(result.loginId)">복사</button>
        </div>
        <div class="ta__result-row">
          <span class="ta__k">비밀번호</span>
          <code class="ta__v">{{ result.password }}</code>
          <button type="button" class="ta__copy" @click="copy(result.password)">복사</button>
        </div>
        <p class="ta__result-hint">이 비밀번호는 지금만 표시됩니다. 안전한 곳에 보관하세요.</p>
      </div>

      <!-- 기존 테스트 계정 목록 -->
      <div class="ta__list-head">
        <span>기존 테스트 계정 <b>{{ accounts.length }}</b>건</span>
        <button type="button" class="ta__refresh" :disabled="loading" @click="reload">↻ 새로고침</button>
      </div>
      <div class="ta__list">
        <div v-if="loading" class="ta__empty">불러오는 중…</div>
        <div v-else-if="!accounts.length" class="ta__empty">생성된 테스트 계정이 없습니다.</div>
        <table v-else class="ta__table">
          <thead>
            <tr><th>로그인ID</th><th>이름</th><th>생성</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="a in accounts" :key="a.empId">
              <td><code>{{ a.loginId }}</code></td>
              <td>{{ a.empNm }}</td>
              <td class="ta__muted">{{ a.createdAt }}</td>
              <td>
                <button type="button" class="ta__del" :disabled="busyId === a.empId"
                        @click="removeOne(a.empId)">
                  {{ busyId === a.empId ? '삭제 중…' : '삭제' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ★ 하단 상세 내역: 어떤 테이블에 무엇이 들어갔나 (생성 후 표시) -->
      <div v-if="result" class="ta__detail">
        <div class="ta__detail-head">📋 방금 생성된 데이터 — 어떤 테이블에 무엇이 (총 9개 테이블)</div>
        <div v-for="g in breakdown" :key="g.group" class="ta__detail-group">
          <div class="ta__detail-gname">{{ g.group }}</div>
          <table class="ta__detail-table">
            <tbody>
              <tr v-for="row in g.rows" :key="row.t">
                <td class="ta__detail-t"><code>{{ row.t }}</code></td>
                <td class="ta__detail-c">{{ row.c }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="ta__detail-foot">
          ※ 보정: <b>PHM_EMP.IN_OFFI_YN</b> D→Y(재직) · <b>FRM_USER.INIT_YN</b> NULL→N(JSP 첫로그인 비번변경 우회).<br />
          ※ 'S' 공용사번이라 계약(CNM_MANAGER)·동의서(PHM_EMP_ASSENT)·급여(P_PAY)는 <b>생성 안 함</b>.
          삭제 시 위 9개 테이블을 자식→부모 역순으로 <b>한 번에</b> 정리합니다.
        </p>
      </div>
    </div>

    <template #footer>
      <button type="button" class="ta__btn ta__btn--danger"
              :disabled="!accounts.length || deletingAll" @click="removeAll">
        {{ deletingAll ? '삭제 중…' : `전체 삭제 (${accounts.length})` }}
      </button>
      <button type="button" class="ta__btn ta__btn--default" @click="close">닫기</button>
    </template>
  </InModal>
</template>

<style scoped>
.ta { display: flex; flex-direction: column; gap: 14px; }
.ta__note {
  margin: 0; font-size: var(--in-font-size-sm); line-height: 1.5;
  color: var(--in-text-subtle); background: var(--in-bg-default);
  padding: 10px 12px; border-radius: var(--in-radius-xs);
}
.ta__create { display: flex; align-items: center; gap: 8px; }
.ta__label { font-size: var(--in-font-size-sm); color: var(--in-text-subtle); flex: 0 0 auto; }
.ta__input {
  flex: 1 1 auto; height: 33px; padding: 0 10px;
  border: 1px solid var(--in-border-input, #ccc); border-radius: var(--in-radius-xs);
  font-size: var(--in-font-size-md); color: var(--in-text-default); background: var(--in-bg-white);
}
.ta__input:focus { outline: none; border-color: var(--in-bg-brand); }

.ta__result {
  border: 1px solid var(--in-border-default); border-radius: var(--in-radius-xs);
  padding: 12px; background: var(--in-surface-white); display: flex; flex-direction: column; gap: 8px;
}
.ta__result-row { display: flex; align-items: center; gap: 8px; }
.ta__k { flex: 0 0 64px; font-size: var(--in-font-size-sm); color: var(--in-text-subtle); }
.ta__v {
  flex: 1 1 auto; font-family: var(--in-font-family-mono, ui-monospace);
  font-size: var(--in-font-size-md); color: var(--in-text-accent); font-weight: 600;
}
.ta__copy, .ta__refresh, .ta__del {
  background: transparent; border: 1px solid var(--in-border-default);
  border-radius: var(--in-radius-xs); cursor: pointer; font-size: var(--in-font-size-sm);
  padding: 3px 8px; color: var(--in-text-default);
}
.ta__copy:hover, .ta__refresh:hover { border-color: var(--in-bg-brand); color: var(--in-text-accent); }
/* ★ (2026-06-12, dspark): danger hex(#c0392b/#e6b3ad/#fdecea) → error 시멘틱 토큰 (UI 일관성 검토 후속) */
.ta__del { color: var(--in-text-error); border-color: color-mix(in srgb, var(--in-border-error) 40%, var(--in-bg-white)); }
.ta__del:hover:not(:disabled) { background: var(--in-surface-accent-error); }
.ta__del:disabled, .ta__refresh:disabled { opacity: .5; cursor: default; }
.ta__result-hint { margin: 0; font-size: var(--in-font-size-sm); color: var(--in-text-subtle); }

.ta__list-head { display: flex; justify-content: space-between; align-items: center; font-size: var(--in-font-size-sm); color: var(--in-text-subtle); }
.ta__list { max-height: 220px; overflow-y: auto; border: 1px solid var(--in-border-subtle, #eee); border-radius: var(--in-radius-xs); }
.ta__empty { padding: 16px; text-align: center; color: var(--in-text-subtle); font-size: var(--in-font-size-sm); }
.ta__table { width: 100%; border-collapse: collapse; font-size: var(--in-font-size-sm); }
.ta__table th, .ta__table td { padding: 7px 10px; text-align: left; border-bottom: 1px solid var(--in-border-subtle, #f0f0f0); }
.ta__table th { color: var(--in-text-subtle); font-weight: var(--in-font-weight-medium); background: var(--in-bg-default); position: sticky; top: 0; }
.ta__table code { font-family: var(--in-font-family-mono, ui-monospace); color: var(--in-text-accent); }
.ta__muted { color: var(--in-text-subtle); }

.ta__btn {
  display: inline-flex; align-items: center; justify-content: center; min-width: 80px; height: 33px;
  padding: 0 16px; border-radius: var(--in-radius-xs); cursor: pointer;
  font-size: var(--in-font-size-md); font-weight: var(--in-font-weight-medium); border: 1px solid transparent;
}
.ta__btn--default { background: var(--in-bg-white); color: var(--in-text-default); border-color: var(--in-border-default); }
.ta__btn--default:hover { border-color: var(--in-border-input); color: var(--in-text-accent); }
.ta__btn--danger { background: var(--in-bg-white); color: var(--in-text-error); border-color: color-mix(in srgb, var(--in-border-error) 40%, var(--in-bg-white)); margin-right: auto; }
.ta__btn--danger:hover:not(:disabled) { background: var(--in-surface-accent-error); }
.ta__btn--danger:disabled { opacity: .5; cursor: default; }

/* ★ 하단 상세 내역 (어떤 테이블에 무엇이) */
.ta__detail {
  border: 1px solid var(--in-border-default); border-radius: var(--in-radius-xs);
  padding: 14px 16px; background: var(--in-bg-default);
}
.ta__detail-head {
  font-size: var(--in-font-size-md); font-weight: var(--in-font-weight-medium);
  color: var(--in-text-accent); margin-bottom: 10px;
}
.ta__detail-group { margin-bottom: 10px; }
.ta__detail-gname {
  font-size: var(--in-font-size-sm); font-weight: var(--in-font-weight-medium);
  color: var(--in-text-default); margin-bottom: 4px;
}
.ta__detail-table { width: 100%; border-collapse: collapse; }
.ta__detail-table td {
  padding: 5px 8px; font-size: var(--in-font-size-sm); vertical-align: top;
  border-bottom: 1px solid var(--in-border-subtle, #ececec);
}
.ta__detail-t { width: 180px; white-space: nowrap; }
.ta__detail-t code {
  font-family: var(--in-font-family-mono, ui-monospace); font-size: var(--in-font-size-sm);
  color: var(--in-text-accent); font-weight: 600;
}
.ta__detail-c { color: var(--in-text-default); word-break: break-all; line-height: 1.5; }
.ta__detail-foot {
  margin: 8px 0 0 0; font-size: var(--in-font-size-sm); line-height: 1.6;
  color: var(--in-text-subtle);
}
</style>
