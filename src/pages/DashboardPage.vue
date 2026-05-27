<script setup>
// ★ (2026-05-27, dspark): 임시 dashboard. 가이드 P1 Step 6 → P3 Step 12 에서 정식 위젯 grid 로 재작성.
//   현재는 로그인 검증 + envelope sanity 호출 (TST0002_00_R01) 만 노출.
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useService } from '@/composables/useService';
import { ElMessage } from 'element-plus';

const auth = useAuthStore();
const { call, loading } = useService();
const rows = ref([]);
const errText = ref('');

async function ping() {
  errText.value = '';
  try {
    const resp = await call('TST0002_00_R01', {
      ME_TST0002_01: [{ _seq: '', sStatus: 'R', sDelete: '' }],
    });
    const slot = resp?.BODY || {};
    const firstKey = Object.keys(slot).find((k) => Array.isArray(slot[k]));
    rows.value = firstKey ? slot[firstKey] : [];
    ElMessage.success(`envelope OK — ${rows.value.length} rows`);
  } catch (e) {
    errText.value = e?.message || String(e);
    ElMessage.error(errText.value);
  }
}
</script>

<template>
  <div class="dashboard">
    <h2 class="dashboard__title">환영합니다, {{ auth.loginId || auth.empId }}</h2>
    <p class="dashboard__hint">
      백엔드 alpha 8090 (JWT 평문 envelope 모드) 와 통신 검증용 임시 화면입니다.
      정식 dashboard 는 P3 Step 12 에서 작성됩니다.
    </p>

    <el-card shadow="never" class="dashboard__card">
      <template #header>
        <div class="dashboard__card-header">
          <span>envelope sanity — TST0002_00_R01</span>
          <el-button type="primary" size="small" :loading="loading" @click="ping">
            호출
          </el-button>
        </div>
      </template>

      <div v-if="rows.length">
        <p>응답 {{ rows.length }} 건</p>
        <pre class="dashboard__pre">{{ JSON.stringify(rows.slice(0, 3), null, 2) }}</pre>
      </div>
      <p v-else-if="errText" class="dashboard__error">{{ errText }}</p>
      <p v-else class="dashboard__empty">[호출] 을 눌러 envelope 응답을 확인하세요.</p>
    </el-card>
  </div>
</template>

<style scoped>
.dashboard { max-width: 960px; }
.dashboard__title { margin: 0 0 4px; font-size: 18px; font-weight: 500; color: var(--in-text-accent, #010101); }
.dashboard__hint { margin: 0 0 16px; font-size: 12px; color: var(--in-text-subtle, #888); }
.dashboard__card { background: var(--in-bg-white, #fff); }
.dashboard__card-header { display: flex; justify-content: space-between; align-items: center; }
.dashboard__pre {
  background: var(--in-surface-default, #f5f5f5);
  border-radius: 4px;
  padding: 10px;
  font-size: 11px;
  max-height: 280px;
  overflow: auto;
}
.dashboard__error { color: var(--in-text-error, #e33131); margin: 0; }
.dashboard__empty { color: var(--in-text-subtle, #888); margin: 0; }
</style>
