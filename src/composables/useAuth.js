// ★ (2026-05-27, dspark): auth store 위 wrapper. 가이드 05_composables.md §4 정합.
//   - login / logout 시 라우터 이동 부수 효과 처리
//   - hasObjectAuth 는 Phase 1A 초기 "로그인 = 모두 허용" 단순화 (가이드 §5.2)
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

export function useAuth() {
  const auth = useAuthStore();
  const router = useRouter();
  const route = useRoute();

  async function login(payload) {
    const result = await auth.login(payload);
    const redirect = typeof route.query?.redirect === 'string' ? route.query.redirect : '/';
    await router.replace(redirect);
    return result;
  }

  async function logout() {
    await auth.logout();
    await router.replace({ name: 'Login' });
  }

  function requireAuth() {
    if (!auth.isLoggedIn) {
      router.replace({ name: 'Login', query: { redirect: route.fullPath } });
      return false;
    }
    return true;
  }

  function hasObjectAuth(_objectId) {
    // Phase 1A: 로그인 = 모든 admin 화면 허용 (가이드 §5.2)
    return auth.isLoggedIn;
  }

  return { auth, login, logout, requireAuth, hasObjectAuth };
}
