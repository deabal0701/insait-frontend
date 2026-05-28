<script setup>
// ★ (2026-05-27, dspark): 인증 후 메인 layout — InLNBSubmenu (Figma 1402:27025) 정합.
//   디자인 시스템의 11 1depth 카탈로그를 그대로 유지 + '설정' (lnb-settings) 의 submenu 에
//   실제 admin 9 화면 (메타관리 5 + 권한관리 3 + 자료실 1) 을 OBJECT_ID 기반으로 매핑.
//   타 카테고리 (인사기획·인사운영·성과관리·보상관리·결재관리·시각화·메일 등) 는 디자인 시스템
//   default submenu 를 그대로 노출 (3depth 클릭 시 '준비 중' 토스트 — 점진 활성화 대상).
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';
import { useAuth } from '@/composables/useAuth';
import { ElMessage } from 'element-plus';
import InLNBSubmenu from '@/components/ui/InLNBSubmenu.vue';
import InLNB from '@/components/ui/InLNB.vue';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const themeStore = useThemeStore();
const { logout } = useAuth();

function onUserCommand(cmd) {
  if (cmd === 'settings') {
    router.push({ name: 'SETTINGS' });
  } else if (cmd === 'theme-white' || cmd === 'theme-green') {
    themeStore.setTheme(cmd.replace('theme-', ''));
  } else if (cmd === 'logout') {
    logout();
  }
}

// 설정 카테고리의 2depth 그룹 펼침 상태 (사용자 toggle 보존)
const settingsExpanded = ref({ meta: true, auth: false, pds: false, env: false });
// 인사기획 카테고리의 2depth 그룹 펼침 상태 (디자인 시스템 default 정합)
const planningExpanded = ref({ org: true, 'member-mgmt': false, recruit: false });

// admin 화면 → '설정' 카테고리의 2depth 그룹 매핑
const ADMIN_PARENT = {
  CCD0020: 'meta', IST0050: 'meta', IST0030: 'meta', IST0020: 'meta', IST0010: 'meta',
  AUT0030: 'auth', AUT0040: 'auth', AUT0050: 'auth',
  FRM0090: 'pds',
  SETTINGS: 'env',
};

// 현재 라우트로부터 1depth activeKey 추론 (admin = 설정 / 그 외 = smart place)
const activeKey = ref('place');
function syncActiveKey() {
  activeKey.value = ADMIN_PARENT[route.name] ? 'settings' : 'place';
  const parent = ADMIN_PARENT[route.name];
  if (parent) settingsExpanded.value = { ...settingsExpanded.value, [parent]: true };
}
syncActiveKey();

// ★ LNB 접기 상태 — collapsed=true 일 때 InLNB (fixed 66px), false 일 때 InLNBSubmenu (open 308px).
//   localStorage 로 사용자 선호 persist.
const COLLAPSED_KEY = 'insait.lnb.collapsed';
const collapsed = ref(localStorage.getItem(COLLAPSED_KEY) === '1');
function setCollapsed(next) {
  collapsed.value = next;
  localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0');
}
function onCollapse() { setCollapsed(true); }
function onExpand()   { setCollapsed(false); }

// InLNB(fixed) 의 key 컨벤션은 InLNBSubmenu 와 다름 — 역매핑 테이블.
// InLNB key (search/people/...) ↔ InLNBSubmenu key (place/planning/...)
const FIXED_TO_SUBMENU = {
  search: 'place', people: 'planning', demography: 'operation',
  analytics: 'performance', cases: 'compensation', inventory: 'approval',
  finance: 'analytics', mail: 'mail', 'bookmark-add': 'bookmark',
  bento: 'bento', settings: 'settings',
};

