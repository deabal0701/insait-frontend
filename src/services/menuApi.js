// ★ (2026-06-16, dspark): 동적 LNB — AS-IS 메뉴 로딩 방식 그대로 envelope 호출.
//   AS-IS 참조: header.jsp(AUT0050_00_R06 = rail/상위GNB) + gnb.jsp(GNB0001_00_R01 = 앵커별 하위트리).
//   신규 백엔드 0 — 보존된 /serviceBroker.h5 + 메타 SQL(MultiQueryCommand) 재사용.
//   권한 필터 = auth_item (우측상단 권한 콤보) → AS-IS 와 동일하게 "권한 바꾸면 메뉴 바뀜".
import http from '@/services/http';
import { buildEnvelope, buildBodyMulti, parseResponse } from '@/services/envelope';
import { useAuthStore } from '@/stores/auth';

/**
 * rail(상위 GNB 카테고리) 조회 — AUT0050_00_R06.
 *   AS-IS header.jsp:128 정합 (emp_id, session_company_cd, auth_item, lang_cd, max_cnt).
 * @param {string} authItemName  권한항목명 (예: ACCESS_ADMIN_GROUP). 빈값이면 기본 권한.
 * @returns {Promise<Array>} [{ menu_id, menu_nm, object_id, icon_default, seq_order, ... }]
 */
export async function fetchRail(authItemName) {
  const auth = useAuthStore();
  const localeCd = (localStorage.getItem('insait.locale') || 'KO').toUpperCase();
  const body = buildBodyMulti({
    ME_AUT0050_01: [{
      emp_id: auth.empId,
      session_company_cd: auth.companyCd,
      company_cd: auth.companyCd,
      auth_item: authItemName || '',
      lang_cd: localeCd,
      max_cnt: '8',
    }],
  });
  const resp = await http.post('/serviceBroker.h5', buildEnvelope('AUT0050_00_R06', body));
  return parseResponse(resp, 'ME_AUT0050_02');
}

/**
 * 앵커(gnb_menu_id) 하위 트리 조회 — GNB0001_00_R01.
 *   AS-IS gnb.jsp:60 정합 (company_cd, user_id, auth_item_nm, gnb_menu_id).
 *   응답 행에 lvl(레벨)·leaf(0=부모/1=리프)·parent_menu_id·object_id 가 서버에서 계산돼 옴.
 * @param {string} authItemName  권한항목명
 * @param {string} gnbMenuId     앵커 메뉴ID (rail 의 menu_id)
 * @returns {Promise<Array>} ME_GNB0001_02 행들 (lvl/leaf 포함)
 */
export async function fetchSubtree(authItemName, gnbMenuId) {
  const auth = useAuthStore();
  const body = buildBodyMulti({
    ME_GNB0001_01: [{
      company_cd: auth.companyCd,
      user_id: auth.userId,
      auth_item_nm: authItemName || '',
      gnb_menu_id: gnbMenuId,
    }],
  });
  const resp = await http.post('/serviceBroker.h5', buildEnvelope('GNB0001_00_R01', body));
  return parseResponse(resp, 'ME_GNB0001_02');
}
