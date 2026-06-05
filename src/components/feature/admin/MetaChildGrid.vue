<script setup>
/**
 * MetaChildGrid — 메타 자식행 인라인 편집 그리드 (rowStatus I/U/D).
 * ★ (2026-06-05, dspark): IST0010 파라미터 / IST0030 컬럼 그리드 공통 추출 (99 backlog #8).
 *   컬럼 구성을 config 로 받아 SQL 파라미터·메시지 컬럼 등 모든 자식 그리드를 수용.
 *
 * rowStatus 프로토콜 (00_architecture §3-A):
 *   신규행 = 'I' (즉시 제거 가능) / 기존행 수정 = 'U' / 기존행 삭제 = 'D'(숨김+payload 유지).
 *   visibleRows = rowStatus !== 'D'. 셀 변경 시 touch() 가 'I'→유지, 그 외 'U' 부여.
 *
 * props:
 *   - rows     : 부모 form 의 자식 배열 (in-place 변형 — 반응성 유지)
 *   - columns  : [{ key, label, kind:'number'|'text'|'checkbox'|'select', width?, placeholder?, options? }]
 *               (kind='select' 은 options:[{value,label}] 필요)
 *   - keyField : :key 용 OID 컬럼명 (없으면 index fallback)
 *   - newRow   : (rows) => 신규 행 객체 (rowStatus:'I' 포함). 미지정 시 columns 기반 기본 생성
 *   - addLabel, hint
 *
 * Figma 노드 ID = TBD (atomic <table> + 입력 셀).
 */
import { computed } from 'vue';
import InButton from '@/components/ui/InButton.vue';

const props = defineProps({
  rows: { type: Array, required: true },
  columns: { type: Array, required: true },
  keyField: { type: String, default: '' },
  newRow: { type: Function, default: null },
  addLabel: { type: String, default: '+ 행 추가' },
  hint: { type: String, default: '' },
  // ★ (2026-06-05, dspark): 마스터-디테일 (엔터티 컬럼 → 매핑). 선택 라디오 + 행 강조.
  selectable: { type: Boolean, default: false },
  selectedRow: { type: Object, default: null },   // 객체 동일성으로 비교
});

const emit = defineEmits(['row-select']);

const visibleRows = computed(() => props.rows.filter((r) => r.rowStatus !== 'D'));

function touch(r) { if (r.rowStatus !== 'I') r.rowStatus = 'U'; }

function defaultNewRow() {
  const r = { rowStatus: 'I' };
  for (const c of props.columns) {
    r[c.key] = c.kind === 'checkbox' ? 'N' : (c.kind === 'number' ? null : '');
  }
  return r;
}

function addRow() {
  const r = props.newRow ? props.newRow(props.rows) : defaultNewRow();
  if (!r.rowStatus) r.rowStatus = 'I';
  props.rows.push(r);
}

function removeRow(r) {
  const idx = props.rows.indexOf(r);
  if (idx < 0) return;
  if (r.rowStatus === 'I') props.rows.splice(idx, 1);   // 신규행 즉시 제거
  else r.rowStatus = 'D';                                // 기존행 D 마크
}

function rowKey(r, i) {
  return (props.keyField && r[props.keyField] != null) ? r[props.keyField] : `new-${i}`;
}

function setCheckbox(r, key, checked) {
  r[key] = checked ? 'Y' : 'N';
  touch(r);
}
</script>

<template>
  <div class="meta-grid">
    <div class="meta-grid__toolbar">
      <InButton size="sm" variant="default" :left-icon-show="false" :right-icon-show="false" @click="addRow">{{ addLabel }}</InButton>
    </div>
    <table class="meta-grid__table">
      <thead>
        <tr>
          <th v-if="selectable" class="meta-grid__sel-col" />
          <th v-for="c in columns" :key="c.key" :class="c.kind === 'checkbox' ? 'ctr' : ''">{{ c.label }}</th>
          <th class="meta-grid__del-col" />
        </tr>
      </thead>
      <tbody>
        <tr v-for="(r, i) in visibleRows" :key="rowKey(r, i)" :class="{ 'meta-grid__row--sel': selectable && r === selectedRow }">
          <td v-if="selectable" class="ctr">
            <input type="radio" :checked="r === selectedRow" @change="emit('row-select', r)" />
          </td>
          <td v-for="c in columns" :key="c.key" :class="c.kind === 'checkbox' ? 'ctr' : ''">
            <input
              v-if="c.kind === 'number'"
              v-model.number="r[c.key]"
              type="number"
              class="meta-grid__cell"
              :style="c.width ? { width: c.width + 'px' } : null"
              @change="touch(r)"
            />
            <input
              v-else-if="c.kind === 'checkbox'"
              type="checkbox"
              :checked="r[c.key] === 'Y'"
              @change="(e) => setCheckbox(r, c.key, e.target.checked)"
            />
            <select
              v-else-if="c.kind === 'select'"
              v-model="r[c.key]"
              class="meta-grid__cell"
              :style="c.width ? { width: c.width + 'px' } : null"
              @change="touch(r)"
            >
              <option v-for="o in (c.options || [])" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
            <input
              v-else
              v-model="r[c.key]"
              type="text"
              class="meta-grid__cell"
              :style="c.width ? { width: c.width + 'px' } : null"
              :placeholder="c.placeholder || ''"
              @input="touch(r)"
            />
          </td>
          <td><button type="button" class="meta-grid__row-del" title="행 삭제" @click="removeRow(r)">✕</button></td>
        </tr>
        <tr v-if="!visibleRows.length">
          <td :colspan="columns.length + (selectable ? 2 : 1)" class="meta-grid__empty">행 없음 — [{{ addLabel }}]</td>
        </tr>
      </tbody>
    </table>
    <p v-if="hint" class="meta-grid__hint">{{ hint }}</p>
  </div>
</template>

<style scoped>
.meta-grid__toolbar { display: flex; justify-content: flex-end; margin-bottom: 8px; }
.meta-grid__table { width: 100%; border-collapse: collapse; }
.meta-grid__table th, .meta-grid__table td {
  border-bottom: 1px solid var(--in-border-default);
  padding: 5px 6px; text-align: left; font-size: var(--in-font-size-sm);
}
.meta-grid__table th { color: var(--in-text-subtle); font-weight: var(--in-font-weight-medium); white-space: nowrap; }
.meta-grid__table td.ctr, .meta-grid__table th.ctr { text-align: center; }
.meta-grid__del-col { width: 32px; }
.meta-grid__sel-col { width: 32px; }
.meta-grid__row--sel { background: var(--in-bg-brand-subtle, var(--in-bg-default)); }
.meta-grid__cell {
  width: 100%; box-sizing: border-box; padding: 5px 6px;
  border: 1px solid var(--in-border-input); border-radius: var(--in-radius-xs);
  font-size: var(--in-font-size-sm); background: var(--in-bg-white); color: var(--in-text-default);
}
.meta-grid__row-del { border: none; background: transparent; cursor: pointer; color: var(--in-text-subtle); font-size: 14px; padding: 4px 8px; }
.meta-grid__row-del:hover { color: var(--in-text-error, #d33); }
.meta-grid__empty { text-align: center; color: var(--in-text-subtle); }
.meta-grid__hint { margin: 6px 0 0; font-size: var(--in-font-size-sm); color: var(--in-text-subtle); }
</style>