// InLNB(fixed) 가 받는 평탄 items — activeKey 동기. 시스템관리 맨 하단 정합.
const fixedItems = computed(() => [
  { key: 'search',       label: '스마트 플레이스', active: activeKey.value === 'place' },
  { key: 'people',       label: '인사기획',       active: activeKey.value === 'planning' },
  { key: 'demography',   label: '인사운영',       active: activeKey.value === 'operation' },
  { key: 'analytics',    label: '성과관리',       active: activeKey.value === 'performance' },
  { key: 'cases',        label: '보상관리',       active: activeKey.value === 'compensation' },
  { key: 'inventory',    label: '결재관리',       active: activeKey.value === 'approval' },
  { key: 'finance',      label: '시각화',         active: activeKey.value === 'analytics' },
  { key: 'mail',         label: '메일',           active: activeKey.value === 'mail' },
  { key: 'bookmark-add', label: '즐겨찾기',       active: activeKey.value === 'bookmark' },
  { key: 'bento',        label: '전체보기',       active: activeKey.value === 'bento' },
  { key: 'settings',     label: '시스템관리',     active: activeKey.value === 'settings' },
]);

// fixed 모드에서 1depth 클릭 시 — activeKey 설정 + 자동으로 펼침 (submenu 트리 노출).
function onFixedClickItem(item) {
  const next = FIXED_TO_SUBMENU[item.key] || item.key;
  activeKey.value = next;
  setCollapsed(false);
  if (next === 'place') router.push({ name: 'Dashboard' });
}

const items = computed(() => {
  const current = route.name;
  return [
    { key: 'place', label: '스마트 플레이스', icon: 'lnb-search' },
    {
      key: 'planning',
      label: '인사기획',
      icon: 'lnb-people',
      submenu: [
        {
          key: 'org',
          label: '조직 관리',
          expanded: planningExpanded.value.org,
          children: [
            { key: 'org-info', label: '조직정보' },
            { key: 'org-chart', label: '조직도' },
            { key: 'org-restructure', label: '조직 개편' },
            { key: 'org-history', label: '조직이력' },
            { key: 'member-history', label: '구성원이력' },
          ],
        },
        { key: 'member-mgmt', label: '구성원 관리', expanded: planningExpanded.value['member-mgmt'] },
        { key: 'recruit', label: '채용 관리', expanded: planningExpanded.value.recruit },
      ],
    },
    { key: 'operation',    label: '인사운영',   icon: 'lnb-demography' },
    { key: 'performance',  label: '성과관리',   icon: 'lnb-analytics' },
    { key: 'compensation', label: '보상관리',   icon: 'lnb-cases' },
    { key: 'approval',     label: '결재관리',   icon: 'lnb-inventory' },
    { key: 'analytics',    label: '시각화',     icon: 'lnb-finance' },
    { key: 'mail',         label: '메일',       icon: 'lnb-mail', notificationDot: true },
    { key: 'bookmark',     label: '즐겨찾기',   icon: 'lnb-bookmark-add' },
    { key: 'bento',        label: '전체보기',   icon: 'lnb-bento' },
    // ★ 시스템관리(설정) — 1depth 맨 하단 배치. 클릭 시 submenu 패널이 메타·권한·자료실 트리로 전환.
    {
      key: 'settings',
      label: '시스템관리',
      icon: 'lnb-settings',
      submenu: [
        {
          key: 'meta',
          label: '메타관리',
          expanded: settingsExpanded.value.meta,
          children: [
            { key: 'CCD0020', label: '공통코드',    active: current === 'CCD0020' },
            { key: 'IST0050', label: '서비스 관리', active: current === 'IST0050' },
            { key: 'IST0030', label: '메시지 관리', active: current === 'IST0030' },
            { key: 'IST0020', label: '엔터티 관리', active: current === 'IST0020' },
            { key: 'IST0010', label: 'SQL 관리',    active: current === 'IST0010' },
          ],
        },
        {
          key: 'auth',
          label: '권한관리',
          expanded: settingsExpanded.value.auth,
          children: [
            { key: 'AUT0030', label: '오브젝트 관리', active: current === 'AUT0030' },
            { key: 'AUT0040', label: '권한 관리',    active: current === 'AUT0040' },
            { key: 'AUT0050', label: '메뉴 관리',    active: current === 'AUT0050' },
          ],
        },
        {
          key: 'pds',
          label: '자료실',
          expanded: settingsExpanded.value.pds,
          children: [
            { key: 'FRM0090', label: '파일자료실', active: current === 'FRM0090' },
          ],
        },
        {
          key: 'env',
          label: '환경설정',
          expanded: settingsExpanded.value.env,
          children: [
            { key: 'SETTINGS', label: '테마·환경', active: current === 'SETTINGS' },
          ],
        },
      ],
    },
  ];
});

