// ★ (2026-06-01, dspark): entity 그리드 표준 저장 흐름 composable.
//   가이드 06b_ibsheet-conversion-blueprint.md §3 (갭 A — IBSheet sStatus/_seq 프로토콜) 정합.
//   IBSheet 가 자동으로 하던 "row 단위 dirty 추적 + 변경분만 batch 저장" 을 표준화한다.
//   모든 entity(저장) 화면이 동일 패턴 1개만 쓰도록 고정 — 화면마다 dirty 추출/envelope 조립을
//   재작성하지 않는다. tui-grid native API 는 그대로(InDataTable.getInstance()) 사용.
//
//   흐름: retrieve(조회) → 사용자 편집(tui-grid) → save(getModifiedRows → extractDirtyForEnvelope
//         → /serviceBroker.h5 S-service POST → 성공 시 dirty clear + 재조회).
//
// ★ (2026-06-02, dspark): [옵션 1 — 단일 창구 통합] 이후 본 composable 은 INTERNAL 부품으로 격하.
//   화면(페이지)은 더 이상 useEntityGrid 를 직접 import 하지 않는다 — InDataTable 이 service props
//   (retrieveServiceId/saveServiceId/...) 를 받아 본 composable 을 내부에서 사용하고, gridRef.retrieve()
//   / gridRef.save() 로 노출한다. 따라서 신규 화면은 InDataTable 하나만 쓰면 된다.
//   (직접 import 는 InDataTable 밖에서 그리드를 조작해야 하는 드문 고급/테스트 케이스에만.)
import { ref } from 'vue';
import { useService } from '@/composables/useService';
import { parseResponse } from '@/services/envelope';
import { extractDirtyForEnvelope } from '@/utils/grid';

/**
 * @param {object} config
 * @param {string}  config.retrieveServiceId - 조회 serviceId (예: 'ORM9999_01_R01')
 * @param {string}  config.saveServiceId     - 저장 serviceId (예: 'ORM9999_01_S01')
 * @param {string}  config.slot              - BODY 메시지 슬롯명 (조회·저장 공통)
 * @param {string}  [config.retrieveSlot]    - 조회 응답 슬롯명 (slot 과 다를 때)
 * @param {string}  [config.saveSlot]        - 저장 요청 슬롯명 (slot 과 다를 때)
 * @param {object}  config.gridRef           - InDataTable 컴포넌트 ref (getInstance 노출) 또는 grid 인스턴스
 * @param {string}  [config.statusKey='sStatus'] - 상태 컬럼명 (백엔드 계약)
 * @param {boolean} [config.softDelete=false]    - 삭제를 sStatus='U' + sDelete='Y' 로 송신
 * @param {boolean} [config.reloadAfterSave=true] - 저장 성공 후 자동 재조회
 * @param {object}  [config.header]              - HEADER 옵션 ({ objectId, actionType, companyCd, localeCd }).
 *                                                  serviceId 접두와 objectId 가 다른 서비스(예: INT_*_S01 / objectId=ORM9999) 필수
 */
export function useEntityGrid(config = {}) {
  const {
    retrieveServiceId,
    saveServiceId,
    slot,
    retrieveSlot,
    saveSlot,
    gridRef,
    statusKey = 'sStatus',
    softDelete = false,
    reloadAfterSave = true,
    header = {},
  } = config;

  const { call, loading, error } = useService();
  const rows = ref([]);
  const dirtyCount = ref(0);
  // ★ (2026-06-02, dspark): 직전 조회 body 기억. 저장 후 자동 재조회가 빈 {} 를 보내면
  //   MultiQuery 의 검색 IN 메시지(queryParamMessage)가 null → NPE(AbsBusinessCommand:178)
  //   발생. "저장 후엔 방금 본 그 조회를 다시" 하도록 마지막 retrieve body 를 재사용한다.
  let lastRetrieveBody = {};

  /** gridRef(컴포넌트 ref | 인스턴스 | ref(인스턴스)) → tui-grid 인스턴스 해석. */
  function grid() {
    const c = gridRef && (gridRef.value !== undefined ? gridRef.value : gridRef);
    if (!c) return null;
    return typeof c.getInstance === 'function' ? c.getInstance() : c;
  }

  /** 조회 — 응답 슬롯을 rows 에 반영하고 반환. body 는 자동 재조회용으로 기억. */
  async function retrieve(body = {}, options = {}) {
    lastRetrieveBody = body || {};
    const resp = await call(retrieveServiceId, lastRetrieveBody, { ...header, ...options });
    rows.value = parseResponse(resp, retrieveSlot || slot);
    return rows.value;
  }

  /** 현재 그리드의 변경분(I/U/D)을 envelope BODY row 배열로 추출 (저장 전 미리보기용). */
  function collectDirty() {
    const g = grid();
    if (!g || typeof g.getModifiedRows !== 'function') return [];
    // ★ (2026-06-01, dspark): 편집 중인 셀을 강제 커밋. Enter/blur 없이 저장 버튼을 바로
    //   누르면 in-progress 편집이 getModifiedRows() 에 반영 안 돼 변경이 누락됨(빈 배열).
    try { g.finishEditing?.(); } catch (_) { /* 편집 중 아님 */ }
    return extractDirtyForEnvelope(g.getModifiedRows(), { statusKey, softDelete });
  }

  /**
   * 저장 — 변경분만 batch POST. 변경 0건이면 호출 생략.
   * @param {object} [opts]
   * @param {object|null} [opts.reloadBody] - 저장 후 재조회 body. null 이면 재조회 생략
   * @returns {Promise<{skipped:boolean, dirty:Array, response?:object}>}
   */
  async function save(opts = {}) {
    const dirty = collectDirty();
    dirtyCount.value = dirty.length;
    if (!dirty.length) return { skipped: true, dirty: [] };

    const response = await call(saveServiceId, { [saveSlot || slot]: dirty }, { ...header });

    const g = grid();
    if (g && typeof g.clearModifiedData === 'function') g.clearModifiedData();
    if (reloadAfterSave && opts.reloadBody !== null) {
      // ★ (2026-06-02, dspark): reloadBody 미지정 시 직전 조회 body 재사용 (빈 {} → NPE 회피).
      await retrieve(opts.reloadBody || lastRetrieveBody);
    }
    return { skipped: false, dirty, response };
  }

  return { rows, retrieve, save, collectDirty, loading, error, dirtyCount };
}
