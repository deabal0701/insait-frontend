<script setup>
/**
 * SgGridSection — SG 목록 섹션 (제목 + 건수 + 표준 툴바 + 그리드) (★ 2026-06-18, dspark)
 *
 * ⚠️ 원자(atomic) ui 컴포넌트 아님 — 범용 레이아웃 패턴이라 components/common/ 에 둔다. In* 접두 미사용.
 *
 * 업무 그리드는 항상 "제목 + 건수 + [입력/삭제/복원/저장] 툴바 + 그리드" 묶음으로 나오므로 그 묶음을 캡슐화.
 * 툴바 버튼은 그리드와 항상 함께라 컴포넌트에 내장(@add/@delete/@restore/@save emit). 그리드는 기본 슬롯(InDataTable).
 *
 * 사용:
 *   <SgGridSection title="사업장 목록" :count="shown" :sub="filtered ? `/ 전체 ${total}` : ''"
 *                  @add="onAdd" @delete="onDel" @restore="onRestore" @save="onSave">
 *     <InDataTable ref="grid" … />
 *   </SgGridSection>
 *   - 상위 미선택 등으로 입력·저장을 막을 땐 :disabled="조건" (삭제·복원은 유지)
 *   - 제목 옆 보조표시(선택 사업장 등) = :subtitle / :subtitle-muted
 *   - 툴바 외 추가 버튼(엑셀 등) = #toolbar-extra 슬롯 / 툴바 자체 끄기 = :toolbar="false"
 */
import InButton from '@/components/ui/InButton.vue';

defineProps({
  title: { type: String, default: '' },
  count: { type: Number, default: null },           // null 이면 건수 미표시
  sub: { type: String, default: '' },               // 건수 뒤 보조(예: "/ 전체 15")
  subtitle: { type: String, default: '' },          // 제목 뒤(예: "— 서울(100)")
  subtitleMuted: { type: Boolean, default: false },
  toolbar: { type: Boolean, default: true },        // 표준 입력/삭제/복원/저장 툴바 표시
  disabled: { type: Boolean, default: false },      // 입력+저장 비활성(상위 미선택 등). 삭제·복원은 유지
});
const emit = defineEmits(['add', 'delete', 'restore', 'save']);
</script>

<template>
  <section class="grid-section">
    <div class="grid-section__head">
      <strong class="grid-section__title">
        {{ title }}
        <span v-if="count != null" class="grid-section__count">총 {{ count.toLocaleString() }}건</span>
        <span v-if="sub" class="grid-section__count grid-section__count--muted">{{ sub }}</span>
        <span v-if="subtitle" class="grid-section__sub" :class="{ 'grid-section__sub--muted': subtitleMuted }">{{ subtitle }}</span>
      </strong>
      <div v-if="toolbar || $slots['toolbar-extra']" class="grid-section__toolbar">
        <slot name="toolbar-extra" />
        <template v-if="toolbar">
          <InButton size="md" :left-icon-show="false" :right-icon-show="false" :disabled="disabled" @click="emit('add')">입력</InButton>
          <InButton size="md" variant="danger" :left-icon-show="false" :right-icon-show="false" @click="emit('delete')">삭제</InButton>
          <InButton size="md" :left-icon-show="false" :right-icon-show="false" @click="emit('restore')">복원</InButton>
          <InButton size="md" variant="primary" :left-icon-show="false" :right-icon-show="false" :disabled="disabled" @click="emit('save')">저장</InButton>
        </template>
      </div>
    </div>
    <slot />
  </section>
</template>

<style scoped>
.grid-section { display: flex; flex-direction: column; gap: 8px; }
.grid-section__head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.grid-section__title { font-size: var(--in-font-size-md); color: var(--in-text-default); }
.grid-section__count { margin-left: 6px; font-size: var(--in-font-size-sm); font-weight: var(--in-font-weight-regular); color: var(--in-text-brand); }
.grid-section__count--muted { color: var(--in-text-subtle); }
.grid-section__sub { margin-left: 4px; font-size: var(--in-font-size-sm); font-weight: var(--in-font-weight-regular); color: var(--in-text-brand); }
.grid-section__sub--muted { color: var(--in-text-subtle); }
.grid-section__toolbar { display: flex; gap: 6px; }
</style>
