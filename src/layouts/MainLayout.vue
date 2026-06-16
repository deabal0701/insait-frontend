<script setup>
// ★ (2026-06-16, dspark): 동적 LNB — AS-IS 메뉴 로딩 방식(envelope) 정합. 사용자 지시: "AS-IS 동일 방식 조회".
//   rail(업무 카테고리) = AUT0050_00_R06 / 하위트리 = GNB0001_00_R01 (services/menuApi.js).
//   권한 콤보(auth_item) → 메뉴 권한필터(AS-IS 동일하게 "권한 바꾸면 메뉴 바뀜").
//   스마트 플레이스(대시보드)=하드코딩 최상단 · 시스템관리=하드코딩 최하단 · 그 사이 업무메뉴=서버 동적.
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useMenuStore } from '@/stores/menu';
import { useAuth } from '@/composables/useAuth';
import { ElMessage } from 'element-plus';
import InLNBSubmenu from '@/components/ui/InLNBSubmenu.vue';
import InLNB from '@/components/ui/InLNB.vue';
import { adminApi } from '@/services/adminApi';
import { PLACE_ITEM, ADMIN_OBJECT_IDS, buildSettingsItem } from '@/constants/menuTree';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const menu = useMenuStore();
const { logout } = useAuth();

function onUserCommand(cmd) {
  if (cmd === 'settings') router.push({ name: 'SETTINGS' });
  else if (cmd === 'logout') logout();
}

// ── 권한(역할) 콤보 — my-auths. 선택 권한명(authItemName) 이 메뉴 필터 파라미터(auth_item). ──
const myAuths = ref([]);
const selectedAuthId = computed({
  get: () => auth.selectedAuthId,
  set: (v) => { auth.selectedAuthId = v; },
});
const selectedAuthName = computed(() => {
  const a = myAuths.value.find((x) => String(x.authItemId) === String(auth.selectedAuthId));
  return a ? a.authItemName : '';
});

// ── 시스템관리(하드코딩 최하단) 2depth 그룹 펼침 상태 ──
const settingsExpanded = ref({ meta: true, auth: false, sysenv: false, pds: false, env: false, playground: false });

// ── 1depth 활성 키 ──
const activeKey = ref('place');
function syncActiveKey() {
  if (ADMIN_OBJECT_IDS.has(route.name)) activeKey.value = 'settings';
}
syncActiveKey();
watch(() => route.name, syncActiveKey);
watch(() => route.meta?.menuId, (m) => menu.setCurrentMenu(m || ''), { immediate: true });

