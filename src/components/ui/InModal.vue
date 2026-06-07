<script>
// ★ (2026-06-07, dspark): 모듈 스코프 — 모든 InModal 인스턴스가 공유하는 "열린 모달 스택".
//   (1) ESC 가 최상단(마지막에 열린) 모달만 닫도록 하여, drawer 위에 confirm 이 떠 있을 때
//       ESC 한 번에 둘 다 닫히던 문제 방지. (2) body 스크롤 잠금을 refcount — 스택이 비어야 해제.
const openModalStack = [];
let modalSeq = 0;
</script>

<script setup>
import { computed, nextTick, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import CloseIcon from '@/assets/icons/close.svg';

/**
 * InModal — W4 패턴 재사용 모달 (Figma 미정의 — atomic 조합, TBD)
 *
 * 출처: design-system/v2/src/components/ui/InModal.vue (Plain JS 변환)
 *
 * type:
 *   - confirm: 작은 너비 + 메시지 + 2 버튼 (확인/취소)
 *   - form:    중간 너비 + 슬롯 내용 + 액션 슬롯
 *   - detail:  큰 너비 + 슬롯 내용 + 닫기 버튼
 *
 * 시각: overlay rgba(0,0,0,0.5) + center + InCard 스타일 (radius sm + shadow elev-3)
 * 헤더: 제목 + close icon (Figma close.svg)
 * 바디: slot
 * 푸터: slot (form/detail) 또는 자동 (confirm)
 *
 * W6 #3 — focus trap (Tab cycle + ESC + restore previous focus)
 *
 * NATIVE 구현 — el-dialog 미사용. <Teleport to="body"> + 자체 focus trap.
 */

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  type: {
    type: String,
    default: 'confirm',
    validator: (v) => ['confirm', 'form', 'detail'].includes(v),
  },
  title: { type: String, default: '확인' },
  message: { type: String, default: '' },
  confirmText: { type: String, default: '확인' },
  cancelText: { type: String, default: '취소' },
  width: { type: Number, default: 0 },
  closeOnOverlay: { type: Boolean, default: true },
  showClose: { type: Boolean, default: true },
});

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel', 'close']);

const widthPx = computed(() => {
  if (props.width) return props.width;
  if (props.type === 'confirm') return 360;
  if (props.type === 'form') return 480;
  return 720;
});

function close() {
  emit('update:modelValue', false);
  emit('close');
}

function onOverlay() {
  if (props.closeOnOverlay) close();
}

function onConfirm() {
  emit('confirm');
  emit('update:modelValue', false);
}

function onCancel() {
  emit('cancel');
  emit('update:modelValue', false);
}

// W6 #3 — focus trap (Tab cycle + ESC + restore previous focus)
const modalEl = ref(null);
let previouslyFocused = null;
const modalId = ++modalSeq;   // ★ (2026-06-07, dspark): 인스턴스 식별자 — ESC 스택 최상단 판별용

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusable() {
  if (!modalEl.value) return [];
  return Array.from(modalEl.value.querySelectorAll(FOCUSABLE_SELECTOR))
    .filter((el) => !el.hasAttribute('aria-hidden') && el.offsetParent !== null);
}

function trapTab(e) {
  const list = getFocusable();
  if (list.length === 0) {
    e.preventDefault();
    return;
  }
  const first = list[0];
  const last = list[list.length - 1];
  const active = document.activeElement;
  if (e.shiftKey) {
    if (active === first || !modalEl.value?.contains(active)) {
      e.preventDefault();
      last.focus();
    }
  } else {
    if (active === last || !modalEl.value?.contains(active)) {
      e.preventDefault();
      first.focus();
    }
  }
}

function onKeydown(e) {
  if (!props.modelValue) return;
  // ★ (2026-06-07, dspark): 최상단 모달만 키 처리 — 하위(스택 아래) 모달은 ESC/Tab 양보.
  if (openModalStack.length && openModalStack[openModalStack.length - 1] !== modalId) return;
  if (e.key === 'Escape') {
    close();
  } else if (e.key === 'Tab') {
    trapTab(e);
  }
}

// ★ (2026-06-07, dspark): 스크롤 잠금 + 포커스 트랩 진입/복원을 watch 단독이 아니라 헬퍼로 분리.
//   기존 watch(no immediate) 의 두 결함을 교정: (1) v-if 로 modelValue=true 인 채 '마운트되며
//   열리는' 일반 패턴(예: EntityCatalog 삭제 confirm)에서 스크롤 잠금·초기 포커스가 전혀 안 걸림,
//   (2) 열린 채 unmount(부모 v-if off) 되면 false 분기가 안 돌아 body 스크롤이 잠긴 채 남고
//   포커스도 복원 안 됨. 스택 refcount 로 다중 모달 스크롤 잠금도 정합.
function lockAndFocus() {
  if (typeof document === 'undefined') return;
  document.body.style.overflow = 'hidden';
  if (!openModalStack.includes(modalId)) openModalStack.push(modalId);
  previouslyFocused = document.activeElement ?? null;
  nextTick(() => {
    const list = getFocusable();
    if (list.length > 0) list[0].focus();
    else modalEl.value?.focus();
  });
}

