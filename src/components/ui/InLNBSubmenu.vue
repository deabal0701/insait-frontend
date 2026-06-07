<script setup>
import { computed } from 'vue';
import InCompanyLogo from '@/components/ui/InCompanyLogo.vue';
import ArrowLeftIcon from '@/assets/icons/arrow-left.svg';
import ArrowDownIcon from '@/assets/icons/arrow-down.svg';
import NotificationsIcon from '@/assets/icons/notifications.svg';
import PersonIcon from '@/assets/icons/person.svg';
import { ICON_REGISTRY } from '@/assets/icons/registry';

/**
 * InLNBSubmenu — Figma 1402:27025 (Navigation/LNB / accordion=Open+1dep Hover)
 *
 * 2-layer composition:
 *  - LnbFixed rail (110 wide, bg brand): 11 1depth-Item (icon 36 + inline label 12px white)
 *  - LnbOpen submenu panel (182 wide, bg accent/subtler #e8f1f44d, border-r default):
 *    - Comany header (50 high, 회사명 medium 15px + notification badge 99+)
 *    - 1depth-Title (active 1depth label, bg accent/brand #e1f5fc, size 2xl 16px, text brand)
 *    - 2depth-Items tree (각 toggle 가능, expanded 시 3depth bullet+label 노출)
 *
 * Active 1depth 가 변경되면 submenu panel 내용이 그 1depth 의 submenu 트리로 전환.
 */

const props = defineProps({
  items: {
    type: Array,
    default: () => [
      { key: 'place', label: '스마트 플레이스', icon: 'lnb-search' },
      {
        key: 'planning',
        label: '인사기획',
        icon: 'lnb-people',
        active: true,
        submenu: [
          {
            key: 'org',
            label: '조직 관리',
            expanded: true,
            children: [
              { key: 'org-info', label: '조직정보', active: true },
              { key: 'org-chart', label: '조직도' },
              { key: 'org-restructure', label: '조직 개편' },
              { key: 'org-history', label: '조직이력' },
              { key: 'member-history', label: '구성원이력' },
            ],
          },
          { key: 'member-mgmt', label: '구성원 관리' },
          { key: 'recruit', label: '채용 관리' },
        ],
      },
      { key: 'operation', label: '인사운영', icon: 'lnb-demography' },
      { key: 'performance', label: '성과관리', icon: 'lnb-analytics' },
      { key: 'compensation', label: '보상관리', icon: 'lnb-cases' },
      { key: 'approval', label: '결재관리', icon: 'lnb-inventory' },
      { key: 'analytics', label: '시각화', icon: 'lnb-finance' },
      { key: 'mail', label: '메일', icon: 'lnb-mail', notificationDot: true },
      { key: 'settings', label: '설정', icon: 'lnb-settings' },
      { key: 'bookmark', label: '즐겨찾기', icon: 'lnb-bookmark-add' },
      { key: 'bento', label: '전체보기', icon: 'lnb-bento' },
    ],
  },
  activeKey: { type: String, default: 'planning' },
  companyName: { type: String, default: '회사명' },
  notificationCount: { type: Number, default: 99 },
  height: { type: Number, default: 760 },
});

const emit = defineEmits(['click-1depth', 'click-2depth', 'click-3depth', 'collapse']);

const activeItem = computed(() =>
  props.items.find((it) => it.key === props.activeKey),
);

// ★ (2026-05-27, dspark): submenu 가 빈 배열 [] 이어도 panel + 1depth-Title 박스 표시.
//   "메뉴 미정" 상태 (예: 스마트 플레이스) 에서도 panel 헤더만 보이게 하는 의도.
//   정확한 메뉴가 정해지면 submenu 에 children 채워 자동 활성.
const showPanel = computed(() => Array.isArray(activeItem.value?.submenu));

const totalWidth = computed(() => (showPanel.value ? 110 + 182 + 16 : 110 + 16));

const formatBadgeCount = (n) => (n >= 99 ? '99+' : String(n));
</script>

