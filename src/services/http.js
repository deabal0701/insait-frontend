// ★ (2026-05-27, dspark): axios instance + interceptor. 가이드 03_axios-interceptor.md §3 정합.
//   JWT Bearer 자동 부착 / 401 refresh + 동시 401 race 큐 / envelope HEADER.resultType 분기.
//   ★ 2026-05-27: services/http.js 로 이동 (이전 lib/axios.js). Vue 3 시장 표준 정합.
import axios from 'axios';
import router from '@/router';
import { useAuthStore } from '@/stores/auth';
import { isSuccess, getResultMessage } from '@/services/envelope';

// 세션 정리 + 로그인 화면 이동 (refresh 불가/실패 공통). 현재 라우트를 redirect 쿼리로 보존.
function clearAndRedirectToLogin(auth) {
  auth.clear();
  const current = router.currentRoute.value;
  if (current.name !== 'Login') {
    router.push({ name: 'Login', query: { redirect: current.fullPath } });
  }
}

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '', // 비어 있으면 vite proxy 사용
  timeout: 30000,
  headers: { 'Content-Type': 'application/json; charset=UTF-8' },
});

// === Request interceptor ===
http.interceptors.request.use((config) => {
  const auth = useAuthStore();
  if (auth.accessToken) {
    config.headers.Authorization = `${auth.tokenType || 'Bearer'} ${auth.accessToken}`;
  }
  // ★ (2026-05-31, dspark): 임시 — 서버에 "이 요청은 JSON 렌더러(EnvelopeJsonRenderer)로 처리" 표식.
  //   서버 ServiceRequestController 가 헤더 없으면 success_response.jsp(정답지) 로 forward,
  //   'java' 면 JSON 직접 응답. JSP 폐기 + parity 검증 완료 시 본 줄 제거 예정.
  config.headers['X-Insait-Render'] = 'java';
  return config;
});

// === Response interceptor + 401 refresh 큐 ===
let refreshing = false;
let waitQueue = []; // 동시 401 들이 새 token 을 기다리며 적재되는 곳

function flushQueue(error, token) {
  waitQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  waitQueue = [];
}

http.interceptors.response.use(
  (response) => {
    const data = response.data;
    // envelope 응답이면 resultType 분기. 비-envelope (예: /api/auth/login) 은 data 그대로.
    if (data && data.HEADER && typeof data.HEADER === 'object') {
      if (isSuccess(data)) return data;
      const message = getResultMessage(data) || 'envelope ERROR';
      const code = data.HEADER.resultCode || '';
      if (code === 'SYSERROR_001') {
        // 세션 만료 — 401 처럼 처리. envelope 만료는 HTTP 200 으로 오므로
        // error 핸들러가 refresh·재시도할 수 있도록 원 요청 config 를 실어 보낸다.
        const expiredErr = new Error(message);
        expiredErr.__envelopeAuthExpired = true;
        expiredErr.config = response.config;
        expiredErr.envelope = data;
        expiredErr.resultCode = code;
        return Promise.reject(expiredErr);
      }
      const err = new Error(message);
      err.envelope = data;
      err.resultCode = code;
      return Promise.reject(err);
    }
    return data;
  },
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const isAuthExpired = error.__envelopeAuthExpired === true || status === 401;

    // 인증 만료가 아니면 그대로 전파
    if (!isAuthExpired) {
      return Promise.reject(error);
    }

    const auth = useAuthStore();

    // 복구 불가 (재시도할 config 없음 / 이미 한 번 재시도함 / refresh token 없음)
    // → 세션 정리 + 로그인 화면 이동. envelope 만료·HTTP 401 모두 본 경로로 수렴.
    if (!original || original._retry || !auth.refreshToken) {
      clearAndRedirectToLogin(auth);
      return Promise.reject(error);
    }

    if (refreshing) {
      // refresh 진행 중 — 큐에 적재
      return new Promise((resolve, reject) => {
        waitQueue.push({
          resolve: (token) => {
            original.headers.Authorization = `${auth.tokenType} ${token}`;
            original._retry = true;
            resolve(http(original));
          },
          reject,
        });
      });
    }

    refreshing = true;
    original._retry = true;
    try {
      const refreshResp = await axios.post(
        `${http.defaults.baseURL || ''}/api/auth/refresh`,
        { refreshToken: auth.refreshToken },
        { headers: { 'Content-Type': 'application/json' } },
      );
      const newToken = refreshResp.data?.accessToken;
      if (!newToken) throw new Error('refresh returned no accessToken');
      auth.setAccessToken(newToken);
      flushQueue(null, newToken);
      original.headers.Authorization = `${auth.tokenType} ${newToken}`;
      return http(original);
    } catch (refreshErr) {
      flushQueue(refreshErr, null);
      // refresh 실패 = 세션 복구 불가 → 즉시 로그인 화면 이동 (다음 라우트 이동 대기 X)
      clearAndRedirectToLogin(auth);
      return Promise.reject(refreshErr);
    } finally {
      refreshing = false;
    }
  },
);

export default http;
