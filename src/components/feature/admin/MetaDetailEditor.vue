<script setup>
/**
 * MetaDetailEditor — 메타 카탈로그 상세/편집 Drawer 공통 chrome.
 * ★ (2026-06-05, dspark): IST0010·IST0030 에서 공통 추출 (99 backlog #8).
 *   InModal(우측 Drawer) + 탭 + 모드별 푸터([수정][삭제][닫기] ↔ [저장][취소]) 만 담당.
 *   탭 내용(정의 폼·본문·자식 그리드·보기 리스트)은 default 슬롯으로 페이지가 주입.
 *   상태/액션은 useMetaEditor 가 제공 → 페이지가 props/이벤트로 연결.
 *
 * Figma 노드 ID = TBD (atomic 조합 — InModal/InTabs/InButton).
 * 출처: QueryCatalog/MessageCatalog 인라인 패턴 일반화.
 */
import { computed } from 'vue';
import InModal from '@/components/ui/InModal.vue';
import InTabs from '@/components/ui/InTabs.vue';
import InButton from '@/components/ui/InButton.vue';

const props = defineProps({
  mode: { type: String, required: true },          // '' | 'view' | 'create' | 'edit'
  title: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
  tabs: { type: Array, default: () => [] },          // InTabs items
  activeTab: { type: String, default: '' },
  width: { type: Number, default: 900 },
  hasContent: { type: Boolean, default: false },     // create 또는 detail 로드 완료
  showCopy: { type: Boolean, default: true },
});

const emit = defineEmits(['update:activeTab', 'edit', 'delete', 'save', 'cancel', 'close', 'copy']);

const isEditing = computed(() => props.mode === 'create' || props.mode === 'edit');
</script>

<template>
  <InModal
    v-if="mode"
    :model-value="!!mode"
    :title="title"
    type="detail"
    :width="width"
    :close-on-overlay="!isEditing"
    @update:model-value="(v) => { if (!v) emit('close'); }"
  >
    <div v-if="loading" class="meta-editor__loading">상세 조회 중…</div>

    <div v-else-if="hasContent">
      <div v-if="mode === 'view' && showCopy" class="meta-editor__head">
        <InButton size="sm" variant="text" @click="emit('copy')">📋 JSON 복사</InButton>
      </div>

      <InTabs
        :model-value="activeTab"
        :items="tabs"
        @update:model-value="(v) => emit('update:activeTab', v)"
      />

      <slot :tab="activeTab" />
    </div>

    <template #footer>
      <template v-if="isEditing">
        <InButton variant="default" :left-icon-show="false" :right-icon-show="false" :disabled="saving" @click="emit('cancel')">취소</InButton>
        <InButton variant="primary" :left-icon-show="false" :right-icon-show="false" :disabled="saving" @click="emit('save')">{{ saving ? '저장 중…' : '저장' }}</InButton>
      </template>
      <template v-else>
        <InButton variant="default" :left-icon-show="false" :right-icon-show="false" @click="emit('close')">닫기</InButton>
        <InButton variant="default" :left-icon-show="false" :right-icon-show="false" @click="emit('delete')">삭제</InButton>
        <InButton variant="primary" :left-icon-show="false" :right-icon-show="false" @click="emit('edit')">수정</InButton>
      </template>
    </template>
  </InModal>
</template>

<style scoped>
.meta-editor__loading { padding: 32px; text-align: center; color: var(--in-text-subtle); }
.meta-editor__head { display: flex; gap: 8px; margin-bottom: 12px; }
</style>