function onClick1depth(item) {
  activeKey.value = item.key;
  if (item.key === 'place') {
    router.push({ name: 'Dashboard' });
  }
}

function onClick2depth(parent, group) {
  const targetState = parent.key === 'settings' ? settingsExpanded : planningExpanded;
  targetState.value = { ...targetState.value, [group.key]: !targetState.value[group.key] };
}

function onClick3depth(parent, _group, child) {
  if (parent.key === 'settings' && child?.key) {
    if (child.key !== route.name) router.push({ name: child.key });
    return;
  }
  // 타 카테고리 — 점진 활성화 대상
  ElMessage.info(`${child.label} — 준비 중`);
}

// 화면 높이 추적 (InLNBSubmenu 의 height prop = px number)
const viewportH = ref(window.innerHeight);
function onResize() { viewportH.value = window.innerHeight; }
onMounted(() => window.addEventListener('resize', onResize));
onUnmounted(() => window.removeEventListener('resize', onResize));

const displayName = computed(() => auth.loginId || auth.empId || 'user');
const currentTitle = computed(() => route.meta?.title || '');
</script>

<template>
  <div class="main-layout">
    <template v-if="collapsed">
      <InLNB
        accordion="fixed"
        :items="fixedItems"
        :height="viewportH"
        class="main-layout__lnb main-layout__lnb--fixed"
        @toggle-accordion="onExpand"
        @click-item="onFixedClickItem"
      />
    </template>
    <template v-else>
      <InLNBSubmenu
        :items="items"
        :active-key="activeKey"
        company-name="insa-IT"
        :notification-count="99"
        :height="viewportH"
        class="main-layout__lnb main-layout__lnb--open"
        @click-1depth="onClick1depth"
        @click-2depth="onClick2depth"
        @click-3depth="onClick3depth"
        @collapse="onCollapse"
      />
    </template>

    <div class="main-layout__main">
      <header class="main-layout__header">
        <div class="main-layout__crumb">{{ currentTitle }}</div>
        <el-dropdown trigger="click" placement="bottom-end" @command="onUserCommand">
          <span class="main-layout__user">
            <span class="main-layout__user-avatar">{{ (displayName[0] || '?').toUpperCase() }}</span>
            <span class="main-layout__user-name">{{ displayName }}</span>
            <el-icon class="main-layout__user-caret"><svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M1 3l4 4 4-4z"/></svg></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item disabled>
                <span class="dd-label">테마 색상</span>
              </el-dropdown-item>
              <el-dropdown-item
                command="theme-white"
                :class="{ 'is-current-theme': themeStore.theme === 'white' }"
              >
                <span class="dd-swatch dd-swatch--white" />
                화이트 (기본){{ themeStore.theme === 'white' ? ' ✓' : '' }}
              </el-dropdown-item>
              <el-dropdown-item
                command="theme-green"
                divided
                :class="{ 'is-current-theme': themeStore.theme === 'green' }"
              >
                <span class="dd-swatch dd-swatch--green" />
                그린{{ themeStore.theme === 'green' ? ' ✓' : '' }}
              </el-dropdown-item>
              <el-dropdown-item command="settings" divided>환경 설정</el-dropdown-item>
              <el-dropdown-item command="logout" divided>로그아웃</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </header>

      <main class="main-layout__content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.main-layout {
  display: flex;
  min-height: 100vh;
  background: var(--in-bg-default, #fbfbfb);
}
.main-layout__lnb {
  flex: 0 0 auto;
}

