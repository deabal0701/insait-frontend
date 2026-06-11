<script setup>
// ★ (2026-05-27, dspark): 인증 후 메인 layout — InLNBSubmenu (Figma 1402:27025) 정합.
//   디자인 시스템의 11 1depth 카탈로그를 그대로 유지 + '설정' (lnb-settings) 의 submenu 에
//   실제 admin 9 화면 (메타관리 5 + 권한관리 3 + 자료실 1) 을 OBJECT_ID 기반으로 매핑.
//   타 카테고리 (인사기획·인사운영·성과관리·보상관리·결재관리·시각화·메일 등) 는 디자인 시스템
//   default submenu 를 그대로 노출 (3depth 클릭 시 '준비 중' 토스트 — 점진 활성화 대상).
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useAuth } from '@/composables/useAuth';
import { ElMessage } from 'element-plus';
import InLNBSubmenu from '@/components/ui/InLNBSubmenu.vue';
import InLNB from '@/components/ui/InLNB.vue';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const { logout } = useAuth();

function onUserCommand(cmd) {
  if (cmd === 'settings') {
    router.push({ name: 'SETTINGS' });
  } else if (cmd === 'logout') {
    logout();
  }
}

// ★ (2026-05-27, dspark): 각 1depth 카테고리별 2depth 그룹 펼침 상태 (사용자 toggle 보존).
//   Figma 진본 정합으로 모든 1depth 에 placeholder submenu 트리 (router 진입은 시스템관리만,
//   그 외 카테고리는 click 시 '준비 중' 토스트).
const settingsExpanded = ref({ meta: true, auth: false, sysenv: false, pds: false, env: false, playground: false });
const planningExpanded = ref({ org: true, 'member-mgmt': false, recruit: false });
const operationExpanded = ref({ attendance: true, leave: false, dispatch: false, order: false });
const performanceExpanded = ref({ eval: true, meeting: false, config: false });
const compensationExpanded = ref({ pay: true, bonus: false, deduction: false });
const approvalExpanded = ref({ line: true, doc: false, inbox: false, list: false });
const analyticsExpanded = ref({ 'hr-data': true, 'recruit-data': false });
const mailExpanded = ref({ box: true });
const bookmarkExpanded = ref({ list: true });
const bentoExpanded = ref({ all: true });

// admin 화면 → '설정' 카테고리의 2depth 그룹 매핑
const ADMIN_PARENT = {
  // ★ (2026-06-11, dspark): 메타관리(SYS_DEV) = AS-IS active 5 화면 (공통코드는 시스템환경으로 이동).
  AUT0030: 'meta', IST0030: 'meta', IST0020: 'meta', IST0050: 'meta', IST0010: 'meta',
  // ★ (2026-06-07, dspark): 「사용자와 접근제어」(auth) 그룹 = AS-IS SYS_ACCESS 7 화면.
  AUT0010: 'auth', AUT0020: 'auth', AUT0040: 'auth', AUT0060: 'auth', AUT0070: 'auth', AUT0100: 'auth', AUT0050: 'auth',
  // ★ (2026-06-11, dspark): 시스템환경(SYS_ENV) = AS-IS 공통코드/기준/레지스트리 등 (TO-BE 필수 5).
  CCD0040: 'sysenv', CCD0010: 'sysenv', CCD0050: 'sysenv', CCD0020: 'sysenv', CCD0070: 'sysenv',
  FRM0090: 'pds',
  SETTINGS: 'env',
  COMPONENTS: 'env',
  // ★ (2026-06-02, dspark): Grid 카탈로그 → 시스템관리 > Playground 그룹
  DevGridGallery: 'playground',
  DevTestGridPage: 'playground',
};

