<script setup>
/**
 * SgSearchBar — SG(검색박스+그리드) 규격 검색바 (★ 2026-06-18, dspark)
 *
 * ⚠️ 원자(atomic) ui 컴포넌트 아님 — 여러 In* 를 조합한 **범용 레이아웃 패턴** 이라 ui/ 가 아닌
 *    components/common/ 에 둔다 (특정 도메인도 아니므로 feature/{domain}/ 도 아님). In* 접두 미사용.
 *
 * 2026-06-17 기획 미팅 SG 규격(검색박스 3줄 이내 + 접기 + 칩 표시) 표준. 모든 SG 업무화면 재사용 대상.
 * 검색 카드 + 필드(라벨+컨트롤) 반응형 그리드 + [조회]/[초기화] + 접기 토글 칩 + 활성 필터 칩(접힘 시)을 캡슐화.
 *
 * 사용:
 *   const fields = [
 *     { key:'baseYmd', label:'기준일자', type:'date', chip:false },          // chip:false → 칩 미표시(서버 기준일 등)
 *     { key:'bizNm', label:'사업장명', type:'text', placeholder:'사업장명 포함검색' },
 *     { key:'mgrYn', label:'주사업장', type:'select', options:[{value:'',label:'전체'}, ...], placeholder:'전체' },
 *   ];
 *   <SgSearchBar :fields="fields" v-model="values" @search="onSearch" @reset="onReset" />
 *     - @search(values) : [조회] / 텍스트 Enter / 날짜 변경 시 (applied 스냅샷=values 로 칩 갱신)
 *     - @reset()        : [초기화] 시 (부모가 v-model 을 초기값으로)
 *   - 커스텀 필드: #field-{key} 슬롯 (type 기반 렌더 대체). slotProps = { field, value, set(v), search() }
 *
 * type: 'date'(InDatePicker) | 'text'(InTextField) | 'select'(InSelect). 그 외/특수는 슬롯.
 */
import { ref, computed } from 'vue';
import InCard from '@/components/ui/InCard.vue';
import InButton from '@/components/ui/InButton.vue';
import InDatePicker from '@/components/ui/InDatePicker.vue';
import InTextField from '@/components/ui/InTextField.vue';
import InSelect from '@/components/ui/InSelect.vue';
import InChip from '@/components/ui/InChip.vue';

const props = defineProps({
  fields: { type: Array, required: true },          // [{ key, label, type, placeholder?, options?, chip? }]
  modelValue: { type: Object, default: () => ({}) }, // staged 값 { key: value } (v-model)
  collapsible: { type: Boolean, default: true },
  searchText: { type: String, default: '조회' },
  resetText: { type: String, default: '초기화' },
});
const emit = defineEmits(['update:modelValue', 'search', 'reset']);

const collapsed = ref(false);
const applied = ref({});   // 마지막 [조회] 시점 스냅샷 — 칩 표시 출처(타이핑 중엔 안 바뀜)

function setVal(key, v) {
  emit('update:modelValue', { ...props.modelValue, [key]: v });
}
function triggerSearch() {
  applied.value = { ...props.modelValue };
  emit('search', { ...props.modelValue });
}
function triggerReset() {
  applied.value = {};
  emit('reset');
}

// 활성 필터 칩 (접힘 시) — applied 값 기준. select 는 옵션 라벨, 그 외는 "라벨: 값".
const chips = computed(() => {
  const out = [];
  for (const f of props.fields) {
    if (f.chip === false) continue;
    const v = applied.value[f.key];
    if (v === '' || v == null) continue;
    let text;
    if (f.type === 'select') {
      const opt = (f.options || []).find((o) => String(o.value) === String(v));
      if (!opt || opt.value === '' || opt.value == null) continue;
      text = opt.label;
    } else {
      text = `${f.label}: ${v}`;
    }
    out.push({ key: f.key, text });
  }
  return out;
});
const hasChips = computed(() => chips.value.length > 0);
</script>

