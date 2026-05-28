<script setup>
// ★ (2026-05-27, dspark): 로그인 화면 — Figma HRMS 06 통합 로그인 (1:98859) 정합.
//   design-system v2 의 LoginPatternView 구조 그대로 (소셜 로그인 3종 제외, 사용자 결정).
//   백엔드 AuthController.login 호출. companyCd 는 hidden default '01' (Figma 패턴에 없음).
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuth } from '@/composables/useAuth';
import InCard from '@/components/ui/InCard.vue';
import InCompanyLogo from '@/components/ui/InCompanyLogo.vue';
import InTextField from '@/components/ui/InTextField.vue';
import InPasswordField from '@/components/ui/InPasswordField.vue';
import InButton from '@/components/ui/InButton.vue';
import InCheckbox from '@/components/ui/InCheckbox.vue';
import InToast from '@/components/ui/InToast.vue';
import CardIdIcon from '@/assets/icons/card-id.svg';

const { t } = useI18n();
const { login } = useAuth();

const REMEMBER_KEY = 'insait.rememberLoginId';
const initialRememberId = localStorage.getItem(REMEMBER_KEY) || '';

const userId = ref(initialRememberId);
const password = ref('');
const showPwd = ref(false);
const rememberId = ref(!!initialRememberId);
const companyCd = ref('01'); // hidden default — Phase 1A 단일 회사

const state = ref(initialRememberId ? 'typing' : 'empty'); // empty | typing | submitting | error | success
const errorMsg = ref('');

const inputStatus = computed(() => (state.value === 'error' ? 'error' : undefined));
const inputDisabled = computed(() => state.value === 'submitting' || state.value === 'success');

async function submit() {
  if (!userId.value || !password.value) {
    state.value = 'error';
    errorMsg.value = '아이디와 비밀번호를 입력해주세요.';
    return;
  }
  state.value = 'submitting';
  errorMsg.value = '';

  try {
    await login({
      loginId: userId.value.trim(),
      password: password.value,
      companyCd: companyCd.value.trim() || '01',
      localeCd: 'KO',
    });
    state.value = 'success';
    if (rememberId.value) {
      localStorage.setItem(REMEMBER_KEY, userId.value.trim());
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }
  } catch (e) {
    state.value = 'error';
    errorMsg.value = e?.response?.data?.error || e?.message || t('login.failed');
  }
}

function reset() {
  password.value = '';
  showPwd.value = false;
  state.value = userId.value ? 'typing' : 'empty';
  errorMsg.value = '';
}
</script>

<template>
  <div class="login-root">
  <div class="login-card-wrap">
    <InCard state="enabled" type="content">
      <template #default>
        <div class="login-card">
          <!-- 브랜드 마크 -->
          <div class="login-logo">
            <InCompanyLogo :logo="true" variant="insait" :size="56" />
          </div>

          <!-- 브랜드 슬로건 -->
          <p class="login-slogan">
            HR을 가장 똑똑하게<br />
            인사이트를 주는 업무공간, 인사잇
          </p>

          <!-- 아이디 -->
          <form class="login-fields" @submit.prevent="submit">
            <div class="login-field">
              <InTextField
                v-model="userId"
                label="아이디"
                layout="vertical"
                placeholder="아이디를 입력하세요"
                :status="inputStatus"
                :disabled="inputDisabled"
                @input="state === 'error' && (state = 'typing')"
              />
            </div>

            <!-- 비밀번호 -->
            <div class="login-field">
              <InPasswordField
                v-model="password"
                :visible="showPwd"
                label="비밀번호"
                layout="vertical"
                input="비밀번호를 입력하세요"
                :status="inputStatus"
                :disabled="inputDisabled"
                @update:visible="showPwd = $event"
                @input="state === 'error' && (state = 'typing')"
              />
            </div>

            <!-- 부가행: 아이디 저장 + 비밀번호 재설정 -->
            <div class="login-aux">
              <InCheckbox v-model="rememberId" label="아이디 저장" size="sm" />
              <a class="login-link" href="#" @click.prevent>비밀번호 재설정</a>
            </div>

            <!-- 로그인 버튼 -->
            <div class="login-actions">
              <InButton
                type="submit"
                variant="primary"
                size="lg"
                :left-icon-show="false"
                :right-icon-show="false"
                :disabled="inputDisabled"
                @click="submit"
              >
                <template v-if="state === 'submitting'">로그인 중...</template>
                <template v-else-if="state === 'success'">로그인됨</template>
                <template v-else>로그인</template>
              </InButton>
            </div>
          </form>

          <!-- 신청 링크 2종 -->
          <div class="login-apply">
            <a class="apply-link" href="#" @click.prevent>
              <img :src="CardIdIcon" alt="" class="apply-link__icon" />
              <span>회원 신청하기</span>
            </a>
            <a class="apply-link" href="#" @click.prevent>
              <img :src="CardIdIcon" alt="" class="apply-link__icon" />
              <span>대표 신청하기</span>
            </a>
          </div>

          <!-- error 시 다시 시도 -->
          <div v-if="state === 'error'" class="login-reset">
            <InButton
              variant="text"
              size="sm"
              :left-icon-show="false"
              :right-icon-show="false"
              @click="reset"
            >다시 입력</InButton>
          </div>
        </div>
      </template>
    </InCard>
  </div>

  <!-- Toast: error / success -->
  <div v-if="state === 'error'" class="login-toast">
    <InToast status="error" :message="errorMsg" closable @close="errorMsg = ''" />
  </div>
  <div v-else-if="state === 'success'" class="login-toast">
    <InToast status="success" message="로그인되었습니다." closable />
  </div>
  </div>
