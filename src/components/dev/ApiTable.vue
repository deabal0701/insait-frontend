<script setup>
// ★ (2026-06-14, dspark): InDataTable 매뉴얼용 API 레퍼런스 표.
//   kind 별 컬럼 헤더를 바꿔 props / methods / events / columns-옵션 등에 재사용.
//   rows = [{ name, type, default, desc }] (default 는 events/methods 에선 비움).
const props = defineProps({
  kind: { type: String, default: 'props' }, // props | methods | events | columns | options
  rows: { type: Array, required: true },
});

const HEADERS = {
  props:   ['Prop', '타입', '기본값', '설명'],
  methods: ['메서드', '시그니처', '', '설명'],
  events:  ['이벤트', 'payload', '', '설명'],
  columns: ['컬럼 속성', '타입', '기본값', '설명'],
  options: ['옵션', '타입', '기본값', '설명'],
};
const hideMid = (k) => k === 'methods' || k === 'events';
</script>

<template>
  <div class="api-tbl-wrap">
    <table class="api-tbl">
      <thead>
        <tr>
          <th>{{ HEADERS[kind][0] }}</th>
          <th>{{ HEADERS[kind][1] }}</th>
          <th v-if="!hideMid(kind)">{{ HEADERS[kind][2] }}</th>
          <th>{{ HEADERS[kind][3] }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in rows" :key="r.name">
          <td><code class="api-tbl__name">{{ r.name }}</code></td>
          <td><code class="api-tbl__type">{{ r.type }}</code></td>
          <td v-if="!hideMid(kind)">
            <code v-if="r.default !== undefined && r.default !== ''" class="api-tbl__def">{{ r.default }}</code>
            <span v-else class="api-tbl__dash">—</span>
          </td>
          <td class="api-tbl__desc" v-html="r.desc"></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.api-tbl-wrap { overflow-x: auto; margin: 12px 0 20px; }
.api-tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--in-font-size-sm, 13px);
}
.api-tbl th {
  text-align: left;
  padding: 8px 12px;
  background: var(--in-bg-default, #fbfbfb);
  border-bottom: 2px solid var(--in-border-default, #e2e2e2);
  color: var(--in-text-accent, #010101);
  font-weight: 600;
  white-space: nowrap;
}
.api-tbl td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--in-border-default, #e2e2e2);
  color: var(--in-text-default, #565656);
  vertical-align: top;
}
.api-tbl__name { color: var(--in-brand, #13a9e9); font-weight: 600; }
.api-tbl__type, .api-tbl__def {
  font-family: var(--in-font-family-mono, ui-monospace, monospace);
  font-size: 12px;
  color: var(--in-text-subtle, #8a8a8a);
}
.api-tbl__def { color: var(--in-text-warning, #b8860b); }
.api-tbl__dash { color: var(--in-text-state-disabled, #b0b0b0); }
.api-tbl__desc :deep(code) {
  padding: 1px 5px;
  background: var(--in-bg-default, #f3f3f3);
  border-radius: 4px;
  font-family: var(--in-font-family-mono, monospace);
  font-size: 12px;
}
</style>
