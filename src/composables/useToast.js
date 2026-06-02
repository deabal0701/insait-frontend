// ★ (2026-06-02, dspark): InToast 기반 명령형 toast 서비스 — element-plus ElMessage 대체.
//   ElMessage 처럼 어디서든 toast.success('...') 호출하면 화면 우상단에 InToast 가 뜨고
//   자동으로 사라진다(스택·자동 dismiss·닫기). 시각은 디자인시스템 InToast(Figma Toast-Wrap) 사용.
//   렌더는 App.vue 에 1회 마운트된 InToastHost 가 담당 — 본 모듈의 reactive 큐를 구독.
//
//   사용: const toast = useToast(); toast.warning('저장할 항목이 없습니다');
//   매핑: ElMessage.success/warning/error → toast.success/warning/error,
//        ElMessage.info → toast.info (InToast 의 'enabled' brand 스타일)
import { reactive } from 'vue';

// 앱 전역 단일 큐 (모듈 싱글톤). InToastHost 가 이 배열을 v-for 로 렌더.
const state = reactive({ toasts: [] });
let seq = 0;

/** 토스트 1건 추가. duration(ms) 후 자동 제거(0 이면 수동 닫기만). 반환 = id. */
function push(status, message, opts = {}) {
  const id = ++seq;
  const duration = opts.duration ?? 3000;
  state.toasts.push({ id, status, message: String(message ?? ''), closable: opts.closable !== false });
  if (duration > 0) setTimeout(() => remove(id), duration);
  return id;
}

function remove(id) {
  const i = state.toasts.findIndex((t) => t.id === id);
  if (i >= 0) state.toasts.splice(i, 1);
}

/** InToastHost 전용 — 렌더할 큐 구독. */
export function useToastState() {
  return state;
}

/** 컴포넌트/composable 에서 호출하는 명령형 API (ElMessage 대체). */
export function useToast() {
  return {
    success: (message, opts) => push('success', message, opts),
    warning: (message, opts) => push('warning', message, opts),
    error: (message, opts) => push('error', message, opts),
    info: (message, opts) => push('enabled', message, opts), // InToast 에 'info' 없음 → brand 'enabled'
    remove,
  };
}