</template>

<style scoped>
.login-root {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
}
.login-card-wrap {
  position: relative;
  z-index: 1;
  width: 360px;
  max-width: 100%;
}
/* ★ (2026-05-27, dspark): 로그인 카드 테두리·shadow 강화 — Figma 진본 정합 + stage bg
 *   (옅은 파랑 반투명) 위에서 시각 명확하게. InCard default 의 옅은 border (#e2e2e2)
 *   + alpha 5% shadow 를 강화. */
.login-card-wrap :deep(.in-card) {
  border-color: var(--in-border-bold);              /* #b6b6b6 — 더 진한 회색 */
  box-shadow: 0 8px 24px 0 rgba(0, 0, 0, 0.08);     /* 좀 더 두드러진 shadow */
}
.login-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 12px;
}
.login-logo {
  display: flex;
  justify-content: center;
  margin-bottom: 4px;
}
.login-slogan {
  margin: 0 0 12px 0;
  text-align: center;
  font-family: var(--in-font-family-body);
  font-size: var(--in-font-size-md);
  line-height: var(--in-line-height-lg);
  font-weight: var(--in-font-weight-medium);
  color: var(--in-text-brand);
}
.login-fields {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
/* ★ (2026-05-27, dspark): .login-field 가 flex container 면 자식 .in-tf 의 main-axis
 *   width 가 content-based (198px) 가 되어 input 폭이 좁아짐. block + width 100% 강제. */
.login-field { display: block; width: 100%; }
.login-field :deep(.in-tf),
.login-field :deep(.in-pf) { width: 100%; }
.login-field :deep(.in-tf__control),
.login-field :deep(.in-pf__control) { width: 100%; }
.login-field :deep(.el-input) { width: 100%; }

/* ★ (2026-05-27, dspark): 로그인 화면 한정 — InTextField / InPasswordField 의 default
 *   밑줄형(border-bottom only + grey bg) 을 box style 로 override.
 *   로그인 같은 1-shot 폼은 박스형이 시각 정합 더 자연 (사용자 요청). */
.login-field :deep(.el-input__wrapper) {
  background: var(--in-bg-white) !important;
  border: 1px solid var(--in-border-input-default) !important;
  border-radius: 6px;
  height: 40px !important;
  padding: 0 12px;
  transition: border-color 120ms;
}
.login-field :deep(.el-input__wrapper:hover):not(:focus-within) {
  border-color: var(--in-text-default) !important;
}
.login-field :deep(.el-input__wrapper:focus-within) {
  border-color: var(--in-border-brand) !important;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--in-brand) 18%, transparent) !important;
}
.login-field :deep(.in-tf--error .el-input__wrapper),
.login-field :deep(.in-pf--error .el-input__wrapper) {
  border-color: var(--in-border-error) !important;
}

/* ★ (2026-05-27, dspark): Chrome / Edge / Safari 의 password-manager autofill highlight
 *   (옅은 노랑·파랑 배경) 제거. box-shadow inset 으로 wrapper bg 를 강제 덮고,
 *   transition 을 9999s 로 늘려 autofill 의 색 전환을 사실상 영구 차단. */
.login-field :deep(input:-webkit-autofill),
.login-field :deep(input:-webkit-autofill:hover),
.login-field :deep(input:-webkit-autofill:focus),
.login-field :deep(input:-webkit-autofill:active) {
  -webkit-box-shadow: 0 0 0 100px var(--in-bg-white) inset !important;
  box-shadow: 0 0 0 100px var(--in-bg-white) inset !important;
  -webkit-text-fill-color: var(--in-text-accent) !important;
  caret-color: var(--in-text-accent);
  transition: background-color 9999s ease-out, color 9999s ease-out;
}
.login-aux {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: var(--in-font-size-sm);
  margin-top: 2px;
}
.login-link {
  color: var(--in-text-subtle);
  text-decoration: none;
}
.login-link:hover { color: var(--in-text-brand); }
.login-actions {
  margin-top: 6px;
  display: flex;
}
.login-actions > * { flex: 1 1 0; }
.login-apply {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  margin-top: 8px;
  padding-top: 4px;
}
.apply-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--in-font-size-sm);
  color: var(--in-text-subtle);
  text-decoration: none;
}
.apply-link:hover { color: var(--in-text-brand); }
.apply-link__icon { width: 16px; height: 16px; display: block; }
.login-reset {
  display: flex;
  justify-content: center;
  margin-top: 4px;
}
.login-toast {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: center;
  margin-top: 12px;
}
</style>
