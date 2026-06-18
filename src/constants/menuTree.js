// ★ (2026-06-16, dspark): 메뉴 SSOT seed — "동적 메뉴" 대응 구조.
//   사용자 지시(2026-06-16): ① rail 1depth = Figma LNB 11 카테고리(스마트 플레이스 유지),
//   ② h5on 실제 화면을 Figma 카테고리에 매핑, ③ "추후 메뉴는 동적으로 처리" → 하드코딩을
//   MainLayout 템플릿 인라인에 박지 말고 FRM_MENU 로 갈아끼울 수 있는 데이터 스키마로 분리.
//
//   ▶ 데이터 소스 스왑 설계 (정적 seed → 동적 fetch, 화면 코드 무변경):
//     - 현재 : MENU_TREE (본 파일 정적 seed)            → useMenuStore.menuTree
//     - 추후 : normalizeFrmMenuRows(envelope FRM_MENU)  → useMenuStore.menuTree  (동일 shape)
//     MainLayout 은 menuTree 를 "렌더링만" 한다(인라인 literal 제거). 소스가 바뀌어도 레이아웃 불변.
//     (menu.js store 의 fetchMenu TODO 와 연결 — P3 Step 10)
//
//   ▶ 노드 스키마 (FRM_MENU 정합 — 동적 전환 시 컬럼 1:1 매핑):
//     {
//       id,         // 안정 키. 화면이면 h5on 화면코드(RM005), 카테고리/그룹이면 의미 키(operation/appl).  ~ FRM_MENU.MENU_ID/OBJECT_ID
//       label,      // 표시명.                                                                            ~ FRM_MENU.MENU_NM
//       icon,       // 1depth 전용(lnb-*). ICON_REGISTRY 키.
//       routeName,  // insait 라우트명(구현 시). 없으면 null → status:'pending'.
//       legacyUrl,  // h5on 원본 경로(테넌트 WHNN 제거). 추적·매핑 근거.                                 ~ FRM_MENU.MENU_URL
//       status,     // 'active'(라우팅) | 'pending'('준비 중' 토스트).                                    ~ FRM_MENU.USE_YN 등
//       source,     // 'figma'(IA) | 'h5on'(화면) | 'insait-admin'(직접 REST 차선).  추적용.
//       children,   // 하위 노드(2·3depth).                                                              ~ FRM_MENU.UP_MENU_ID 역참조
//     }
//
//   ▶ status 규약: 'active' = onClick3depth 에서 router.push(routeName).  'pending' = ElMessage.info('준비 중').
//
//   ⚠️ TODO(decision) 표기 = 사용자 확정 필요 매핑(아래 본문 주석). 확정 후 갱신.

