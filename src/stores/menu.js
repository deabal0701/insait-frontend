// ★ (2026-06-16, dspark): 동적 LNB store — AS-IS envelope 메뉴 캐시.
//   rail = AUT0050_00_R06(권한필터 상위 카테고리), subtrees = GNB0001_00_R01(앵커별 lazy 트리).
//   사용자 지시(2026-06-16): "AS-IS 동일 방식으로 조회" — 신규 백엔드 없이 보존 envelope 사용.
//   시스템관리(SYS_ADMIN)는 본 store 가 아니라 MainLayout 하드코딩(최하단 고정).
import { defineStore } from 'pinia';
import { fetchRail, fetchSubtree } from '@/services/menuApi';
import { railRowsToItems, subtreeRowsToSubmenu } from '@/constants/menuTree';

export const useMenuStore = defineStore('menu', {
  state: () => ({
    rail: [],          // [{ key, label, icon, objectId, source }]
    subtrees: {},      // { [menuId]: [ { key, label, children:[{key,label,objectId}] } ] }
    expanded: {},      // { [groupKey]: bool } — 서버 2depth 그룹 펼침
    authItemName: '',
    currentMenuId: '',
    loaded: false,
  }),
  actions: {
    setCurrentMenu(menuId) { this.currentMenuId = menuId || ''; },

    /** rail(상위 카테고리) 로드 — 권한 변경 시 재호출. 실패 시 빈 rail(시스템관리 하드코딩은 유지). */
    async loadRail(authItemName) {
      this.authItemName = authItemName || '';
      try {
        this.rail = railRowsToItems(await fetchRail(this.authItemName));
      } catch {
        this.rail = [];
      } finally {
        this.subtrees = {};
        this.expanded = {};
        this.loaded = true;
      }
      return this.rail;
    },

    /** 앵커 하위트리 lazy 로드(캐시). */
    async ensureSubtree(menuId) {
      if (!menuId || this.subtrees[menuId]) return this.subtrees[menuId];
      try {
        this.subtrees = { ...this.subtrees, [menuId]: subtreeRowsToSubmenu(await fetchSubtree(this.authItemName, menuId)) };
      } catch {
        this.subtrees = { ...this.subtrees, [menuId]: [] };
      }
      return this.subtrees[menuId];
    },

    toggleGroup(groupKey) {
      this.expanded = { ...this.expanded, [groupKey]: !this.expanded[groupKey] };
    },
  },
});
