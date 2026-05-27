<script setup>
// ★ (2026-05-27, dspark): 로그인 화면. 가이드 00_implementation-roadmap.md P1 Step 5 정합.
//   백엔드 AuthController.login 호출 → 토큰 저장 → useAuth.login 이 redirect 처리.
//   AS-IS 검증 사용자 (white / ##win1234 / 01) 가 alpha 8090 에서 그대로 동작.
import { reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { useAuth } from '@/composables/useAuth';

const { t } = useI18n();
const { login } = useAuth();

const form = reactive({
  loginId: '',
  password: '',
  companyCd: '01',
});
const submitting = ref(false);
const formRef = ref(null);

const rules = {
  loginId: [{ required: true, message: t('login.required'), trigger: 'blur' }],
  password: [{ required: true, message: t('login.required'), trigger: 'blur' }],
  companyCd: [{ required: true, message: t('login.required'), trigger: 'blur' }],
};

async function onSubmit() {
  if (!formRef.value) return;
  try {
    await formRef.value.validate();
  } catch {
    return;
  }
  submitting.value = true;
  try {
    await login({
      loginId: form.loginId.trim(),
      password: form.password,
      companyCd: form.companyCd.trim(),
      localeCd: 'KO',
    });
  } catch (e) {
    const message = e?.response?.data?.error || e?.message || t('login.failed');
    ElMessage.error(message);
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent="onSubmit">
    <el-form-item :label="t('login.loginId')" prop="loginId">
      <el-input v-model="form.loginId" autocomplete="username" />
    </el-form-item>
    <el-form-item :label="t('login.password')" prop="password">
      <el-input v-model="form.password" type="password" show-password autocomplete="current-password" />
    </el-form-item>
    <el-form-item :label="t('login.companyCd')" prop="companyCd">
      <el-input v-model="form.companyCd" />
    </el-form-item>
    <el-button type="primary" native-type="submit" :loading="submitting" class="login-submit">
      {{ submitting ? t('login.submitting') : t('login.submit') }}
    </el-button>
  </el-form>
</template>

<style scoped>
.login-submit {
  width: 100%;
  height: 40px;
  margin-top: 4px;
}
</style>
