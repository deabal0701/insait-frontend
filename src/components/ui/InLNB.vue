<script setup>
import { computed } from 'vue';
import InCompanyLogo from '@/components/ui/InCompanyLogo.vue';
// ★ (2026-06-16, dspark): toggle 전용 chevron('<'). open='<'(접기) / fixed 일 때 rotate(180)='>'(펼치기).
//   design-system chevron-left 대신 여백 0 전용 SVG (16px 버튼서 정확한 크기·찌부 없음).
import LnbToggleChevron from '@/assets/icons/lnb-toggle-chevron.svg';
import PersonIcon from '@/assets/icons/person.svg';
import NotificationsIcon from '@/assets/icons/notifications.svg';
import LnbSearchIcon from '@/assets/icons/lnb-search.svg';
import LnbPeopleIcon from '@/assets/icons/lnb-people.svg';
import LnbDemographyIcon from '@/assets/icons/lnb-demography.svg';
import LnbAnalyticsIcon from '@/assets/icons/lnb-analytics.svg';
import LnbCasesIcon from '@/assets/icons/lnb-cases.svg';
import LnbInventoryIcon from '@/assets/icons/lnb-inventory.svg';
import LnbFinanceIcon from '@/assets/icons/lnb-finance.svg';
import LnbMailIcon from '@/assets/icons/lnb-mail.svg';
import LnbSettingsIcon from '@/assets/icons/lnb-settings.svg';
import LnbBookmarkAddIcon from '@/assets/icons/lnb-bookmark-add.svg';
import LnbBentoIcon from '@/assets/icons/lnb-bento.svg';

/**
 * InLNB — Figma DS 1402:27026 (Navigation/LNB)
 *
 * Figma 매트릭스: accordion (3) = Fixed / Open / Open+1dep Hover
 *   - Fixed (66px = 50 rail + 16 toggle): icon-only rail
 *   - Open  (248px = 50 rail + 182 panel + 16 toggle): rail + LnbOpen 패널
 *       - Comany row (182×50): 회사명 + notification bell + 99+ badge
 *       - 1depth-Title: active 1depth label + icon (brand bg)
 *       - Submenu (flat 2depth items)
 *   - Open+1dep Hover: 풍부한 3-depth tree → InLNBSubmenu.vue 사용 권장
 *
 * Vue 표준 API:
 *   - v-model:active-key (선택 1depth 표시)
 *   - props: accordion · items · companyName · notificationCount · height
 *   - emits: toggle-accordion · click-item · click-submenu
 *
 * AS-IS 8 한국어 메뉴: 인사기획·인사기본·성과관리·보상관리·결재관리·시각화·메일·환경설정
 */

const props = defineProps({
  accordion: {
    type: String,
    default: 'fixed',
    validator: (v) => ['fixed', 'open'].includes(v),
  },
  activeKey: { type: String, default: 'people' },
  items: {
    type: Array,
    default: () => [
      { key: 'search', label: '검색' },
      {
        key: 'people', label: '인사기본',
        submenu: [
          { key: 'org-info', label: '조직정보', active: true },
          { key: 'org-chart', label: '조직도' },
          { key: 'org-restructure', label: '조직 개편' },
          { key: 'org-history', label: '조직이력' },
          { key: 'member-history', label: '구성원이력' },
          { key: 'member-mgmt', label: '구성원 관리' },
          { key: 'recruit', label: '채용 관리' },
        ],
      },
      { key: 'demography', label: '인사기획' },
      { key: 'analytics', label: '성과관리' },
      { key: 'cases', label: '결재관리' },
      { key: 'inventory', label: '시각화' },
      { key: 'finance', label: '보상관리' },
      { key: 'mail', label: '메일', notificationDot: true },
      { key: 'settings', label: '환경설정' },
      { key: 'bookmark-add', label: '즐겨찾기' },
      { key: 'bento', label: '전체메뉴' },
    ],
  },
  companyName: { type: String, default: '회사명' },
  notificationCount: { type: Number, default: 99 },
  height: { type: Number, default: 1080 },
});

