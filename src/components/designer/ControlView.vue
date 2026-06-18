<script setup>
/**
 * ControlView — 위젯(컨트롤) 하나를 실제 컴포넌트로 렌더 (★ 2026-06-18, dspark)
 *
 * ⚠️ "컨트롤 → 컴포넌트" 매핑의 **단일 스왑 지점**. 컴포넌트를 바꾸려면 해당 분기 1곳만 수정
 *    (예: textbox 를 다른 입력으로 → 아래 v-else-if="textbox" 의 컴포넌트 교체). 저장 JSON(controls.js 데이터)은 불변.
 *
 * props.design=true → 디자이너 캔버스용(데이터그리드 등은 envelope 호출 없이 경량 미리보기).
 *          =false → 런타임(실제 화면). 데이터그리드는 실 InDataTable(self-managed envelope).
 */
import InTextField from '@/components/ui/InTextField.vue';
import InNumberField from '@/components/ui/InNumberField.vue';
import InSelect from '@/components/ui/InSelect.vue';
import InDatePicker from '@/components/ui/InDatePicker.vue';
import InCheckbox from '@/components/ui/InCheckbox.vue';
import InSwitch from '@/components/ui/InSwitch.vue';
import InButton from '@/components/ui/InButton.vue';
import InDataTable from '@/components/ui/InDataTable.vue';
import SgSearchBar from '@/components/common/SgSearchBar.vue';

const props = defineProps({
  widget: { type: Object, required: true },
  design: { type: Boolean, default: false },
});
function p() { return props.widget.props || {}; }
</script>

<template>
  <div class="cv" :data-type="widget.type">
    <!-- 배치 -->
    <div v-if="widget.type === 'panel'" class="cv-panel" :class="{ 'cv-panel--bordered': p().bordered }">
      <div v-if="p().title" class="cv-panel__title">{{ p().title }}</div>
    </div>
    <hr v-else-if="widget.type === 'divider'" class="cv-divider" />

    <!-- 표시 -->
    <span v-else-if="widget.type === 'label'" class="cv-label" :style="{ textAlign: p().align || 'left' }">{{ p().text }}</span>
    <strong v-else-if="widget.type === 'heading'" class="cv-heading" :class="`cv-heading--${p().size || 'lg'}`">{{ p().text }}</strong>

    <!-- 입력 (★ 컴포넌트 스왑 지점) -->
    <InTextField v-else-if="widget.type === 'textbox'" :label="p().label" :input="p().placeholder" />
    <InNumberField v-else-if="widget.type === 'number'" :label="p().label" :placeholder="p().placeholder" />
    <InSelect v-else-if="widget.type === 'select'" :label="p().label" :input="p().placeholder" :options="p().options || []" />
    <InDatePicker v-else-if="widget.type === 'datepicker'" :label="p().label" />
    <label v-else-if="widget.type === 'checkbox'" class="cv-inline">
      <InCheckbox :model-value="!!p().checked" /><span>{{ p().label }}</span>
    </label>
    <label v-else-if="widget.type === 'switch'" class="cv-inline">
      <InSwitch :model-value="!!p().on" /><span>{{ p().label }}</span>
    </label>

    <!-- 동작 -->
    <InButton v-else-if="widget.type === 'button'" :variant="p().variant || 'primary'" :left-icon-show="false" :right-icon-show="false">{{ p().text }}</InButton>

    <!-- 데이터 -->
    <SgSearchBar
      v-else-if="widget.type === 'searchbar'"
      :fields="p().fields || []"
      :model-value="{}"
    />
    <!-- 데이터그리드 — ★ (2026-06-18) WYSIWYG: 디자인 모드도 실 그리드(빈) 렌더 → 미리보기/런타임과 동일 구조.
         디자인 모드는 envelope 미연결(서비스ID 미전달·autoRetrieve off)이라 조회 호출은 안 함(빈 상태). -->
    <InDataTable
      v-else-if="widget.type === 'datagrid'"
      :columns="p().columns || []"
      :height="(widget.h * 40) - 40"
      :options="{ rowHeaders: ['rowNum', 'checkbox'] }"
      :retrieve-service-id="design ? undefined : (p().retrieveServiceId || undefined)"
      :save-service-id="design ? undefined : (p().saveServiceId || undefined)"
      :slot-name="design ? undefined : (p().slot || undefined)"
      :header="{ objectId: p().objectId }"
      :auto-retrieve="!design && !!p().autoRetrieve"
      show-status
    />

    <span v-else class="cv-unknown">알 수 없는 컨트롤: {{ widget.type }}</span>
  </div>
</template>

<style scoped>
.cv { width: 100%; height: 100%; display: flex; flex-direction: column; min-width: 0; }
.cv-panel { width: 100%; height: 100%; border-radius: var(--in-radius-xs, 4px); }
.cv-panel--bordered { border: 1px solid var(--in-border-default, #e2e2e2); }
.cv-panel__title { padding: 4px 8px; font-size: var(--in-font-size-sm); color: var(--in-text-subtle); border-bottom: 1px solid var(--in-border-subtle, #eee); }
.cv-divider { width: 100%; border: 0; border-top: 1px solid var(--in-border-default, #e2e2e2); margin: 0; align-self: center; }
.cv-label { font-size: var(--in-font-size-sm); color: var(--in-text-default); align-self: center; width: 100%; }
.cv-heading { color: var(--in-text-default); align-self: center; }
.cv-heading--md { font-size: 14px; } .cv-heading--lg { font-size: 18px; } .cv-heading--xl { font-size: 22px; }
.cv-inline { display: inline-flex; align-items: center; gap: 6px; font-size: var(--in-font-size-sm); color: var(--in-text-default); }
.cv-unknown { color: var(--in-text-error, #e33131); font-size: var(--in-font-size-sm); }

.cv-grid-stub { width: 100%; height: 100%; border: 1px dashed var(--in-border-input, #c9c9c9); border-radius: var(--in-radius-xs, 4px); background: var(--in-bg-white, #fff); display: flex; flex-direction: column; overflow: hidden; }
.cv-grid-stub__head { padding: 6px 10px; font-size: var(--in-font-size-sm); color: var(--in-text-default); border-bottom: 1px solid var(--in-border-subtle, #eee); }
.cv-grid-stub__head span { color: var(--in-text-subtle); }
.cv-grid-stub__cols { display: flex; gap: 0; border-bottom: 1px solid var(--in-border-subtle, #eee); overflow: hidden; }
.cv-grid-stub__col { flex: 1 0 auto; padding: 4px 10px; font-size: 12px; color: var(--in-text-subtle); border-right: 1px solid var(--in-border-subtle, #eee); white-space: nowrap; background: var(--in-bg-default); }
.cv-grid-stub__note { margin-top: auto; padding: 8px 10px; font-size: 12px; color: var(--in-text-subtle); text-align: center; }
</style>