<template>
  <aside
    class="in-lnb2"
    :style="{ width: totalWidth + 'px', height: height + 'px' }"
    role="navigation"
    aria-label="LNB"
  >
    <!-- Layer 1: Fixed rail (110 wide) -->
    <div class="in-lnb2__rail">
      <!-- Home cell -->
      <div class="in-lnb2__home">
        <InCompanyLogo :logo="true" :size="32" />
      </div>

      <!-- 1depth categories -->
      <nav class="in-lnb2__cats" aria-label="1depth">
        <button
          v-for="it in items"
          :key="it.key"
          type="button"
          class="in-lnb2__1dep"
          :class="{
            'in-lnb2__1dep--active': it.key === activeKey,
          }"
          @click="emit('click-1depth', it)"
        >
          <span class="in-lnb2__1dep-icon-box">
            <img
              :src="ICON_REGISTRY[it.icon]"
              :alt="it.label"
              class="in-lnb2__1dep-icon"
            />
            <span v-if="it.notificationDot" class="in-lnb2__1dep-dot" aria-hidden="true"></span>
          </span>
          <span class="in-lnb2__1dep-label">{{ it.label }}</span>
        </button>
      </nav>

      <!-- Profile -->
      <div class="in-lnb2__profile">
        <div class="in-lnb2__avatar">
          <img :src="PersonIcon" alt="user" class="in-lnb2__avatar-icon" />
          <span class="in-lnb2__avatar-dot" aria-hidden="true"></span>
        </div>
      </div>
    </div>

    <!-- Layer 2: Submenu panel (182 wide), 활성 1depth 의 submenu 트리 -->
    <div v-if="showPanel && activeItem" class="in-lnb2__panel">
      <!-- Comany header -->
      <div class="in-lnb2__comany">
        <span class="in-lnb2__comany-name">{{ companyName }}</span>
        <span class="in-lnb2__comany-badge">
          <img :src="NotificationsIcon" alt="알림" class="in-lnb2__comany-bell" />
          <span class="in-lnb2__comany-badge-count">{{ formatBadgeCount(notificationCount) }}</span>
        </span>
      </div>

      <!-- Submenu container -->
      <div class="in-lnb2__panel-body">
        <!-- 1depth-Title (active 1depth label + icon) -->
        <div class="in-lnb2__1dep-title">
          <span class="in-lnb2__1dep-title-label">{{ activeItem.label }}</span>
          <span class="in-lnb2__1dep-title-icon">
            <img
              :src="ICON_REGISTRY[activeItem.icon]"
              :alt="activeItem.label"
              class="in-lnb2__1dep-title-svg"
            />
          </span>
        </div>

        <!-- 2depth + 3depth tree -->
        <ul class="in-lnb2__2deps" role="tree">
          <li v-for="g in activeItem.submenu" :key="g.key" class="in-lnb2__2dep-group">
            <button
              type="button"
              class="in-lnb2__2dep"
              :aria-expanded="!!g.expanded"
              @click="emit('click-2depth', activeItem, g)"
            >
              <span class="in-lnb2__2dep-label">{{ g.label }}</span>
              <img
                :src="ArrowDownIcon"
                alt=""
                class="in-lnb2__2dep-chev"
                :class="{ 'in-lnb2__2dep-chev--up': g.expanded }"
              />
            </button>
            <ul v-if="g.expanded && g.children?.length" class="in-lnb2__3deps" role="group">
              <li
                v-for="c in g.children"
                :key="c.key"
                class="in-lnb2__3dep"
                :class="{ 'in-lnb2__3dep--active': c.active }"
                @click="emit('click-3depth', activeItem, g, c)"
              >
                <span class="in-lnb2__3dep-bullet" aria-hidden="true">·</span>
                <span class="in-lnb2__3dep-label">{{ c.label }}</span>
              </li>
            </ul>
          </li>
        </ul>
      </div>
    </div>

    <!-- Collapse btn (always at right edge) -->
    <button
      type="button"
      class="in-lnb2__toggle"
      aria-label="메뉴 접기"
      @click="emit('collapse')"
    >
      <img :src="ArrowLeftIcon" alt="" class="in-lnb2__toggle-icon" />
    </button>
  </aside>
</template>

<style scoped>
.in-lnb2 {
  position: relative;
  display: flex;
  font-family: var(--in-font-family-body);
  user-select: none;
  isolation: isolate;
}