const emit = defineEmits(['toggle-accordion', 'update:activeKey', 'click-item', 'click-submenu']);

const iconMap = {
  'search': LnbSearchIcon,
  'people': LnbPeopleIcon,
  'demography': LnbDemographyIcon,
  'analytics': LnbAnalyticsIcon,
  'cases': LnbCasesIcon,
  'inventory': LnbInventoryIcon,
  'finance': LnbFinanceIcon,
  'mail': LnbMailIcon,
  'settings': LnbSettingsIcon,
  'bookmark-add': LnbBookmarkAddIcon,
  'bento': LnbBentoIcon,
};

const railWidth = 50;
const panelWidth = 182;
const toggleWidth = 16;

const totalWidth = computed(() =>
  props.accordion === 'fixed' ? railWidth + toggleWidth : railWidth + panelWidth + toggleWidth,
);

const activeItem = computed(() =>
  props.items.find((it) => it.key === props.activeKey),
);

const showPanel = computed(() => props.accordion === 'open' && !!activeItem.value);

const formatBadge = (n) => (n >= 99 ? '99+' : String(n));

function onItemClick(it, idx) {
  emit('update:activeKey', it.key);
  emit('click-item', it, idx);
}
</script>

<template>
  <aside
    class="in-lnb"
    :class="`in-lnb--${accordion}`"
    :style="{ width: totalWidth + 'px', height: height + 'px' }"
    role="navigation"
    aria-label="LNB"
  >
    <!-- LnbFixed rail (50px, 항상 icon-only) -->
    <div class="in-lnb__rail">
      <!-- Home cell -->
      <div class="in-lnb__home">
        <InCompanyLogo :logo="true" :size="32" />
      </div>

      <!-- Categories -->
      <nav class="in-lnb__cats" aria-label="1depth">
        <button
          v-for="(it, idx) in items"
          :key="it.key"
          type="button"
          class="in-lnb__item"
          :class="{ 'in-lnb__item--active': it.key === activeKey }"
          :aria-current="it.key === activeKey ? 'page' : undefined"
          @click="onItemClick(it, idx)"
        >
          <span class="in-lnb__icon-box">
            <img :src="iconMap[it.key]" :alt="it.label || it.key" class="in-lnb__icon" />
            <span v-if="it.notificationDot" class="in-lnb__item-dot" aria-hidden="true"></span>
          </span>
        </button>
      </nav>

      <!-- Profile -->
      <div class="in-lnb__profile">
        <div class="in-lnb__avatar">
          <img :src="PersonIcon" alt="user" class="in-lnb__avatar-icon" />
          <span class="in-lnb__avatar-dot" aria-hidden="true"></span>
        </div>
      </div>
    </div>

    <!-- LnbOpen panel (182px, accordion=open + active item 있을 때만) -->
    <div v-if="showPanel && activeItem" class="in-lnb__panel">
      <!-- Comany row (회사명 + 알림벨 + 99+ badge) -->
      <div class="in-lnb__comany">
        <span class="in-lnb__comany-name">{{ companyName }}</span>
        <span class="in-lnb__comany-badge">
          <img :src="NotificationsIcon" alt="알림" class="in-lnb__comany-bell" />
          <span v-if="notificationCount > 0" class="in-lnb__comany-count">{{ formatBadge(notificationCount) }}</span>
        </span>
      </div>

      <!-- Body: 1depth-Title + submenu -->
      <div class="in-lnb__panel-body">
        <!-- 1depth-Title (active 1depth label + icon, brand bg) -->
        <div class="in-lnb__title">
          <span class="in-lnb__title-label">{{ activeItem.label }}</span>
          <span class="in-lnb__title-icon">
            <img
              :src="iconMap[activeItem.key]"
              :alt="activeItem.label"
              class="in-lnb__title-svg"
            />
          </span>
        </div>

        <!-- Submenu items (flat 2depth) -->
        <ul v-if="activeItem.submenu?.length" class="in-lnb__submenu" role="list">
          <li
            v-for="s in activeItem.submenu"
            :key="s.key"
            class="in-lnb__sub"
            :class="{ 'in-lnb__sub--active': s.active }"
            @click="emit('click-submenu', activeItem, s)"
          >
            <span class="in-lnb__sub-bullet" aria-hidden="true">·</span>
            <span class="in-lnb__sub-label">{{ s.label }}</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- Collapse/expand toggle -->
    <button
      type="button"
      class="in-lnb__toggle"
      :aria-label="accordion === 'fixed' ? '메뉴 펼치기' : '메뉴 접기'"
      @click="emit('toggle-accordion')"
    >
      <img
        :src="LnbToggleChevron"
        alt=""
        class="in-lnb__toggle-icon"
        :class="{ 'in-lnb__toggle-icon--flipped': accordion === 'fixed' }"
      />
    </button>
  </aside>