/** rail 1depth = Figma LNB 11 카테고리 (스마트 플레이스 #1 유지). 순서·아이콘 = Figma 진본. */
export const MENU_TREE = [
  // 1) 스마트 플레이스 — Figma 고유(대시보드). h5on 대응 화면 없음. submenu 미정(빈 트리 유지).
  {
    id: 'place', label: '스마트 플레이스', icon: 'lnb-search', source: 'figma',
    routeName: 'Dashboard', status: 'active', children: [],
  },

  // 2) 인사기획 ← h5on 인사기본{조직관리·구성원관리·인사정보} + h5on{채용}
  {
    id: 'planning', label: '인사기획', icon: 'lnb-people', source: 'figma', children: [
      { id: 'org', label: '조직 관리', source: 'h5on', legacyUrl: null, status: 'pending', children: [
        { id: 'org-info', label: '조직정보', status: 'pending' },
        { id: 'org-chart', label: '조직도', status: 'pending' },
        { id: 'org-restructure', label: '조직 개편', status: 'pending' },
        { id: 'org-history', label: '조직이력', status: 'pending' },
        { id: 'member-history', label: '구성원이력', status: 'pending' },
      ] },
      // h5on 인사기본{구성원관리 + 인사정보} 통합 (인사정보 = 개인 인사기록 → 구성원 관리 산하).
      { id: 'member-mgmt', label: '구성원 관리', source: 'h5on', status: 'pending', children: [] },
      { id: 'recruit', label: '채용 관리', source: 'h5on', status: 'pending', children: [] }, // ← h5on '채용' 모듈(4그룹, 라벨 미수집)
    ],
  },

  // 3) 인사운영 ← h5on 인사기본{발령·근무·휴가·출장 + 신청서 + 전자계약}
  {
    id: 'operation', label: '인사운영', icon: 'lnb-demography', source: 'figma', children: [
      { id: 'attendance', label: '근태관리', source: 'h5on', legacyUrl: null, status: 'pending', children: [
        { id: 'attendance-daily', label: '일일근태', status: 'pending' },
        { id: 'attendance-monthly', label: '월간근태', status: 'pending' },
        { id: 'attendance-overtime', label: '연장근무', status: 'pending' },
      ] },
      { id: 'leave', label: '휴가관리', source: 'h5on', status: 'pending', children: [] },
      { id: 'dispatch', label: '출장관리', source: 'h5on', status: 'pending', children: [] },
      { id: 'order', label: '발령관리', source: 'h5on', status: 'pending', children: [] },
      // ── TODO(decision) #1: 신청서/전자계약 위치 = 인사운영 vs 결재관리.
      //    h5on 은 '인사기본'에 발령/근무/휴가/출장과 함께 둔다 → 운영 클러스터로 본 위치에 배치.
      //    대안: 신청·결재 워크플로우라 '결재관리(approval)' 산하가 더 맞을 수 있음. 확정 시 이동.
      { id: 'appl', label: '신청서', source: 'h5on', status: 'active', children: [
        { id: 'RM001', label: '신청내역',        routeName: null, legacyUrl: '/ssw01_x/RM001',     status: 'pending' },
        { id: 'RM002', label: '결재함',          routeName: null, legacyUrl: '/ssw01_x/RM002',     status: 'pending' },
        { id: 'RM003', label: '신청서 작성',     routeName: null, legacyUrl: '/ssw01_efs_t/RM003', status: 'pending' },
        { id: 'RM004', label: '임시보관함',      routeName: null, legacyUrl: '/ssw01_x/RM004',     status: 'pending' },
        { id: 'RM005', label: '신청서 양식 관리', routeName: null, legacyUrl: '/ssw01_t/RM005',     status: 'pending' },
      ] },
      { id: 'RL', label: '전자계약', source: 'h5on', routeName: null, legacyUrl: '/ssw01_t/RL', status: 'pending', children: [] },
    ],
  },

  // 4) 성과관리 ← h5on{성과평가}
  {
    id: 'performance', label: '성과관리', icon: 'lnb-analytics', source: 'figma', children: [
      { id: 'eval', label: '성과 평가', source: 'h5on', status: 'pending', children: [
        { id: 'eval-mine', label: '나의 평가', status: 'pending' },
        { id: 'eval-manage', label: '평가관리', status: 'pending' },
      ] },
      { id: 'meeting', label: '면담', source: 'h5on', status: 'pending', children: [] },
      { id: 'eval-config', label: '평가설정', source: 'h5on', status: 'pending', children: [] },
    ],
  },

  // 5) 보상관리 ← h5on{보상관리 9그룹}. ── TODO(decision) #3: Figma 3그룹 vs h5on 9그룹.
  //    h5on 이 더 상세하므로 h5on 9그룹을 채택(아래). Figma 깊은 트리는 토큰 복구 후 대조.
  {
    id: 'compensation', label: '보상관리', icon: 'lnb-cases', source: 'figma', children: [
      { id: 'comp-worker',  label: '근로자별 관리', source: 'h5on', status: 'pending', children: [] },
      { id: 'comp-settle',  label: '급여정산',     source: 'h5on', status: 'pending', children: [] },
      { id: 'comp-payroll', label: '급여관리',     source: 'h5on', status: 'pending', children: [] },
      { id: 'comp-income',  label: '근로소득명세', source: 'h5on', status: 'pending', children: [] },
      { id: 'comp-bonus',   label: '성과급관리',   source: 'h5on', status: 'pending', children: [] },
      { id: 'comp-budget',  label: '예산관리',     source: 'h5on', status: 'pending', children: [] },
      { id: 'comp-account', label: '회계정산',     source: 'h5on', status: 'pending', children: [] },
      { id: 'comp-retire',  label: '퇴직금관리',   source: 'h5on', status: 'pending', children: [] },
      { id: 'comp-yearend', label: '연말정산',     source: 'h5on', status: 'pending', children: [] },
    ],
  },

  // 6) 결재관리 — Figma IA. h5on '인사기본.신청서'를 여기로 보낼지는 TODO(decision) #1 참조.
  {
    id: 'approval', label: '결재관리', icon: 'lnb-inventory', source: 'figma', children: [
      { id: 'appr-line', label: '결재선지정', source: 'figma', status: 'pending', children: [
        { id: 'appr-personal', label: '개인결재선', status: 'pending' },
        { id: 'appr-delegate', label: '대리결재선', status: 'pending' },
        { id: 'appr-final',    label: '전결자지정', status: 'pending' },
      ] },
      { id: 'appr-doc',   label: '결재문서', source: 'figma', status: 'pending', children: [] },
      { id: 'appr-inbox', label: '상신함',   source: 'figma', status: 'pending', children: [] },
      { id: 'appr-list',  label: '결재함',   source: 'figma', status: 'pending', children: [] },
    ],
  },

  // 7) 시각화 ← h5on{인사이트}. (이름만 다름, 동일 의미)
  {
    id: 'analytics', label: '시각화', icon: 'lnb-finance', source: 'figma', children: [
      { id: 'vis-headcount', label: '인원통계', source: 'h5on', status: 'pending', children: [] },
      { id: 'VB', label: '업무통계', source: 'h5on', routeName: null, legacyUrl: '/ssw01_t/VB', status: 'pending', children: [] },
      { id: 'VC', label: '비용통계', source: 'h5on', routeName: null, legacyUrl: '/ssw01_t/VC', status: 'pending', children: [] },
      { id: 'VD', label: '인재운영', source: 'h5on', routeName: null, legacyUrl: '/ssw01_t/VD', status: 'pending', children: [] },
    ],
  },

  // 8) 메일 — Figma 고유. h5on 대응 없음.
  {
    id: 'mail', label: '메일', icon: 'lnb-mail', source: 'figma', notificationDot: true, children: [
      { id: 'mail-box', label: '메일함', source: 'figma', status: 'pending', children: [
        { id: 'mail-write',  label: '편지쓰기',   status: 'pending' },
        { id: 'mail-inbox',  label: '받은편지함', status: 'pending' },
        { id: 'mail-sent',   label: '보낸편지함', status: 'pending' },
        { id: 'mail-draft',  label: '임시보관함', status: 'pending' },
        { id: 'mail-spam',   label: '스팸편지함', status: 'pending' },
        { id: 'mail-trash',  label: '휴지통',     status: 'pending' },
      ] },
    ],
  },

  // 9) 설정(시스템관리) — insait 직접 REST 차선(사용자 구현 완료, 환경설정 포함). 기존 라우팅 active.
  //    h5on '시스템관리.시스템설정' 대응 + 그 이상(메타·권한·시스템환경·자료실·환경설정·playground).
  {
    id: 'settings', label: '시스템관리', icon: 'lnb-settings', source: 'insait-admin', children: [
      { id: 'meta', label: '메타관리', status: 'active', children: [
        { id: 'AUT0030', label: '오브젝트 관리', routeName: 'AUT0030', status: 'active' },
        { id: 'IST0030', label: '메시지 관리',   routeName: 'IST0030', status: 'active' },
        { id: 'IST0020', label: '엔터티 관리',   routeName: 'IST0020', status: 'active' },
        { id: 'IST0050', label: '서비스 관리',   routeName: 'IST0050', status: 'active' },
        { id: 'IST0010', label: 'SQL 관리',      routeName: 'IST0010', status: 'active' },
        { id: 'SCR0010', label: '화면 디자이너', routeName: 'SCR0010', status: 'active', source: 'insait-admin' },
      ] },
      { id: 'auth', label: '사용자와 접근제어', status: 'active', children: [
        { id: 'AUT0010', label: '사용자 관리',     routeName: 'AUT0010', status: 'active' },
        { id: 'AUT0050', label: '메뉴 관리',       routeName: 'AUT0050', status: 'active' },
        { id: 'AUT0070', label: '권한기준 관리',   routeName: 'AUT0070', status: 'active' },
        { id: 'AUT0020', label: '사용자그룹 관리', routeName: 'AUT0020', status: 'active' },
        { id: 'AUT0040', label: '권한 관리',       routeName: 'AUT0040', status: 'active' },
        { id: 'AUT0100', label: '외부사용자 관리', routeName: 'AUT0100', status: 'active' },
        { id: 'AUT0060', label: '조직권한 관리',   routeName: 'AUT0060', status: 'active' },
      ] },
      { id: 'sysenv', label: '시스템환경', status: 'active', children: [
        { id: 'CCD0040', label: '인사영역관리',     routeName: 'CCD0040', status: 'active' },
        { id: 'CCD0080', label: '단위업무관리',     routeName: 'CCD0080', status: 'active' },
        { id: 'CCD0010', label: '공통코드관리',     routeName: 'CCD0010', status: 'active' },
        { id: 'CCD0050', label: '옵션관리',         routeName: 'CCD0050', status: 'active' },
        { id: 'CCD0030', label: '레지스트리관리',   routeName: 'CCD0030', status: 'active' },
        { id: 'CCD0220', label: '업무기준설정관리', routeName: 'CCD0220', status: 'active' },
        { id: 'CCD0020', label: '업무기준관리',     routeName: 'CCD0020', status: 'active' },
        { id: 'CCD0070', label: 'MAX값관리',        routeName: 'CCD0070', status: 'active' },
      ] },
      { id: 'pds', label: '자료실', status: 'active', children: [
        { id: 'FRM0090', label: '파일자료실', routeName: 'FRM0090', status: 'active' },
      ] },
      { id: 'env', label: '환경설정', status: 'active', children: [   // ← 사용자 구현 완료
        { id: 'SETTINGS',   label: '테마·환경', routeName: 'SETTINGS',   status: 'active' },
        { id: 'COMPONENTS', label: '컴포넌트',  routeName: 'COMPONENTS', status: 'active' },
      ] },
      { id: 'playground', label: 'Playground (dev)', status: 'active', children: [
        { id: 'DevGridDocs',      label: 'Grid 개발자 매뉴얼', routeName: 'DevGridDocs',      status: 'active' },
        { id: 'DevGridGallery',   label: 'Grid 카탈로그',      routeName: 'DevGridGallery',   status: 'active' },
        { id: 'DevTestGridPage',  label: 'Grid 테스트 페이지', routeName: 'DevTestGridPage',  status: 'active' },
        { id: 'DevSeasonMenuDemo', label: '시즌메뉴 데모',     routeName: 'DevSeasonMenuDemo', status: 'active' },
      ] },
    ],
  },

  // 10) 즐겨찾기 — Figma 고유. (사용자별 동적 — 추후 API)
  {
    id: 'bookmark', label: '즐겨찾기', icon: 'lnb-bookmark-add', source: 'figma', children: [
      { id: 'bookmark-list', label: '즐겨찾기 목록', status: 'pending', children: [] },
    ],
  },

  // 11) 전체보기 — Figma 고유(전체 메뉴 오버레이).
  {
    id: 'bento', label: '전체보기', icon: 'lnb-bento', source: 'figma', children: [
      { id: 'bento-all', label: '전체 메뉴', status: 'pending', children: [] },
    ],
  },
];