/* === Fixed rail (110) === */
.in-lnb2__rail {
  display: flex;
  flex-direction: column;
  width: 110px;
  height: 100%;
  background: var(--in-bg-brand);
  flex-shrink: 0;
  z-index: 1;
}

.in-lnb2__home {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 50px;
  padding: 18px 0;
  background: var(--in-text-default);             /* Figma Text/Default #565656 */
  border-bottom: 1px solid var(--in-blue-200);    /* ★ (2026-05-29, dspark): hex 하드코딩 → 토큰 정합 */
  flex-shrink: 0;
}

.in-lnb2__cats {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 5px 0 10px 7px;
  flex: 1 1 0;
  overflow-y: auto;
}

.in-lnb2__1dep {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 103px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--in-text-white);
  padding: 0;
}

.in-lnb2__1dep-icon-box {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--in-radius-sm);
  flex-shrink: 0;
  transition: background 120ms ease, box-shadow 120ms ease;
}

.in-lnb2__1dep--active .in-lnb2__1dep-icon-box {
  background: var(--in-bg-state-hover);           /* Surface/Action/Bolder #0488c7 */
  box-shadow: var(--in-shadow-1depon);            /* ★ (2026-06-07, dspark): 하드코딩 #1cb0ef → 토큰 (green 테마 추종) */
}

.in-lnb2__1dep-icon {
  width: 18px;
  height: 18px;
  display: block;
  filter: brightness(0) invert(1);                /* white tint */
}

.in-lnb2__1dep-dot {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: var(--in-radius-full);
  background: var(--in-icon-info-error);          /* Figma Icon/Info/Error */
  right: 8px;
  top: 8px;
}

.in-lnb2__1dep-label {
  font-family: var(--in-font-family-body);
  font-size: var(--in-font-size-sm);              /* Figma Body/sm (12px) */
  line-height: var(--in-line-height-sm);          /* 19px */
  font-weight: 500;
  letter-spacing: var(--in-letter-spacing-sm);
  color: var(--in-text-white);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1 1 0;
  min-width: 0;
  text-align: left;
}

/* Profile */
.in-lnb2__profile {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 10px 0 15px 0;
  background: var(--in-bg-brand);
  flex-shrink: 0;
}

.in-lnb2__avatar {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  background: var(--in-icon-bold);                /* Figma Icon/Bold (#53c3ee → --in-iblue-300 alias) */
  border-radius: var(--in-radius-full);
}

.in-lnb2__avatar-icon {
  width: 22px;
  height: 22px;
  display: block;
  filter: brightness(0) invert(1);
}

.in-lnb2__avatar-dot {
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: var(--in-radius-full);
  background: var(--in-text-white);
  left: 23px;
  top: 24px;
}

/* === Submenu panel (182) === */
.in-lnb2__panel {
  display: flex;
  flex-direction: column;
  width: 182px;
  height: 100%;
  background: var(--in-bg-accent-subtler);        /* Figma Background/Accent/Subtler */
  border-right: 1px solid var(--in-border-default);
  flex-shrink: 0;
  z-index: 2;
}

.in-lnb2__comany {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 50px;
  padding: 18px 22px 18px 12px;
  background: var(--in-bg-accent-subtler);        /* Background/Accent/Subtler */
  border-bottom: 1px solid var(--in-border-default);
  flex-shrink: 0;
}

.in-lnb2__comany-name {
  flex: 1 1 0;
  min-width: 0;
  font-family: var(--in-font-family-body);
  font-size: var(--in-font-size-xl);              /* 15 */
  line-height: var(--in-line-height-xl);          /* 22 */
  letter-spacing: var(--in-letter-spacing-xl);
  font-weight: 500;
  color: var(--in-text-accent);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.in-lnb2__comany-badge {
  position: relative;
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
}

.in-lnb2__comany-bell {
  width: 24px;
  height: 24px;
  display: block;
}

.in-lnb2__comany-badge-count {
  position: absolute;
  top: -1px;
  left: 13px;
  min-width: 14px;
  height: 16px;
  padding: 0 3px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--in-icon-info-error);          /* Icon/Info/Error */
  color: var(--in-text-white);
  border-radius: var(--in-radius-full);
  font-family: var(--in-font-family-body);
  font-size: var(--in-font-size-xs, 11px);        /* Figma Font/Size/xs */
  line-height: var(--in-line-height-xs, 16px);
  font-weight: 500;
  white-space: nowrap;
}

