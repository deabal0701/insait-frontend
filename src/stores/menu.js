// ★ (2026-05-27, dspark): FRM_MENU 캐시 store. 가이드 04_pinia-stores.md §3 정합.
//   fetchMenu envelope 호출은 P3 Step 10 에서 본격. 현재는 골격 + currentMenuId 만.
import { defineStore } from 'pinia';

export const useMenuStore = defineStore('menu', {
  state: () => ({
    menuList: [],
    menuTree: [],
    currentMenuId: '',
    loaded: false,
  }),
  actions: {
    setCurrentMenu(menuId) {
      this.currentMenuId = menuId || '';
    },
    // TODO(P3 Step 10): fetchMenu — envelope 호출 FRM_MENU 트리 캐싱
  },
});