// ── TODO(decision) #2: h5on 전용 모듈 — Figma 11 카테고리에 대응 슬롯 없음.
//    rail(=Figma 11 고정)에 억지로 넣지 않고 별도 보류. 확정 시 ① 신규 1depth, ② 기존 산하,
//    ③ 생략 중 선택. (캘린더=단일화면, 인재육성=단일화면으로 보임)
export const H5ON_UNMAPPED = [
  { id: 'calendar', label: '캘린더 (일간/주간)', source: 'h5on', note: 'Figma 대응 카테고리 없음. 단일 화면 추정.' },
  { id: 'talent',   label: '인재육성',          source: 'h5on', note: 'Figma 대응 카테고리 없음. 단일 화면 추정.' },
];

/**
 * 동적 소스 어댑터(미래) — envelope FRM_MENU rows → MENU_TREE 동일 shape 정규화.
 * 지금은 stub. P3 Step 10(menu.js fetchMenu) 에서 구현. 구현되면 useMenuStore 가
 * 정적 MENU_TREE 대신 이 결과를 menuTree 로 사용 → MainLayout 무변경.
 *
 * @param {Array<object>} rows FRM_MENU 평면 행 (MENU_ID/MENU_NM/UP_MENU_ID/MENU_SEQ/OBJECT_ID/MENU_URL/...)
 * @returns {Array<object>} 트리화된 MENU_TREE 동일 shape
 */