.in-lnb2__panel-body {
  display: flex;
  flex-direction: column;
  padding: 10px;
  gap: 5px;
  flex: 1 1 0;
  overflow-y: auto;
}

.in-lnb2__1dep-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 64px;
  padding: 20px 16px 22px 16px;
  background: var(--in-iblue-50);                 /* Figma Background/Accent/Brand opaque (#e1f5fc primitive — alpha 변형 은 --in-bg-accent-brand) */
  border-radius: var(--in-radius-sm);
  flex-shrink: 0;
}

.in-lnb2__1dep-title-label {
  font-family: var(--in-font-family-body);
  font-size: var(--in-font-size-2xl, 16px);
  line-height: var(--in-line-height-2xl, 24px);
  letter-spacing: -0.4px;
  font-weight: 500;
  color: var(--in-text-brand);
  white-space: nowrap;
}

.in-lnb2__1dep-title-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
}

.in-lnb2__1dep-title-svg {
  width: 22px;
  height: 22px;
  display: block;
  filter: brightness(0) saturate(100%) invert(46%) sepia(86%) saturate(2056%) hue-rotate(174deg) brightness(95%) contrast(91%);
  /* Brand #13a9e9 tint via filter (Icon/Brand) */
}

/* 2depth */
.in-lnb2__2deps {
  display: flex;
  flex-direction: column;
  list-style: none;
  padding: 0;
  margin: 0;
  width: 100%;
}

.in-lnb2__2dep-group {
  display: flex;
  flex-direction: column;
}

.in-lnb2__2dep {
  display: flex;
  align-items: center;
  gap: 5px;
  width: 100%;
  padding: 6px 7px 6px 15px;
  background: transparent;
  border: none;
  cursor: pointer;
}

.in-lnb2__2dep-label {
  flex: 1 1 0;
  min-width: 0;
  text-align: left;
  font-family: var(--in-font-family-body);
  font-size: var(--in-font-size-md);              /* 13 */
  line-height: var(--in-line-height-md);          /* 20 */
  letter-spacing: var(--in-letter-spacing-md);
  color: var(--in-text-subtle);                   /* #7c7c7c */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.in-lnb2__2dep[aria-expanded='true'] .in-lnb2__2dep-label {
  color: var(--in-text-accent);                   /* #010101 when expanded */
}

.in-lnb2__2dep-chev {
  width: 20px;
  height: 20px;
  display: block;
  flex-shrink: 0;
  transition: transform 120ms ease;
  filter: brightness(0) saturate(100%) invert(45%);
}

.in-lnb2__2dep-chev--up {
  transform: rotate(180deg);
}

/* 3depth */
.in-lnb2__3deps {
  display: flex;
  flex-direction: column;
  padding: 2px 0;
  margin: 0;
  list-style: none;
  width: 100%;
}

.in-lnb2__3dep {
  display: flex;
  align-items: center;
  gap: 0;
  width: 100%;
  padding: 2px 0 2px 17px;
  cursor: pointer;
  color: var(--in-text-subtle);
}

.in-lnb2__3dep--active {
  color: var(--in-text-brand);                    /* #13a9e9 */
}

.in-lnb2__3dep-bullet {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  width: 10px;
  font-family: var(--in-font-family-body);
  font-size: var(--in-font-size-xs, 11px);        /* Figma Font/Size/xs */
  line-height: var(--in-line-height-xs, 16px);          /* 16 */
  color: inherit;
  flex-shrink: 0;
  margin-right: 10px;
}

.in-lnb2__3dep-label {
  flex: 1 1 0;
  min-width: 0;
  font-family: var(--in-font-family-body);
  font-size: var(--in-font-size-md);              /* 13 */
  line-height: var(--in-line-height-md);          /* 20 */
  letter-spacing: var(--in-letter-spacing-md);
  font-weight: 400;
  color: inherit;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* === Collapse toggle (16×50) === */
.in-lnb2__toggle {
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

.in-lnb2__toggle-icon {
  width: 16px;
  height: 16px;
  display: block;
  filter: brightness(0) invert(1);
}
</style>
