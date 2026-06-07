/**
 * useMetaEditor — 04-admin-lane 메타 카탈로그 편집 상태기계 + 저장/삭제 orchestration.
 * ★ (2026-06-05, dspark): IST0010·IST0030 인라인 편집에서 공통 추출 (99 backlog #8).
 *   부모+자식 단일 호출 + rowStatus(I/U/D) 프로토콜(00_architecture §3-A)의 프론트 측 공통부.
 *
 * 도메인별 차이는 옵션으로 주입:
 *   - api        : adminApi.meta.{domain} (list/detail/create/update/remove/exists)
 *   - keyField   : 업무키 컬럼명 (예: 'queryName' / 'msgDefId') — detail/update/remove 키
 *   - expand     : 상세 조회 expand 배열
 *   - blankForm(): 신규용 빈 폼
 *   - toForm(detail): 상세 → 편집 폼 (자식행에 rowStatus:'' 부여)
 *   - toPayload(form): 폼 → 저장 payload ({def, ...})
 *   - validate(form): 저장 전 검증. false 반환 시 중단(토스트는 호출측 책임)
 *   - defaultTab : 보기/수정 진입 탭. createTab(선택) : 신규 진입 탭
 *   - reload()   : 저장/삭제 후 목록 재조회
 *
 * 반환 상태/액션을 페이지가 MetaDetailEditor 에 바인딩한다.
 */
import { computed, ref } from 'vue';
import { useToast } from '@/composables/useToast';

export function adminErrMsg(e) {
  return e?.response?.data?.error?.message || e?.message || '요청 실패';
}

export function useMetaEditor(opts) {
  const {
    api, keyField, expand, blankForm, toForm, toPayload,
    validate, defaultTab = 'def', createTab, reload,
    domainLabel = '항목',   // ★ (2026-06-05) modalTitle 공통화용 도메인 라벨 (예: 'SQL'·'메시지')
  } = opts;

  const toast = useToast();

  const mode = ref('');            // '' 닫힘 | 'view' | 'create' | 'edit'
  const selected = ref(null);      // 목록 행 또는 저장 결과 def (keyField 보유)
  const detail = ref(null);
  const detailLoading = ref(false);
  const drawerTab = ref(defaultTab);
  const saving = ref(false);
  const confirmDelete = ref(false);
  const form = ref(blankForm());

  const isEditing = computed(() => mode.value === 'create' || mode.value === 'edit');
  const keyOf = (row) => (row ? row[keyField] : undefined);

  // ★ (2026-06-05) modalTitle 공통화 — 5개 카탈로그 동일 패턴 흡수. domainLabel + 업무키.
  const modalTitle = computed(() => {
    if (mode.value === 'create') return `${domainLabel} 신규 등록`;
    const k = keyOf(selected.value) ?? '';
    return mode.value === 'edit' ? `${domainLabel} 수정 — ${k}` : `${domainLabel} 상세 — ${k}`;
  });

  async function openDetail(row) {
    selected.value = row;
    detail.value = null;
    mode.value = 'view';
    drawerTab.value = defaultTab;
    detailLoading.value = true;
    try {
      detail.value = await api.detail(keyOf(row), { expand });
    } catch (e) {
      toast.error?.(adminErrMsg(e));
    } finally {
      detailLoading.value = false;
    }
  }

  function openCreate() {
    selected.value = null;
    detail.value = null;
    form.value = blankForm();
    drawerTab.value = createTab || defaultTab;
    mode.value = 'create';
  }

  function enterEdit() {
    if (!detail.value) return;
    form.value = toForm(detail.value);
    drawerTab.value = defaultTab;
    mode.value = 'edit';
  }

  function cancelEdit() {
    if (mode.value === 'edit') {
      mode.value = 'view';           // 폼 폐기, 보기 복귀 (detail 유지)
      drawerTab.value = defaultTab;
    } else {
      closePanel();                  // create 취소 → 닫기
    }
  }

  function closePanel() {
    mode.value = '';
    selected.value = null;
    detail.value = null;
  }

  async function save() {
    if (saving.value) return;   // ★ (2026-06-07, dspark): 재진입(엔터+버튼 중복 제출) 가드 — 중복 생성 방지
    if (validate && !validate(form.value, { mode: mode.value, setTab: (t) => { drawerTab.value = t; } })) return;
    saving.value = true;
    try {
      const payload = toPayload(form.value);
      let saved;
      if (mode.value === 'create') {
        saved = await api.create(payload);
        toast.success?.('등록되었습니다.');
      } else {
        saved = await api.update(keyOf(selected.value), payload);
        toast.success?.('수정되었습니다.');
      }
      if (reload) await reload();
      // ★ (2026-06-07, dspark): api 응답이 {def,...} 가 아닐 수 있어 방어 — selected/detail 오염 방지
      selected.value = saved?.def ?? saved ?? selected.value;
      detail.value = saved ?? detail.value;
      mode.value = 'view';
      drawerTab.value = defaultTab;
    } catch (e) {
      toast.error?.(adminErrMsg(e));
    } finally {
      saving.value = false;
    }
  }

  async function doDelete() {
    if (saving.value) return;   // ★ (2026-06-07, dspark): 재진입 가드
    saving.value = true;
    try {
      await api.remove(keyOf(selected.value));
      toast.success?.('삭제되었습니다.');
      confirmDelete.value = false;
      closePanel();
      if (reload) await reload();
    } catch (e) {
      confirmDelete.value = false;
      toast.error?.(adminErrMsg(e));
    } finally {
      saving.value = false;
    }
  }

  return {
    mode, selected, detail, detailLoading, drawerTab, saving, confirmDelete, form, isEditing,
    modalTitle,
    openDetail, openCreate, enterEdit, cancelEdit, closePanel, save, doDelete,
  };
}