export function normalizeFrmMenuRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const byId = new Map();
  rows.forEach((r) => byId.set(r.MENU_ID, {
    id: r.OBJECT_ID || r.MENU_ID,
    label: r.MENU_NM,
    routeName: r.OBJECT_ID || null,        // 화면코드 = insait 라우트명 컨벤션
    legacyUrl: r.MENU_URL || null,
    status: r.OBJECT_ID ? 'active' : 'pending',
    source: 'h5on',
    _up: r.UP_MENU_ID,
    _seq: r.MENU_SEQ ?? 0,
    children: [],
  }));
  const roots = [];
  byId.forEach((node) => {
    const parent = node._up ? byId.get(node._up) : null;
    (parent ? parent.children : roots).push(node);
  });
  const sortRec = (list) => {
    list.sort((a, b) => a._seq - b._seq);
    list.forEach((n) => { delete n._up; delete n._seq; sortRec(n.children); });
    return list;
  };
  return sortRec(roots);
}

// ════════════════════════════════════════════════════════════════════════════
// ★ (2026-06-16, dspark): 동적 LNB — AS-IS envelope 메뉴(AUT0050_00_R06 + GNB0001_00_R01)
//   결과를 InLNBSubmenu items shape 으로 변환. 사용자 지시(2026-06-16): "AS-IS 동일 방식 조회".
//   rail = 서버 권한필터 카테고리, 시스템관리(SYS_ADMIN)는 하드코딩 최하단 고정.
// ════════════════════════════════════════════════════════════════════════════

// AS-IS rail 아이콘코드(icon_default = shape_0N) → Figma LNB 아이콘(ICON_REGISTRY 키) 매핑.
// 운영 동작 우선의 임시 매핑 — 추후 카테고리별 정합 아이콘 확정 대상.
const SHAPE_TO_LNB = {
  shape_01: 'lnb-people', shape_02: 'lnb-demography', shape_03: 'lnb-finance',
  shape_04: 'lnb-bookmark-add', shape_05: 'lnb-analytics', shape_06: 'lnb-cases',
  shape_07: 'lnb-inventory', shape_08: 'lnb-mail',
};

/** AUT0050_00_R06 rail 행 → 1depth 카테고리(submenu 는 lazy, 클릭 시 GNB0001_00_R01 로 채움).
 *  ★ 서버 '시스템관리'(레거시 메뉴)는 제외 — insait 실화면을 가리키는 하드코딩 시스템관리(최하단)로 대체. */
export function railRowsToItems(rows) {
  return (Array.isArray(rows) ? rows : [])
    .filter((r) => (r.menu_nm || '').trim() !== '시스템관리')
    .map((r) => ({
      key: r.menu_id,
      label: r.menu_nm,
      icon: SHAPE_TO_LNB[r.icon_default] || 'lnb-bento',
      objectId: r.object_id || null,
      source: 'h5on',
    }));
}

/**
 * GNB0001_00_R01 하위트리 행(lvl/leaf) → InLNBSubmenu submenu([{key,label,children:[{key,label,objectId}]}]).
 *   lvl1 = 2depth 그룹, lvl2+ = 3depth 리프. lvl1 leaf(자식없음) → 자기 자신을 단일 리프로(클릭 네비).
 */
export function subtreeRowsToSubmenu(rows) {
  const groups = [];
  let cur = null;
  for (const r of (Array.isArray(rows) ? rows : [])) {
    const lvl = Number(r.lvl);
    if (lvl <= 1) {
      cur = { key: r.menu_id, label: r.menu_nm, objectId: r.object_id || null, _leaf: Number(r.leaf) === 1, children: [] };
      groups.push(cur);
    } else if (cur) {
      cur.children.push({ key: r.menu_id, label: r.menu_nm, objectId: r.object_id || null });
    }
  }
  for (const g of groups) {
    if (g._leaf && g.children.length === 0) {
      g.children.push({ key: g.key, label: g.label, objectId: g.objectId });
    }
    delete g._leaf;
  }
  return groups;
}

/** rail 맨 앞 고정 — 스마트 플레이스(대시보드). 업무 카테고리 아님(insait 프레임). */
export const PLACE_ITEM = Object.freeze({ key: 'place', label: '스마트 플레이스', icon: 'lnb-search', submenu: [] });

/** 시스템관리(설정) 하위 화면 OBJECT_ID 집합 — 라우트가 admin 화면인지 판정용. */
export const ADMIN_OBJECT_IDS = new Set([
  'AUT0030', 'IST0030', 'IST0020', 'IST0050', 'IST0010', 'SCR0010',
  'AUT0010', 'AUT0050', 'AUT0070', 'AUT0020', 'AUT0040', 'AUT0100', 'AUT0060',
  'CCD0040', 'CCD0080', 'CCD0010', 'CCD0050', 'CCD0030', 'CCD0220', 'CCD0020', 'CCD0070',
  'FRM0090', 'SETTINGS', 'COMPONENTS',
  'DevGridDocs', 'DevGridGallery', 'DevTestGridPage', 'DevSeasonMenuDemo',
]);