<template>
  <div class="sb-wrap">
    <InCard class="sb">
      <div v-show="!collapsible || !collapsed" class="sb__body">
        <div class="sb__fields">
          <div v-for="f in fields" :key="f.key" class="sb__field">
            <label class="sb__label">{{ f.label }}</label>
            <slot
              :name="`field-${f.key}`"
              :field="f"
              :value="modelValue[f.key]"
              :set="(v) => setVal(f.key, v)"
              :search="triggerSearch"
            >
              <InDatePicker
                v-if="f.type === 'date'"
                :model-value="modelValue[f.key]"
                hide-label
                @update:model-value="(v) => setVal(f.key, v || '')"
                @change="triggerSearch"
              />
              <InSelect
                v-else-if="f.type === 'select'"
                :model-value="modelValue[f.key]"
                :options="f.options || []"
                :show-label="false"
                :input="f.placeholder || '전체'"
                size="sm"
                @update:model-value="(v) => setVal(f.key, v)"
              />
              <InTextField
                v-else
                :model-value="modelValue[f.key]"
                :show-label="false"
                :input="f.placeholder || ''"
                @update:model-value="(v) => setVal(f.key, v)"
                @keyup.enter="triggerSearch"
              />
            </slot>
          </div>
        </div>
        <div class="sb__actions">
          <InButton variant="primary" :left-icon-show="false" :right-icon-show="false" @click="triggerSearch">{{ searchText }}</InButton>
          <InButton variant="default" :left-icon-show="false" :right-icon-show="false" @click="triggerReset">{{ resetText }}</InButton>
        </div>
      </div>

      <!-- 접기/펴기 토글 — 카드 하단 가장자리에 걸친 작은 하늘색 칩 -->
      <button
        v-if="collapsible"
        type="button"
        class="sb__toggle"
        :aria-expanded="!collapsed"
        :title="collapsed ? '검색 펴기' : '검색 접기'"
        @click="collapsed = !collapsed"
      >
        <span class="sb__chev" :class="{ 'sb__chev--up': !collapsed }" aria-hidden="true" />
      </button>
    </InCard>

    <!-- 활성 필터 칩 — 접힘 시에만(펼침 시 필드로 보여 중복) -->
    <div v-if="collapsible && collapsed && hasChips" class="sb__chips">
      <InChip v-for="c in chips" :key="c.key" type="multi-select" :label="c.text" />
    </div>
  </div>
</template>

<style scoped>
.sb-wrap { display: flex; flex-direction: column; gap: 12px; }

/* 검색 카드 (InCard 루트에 클래스 fallthrough) — 하단 토글 칩 돌출분 margin 여유 */
.sb { padding: 16px 20px 0; position: relative; margin-bottom: 8px; }
.sb__body { display: flex; align-items: flex-start; gap: 24px; flex-wrap: wrap; padding-bottom: 12px; }
.sb__fields {
  flex: 1 1 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px 28px;
}
.sb__field { display: grid; grid-template-columns: 72px 1fr; align-items: center; gap: 10px; }
.sb__label { text-align: right; font-size: var(--in-font-size-sm); color: var(--in-text-default); white-space: nowrap; }
.sb__actions { flex: 0 0 auto; display: flex; gap: 8px; align-items: flex-start; }

/* 접기/펴기 토글 — 연한 하늘색 칩, 카드 하단 경계 중앙 반쯤 겹침 */
.sb__toggle {
  position: absolute; left: 50%; bottom: 0; transform: translate(-50%, 50%);
  display: inline-flex; align-items: center; justify-content: center;
  width: 46px; height: 20px; padding: 0; z-index: 1;
  border: 1px solid var(--in-border-brand, #36c1e8); border-radius: 999px;
  background: var(--in-bg-accent-brand, #e1f5fc99); color: var(--in-brand, #0ea1da);
  cursor: pointer;
}
.sb__toggle:hover { border-color: var(--in-brand, #0ea1da); color: var(--in-brand-bolder, #0b7fac); }
.sb__chev {
  width: 0; height: 0;
  border-left: 5px solid transparent; border-right: 5px solid transparent;
  border-top: 6px solid currentColor; transition: transform 0.15s;
}
.sb__chev--up { transform: rotate(180deg); }

/* 활성 필터 칩 (InChip 표준 — 컨테이너 정렬만) */
.sb__chips { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
</style>