</template>

<style scoped>
.in-lnb {
  position: relative;
  display: flex;
  font-family: var(--in-font-family-body);
  user-select: none;
  isolation: isolate;
}

/* === Fixed rail (50px, icon-only) === */
.in-lnb__rail {
  display: flex;
  flex-direction: column;
  width: 50px;
  height: 100%;
  background: var(--in-bg-brand);
  flex-shrink: 0;
  z-index: 1;
}

/* Home cell — Figma 진본 (50×50)
 * ★ (2026-05-29, dspark): design-system v2 정합. 진한 회색 (#565656) bg + blue-200 border-bottom
 *   으로 brand rail 과 의도된 시각 대비 (이전 brand 통일은 비정합 — 사용자 재확인 2026-05-27)
 */
.in-lnb__home {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 50px;
  padding: 18px 0;
  background: var(--in-text-default);             /* Figma Text/Default #565656 */
  border-bottom: 1px solid var(--in-blue-200);    /* Figma Blue/200 #82d4f3 */
  flex-shrink: 0;
}

.in-lnb__cats {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  padding: 5px 0 10px 0;
  align-items: center;
  flex: 1 1 0;
  overflow-y: auto;
}

.in-lnb__item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 36px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
}

.in-lnb__icon-box {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--in-radius-sm);
  transition: background 120ms ease, box-shadow 120ms ease;
}

.in-lnb__item--active .in-lnb__icon-box {
  background: var(--in-bg-state-hover);          /* Surface/Action/Bolder #0488c7 */
  box-shadow: var(--in-shadow-1depon);   /* ★ (2026-06-07, dspark): 하드코딩 #1cb0ef → 토큰 (green 테마 추종) */
}

.in-lnb__icon {
  width: 18px;
  height: 18px;
  display: block;
  filter: brightness(0) invert(1);               /* white tint */
}

.in-lnb__item-dot {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: var(--in-radius-full);
  background: var(--in-icon-info-error);
  right: 5px;
  top: 5px;
}

/* === Profile === */
.in-lnb__profile {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 10px 0 15px 0;
  background: var(--in-bg-brand);
  flex-shrink: 0;
}

.in-lnb__avatar {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  background: var(--in-icon-bold);
  border-radius: var(--in-radius-full);
}

.in-lnb__avatar-icon {
  width: 22px;
  height: 22px;
  display: block;
  filter: brightness(0) invert(1);
}

.in-lnb__avatar-dot {
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: var(--in-radius-full);
  background: var(--in-text-white);
  left: 23px;
  top: 24px;
}

/* === LnbOpen panel (182px) === */
.in-lnb__panel {
  display: flex;
  flex-direction: column;
  width: 182px;
  height: 100%;
  background: var(--in-bg-white);
  border-right: 1px solid var(--in-border-default);
  flex-shrink: 0;
  z-index: 2;
}

/* Comany row */
.in-lnb__comany {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 50px;
  padding: 12px 16px;
  background: var(--in-bg-white);
  border-bottom: 1px solid var(--in-border-default);
  flex-shrink: 0;
}