/**
 * 시스템관리 하드코딩 노드(최하단 고정). routeName=OBJECT_ID=라우트명 → onClick3depth 에서 router.push.
 * @param {string} current        현재 route.name (active 표시)
 * @param {object} expanded       { meta, auth, sysenv, pds, env, playground } 펼침 상태
 */
export function buildSettingsItem(current, expanded = {}) {
  const leaf = (key, label) => ({ key, label, active: current === key });
  return {
    key: 'settings', label: '시스템관리', icon: 'lnb-settings',
    submenu: [
      { key: 'meta', label: '메타관리', expanded: !!expanded.meta, children: [
        leaf('AUT0030', '오브젝트 관리'), leaf('IST0030', '메시지 관리'), leaf('IST0020', '엔터티 관리'),
        leaf('IST0050', '서비스 관리'), leaf('IST0010', 'SQL 관리'),
        leaf('SCR0010', '화면 디자이너'),
      ] },
      { key: 'auth', label: '사용자와 접근제어', expanded: !!expanded.auth, children: [
        leaf('AUT0010', '사용자 관리'), leaf('AUT0050', '메뉴 관리'), leaf('AUT0070', '권한기준 관리'),
        leaf('AUT0020', '사용자그룹 관리'), leaf('AUT0040', '권한 관리'), leaf('AUT0100', '외부사용자 관리'),
        leaf('AUT0060', '조직권한 관리'),
      ] },
      { key: 'sysenv', label: '시스템환경', expanded: !!expanded.sysenv, children: [
        leaf('CCD0040', '인사영역관리'), leaf('CCD0080', '단위업무관리'), leaf('CCD0010', '공통코드관리'),
        leaf('CCD0050', '옵션관리'), leaf('CCD0030', '레지스트리관리'), leaf('CCD0220', '업무기준설정관리'),
        leaf('CCD0020', '업무기준관리'), leaf('CCD0070', 'MAX값관리'),
      ] },
      { key: 'pds', label: '자료실', expanded: !!expanded.pds, children: [leaf('FRM0090', '파일자료실')] },
      { key: 'env', label: '환경설정', expanded: !!expanded.env, children: [
        leaf('SETTINGS', '테마·환경'), leaf('COMPONENTS', '컴포넌트'),
      ] },
      { key: 'playground', label: 'Playground (dev)', expanded: !!expanded.playground, children: [
        leaf('DevGridDocs', 'Grid 개발자 매뉴얼'), leaf('DevGridGallery', 'Grid 카탈로그'),
        leaf('DevTestGridPage', 'Grid 테스트 페이지'), leaf('DevSeasonMenuDemo', '시즌메뉴 데모'),
      ] },
    ],
  };
}

// ════════════════════════════════════════════════════════════════════════════
// ★ (2026-06-18, dspark): h5on.com 메뉴 전체 하드코딩 이식 (사용자 지시).
//   https://h5on.com 의 메뉴 트리(hrs_menutree_get · 226행 · 9 최상위 카테고리)를
//   Playwright MCP 로 로그인 후 직접 캡처(2026-06-18) → 1:1 하드코딩.
//   LNB 구성: [상단 = 본 h5on 하드코딩 메뉴] · [구분자 H5ON_DIVIDER] · [하단 = 동적(서버) 메뉴].
//   "일단 메뉴·서브메뉴까지만" → 화면 미연결. 3depth 클릭은 '준비 중'(MainLayout onClick3depth
//   에서 key prefix 'h5on:' 판정). key 는 'h5on:' prefix 로 서버 menu_id·시스템관리 키와 충돌 방지.
//   level1/level0 leaf(자식 없는 노드)는 자기 자신을 단일 3depth 리프로 펼침(subtreeRowsToSubmenu 동일 규약).
//   ⚠️ 추후 동적 전환 시 본 상수 제거하고 서버 메뉴(railRowsToItems/subtreeRowsToSubmenu)로 대체.
// ════════════════════════════════════════════════════════════════════════════