// 현재 라우트로부터 1depth activeKey 추론 (admin = 설정 / 그 외 = smart place)
const activeKey = ref('place');
function syncActiveKey() {
  activeKey.value = ADMIN_PARENT[route.name] ? 'settings' : 'place';
  const parent = ADMIN_PARENT[route.name];
  if (parent) settingsExpanded.value = { ...settingsExpanded.value, [parent]: true };
}
syncActiveKey();
// ★ (2026-05-29, dspark): route 변경 시 LNB activeKey + 메뉴 그룹 펼침 상태 재계산.
//   미적용 시 admin 화면 간 이동 후 LNB 강조가 stale. router.afterEach 보다 컴포넌트
//   생명주기에 묶어 두는 편이 디버깅 용이.
watch(() => route.name, syncActiveKey);

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
    // ★ (2026-05-27, dspark): 스마트 플레이스 — submenu 미정 (Figma 진본·AS-IS 카탈로그에
    //   구체 메뉴 부재). submenu: [] 로 두면 panel 의 1depth-Title 상단 박스만 보이고
    //   2depth/3depth 메뉴는 비어 있음. 추후 정확한 메뉴 확정 시 children 채울 것.
    { key: 'place', label: '스마트 플레이스', icon: 'lnb-search', submenu: [] },
    {
      key: 'planning',
      label: '인사기획',
      icon: 'lnb-people',
      submenu: [
        {
          key: 'org', label: '조직 관리',
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
    {
      key: 'operation', label: '인사운영', icon: 'lnb-demography',
      submenu: [
        {
          key: 'attendance', label: '근태관리',
          expanded: operationExpanded.value.attendance,
          children: [
            { key: 'attendance-daily', label: '일일근태' },
            { key: 'attendance-monthly', label: '월간근태' },
            { key: 'attendance-overtime', label: '연장근무' },
          ],
        },
        { key: 'leave', label: '휴가관리', expanded: operationExpanded.value.leave },
        { key: 'dispatch', label: '출장관리', expanded: operationExpanded.value.dispatch },
        { key: 'order', label: '발령관리', expanded: operationExpanded.value.order },
      ],
    },
    {
      key: 'performance', label: '성과관리', icon: 'lnb-analytics',
      submenu: [
        {
          key: 'eval', label: '성과 평가',
          expanded: performanceExpanded.value.eval,
          children: [
            { key: 'eval-mine', label: '나의 평가' },
            { key: 'eval-manage', label: '평가관리' },
          ],
        },
        { key: 'meeting', label: '면담', expanded: performanceExpanded.value.meeting },
        { key: 'config', label: '평가설정', expanded: performanceExpanded.value.config },
      ],
    },
    {
      key: 'compensation', label: '보상관리', icon: 'lnb-cases',
      submenu: [
        {
          key: 'pay', label: '급여지급',
          expanded: compensationExpanded.value.pay,
          children: [
            { key: 'pay-date',   label: '급여일자관리' },
            { key: 'pay-target', label: '대상자현황' },
            { key: 'pay-base',   label: '기초원장' },
            { key: 'pay-retro',  label: '소급처리' },
            { key: 'pay-close',  label: '기본계산마감' },
            { key: 'pay-except', label: '예외사항관리' },
            { key: 'pay-deduct', label: '공제내역' },
            { key: 'pay-calc',   label: '급여계산' },
          ],
        },
        { key: 'bonus',     label: '상여관리', expanded: compensationExpanded.value.bonus },
        { key: 'deduction', label: '공제관리', expanded: compensationExpanded.value.deduction },
      ],
    },
    {
      key: 'approval', label: '결재관리', icon: 'lnb-inventory',
      submenu: [
        {
          key: 'line', label: '결재선지정',
          expanded: approvalExpanded.value.line,
          children: [
            { key: 'approval-personal', label: '개인결재선' },
            { key: 'approval-delegate', label: '대리결재선' },
            { key: 'approval-final',    label: '전결자지정' },
          ],
        },
        { key: 'doc',   label: '결재문서', expanded: approvalExpanded.value.doc },
        { key: 'inbox', label: '상신함',   expanded: approvalExpanded.value.inbox },
        { key: 'list',  label: '결재함',   expanded: approvalExpanded.value.list },
      ],
    },
    {
      key: 'analytics', label: '시각화', icon: 'lnb-finance',
      submenu: [
        {
          key: 'hr-data', label: '인사데이터',
          expanded: analyticsExpanded.value['hr-data'],
          children: [
            { key: 'hr-headcount', label: '인력구성' },
            { key: 'hr-turnover',  label: '이직률' },
            { key: 'hr-age',       label: '연령및근속연수' },
            { key: 'hr-position',  label: '직무별분포' },
            { key: 'hr-diversity', label: '다양성지표' },
          ],
        },
        { key: 'recruit-data', label: '채용데이터', expanded: analyticsExpanded.value['recruit-data'] },
      ],
    },
    {
      key: 'mail', label: '메일', icon: 'lnb-mail', notificationDot: true,
      submenu: [
        {
          key: 'box', label: '메일함',
          expanded: mailExpanded.value.box,
          children: [
            { key: 'mail-write',  label: '편지쓰기' },
            { key: 'mail-inbox',  label: '받은편지함' },
            { key: 'mail-sent',   label: '보낸편지함' },
            { key: 'mail-draft',  label: '임시보관함' },
            { key: 'mail-outbox', label: '보낼편지함' },
            { key: 'mail-spam',   label: '스팸편지함' },
            { key: 'mail-trash',  label: '휴지통' },
          ],
        },
      ],
    },
    {
      key: 'bookmark', label: '즐겨찾기', icon: 'lnb-bookmark-add',
      submenu: [
        {
          key: 'list', label: '즐겨찾기 목록',
          expanded: bookmarkExpanded.value.list,
          children: [
            { key: 'bookmark-empty', label: '(등록된 즐겨찾기 없음)' },
          ],
        },
      ],
    },
    {
      key: 'bento', label: '전체보기', icon: 'lnb-bento',
      submenu: [
        {
          key: 'all', label: '전체 메뉴',
          expanded: bentoExpanded.value.all,
          children: [
            { key: 'bento-all', label: '전체 메뉴 트리' },
          ],
        },
      ],
    },
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
            // ★ (2026-06-11, dspark): 메타관리 LNB 순서 = AS-IS 개발 및 수정작업(SYS_DEV) active 순서
            //   (SD_OBJ → SD_MSG → SD_ENT → SD_MSG1 → SD_SQL). 공통코드(CCD)는 시스템환경(SYS_ENV)으로 이동.
            { key: 'AUT0030',  label: '오브젝트 관리',    active: current === 'AUT0030' },
            { key: 'IST0030',  label: '메시지 관리',      active: current === 'IST0030' },
            { key: 'IST0020',  label: '엔터티 관리',      active: current === 'IST0020' },
            { key: 'IST0050',  label: '서비스 관리',      active: current === 'IST0050' },
            { key: 'IST0010',  label: 'SQL 관리',         active: current === 'IST0010' },
          ],
        },
        {
          // ★ (2026-06-11, dspark): AS-IS 「사용자와 접근제어」(SYS_ACCESS) active 순서 정합 (frm_menu seq).
          //   사용자(10) → 메뉴(13) → 권한기준(15) → 사용자그룹(20) → 권한(25) → 외부사용자(30) → 조직권한(60).
          key: 'auth',
          label: '사용자와 접근제어',
          expanded: settingsExpanded.value.auth,
          children: [
            { key: 'AUT0010', label: '사용자 관리',     active: current === 'AUT0010' },
            { key: 'AUT0050', label: '메뉴 관리',       active: current === 'AUT0050' },
            { key: 'AUT0070', label: '권한기준 관리',   active: current === 'AUT0070' },
            { key: 'AUT0020', label: '사용자그룹 관리', active: current === 'AUT0020' },
            { key: 'AUT0040', label: '권한 관리',       active: current === 'AUT0040' },
            { key: 'AUT0100', label: '외부사용자 관리', active: current === 'AUT0100' },
            { key: 'AUT0060', label: '조직권한 관리',   active: current === 'AUT0060' },
          ],
        },
        {
          // ★ (2026-06-11, dspark): 시스템환경(SYS_ENV) 그룹 신설 — TO-BE 개발 필수 항목만 우선 추가.
          //   AS-IS active 순서: 인사영역(1)·단위업무(2)·공통코드(3)·옵션(4)·…·업무기준(8)·MAX값(9).
          //   필수 5: 공통코드(전 콤보)·옵션관리/업무기준관리(기준 프레임워크, AUT0070 엔진)·인사영역(COMPANY_CD)·MAX값(채번).
          //   ⚠️ 미구현(Placeholder). "두 얼굴"(런타임 읽기=envelope) 주의 — 착수 전 AS-IS 분석.
          key: 'sysenv',
          label: '시스템환경',
          expanded: settingsExpanded.value.sysenv,
          children: [
            { key: 'CCD0040', label: '인사영역관리',   active: current === 'CCD0040' },
            { key: 'CCD0010', label: '공통코드관리',   active: current === 'CCD0010' },
            { key: 'CCD0050', label: '옵션관리',       active: current === 'CCD0050' },
            { key: 'CCD0020', label: '업무기준관리',   active: current === 'CCD0020' },
            { key: 'CCD0070', label: 'MAX값관리',      active: current === 'CCD0070' },
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
            { key: 'SETTINGS',   label: '테마·환경',  active: current === 'SETTINGS' },
            { key: 'COMPONENTS', label: '컴포넌트',   active: current === 'COMPONENTS' },
          ],
        },
        // ★ (2026-06-02, dspark): Playground(dev) — 환경설정 바로 아래. Grid 카탈로그 단일.
        {
          key: 'playground',
          label: 'Playground (dev)',
          expanded: settingsExpanded.value.playground,
          children: [
            { key: 'DevGridGallery', label: 'Grid 카탈로그', active: current === 'DevGridGallery' },
            { key: 'DevTestGridPage', label: 'Grid 테스트 페이지', active: current === 'DevTestGridPage' },
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

// 카테고리(1depth key) → 해당 expanded ref 매핑
const EXPANDED_REFS = {
  planning: planningExpanded,
  operation: operationExpanded,
  performance: performanceExpanded,
  compensation: compensationExpanded,
  approval: approvalExpanded,
  analytics: analyticsExpanded,
  mail: mailExpanded,
  bookmark: bookmarkExpanded,
  bento: bentoExpanded,
  settings: settingsExpanded,
};

function onClick2depth(parent, group) {
  const targetState = EXPANDED_REFS[parent.key];
  if (!targetState) return;
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
        <!-- ★ (2026-06-04, dspark): banner = 메뉴 뎁스(향후 breadcrumb) 영역.
             [<] 액션은 페이지 본문 헤더 우측으로 이전 (사용자 피드백 — 헤더에는 헤더에 있을 것).
             현재는 route.meta.title 표시. 추후 breadcrumb 격상은 별도 카드. -->
        <div class="main-layout__crumb">{{ currentTitle }}</div>
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
.main-layout__content {
  flex: 1 1 auto;
  padding: 20px;
  overflow: auto;
}
</style>