.in-lnb__comany-name {
  flex: 1 1 0;
  min-width: 0;
  font-family: var(--in-font-family-body);
  font-size: var(--in-font-size-xl);
  line-height: var(--in-line-height-xl);
  letter-spacing: var(--in-letter-spacing-xl);
  font-weight: 500;
  color: var(--in-text-accent);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.in-lnb__comany-badge {
  position: relative;
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
}

.in-lnb__comany-bell {
  width: 24px;
  height: 24px;
  display: block;
}

.in-lnb__comany-count {
  position: absolute;
  top: -1px;
  left: 13px;
  min-width: 14px;
  height: 16px;
  padding: 0 3px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--in-icon-info-error);
  color: var(--in-text-white);
  border-radius: var(--in-radius-full);
  font-family: var(--in-font-family-body);
  font-size: var(--in-font-size-xs);
  line-height: var(--in-line-height-xs);
  font-weight: 500;
  white-space: nowrap;
}

/* Body */
.in-lnb__panel-body {
  display: flex;
  flex-direction: column;
  padding: 10px;
  gap: 8px;
  flex: 1 1 0;
  overflow-y: auto;
}

/* 1depth-Title (active 1depth, brand bg) */
.in-lnb__title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 16px 16px;
  background: var(--in-bg-accent-brand);   /* #e1f5fc */
  border-radius: var(--in-radius-sm);
  flex-shrink: 0;
}

.in-lnb__title-label {
  font-family: var(--in-font-family-body);
  font-size: var(--in-font-size-2xl);
  line-height: var(--in-line-height-2xl);
  letter-spacing: -0.4px;
  font-weight: 500;
  color: var(--in-text-brand);
  white-space: nowrap;
}

.in-lnb__title-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
}

.in-lnb__title-svg {
  width: 22px;
  height: 22px;
  display: block;
  filter: brightness(0) saturate(100%) invert(46%) sepia(86%) saturate(2056%) hue-rotate(174deg) brightness(95%) contrast(91%);
}

/* Submenu (flat 2depth list) */
.in-lnb__submenu {
  display: flex;
  flex-direction: column;
  list-style: none;
  padding: 0;
  margin: 0;
  width: 100%;
}

.in-lnb__sub {
  display: flex;
  align-items: center;
  gap: 0;
  width: 100%;
  padding: 6px 0 6px 17px;
  cursor: pointer;
  color: var(--in-text-subtle);
  transition: color 120ms ease, background 120ms ease;
  border-radius: var(--in-radius-xs);
}

.in-lnb__sub:hover:not(.in-lnb__sub--active) {
  background: var(--in-surface-state-default);
  color: var(--in-text-default);
}

.in-lnb__sub--active {
  color: var(--in-text-brand);
  font-weight: 500;
}

.in-lnb__sub-bullet {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  width: 10px;
  font-size: var(--in-font-size-xs);
  line-height: var(--in-line-height-xs);
  color: inherit;
  flex-shrink: 0;
  margin-right: 10px;
}

.in-lnb__sub-label {
  flex: 1 1 0;
  min-width: 0;
  font-family: var(--in-font-family-body);
  font-size: var(--in-font-size-md);
  line-height: var(--in-line-height-md);
  letter-spacing: var(--in-letter-spacing-md);
  color: inherit;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* === Collapse/expand toggle (16×50) === */
.in-lnb__toggle {
  position: absolute;
  top: 0;
  right: 0;
  width: 16px;
  height: 50px;
  background: var(--in-bg-brand);
  border: none;
  border-top-right-radius: var(--in-radius-xxs);
  border-bottom-right-radius: var(--in-radius-xxs);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3;
}

.in-lnb__toggle-icon {
  width: 13px;                       /* ★ (2026-06-16, dspark): 전용 chevron(여백 0) — 16px 버튼 안에 딱 맞음 */
  height: 20px;
  display: block;
  filter: brightness(0) invert(1);
}
.in-lnb__toggle-icon--flipped { transform: rotate(180deg); }
</style>