export const H5ON_MENU = [
  { key: 'h5on:R', label: '인사기본', icon: 'lnb-people', groups: [
    { key: 'h5on:RD', label: '조직관리', children: [{ key: 'h5on:RD002', label: '조직도' }, { key: 'h5on:RD003', label: '조직개편' }, { key: 'h5on:RD005', label: '조직장관리' }, { key: 'h5on:RD004', label: '조직히스토리' } ] },
    { key: 'h5on:RB', label: '구성원관리', children: [{ key: 'h5on:RB001', label: '모든구성원' }, { key: 'h5on:RB002', label: '구성원초대' } ] },
    { key: 'h5on:RE', label: '인사정보', children: [{ key: 'h5on:RE001', label: '개별인사정보' }, { key: 'h5on:RE002', label: '전체인사정보' }, { key: 'h5on:RE003', label: '변경내역조회' } ] },
    { key: 'h5on:RM', label: '신청서', children: [{ key: 'h5on:RM001', label: '신청내역' }, { key: 'h5on:RM002', label: '결재함' }, { key: 'h5on:RM003', label: '신청서 작성' }, { key: 'h5on:RM004', label: '임시보관함' }, { key: 'h5on:RM005', label: '신청서 양식 관리' } ] },
    { key: 'h5on:RL', label: '전자계약', children: [{ key: 'h5on:RL', label: '전자계약' } ] },
    { key: 'h5on:RG', label: '발령관리', children: [{ key: 'h5on:RG001', label: '발령등록' }, { key: 'h5on:RG002', label: '발령내역' }, { key: 'h5on:RG003', label: '입사발령' }, { key: 'h5on:RG004', label: '입사내역' } ] },
    { key: 'h5on:RI', label: '근무관리', children: [{ key: 'h5on:RI001', label: '근태현황정보' }, { key: 'h5on:RI002', label: '출퇴근현황관리' }, { key: 'h5on:RI003', label: '출퇴근현황' }, { key: 'h5on:RI005', label: '근무스케줄관리(일/주/월)' }, { key: 'h5on:RI006', label: '근무스케줄(주/월)' }, { key: 'h5on:RI007', label: '근무시간현황관리' }, { key: 'h5on:RI008', label: '근무시간현황' }, { key: 'h5on:RI009', label: '특근현황관리' }, { key: 'h5on:RI011', label: '교대근무등록' }, { key: 'h5on:RI012', label: '교대근무현황관리' }, { key: 'h5on:RI013', label: '교대근무현황' }, { key: 'h5on:RI014', label: '근태 마감' } ] },
    { key: 'h5on:RJ', label: '휴가관리', children: [{ key: 'h5on:RJ001', label: '휴가사용현황관리' }, { key: 'h5on:RJ002', label: '휴가사용현황' }, { key: 'h5on:RJ003', label: '휴가신청내역관리' }, { key: 'h5on:RJ004', label: '연차촉진관리' }, { key: 'h5on:RJ005', label: '연차사용통보' } ] },
    { key: 'h5on:RK', label: '출장관리', children: [{ key: 'h5on:RK001', label: '출장품의' }, { key: 'h5on:RK002', label: '출장내역' }, { key: 'h5on:RK003', label: '외근내역' }, { key: 'h5on:RK004', label: '교통비내역' }, { key: 'h5on:RK005', label: '네이버맵API' } ] },
  ] },
  { key: 'h5on:V', label: '인사이트', icon: 'lnb-analytics', groups: [
    { key: 'h5on:VA', label: '인원통계', children: [{ key: 'h5on:VA001', label: '인원분포' }, { key: 'h5on:VA002', label: '인원변동' } ] },
    { key: 'h5on:VB', label: '업무통계', children: [{ key: 'h5on:VB', label: '업무통계' } ] },
    { key: 'h5on:VC', label: '비용통계', children: [{ key: 'h5on:VC', label: '비용통계' } ] },
    { key: 'h5on:VD', label: '인재운영', children: [{ key: 'h5on:VD', label: '인재운영' } ] },
  ] },
  { key: 'h5on:B', label: '보상관리', icon: 'lnb-cases', groups: [
    { key: 'h5on:BC', label: '근로자별 관리', children: [{ key: 'h5on:BC001', label: '계약관리' }, { key: 'h5on:BC002', label: '임금피크계약관리' }, { key: 'h5on:BC003', label: '용역계약직인건비조회' }, { key: 'h5on:BC004', label: '일용직신청관리' }, { key: 'h5on:BC005', label: '인원현황' } ] },
    { key: 'h5on:BA', label: '급여정산', children: [{ key: 'h5on:BA001', label: '급여생성/마감' }, { key: 'h5on:BA002', label: '급여대상자관리' }, { key: 'h5on:BA004', label: '소급관리' }, { key: 'h5on:BA003', label: '기초원장조회' }, { key: 'h5on:BA008', label: '급여계산' }, { key: 'h5on:BA007', label: '공제내역관리' }, { key: 'h5on:BA006', label: '예외사항관리' }, { key: 'h5on:BA005', label: '압류관리' } ] },
    { key: 'h5on:BB', label: '급여관리', children: [{ key: 'h5on:BB001', label: '급여내역' }, { key: 'h5on:BB002', label: '급여메일발송' }, { key: 'h5on:BB003', label: '급여계좌관리' }, { key: 'h5on:BB004', label: '급여대장조회' }, { key: 'h5on:BB005', label: '급여신고/제출자료' }, { key: 'h5on:BB006', label: '급여결과출력' }, { key: 'h5on:BB007', label: '급여 현황' }, { key: 'h5on:BB008', label: '급여 이체 내역' } ] },
    { key: 'h5on:BG', label: '근로소득명세', children: [{ key: 'h5on:BG001', label: '대상자 관리' }, { key: 'h5on:BG002', label: '정산대상 급여관리' }, { key: 'h5on:BG003', label: '근로소득간이지급명세서' } ] },
    { key: 'h5on:BD', label: '성과급관리', children: [{ key: 'h5on:BD001', label: '성과급산출 기초자료' }, { key: 'h5on:BD002', label: '성과급관리' }, { key: 'h5on:BD003', label: '이연성과급 관리' }, { key: 'h5on:BD004', label: '성과급확인' } ] },
    { key: 'h5on:BE', label: '예산관리', children: [{ key: 'h5on:BE001', label: '인건비 예산관리' }, { key: 'h5on:BE002', label: '예산 집행 집계표' }, { key: 'h5on:BE003', label: '4대보험 예산관리' }, { key: 'h5on:BE004', label: '퇴직충당금 예산관리' }, { key: 'h5on:BE005', label: '연차충당금관리' } ] },
    { key: 'h5on:BF', label: '회계정산', children: [{ key: 'h5on:BF001', label: '급여항목 계정매핑' }, { key: 'h5on:BF002', label: '급여 매출전표' }, { key: 'h5on:BF003', label: 'DC부담금 매출전표' } ] },
    { key: 'h5on:BJ', label: '퇴직금관리', children: [{ key: 'h5on:BJ001', label: '퇴직금계산' }, { key: 'h5on:BJ002', label: '퇴직금 계좌관리' }, { key: 'h5on:BJ003', label: '원천징수영수증' }, { key: 'h5on:BJ004', label: '퇴직소득지급조서' }, { key: 'h5on:BJ005', label: '전근무지퇴직소득' }, { key: 'h5on:BJ006', label: '퇴직연금관리' }, { key: 'h5on:BJ007', label: '퇴직추계관리' }, { key: 'h5on:BJ008', label: '퇴직충당금관리' }, { key: 'h5on:BJ009', label: '예상퇴직금조회' }, { key: 'h5on:BJ010', label: '명예퇴직' } ] },
    { key: 'h5on:BZ', label: '연말정산', children: [{ key: 'h5on:BZ001', label: '연말정산기준관리' }, { key: 'h5on:BZ002', label: '사업장 관리' }, { key: 'h5on:BZ003', label: '법정공제율관리' }, { key: 'h5on:BZ004', label: '연말정산항목관리' }, { key: 'h5on:BZ005', label: '소득공제신청' }, { key: 'h5on:BZ006', label: '소득공제신청서' }, { key: 'h5on:BZ007', label: '소득공제신청서출력' }, { key: 'h5on:BZ008', label: '종전근무지등록' }, { key: 'h5on:BZ009', label: '정산대상급여관리' }, { key: 'h5on:BZ010', label: '추가소득산입' }, { key: 'h5on:BZ011', label: '소득공제내역다운로드' }, { key: 'h5on:BZ012', label: '연말정산계산' }, { key: 'h5on:BZ013', label: '연말정산내역다운로드' }, { key: 'h5on:BZ014', label: '연말정산내역' }, { key: 'h5on:BZ015', label: '국세청전산자료' }, { key: 'h5on:BZ016', label: '원천징수영수증출력' }, { key: 'h5on:BZ017', label: '공제자료오류검증' }, { key: 'h5on:BZ018', label: '원천징수부출력' }, { key: 'h5on:BZ019', label: '의료비지급명세서출력' }, { key: 'h5on:BZ020', label: '기부금명세서출력' }, { key: 'h5on:BZ021', label: '원천징수세액조정관리' } ] },
  ] },
  { key: 'h5on:M', label: '성과평가', icon: 'lnb-finance', groups: [
    { key: 'h5on:MA', label: '성과평가', children: [{ key: 'h5on:MA001', label: '나의평가' }, { key: 'h5on:MA002', label: '평가관리' } ] },
    { key: 'h5on:MB', label: '면담', children: [{ key: 'h5on:MB001', label: '나의면담' }, { key: 'h5on:MB002', label: '면담관리' } ] },
    { key: 'h5on:MC', label: '평가설정', children: [{ key: 'h5on:MC001', label: '평가양식' }, { key: 'h5on:MC002', label: '평가등급' }, { key: 'h5on:MC003', label: '평가지표' }, { key: 'h5on:MC004', label: '평가위원' }, { key: 'h5on:MC005', label: '성과급기준' }, { key: 'h5on:MC006', label: '승진대상자 기준' }, { key: 'h5on:MC007', label: '평가제외대상' } ] },
  ] },
  { key: 'h5on:RI004', label: '캘린더 (일간/주간)', icon: 'calendar', groups: [
    { key: 'h5on:RI004', label: '캘린더 (일간/주간)', children: [{ key: 'h5on:RI004', label: '캘린더 (일간/주간)' } ] },
  ] },
  { key: 'h5on:I', label: '채용', icon: 'lnb-inventory', groups: [
    { key: 'h5on:IA', label: '결재선지정', children: [{ key: 'h5on:IA001', label: '개인결재선' }, { key: 'h5on:IA002', label: '대리결재선' }, { key: 'h5on:IA003', label: '전결자지정' } ] },
    { key: 'h5on:IB', label: '결재선지정', children: [{ key: 'h5on:IB001', label: '공용문서' }, { key: 'h5on:IB002', label: '증명서' }, { key: 'h5on:IB003', label: '계약서' } ] },
    { key: 'h5on:IC', label: '결재선지정', children: [{ key: 'h5on:IC001', label: '상신보관함' }, { key: 'h5on:IC002', label: '임시보관함' }, { key: 'h5on:IC003', label: '수신함' }, { key: 'h5on:IC004', label: '수신상신함' } ] },
    { key: 'h5on:ID', label: '결재선지정', children: [{ key: 'h5on:ID001', label: '미결함' }, { key: 'h5on:ID002', label: '반려함' }, { key: 'h5on:ID003', label: '전결함' }, { key: 'h5on:ID004', label: '기결함' }, { key: 'h5on:ID005', label: '공람함' }, { key: 'h5on:ID006', label: '참조함' } ] },
    { key: 'h5on:TTEFS', label: '템플릿관리', children: [{ key: 'h5on:TTEFS', label: '템플릿관리' } ] },
    { key: 'h5on:TTEFST', label: 'eformsuite_템플릿_등록', children: [{ key: 'h5on:TTEFST', label: 'eformsuite_템플릿_등록' } ] },
    { key: 'h5on:TTEFST1', label: 'eformsuite_템플릿_목록', children: [{ key: 'h5on:TTEFST1', label: 'eformsuite_템플릿_목록' } ] },
  ] },
  { key: 'h5on:O', label: '인재육성', icon: 'lnb-bookmark-add', groups: [
    { key: 'h5on:O', label: '인재육성', children: [{ key: 'h5on:O', label: '인재육성' } ] },
  ] },
  { key: 'h5on:S', label: '환경설정', icon: 'lnb-settings', groups: [
    { key: 'h5on:SA', label: '화면설정', children: [{ key: 'h5on:SA', label: '화면설정' } ] },
    { key: 'h5on:SB', label: '내 설정', children: [{ key: 'h5on:SB001', label: '내 로그인 정보' }, { key: 'h5on:SB002', label: '내 입사 정보' } ] },
    { key: 'h5on:SC', label: '회사 정보 관리', children: [{ key: 'h5on:SC', label: '회사 정보 관리' } ] },
    { key: 'h5on:SD', label: '로그인관리', children: [{ key: 'h5on:SD', label: '로그인관리' } ] },
    { key: 'h5on:SE', label: '인사정보 관리', children: [{ key: 'h5on:SE', label: '인사정보 관리' } ] },
    { key: 'h5on:SF', label: '초대 관리', children: [{ key: 'h5on:SF', label: '초대 관리' } ] },
    { key: 'h5on:SG', label: '권한관리', children: [{ key: 'h5on:SG', label: '권한관리' } ] },
    { key: 'h5on:SH', label: '결제관리', children: [{ key: 'h5on:SH', label: '결제관리' } ] },
    { key: 'h5on:SI', label: '연동관리', children: [{ key: 'h5on:SI', label: '연동관리' } ] },
    { key: 'h5on:SJ', label: '인사 관리', children: [{ key: 'h5on:SJ002', label: '근로계약 기준' }, { key: 'h5on:SJ004', label: '승진 기준' }, { key: 'h5on:SJ005', label: '휴가 기준' }, { key: 'h5on:SJ006', label: '근태 기준' }, { key: 'h5on:SJ007', label: '근무 기준' }, { key: 'h5on:SJ008', label: '출장 기준' }, { key: 'h5on:SJ009', label: '임원 및 노조' } ] },
    { key: 'h5on:SK', label: '성과 관리', children: [{ key: 'h5on:SK', label: '성과 관리' } ] },
    { key: 'h5on:SL', label: '보상관리', children: [{ key: 'h5on:SL001', label: '급여 대상자 기준' }, { key: 'h5on:SL002', label: '급여 계산 기준' }, { key: 'h5on:SL003', label: '급여 업무 기준' }, { key: 'h5on:SL004', label: '일할계산 지급기준' }, { key: 'h5on:SL005', label: '간이세액표 기준' }, { key: 'h5on:SL006', label: '급여 수식 기준' }, { key: 'h5on:SL007', label: '예산 기준' }, { key: 'h5on:SL008', label: '지급명세 기준' }, { key: 'h5on:SL009', label: '퇴직금 기준' } ] },
    { key: 'h5on:SM', label: '발령관리', children: [{ key: 'h5on:SM001', label: '발령기준관리' }, { key: 'h5on:SM002', label: '승진발령기준' } ] },
    { key: 'h5on:SN', label: '휴가관리', children: [{ key: 'h5on:SN001', label: '휴가기준관리' }, { key: 'h5on:SN002', label: '연차기준관리' }, { key: 'h5on:SN003', label: '연차사용촉진설정' } ] },
    { key: 'h5on:SO', label: '근무관리', children: [{ key: 'h5on:SO001', label: '근무세부코드' }, { key: 'h5on:SO002', label: '근무그룹생성' }, { key: 'h5on:SO003', label: '출퇴근체크방식설정' }, { key: 'h5on:SO005', label: '회사휴일관리' }, { key: 'h5on:SO006', label: '교대근무기준관리' } ] },
    { key: 'h5on:SP', label: '관리자', children: [{ key: 'h5on:SP001', label: '인사잇 소식 관리' } ] },
  ] },
  { key: 'h5on:WINSYS', label: '시스템관리', icon: 'lnb-bento', groups: [
    { key: 'h5on:WINSYSA', label: '시스템설정', children: [{ key: 'h5on:WINSYSA002', label: '파일업로드' }, { key: 'h5on:WINSYSA003', label: '암복호화 테스트' }, { key: 'h5on:WINSYSA004', label: '구글otp 테스트' } ] },
  ] },
];

/** LNB rail 구분자 — 상단 h5on 하드코딩 메뉴와 하단 동적 메뉴 시각 분리. (InLNBSubmenu/InLNB 가 divider 렌더) */
export const H5ON_DIVIDER = Object.freeze({ key: 'h5on:__divider', divider: true });

/**
 * H5ON_MENU(raw) → InLNBSubmenu items shape. expanded = { [groupKey]: bool } 펼침 상태 주입.
 * @param {object} expanded  2depth 그룹 펼침 맵 (MainLayout h5onExpanded ref)
 */
export function buildH5onItems(expanded = {}) {
  return H5ON_MENU.map((cat) => ({
    key: cat.key,
    label: cat.label,
    icon: cat.icon,
    submenu: cat.groups.map((g) => ({
      key: g.key,
      label: g.label,
      expanded: !!expanded[g.key],
      children: g.children.map((c) => ({ key: c.key, label: c.label })),
    })),
  }));
}