function unlockAndRestore() {
  if (typeof document === 'undefined') return;
  const idx = openModalStack.indexOf(modalId);
  if (idx >= 0) openModalStack.splice(idx, 1);
  if (openModalStack.length === 0) document.body.style.overflow = '';   // 다른 모달 없을 때만 해제
  if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus();
  previouslyFocused = null;
}

watch(() => props.modelValue, (v) => {
  if (v) lockAndFocus();
  else unlockAndRestore();
});

onMounted(() => {
  if (typeof window !== 'undefined') window.addEventListener('keydown', onKeydown);
  if (props.modelValue) lockAndFocus();    // open-on-mount (v-if 패턴) 대응
});
onBeforeUnmount(() => {
  if (typeof window !== 'undefined') window.removeEventListener('keydown', onKeydown);
  if (openModalStack.includes(modalId)) unlockAndRestore();   // 열린 채 unmount 시 정리
});
</script>

<template>
  <Teleport to="body">
    <Transition name="in-modal-fade">
      <div v-if="modelValue" class="in-modal__overlay" @click.self="onOverlay">
        <div
          ref="modalEl"
          class="in-modal"
          :class="`in-modal--${type}`"
          :style="{ width: widthPx + 'px' }"
          role="dialog"
          aria-modal="true"
          tabindex="-1"
        >
          <header class="in-modal__head">
            <h2 class="in-modal__title">{{ title }}</h2>
            <button v-if="showClose" type="button" class="in-modal__close" aria-label="닫기" @click="close">
              <img :src="CloseIcon" alt="" />
            </button>
          </header>

          <div class="in-modal__body">
            <p v-if="type === 'confirm' && message" class="in-modal__message">{{ message }}</p>
            <slot />
          </div>

          <footer v-if="type === 'confirm' || $slots.footer" class="in-modal__foot">
            <slot name="footer">
              <button type="button" class="in-modal__btn in-modal__btn--default" @click="onCancel">{{ cancelText }}</button>
              <button type="button" class="in-modal__btn in-modal__btn--primary" @click="onConfirm">{{ confirmText }}</button>
            </slot>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.in-modal__overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--in-z-modal);
}

.in-modal {
  background: var(--in-surface-white);
  border-radius: var(--in-radius-sm);
  box-shadow: var(--in-shadow-elev-3);
  display: flex;
  flex-direction: column;
  max-height: 86vh;
  font-family: var(--in-font-family-body);
}

.in-modal__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--in-border-default);
}

.in-modal__title {
  margin: 0;
  font-size: var(--in-font-size-lg);
  line-height: var(--in-line-height-lg);
  font-weight: var(--in-font-weight-medium);
  color: var(--in-text-accent);
}

.in-modal__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
}
.in-modal__close > img { width: 16px; height: 16px; display: block; }

.in-modal__body {
  padding: 20px;
  overflow-y: auto;
  flex: 1 1 auto;
}

.in-modal__message {
  margin: 0;
  font-size: var(--in-font-size-md);
  line-height: var(--in-line-height-md);
  color: var(--in-text-default);
}

.in-modal__foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px 16px 20px;
  border-top: 1px solid var(--in-border-default);
}

.in-modal__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 80px;
  height: 33px;
  padding: 0 16px;
  border-radius: var(--in-radius-xs);
  cursor: pointer;
  font-size: var(--in-font-size-md);
  font-weight: var(--in-font-weight-medium);
  border: 1px solid transparent;
}

.in-modal__btn--default {
  background: var(--in-bg-white);
  color: var(--in-text-default);
  border-color: var(--in-border-default);
}
.in-modal__btn--default:hover {
  border-color: var(--in-border-input);
  color: var(--in-text-accent);
}

.in-modal__btn--primary {
  background: var(--in-bg-brand);
  color: var(--in-text-white);
  border-color: var(--in-bg-brand);
}
.in-modal__btn--primary:hover {
  background: var(--in-bg-state-hover);
  border-color: var(--in-bg-state-hover);
}

/* Transition */
.in-modal-fade-enter-active,
.in-modal-fade-leave-active {
  transition: opacity 150ms ease;
}
.in-modal-fade-enter-from,
.in-modal-fade-leave-to {
  opacity: 0;
}

/* ★ (2026-06-03, dspark): type="detail" 은 우측 슬라이드 Drawer 시각 — overlay 우측 정렬 + 풀 height + slide-in transition.
   detail 모달이 일반 중앙 팝업이 아니라 IBSheet 운영 시기의 상세 패널 UX 정합. */
.in-modal__overlay:has(.in-modal--detail) { justify-content: flex-end; align-items: stretch; }
.in-modal--detail {
  max-height: none;
  height: 100vh;
  border-radius: 0;
  box-shadow: var(--in-shadow-elev-3);
}
.in-modal-fade-enter-active:has(.in-modal--detail),
.in-modal-fade-leave-active:has(.in-modal--detail) {
  transition: opacity 200ms ease;
}
.in-modal-fade-enter-active:has(.in-modal--detail) .in-modal--detail,
.in-modal-fade-leave-active:has(.in-modal--detail) .in-modal--detail {
  transition: transform 220ms cubic-bezier(.2,.7,.2,1);
}
.in-modal-fade-enter-from:has(.in-modal--detail) .in-modal--detail,
.in-modal-fade-leave-to:has(.in-modal--detail) .in-modal--detail {
  transform: translateX(100%);
}
</style>
