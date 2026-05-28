// ★ (2026-05-27, dspark): /serviceBroker.h5 envelope 호출 wrapper. 가이드 05_composables.md §2 정합.
//   - serviceId + BODY → envelope 조립 → POST → response 반환
//   - loading / error / data 상태 자동 관리
//   - 컴포넌트는 axios·envelope 직접 호출 금지 — 본 composable 단일 진입점
import { ref } from 'vue';
import http from '@/services/http';
import { buildEnvelope } from '@/services/envelope';

export function useService() {
  const loading = ref(false);
  const error = ref(null);
  const data = ref(null);

  /**
   * @param {string} serviceId  ex: 'PHM0070_01_R01'
   * @param {object} body       envelope BODY (메시지 슬롯 객체). 또는 falsy → {}
   * @param {object} [options]  { actionType, objectId, companyCd, localeCd, suppressError }
   * @returns {Promise<object>} 응답 envelope (HEADER + BODY)
   */
  async function call(serviceId, body, options = {}) {
    loading.value = true;
    error.value = null;
    try {
      const envelope = buildEnvelope(serviceId, body || {}, options);
      const response = await http.post('/serviceBroker.h5', envelope);
      data.value = response;
      return response;
    } catch (e) {
      error.value = e;
      if (!options.suppressError) throw e;
      return null;
    } finally {
      loading.value = false;
    }
  }

  return { call, loading, error, data };
}
