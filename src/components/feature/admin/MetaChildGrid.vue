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
import { computed, getCurrentInstance, ref } from 'vue';
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
  // ★ (2026-06-11, dspark): 번호(순서)·상태 컬럼 옵션 (기본 off — 기존 화면 영향 없음). AUT0070 정합.
  showSeq: { type: Boolean, default: false },
  showStatus: { type: Boolean, default: false },
  // ★ (2026-06-11, dspark): 내장 [행 추가] 버튼 숨김 (AUT0060 사원 그리드처럼 picker 로 외부 추가 시).
  hideAdd: { type: Boolean, default: false },
});

const emit = defineEmits(['row-select', 'cell-picker']);

const visibleRows = computed(() => props.rows.filter((r) => r.rowStatus !== 'D'));

// ★ (2026-06-08, dspark): combo(datalist) 컬럼 — 자유입력 + 표준값 제안. 인스턴스별 고유 id 로 datalist 충돌 회피(다중 그리드 공존).
const instanceId = getCurrentInstance()?.uid ?? 0;
const comboColumns = computed(() => props.columns.filter((c) => c.kind === 'combo'));

function touch(r) { if (r.rowStatus !== 'I') r.rowStatus = 'U'; }

// ★ (2026-06-15, dspark): searchcombo = el-select remote(인라인 서버검색). 팝업 없이 칸에 타이핑→드롭다운 리스트→선택.
//   col.sc = { fetcher(q)->raw[], value(raw)->저장값, label(raw)->드롭다운라벨, apply(raw,row)->row write }
//   col.displayKey: 선택 후 표시용 라벨(없으면 col.key 값). 한 번에 하나만 열리므로 옵션 목록은 공유 ref.
const scOptions = ref([]);     // [{ value, label }]
const scLastRaw = ref([]);     // 마지막 검색 원본 행 (선택 시 apply 에 전달)
const scLoading = ref(false);
async function scSearch(col, q) {
  const query = (q || '').trim();
  if (!query) { scOptions.value = []; scLastRaw.value = []; return; }
  scLoading.value = true;
  try {
    const raws = (await col.sc.fetcher(query)) || [];
    scLastRaw.value = raws;
    // label = 드롭다운 리스트(풍부) / short = 선택 후 접힌 표시값(짧게). short 없으면 label 사용.
    scOptions.value = raws.map((raw) => ({
      value: col.sc.value(raw),
      label: col.sc.label(raw),
      short: col.sc.short ? col.sc.short(raw) : col.sc.label(raw),
    }));
  } catch (e) { scOptions.value = []; scLastRaw.value = []; }
  finally { scLoading.value = false; }
}
function scSelect(r, col, v) {
  const raw = scLastRaw.value.find((x) => col.sc.value(x) === v);
  if (raw) col.sc.apply(raw, r);           // 원본 행으로 write (다중 필드·변환 포함)
  else r[col.key] = v;                      // 매칭 없으면(=clear 등) 값만
  touch(r);
}
// 현재 저장값을 검색 전에도 라벨로 보여주기 위한 seed 옵션 (검색 결과가 비었을 때만 — 옵션 개수 토글로 인한 el-select 키보드 내비 오류 방지)
function scSeed(r, col) {
  if (scOptions.value.length) return null;
  const val = r[col.key];
  if (val == null || val === '') return null;
  const disp = (col.displayKey && r[col.displayKey]) ? r[col.displayKey] : val;
  return { value: val, label: disp, short: disp };
}

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

// ★ (2026-06-07, dspark): 기존 `new-${i}` 는 visibleRows 인덱스 기반이라, 위 행을 soft-delete 하면
//   아래 신규행들의 :key 가 밀려 바뀜 → Vue 가 <input> 을 teardown/재생성 → 입력 중 포커스 소실.
//   행 객체 동일성에 묶인 안정 uid(WeakMap)로 교체 — payload 오염(toPayload 가 rows 직송) 없이 key 안정성 확보.
const uidMap = new WeakMap();
let uidSeq = 0;
function rowKey(r) {
  if (props.keyField && r[props.keyField] != null) return r[props.keyField];
  let u = uidMap.get(r);
  if (u == null) { u = ++uidSeq; uidMap.set(r, u); }
  return `uid-${u}`;
}

function setCheckbox(r, key, checked) {
  r[key] = checked ? 'Y' : 'N';
  touch(r);
}

// ★ (2026-06-11, dspark): 상태 라벨 (rowStatus → 표시). D 는 visibleRows 에서 숨김이라 신규/수정/''.
function statusLabel(r) {
  return r.rowStatus === 'I' ? '신규' : r.rowStatus === 'U' ? '수정' : r.rowStatus === 'D' ? '삭제' : '';
}
</script>