// ── collapsed (fixed rail) — localStorage persist ──
const COLLAPSED_KEY = 'insait.lnb.collapsed';
const collapsed = ref(localStorage.getItem(COLLAPSED_KEY) === '1');
function setCollapsed(next) { collapsed.value = next; localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0'); }
function onCollapse() { setCollapsed(true); }
function onExpand() { setCollapsed(false); }

// ── 서버 rail → InLNBSubmenu items (submenu 는 store subtrees 에서 lazy, expanded/active 주입) ──
const serverItems = computed(() => menu.rail.map((cat) => ({
  key: cat.key,
  label: cat.label,
  icon: cat.icon,
  submenu: (menu.subtrees[cat.key] || []).map((g) => ({
    key: g.key,
    label: g.label,
    expanded: !!menu.expanded[g.key],
    children: (g.children || []).map((c) => ({
      key: c.key, label: c.label, objectId: c.objectId, active: c.objectId === route.name,
    })),
  })),
})));

// ── 시스템관리 노드(최하단 고정) ──
const settingsItem = computed(() => buildSettingsItem(route.name, settingsExpanded.value));

// ── 최종 items = [스마트플레이스(고정), ...서버 업무메뉴, 시스템관리(고정 최하단)] ──
const items = computed(() => [{ ...PLACE_ITEM }, ...serverItems.value, settingsItem.value]);

// ── collapsed rail items (동일 소스) ──
const fixedItems = computed(() => items.value.map((it) => ({
  key: it.key, label: it.label, icon: it.icon, notificationDot: it.notificationDot,
  active: it.key === activeKey.value,
})));

// ── 핸들러 ──
async function onClick1depth(item) {
  activeKey.value = item.key;
  if (item.key === 'place') { router.push({ name: 'Dashboard' }); return; }
  if (item.key !== 'settings') await menu.ensureSubtree(item.key);
}
function onFixedClickItem(item) {
  activeKey.value = item.key;
  setCollapsed(false);
  if (item.key === 'place') { router.push({ name: 'Dashboard' }); return; }
  if (item.key !== 'settings') menu.ensureSubtree(item.key);
}
function onClick2depth(parent, group) {
  if (parent.key === 'settings') {
    settingsExpanded.value = { ...settingsExpanded.value, [group.key]: !settingsExpanded.value[group.key] };
  } else {
    menu.toggleGroup(group.key);
  }
}
function onClick3depth(parent, _group, child) {
  if (parent.key === 'settings') {
    if (child?.key && child.key !== route.name) router.push({ name: child.key });
    return;
  }
  // 서버 업무메뉴 — object_id 가 insait 라우트로 존재하면 이동, 없으면 준비 중(화면 미구현)
  const rn = child?.objectId;
  if (rn && router.hasRoute(rn)) {
    if (rn !== route.name) router.push({ name: rn });
  } else {
    ElMessage.info(`${child?.label || ''} — 준비 중`);
  }
}

// ── viewport 높이 추적 (LNB height prop) ──
const viewportH = ref(window.innerHeight);
function onResize() { viewportH.value = window.innerHeight; }

const displayName = computed(() => auth.loginId || auth.empId || 'user');
const currentTitle = computed(() => route.meta?.title || '');

// ── rail 로드 (권한명 기준). admin 화면이 아니면 첫 업무 카테고리 자동 선택. ──
async function reloadRail() {
  if (menu.loaded && menu.authItemName === selectedAuthName.value) return; // 동일 권한 중복 로드 방지
  await menu.loadRail(selectedAuthName.value);
  if (!ADMIN_OBJECT_IDS.has(route.name) && menu.rail.length) {
    activeKey.value = menu.rail[0].key;
    await menu.ensureSubtree(menu.rail[0].key);
  }
}
onMounted(async () => {
  window.addEventListener('resize', onResize);
  if (!auth.isLoggedIn) return;
  try {
    const list = await adminApi.access.myAuths();
    myAuths.value = Array.isArray(list) ? list : [];
    const ids = myAuths.value.map((a) => String(a.authItemId));
    if (!auth.selectedAuthId || !ids.includes(String(auth.selectedAuthId))) {
      auth.selectedAuthId = ids.length ? ids[0] : '';
    }
  } catch {
    myAuths.value = []; // 권한 조회 실패 시 콤보 비표시
  }
  await reloadRail();
});
onUnmounted(() => window.removeEventListener('resize', onResize));

// 권한(역할) 변경 → rail 재조회 (메뉴 권한 필터 반영 — AS-IS 정합)
watch(selectedAuthName, async (name, old) => {
  if (name && name !== old) await reloadRail();
});
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
        <!-- ★ (2026-06-04, dspark): banner = 메뉴 뎁스(향후 breadcrumb) 영역.
             [<] 액션은 페이지 본문 헤더 우측으로 이전 (사용자 피드백 — 헤더에는 헤더에 있을 것).
             현재는 route.meta.title 표시. 추후 breadcrumb 격상은 별도 카드. -->
        <div class="main-layout__crumb">{{ currentTitle }}</div>
        <div class="main-layout__header-right">
          <!-- ★ (2026-06-15, dspark): 권한(역할) 콤보 — AS-IS 상단 역할 셀렉터 정합. 보유 권한 있을 때만 표시. -->
          <el-select
            v-if="myAuths.length"
            v-model="selectedAuthId"
            size="small"
            class="main-layout__auth"
            placeholder="권한"
          >
            <el-option
              v-for="a in myAuths"
              :key="a.authItemId"
              :value="String(a.authItemId)"
              :label="a.displayName || a.authItemName"
            />
          </el-select>
          <el-dropdown trigger="click" placement="bottom-end" @command="onUserCommand">
          <span class="main-layout__user">
            <span class="main-layout__user-avatar">{{ (displayName[0] || '?').toUpperCase() }}</span>
            <span class="main-layout__user-name">{{ displayName }}</span>
            <el-icon class="main-layout__user-caret"><svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M1 3l4 4 4-4z"/></svg></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="settings">환경 설정</el-dropdown-item>
              <el-dropdown-item command="logout" divided>로그아웃</el-dropdown-item>
            </el-dropdown-menu>
          </template>
          </el-dropdown>
        </div>
      </header>

      <main class="main-layout__content">
        <!-- ★ (2026-05-29, dspark): :key 로 route 변경 시 강제 remount.
             SPA navigation 후 blank 화면 (HMR/lazy-import 캐시 race) 방지 — 사용자
             "메타관리 홈 클릭 시 빈 화면 / 새로고침 시 정상" 보고에 대응.
             ★ (2026-06-05, dspark): fullPath → path 로 변경. fullPath 는 query 포함이라
             목록의 필터/페이징/정렬(URL query 동기화)마다 페이지를 remount → setup 재실행 →
             검색 staged 등 로컬상태 소실(검색어 입력칸 비워짐) 버그. path 만 키로 쓰면
             화면(경로) 전환 시에만 remount, query 변경엔 remount 안 함(상태 보존). -->
        <RouterView :key="$route.path" />
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
  position: relative;               /* ★ (2026-06-16, dspark): absolute rail 오버레이 기준 */
}
/* ★ (2026-06-16, dspark): h5on 식 hover 오버레이 drawer.
 *   rail 을 absolute(평소 50px 아이콘 전용)로 띄워 panel 을 밀지 않게 하고,
 *   hover 시 rail 이 라벨까지 168px 로 펼쳐져 panel 위로 오버레이된다.
 *   (이전: 50px icon-only 고정 + 라벨 display:none — h5on 식 drawer 미동작 원인) */
