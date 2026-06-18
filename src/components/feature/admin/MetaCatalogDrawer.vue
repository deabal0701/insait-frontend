<script setup>
/**
 * MetaCatalogDrawer — 메타 카탈로그 편집 Drawer 스캐폴드 (★ 2026-06-18, dspark)
 *
 * 5개 메타관리 화면(SQL/메시지/엔터티/서비스/오브젝트)의 #drawer 가 반복하던
 *   ① MetaDetailEditor 래핑(~14줄 동일 props/events, 전부 useMetaEditor 상태에서 옴)
 *   ② 삭제 확인 InModal(~10줄, title/message 만 화면별 차이)
 * 두 덩어리를 캡슐화한다. 화면은 editor(=useMetaEditor 인스턴스) + tabs + width + 삭제문구만 전달.
 *
 * ⚠️ MetaDetailEditor 는 변경하지 않는다(접근제어 4화면 AuthItem/User/Group/ExtUser 도 공유).
 *    본 컴포넌트는 그 "위를 감싸는" 추가 래퍼라 기존 동작 100% 동일.
 *
 * 사용:
 *   <MetaCatalogDrawer :editor="editor" :tabs="tabItems" :width="940"
 *                      delete-title="오브젝트 삭제" :delete-message="`'${selected?.objectNm}' 를 삭제할까요?`">
 *     <section v-if="drawerTab === 'def'" ...> ... </section>   <!-- 탭 내용(화면별) = 기본 slot -->
 *   </MetaCatalogDrawer>
 *
 * 탭 내용 slot 은 화면 scope 에서 렌더되므로 mode/detail/form/drawerTab 등 화면 상태를 그대로 참조한다.
 */
import { computed } from 'vue';
import MetaDetailEditor from '@/components/feature/admin/MetaDetailEditor.vue';
import InModal from '@/components/ui/InModal.vue';

const props = defineProps({
  editor: { type: Object, required: true },       // useMetaEditor() 반환 인스턴스
  tabs: { type: Array, default: () => [] },        // MetaDetailEditor tabs(=tabItems)
  width: { type: Number, default: 940 },
  deleteTitle: { type: String, default: '삭제' },
  deleteMessage: { type: String, default: '삭제하시겠습니까?' },
});

// useMetaEditor 의 상태·액션(refs/fns)을 그대로 노출 → 템플릿 자동 언랩. 인스턴스는 불변이라 안전.
const {
  mode, modalTitle, detailLoading, saving, drawerTab, detail, confirmDelete,
  enterEdit, save, cancelEdit, closePanel, doDelete,
} = props.editor;

const hasContent = computed(() => mode.value === 'create' || !!detail.value);
</script>

<template>
  <MetaDetailEditor
    :mode="mode"
    :title="modalTitle"
    :loading="detailLoading"
    :saving="saving"
    :tabs="tabs"
    :active-tab="drawerTab"
    :has-content="hasContent"
    :width="width"
    deletable-in-edit
    @update:active-tab="(t) => { drawerTab = t; }"
    @edit="enterEdit"
    @delete="confirmDelete = true"
    @save="save"
    @cancel="cancelEdit"
    @close="closePanel"
  >
    <slot />
  </MetaDetailEditor>

  <!-- 삭제 확인 -->
  <InModal
    v-if="confirmDelete"
    :model-value="confirmDelete"
    type="confirm"
    :title="deleteTitle"
    :message="deleteMessage"
    confirm-text="삭제"
    cancel-text="취소"
    @confirm="doDelete"
    @cancel="confirmDelete = false"
    @update:model-value="(v) => { if (!v) confirmDelete = false; }"
  />
</template>
