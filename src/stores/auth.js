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
    expiresAt: 0,
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
      this.setAccessToken(resp.data?.accessToken);
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
      this.expiresAt = payload.expiresAt || 0;
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
    pick: ['accessToken', 'refreshToken', 'empId', 'userId', 'loginId', 'companyCd', 'tokenType'],
  },
});