<template>
  <div class="meta-grid">
    <div v-if="!hideAdd" class="meta-grid__toolbar">
      <InButton size="sm" variant="default" :left-icon-show="false" :right-icon-show="false" @click="addRow">{{ addLabel }}</InButton>
    </div>
    <table class="meta-grid__table">
      <thead>
        <tr>
          <th v-if="selectable" class="meta-grid__sel-col" />
          <th v-if="showSeq" class="meta-grid__seq-col">번호</th>
          <th v-if="showStatus" class="meta-grid__status-col">상태</th>
          <th
            v-for="c in columns"
            :key="c.key"
            :class="c.kind === 'checkbox' ? 'ctr' : ''"
            :style="c.width ? { width: c.width + 'px' } : null"
          >{{ c.label }}</th>
          <th class="meta-grid__del-col" />
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in visibleRows" :key="rowKey(r)" :class="{ 'meta-grid__row--sel': selectable && r === selectedRow }">
          <td v-if="selectable" class="ctr">
            <input type="radio" :checked="r === selectedRow" @change="emit('row-select', r)" />
          </td>
          <td v-if="showSeq" class="ctr meta-grid__seq">{{ visibleRows.indexOf(r) + 1 }}</td>
          <td v-if="showStatus" class="ctr">
            <span v-if="r.rowStatus" :class="['meta-grid__status', `is-${r.rowStatus.toLowerCase()}`]">{{ statusLabel(r) }}</span>
          </td>
          <td v-for="c in columns" :key="c.key" :class="c.kind === 'checkbox' ? 'ctr' : ''">
            <input
              v-if="c.kind === 'number'"
              v-model.number="r[c.key]"
              type="number"
              class="meta-grid__cell"              @change="touch(r)"
            />
            <input
              v-else-if="c.kind === 'checkbox'"
              type="checkbox"
              :checked="r[c.key] === 'Y'"
              @change="(e) => setCheckbox(r, c.key, e.target.checked)"
            />
            <span v-else-if="c.kind === 'readonly'" class="meta-grid__readonly">{{ r[c.key] }}</span>
            <select
              v-else-if="c.kind === 'select'"
              v-model="r[c.key]"
              class="meta-grid__cell"              @change="touch(r)"
            >
              <option v-for="o in (c.options || [])" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
            <input
              v-else-if="c.kind === 'date'"
              v-model="r[c.key]"
              type="date"
              class="meta-grid__cell"              @change="touch(r)"
            />
            <input
              v-else-if="c.kind === 'combo'"
              v-model="r[c.key]"
              type="text"
              class="meta-grid__cell"
              :list="`dl-${instanceId}-${c.key}`"
              :placeholder="c.placeholder || ''"
              @input="touch(r)"
            />
            <!-- ★ (2026-06-12, dspark): editcombo = 드롭다운(클릭 시 전체 옵션) + 자유입력(allow-create) 둘 다. datalist 가 기존값 필터로 옵션을 가리는 문제 해결. -->
            <el-select
              v-else-if="c.kind === 'editcombo'"
              v-model="r[c.key]"
              filterable
              allow-create
              default-first-option
              :reserve-keyword="false"
              size="small"
              class="meta-grid__editcombo"
              :placeholder="c.placeholder || ''"
              @change="touch(r)"
            >
              <el-option v-for="o in (c.options || [])" :key="o" :label="o" :value="o" />
            </el-select>
            <!-- ★ (2026-06-15, dspark): picker = 검색 버튼으로 값 채움 (정확한 이름 손입력 대체). 클릭 → 부모가 SearchPickerModal 띄움. r[displayKey] 우선 표시, 없으면 r[key]. -->
            <div
              v-else-if="c.kind === 'picker'"
              class="meta-grid__picker"            >
              <input
                :value="(c.displayKey && r[c.displayKey]) ? r[c.displayKey] : r[c.key]"
                type="text"
                readonly
                class="meta-grid__cell meta-grid__picker-val"
                :placeholder="c.placeholder || '검색하여 선택'"
                @click="emit('cell-picker', { row: r, col: c })"
              />
              <button type="button" class="meta-grid__pick-btn" title="검색" @click="emit('cell-picker', { row: r, col: c })">🔍</button>
            </div>
            <!-- ★ (2026-06-15, dspark): searchcombo = 인라인 서버검색 드롭다운(el-select remote). 타이핑→리스트→선택, 팝업 없음. -->
            <el-select
              v-else-if="c.kind === 'searchcombo'"
              :model-value="r[c.key]"
              filterable
              remote
              :remote-method="(q) => scSearch(c, q)"
              :loading="scLoading"
              default-first-option
              clearable
              :reserve-keyword="false"
              size="small"
              class="meta-grid__editcombo"
              :placeholder="c.placeholder || '검색하여 선택'"
              @change="(v) => scSelect(r, c, v)"
            >
              <!-- :label = 접힌 표시값(짧게) / 슬롯 = 드롭다운 리스트(풍부) -->
              <el-option v-if="scSeed(r, c)" :key="'_seed'" :value="scSeed(r, c).value" :label="scSeed(r, c).short">{{ scSeed(r, c).label }}</el-option>
              <el-option v-for="o in scOptions" :key="o.value" :value="o.value" :label="o.short">{{ o.label }}</el-option>
            </el-select>
            <input
              v-else
              v-model="r[c.key]"
              type="text"
              class="meta-grid__cell"
              :placeholder="c.placeholder || ''"
              @input="touch(r)"
            />
          </td>
          <td><button type="button" class="meta-grid__row-del" title="행 삭제" @click="removeRow(r)">✕</button></td>
        </tr>
        <tr v-if="!visibleRows.length">
          <td :colspan="columns.length + 1 + (selectable ? 1 : 0) + (showSeq ? 1 : 0) + (showStatus ? 1 : 0)" class="meta-grid__empty">행 없음 — [{{ addLabel }}]</td>
        </tr>
      </tbody>
    </table>
    <!-- ★ (2026-06-08, dspark): combo 컬럼 datalist (인스턴스당 1개, 행마다 :list 로 참조) -->
    <datalist v-for="c in comboColumns" :id="`dl-${instanceId}-${c.key}`" :key="`dl-${c.key}`">
      <option v-for="o in (c.options || [])" :key="o" :value="o" />
    </datalist>
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
.meta-grid__seq-col { width: 44px; text-align: center; }
.meta-grid__status-col { width: 56px; text-align: center; }
.meta-grid__seq { color: var(--in-text-subtle); }
.meta-grid__readonly { display: inline-block; padding: 5px 6px; color: var(--in-text-default); font-size: var(--in-font-size-sm); }
.meta-grid__status { display: inline-block; padding: 1px 6px; border-radius: var(--in-radius-xs); font-size: var(--in-font-size-xs); }
.meta-grid__status.is-i { background: var(--in-bg-success-subtle, #e6f4ea); color: var(--in-text-success, #1a7f37); }
.meta-grid__status.is-u { background: var(--in-bg-warning-subtle, #fff4e5); color: var(--in-text-warning, #b54708); }
.meta-grid__status.is-d { background: var(--in-bg-error-subtle, #fde7e7); color: var(--in-text-error, #d33); }
.meta-grid__row--sel { background: var(--in-bg-brand-subtle, var(--in-bg-default)); }
.meta-grid__cell {
  width: 100%; box-sizing: border-box; padding: 5px 6px;
  border: 1px solid var(--in-border-input); border-radius: var(--in-radius-xs);
  font-size: var(--in-font-size-sm); background: var(--in-bg-white); color: var(--in-text-default);
}
/* ★ (2026-06-12, dspark): editcombo(el-select) 높이·테두리를 텍스트 셀과 동일하게 (size small 이 더 낮던 문제 — 사용자 피드백). */
.meta-grid__editcombo { width: 100%; }
.meta-grid__editcombo :deep(.el-select__wrapper) {
  min-height: 30px; padding: 4px 8px; border-radius: var(--in-radius-xs);
  box-shadow: 0 0 0 1px var(--in-border-input) inset; font-size: var(--in-font-size-sm);
}
/* ★ (2026-06-15, dspark): picker 셀 — 읽기전용 값 + 🔍 버튼. 정확한 이름 손입력 대체. */
.meta-grid__picker { display: flex; gap: 4px; align-items: center; }
.meta-grid__picker-val { flex: 1 1 0; min-width: 0; cursor: pointer; background: var(--in-bg-white); }
.meta-grid__pick-btn { flex: 0 0 auto; border: 1px solid var(--in-border-input); background: var(--in-bg-default, #f5f5f5); border-radius: var(--in-radius-xs); padding: 4px 6px; cursor: pointer; font-size: 12px; line-height: 1; }
.meta-grid__pick-btn:hover { background: var(--in-bg-brand-subtle, #e9f0ff); }
.meta-grid__row-del { border: none; background: transparent; cursor: pointer; color: var(--in-text-subtle); font-size: 14px; padding: 4px 8px; }
.meta-grid__row-del:hover { color: var(--in-text-error, #d33); }
.meta-grid__empty { text-align: center; color: var(--in-text-subtle); }
.meta-grid__hint { margin: 6px 0 0; font-size: var(--in-font-size-sm); color: var(--in-text-subtle); }
</style>
