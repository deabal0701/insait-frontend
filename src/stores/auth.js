// ★ (2026-05-27, dspark): JWT 토큰·식별자 상태 + login/refresh/logout actions.
//   가이드 04_pinia-stores.md §2 정합. localStorage 자동 persist (pinia-plugin-persistedstate).
//   백엔드 AuthController (com.win.bframe.controller.AuthController) 응답 shape 와 1:1 정합.
import { defineStore } from 'pinia';
import axios from 'axios';

const RAW_BASE = import.meta.env.VITE_API_BASE_URL || '';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    accessToken: '',
    refreshToken: '',
    empId: '',
    userId: '',
    loginId: '',
    companyCd: '',
    tokenType: 'Bearer',
    // ★ (2026-06-15, dspark): 상단바 권한(역할) 콤보 선택값. AS-IS 역할 선택 정합 (현재는 표시·보관까지, G5 LNB 연동 후 메뉴 필터).
    selectedAuthId: '',
  }),
  getters: {
    isLoggedIn: (s) => !!s.accessToken,
    isAuthenticated: (s) => !!s.accessToken,
  },
  actions: {
    /** POST /api/auth/login — 평문 비번 송신 (alpha JSP 정합). 응답 shape = AuthController.login 반환. */
    async login({ loginId, password, companyCd, localeCd = 'KO' }) {
      const resp = await axios.post(
        `${RAW_BASE}/api/auth/login`,
        { loginId, password, companyCd, localeCd },
        { headers: { 'Content-Type': 'application/json' } },
      );
      this.setSession(resp.data);
      return resp.data;
    },
    async refresh() {
      if (!this.refreshToken) throw new Error('no refresh token');
      const resp = await axios.post(
        `${RAW_BASE}/api/auth/refresh`,
        { refreshToken: this.refreshToken },
        { headers: { 'Content-Type': 'application/json' } },
      );
      // ★ (2026-06-07, dspark): 토큰 누락 응답에 조용히 로그아웃되지 않도록 throw (interceptor refresh 와 정합)
      const t = resp.data?.accessToken;
      if (!t) throw new Error('refresh returned no accessToken');
      this.setAccessToken(t);
      return resp.data;
    },
    async logout() {
      try {
        await axios.post(`${RAW_BASE}/api/auth/logout`, {}, { headers: { 'Content-Type': 'application/json' } });
      } catch {
        // 백엔드 호출 실패해도 클라이언트 상태는 정리
      } finally {
        this.clear();
      }
    },
    setSession(payload) {
      this.accessToken = payload.accessToken || '';
      this.refreshToken = payload.refreshToken || this.refreshToken;
      this.empId = payload.empId || '';
      this.userId = payload.userId || '';
      this.loginId = payload.loginId || '';
      this.companyCd = payload.companyCd || '';
      this.tokenType = payload.tokenType || 'Bearer';
    },
    setAccessToken(token) {
      this.accessToken = token || '';
    },
    clear() {
      this.$reset();
    },
  },
  persist: {
    storage: localStorage,
    key: 'insait.auth',
    pick: ['accessToken', 'refreshToken', 'empId', 'userId', 'loginId', 'companyCd', 'tokenType', 'selectedAuthId'],
  },
});
