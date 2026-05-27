// ★ (2026-05-27, dspark): 공통코드(FRM_CODE) 캐시 store. 가이드 04_pinia-stores.md §4 정합.
//   fetchCode envelope 호출은 P4 Step 13 (CCD0020) 진입 시 본격. 현재는 캐시 슬롯만.
import { defineStore } from 'pinia';

export const useCodeStore = defineStore('code', {
  state: () => ({
    codesByKind: {}, // { COMPANY_CD: [...], LOCALE_CD: [...], ... }
  }),
  getters: {
    getCodeName: (s) => (cdKind, cd) => {
      const list = s.codesByKind[cdKind] || [];
      const hit = list.find((x) => x.cd === cd);
      return hit ? hit.cd_nm : '';
    },
  },
  actions: {
    setCodes(cdKind, list) {
      this.codesByKind = { ...this.codesByKind, [cdKind]: list || [] };
    },
    // TODO(P4 Step 13): fetchCode — envelope 호출 FRM_CODE 그룹별 캐싱
  },
});