.main-layout__lnb--open :deep(.in-lnb2__rail) {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 50px;
  z-index: 30;
  overflow: hidden;
  transition: width 160ms ease, box-shadow 160ms ease;
}
.main-layout__lnb--open :deep(.in-lnb2__rail:hover) {
  width: 150px;                     /* 펼침 — 라벨 노출 (★ 2026-06-16 168→150 폭 축소) */
  box-shadow: 4px 0 16px rgba(0, 0, 0, 0.18);
}
/* ★ (2026-05-27, dspark): .in-lnb2__home 는 design-system default (--in-text-default
 *   #565656 회색 + 옅은 blue border-bottom) 그대로 유지. Figma 진본에서 home cell 만
 *   어두운 회색 사각형 (종이비행기 뒤). 이전 brand override 는 제거. */
.main-layout__lnb--open :deep(.in-lnb2__cats) {
  padding: 5px 0 10px 0;
  align-items: center;
  width: 100%;
}
.main-layout__lnb--open :deep(.in-lnb2__rail:hover .in-lnb2__cats) {
  align-items: flex-start;
  padding-left: 7px;
}
.main-layout__lnb--open :deep(.in-lnb2__1dep) {
  width: 100%;
  justify-content: center;
  gap: 0;
  padding: 0;
}
.main-layout__lnb--open :deep(.in-lnb2__rail:hover .in-lnb2__1dep) {
  width: 134px;
  justify-content: flex-start;
  gap: 6px;
  padding: 0 6px;
}
.main-layout__lnb--open :deep(.in-lnb2__1dep-label) {
  display: none;                    /* 평소 숨김 — icon-only rail */
}
.main-layout__lnb--open :deep(.in-lnb2__rail:hover .in-lnb2__1dep-label) {
  display: block;                   /* hover 시 라벨 노출 — h5on 정합 */
}
.main-layout__lnb--open :deep(.in-lnb2__profile) {
  width: 100%;
}
.main-layout__lnb--open :deep(.in-lnb2__panel) {
  flex: 0 0 182px;
  margin-left: 50px;                /* ★ (2026-06-16, dspark): absolute rail(50) 공간 확보 */
}

/* ★ (2026-05-27, dspark): InLNB(fixed) collapsed — Figma 진본 정합.
 *   rail/profile 은 brand (design-system default) / home cell 만 어두운 회색.
 *   (InLNBSubmenu home 과 동일 패턴 — 종이비행기 로고 뒤 사각형은 항상 회색) */
.main-layout__lnb--fixed :deep(.in-lnb__home) {
  background: var(--in-text-default) !important;   /* #565656 회색 — Figma 진본 정합 (펼쳐짐의 home 과 동일) */
}
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
  display: inline-flex;
  align-items: center;
  gap: 10px;
}
.main-layout__header-right {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}
/* ★ (2026-06-15, dspark): 상단바 권한(역할) 콤보 */
.main-layout__auth {
  width: 160px;
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
  color: var(--in-text-white); /* ★ (2026-06-12, dspark): #fff → 토큰 */
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
.main-layout__content {
  flex: 1 1 auto;
  padding: 20px;
  overflow: auto;
}
</style>