/* ★ (2026-05-27, dspark): InLNBSubmenu rail 라벨 hiding + 50px icon-only 강제.
 * design-system v2 InLNBSubmenu 의 root <aside class="in-lnb2"> 가 본 부모 class
 * (.main-layout__lnb--open) 와 같은 element 에 결합. 따라서 :deep(.in-lnb2) 자손
 * selector 가 매칭 실패 → root width 는 .main-layout__lnb--open 으로 직접 override.
 * 내부 element (__rail / __panel / __1dep* 등) 만 :deep() 으로 처리.
 * inline style 의 width: 308px 를 이기려면 !important 필수. */
.main-layout__lnb--open {
  width: 248px !important;          /* rail 50 + panel 182 + toggle 16 */
  min-width: 248px !important;
  max-width: 248px !important;
}
.main-layout__lnb--open :deep(.in-lnb2__rail) {
  flex: 0 0 50px;
  width: 50px;
}
/* ★ (2026-05-27, dspark): .in-lnb2__home 는 design-system default (--in-text-default
 *   #565656 회색 + 옅은 blue border-bottom) 그대로 유지. Figma 진본에서 home cell 만
 *   어두운 회색 사각형 (종이비행기 뒤). 이전 brand override 는 제거. */
.main-layout__lnb--open :deep(.in-lnb2__cats) {
  padding: 5px 0 10px 0;
  align-items: center;
  width: 100%;
}
.main-layout__lnb--open :deep(.in-lnb2__1dep) {
  width: 100%;
  justify-content: center;
  gap: 0;
  padding: 0;
}
.main-layout__lnb--open :deep(.in-lnb2__1dep-label) {
  display: none;                    /* 라벨 hiding — icon-only rail */
}
.main-layout__lnb--open :deep(.in-lnb2__profile) {
  width: 100%;
}
.main-layout__lnb--open :deep(.in-lnb2__panel) {
  flex: 0 0 182px;
}

/* ★ (2026-05-27, dspark): InLNB(fixed) collapsed 시각 — Figma 진본 정합 정정.
 *   이전: rail/home/profile 모두 --in-text-default(#565656 회색) 으로 override 했음.
 *   진본 (사용자 제공 이미지) 은 rail 전체 brand. design-system InLNB default 그대로
 *   사용 (rail/home bg = --in-bg-brand). 별도 override 불필요. */
.main-layout__main {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--in-bg-white, #fff);   /* LNB panel(옅은 파랑) 과 시각 분리 */
}
.main-layout__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px 12px 16px;        /* left 16 — LNB panel 우측에 바로 인접 */
  background: var(--in-bg-white, #fff);
  border-bottom: 1px solid var(--in-border-default, #e2e2e2);
}
.main-layout__crumb {
  font-size: 14px;
  font-weight: 500;
  color: var(--in-text-accent, #010101);
}
.main-layout__user {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 0 10px 0 4px;
  border-radius: 16px;
  cursor: pointer;
  font-size: 13px;
  color: var(--in-text-default, #565656);
  transition: background-color 120ms;
  outline: none;
}
.main-layout__user:hover,
.main-layout__user:focus-visible {
  background: var(--in-surface-state-default, #f5f5f5);
}
.main-layout__user-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--in-brand);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0;
}
.main-layout__user-name {
  font-weight: 500;
  white-space: nowrap;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.main-layout__user-caret {
  color: var(--in-text-subtle, #888);
  font-size: 10px;
}
:global(.dd-swatch) {
  display: inline-block;
  width: 12px;
  height: 12px;
  margin-right: 8px;
  border-radius: 50%;
  vertical-align: middle;
}
:global(.dd-swatch--white) { background: linear-gradient(135deg, #13a9e9, #0488c7); }
:global(.dd-swatch--green) { background: linear-gradient(135deg, #1cac6f, #06683e); }
:global(.dd-label) {
  font-size: 11px;
  color: var(--in-text-subtle);
  font-weight: 500;
}
:global(.is-current-theme) {
  color: var(--in-text-brand) !important;
  font-weight: 500;
}
.main-layout__content {
  flex: 1 1 auto;
  padding: 20px;
  overflow: auto;
}
</style>
