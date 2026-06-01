// ★ (2026-06-01, dspark): #1 결손기능 — Excel 다운로드/업로드 (IBSheet Down2Excel/LoadExcel 대체).
//   exceljs(MIT)를 동적 import 하여 메인 번들에 포함하지 않음(필요 시점 로드).
//   tui-grid 인스턴스의 columns/data 를 기준으로 .xlsx 입출력.

async function loadExcelJS() {
  const mod = await import('exceljs');
  return mod.default || mod;
}

/** 보이는 데이터 컬럼만 (rowHeader/checkbox 제외). */
function dataColumns(grid) {
  return (grid.getColumns?.() || []).filter((c) => c && c.name && c.name !== '_number' && c.name !== '_checked');
}

/**
 * 그리드 현재 데이터를 .xlsx 로 다운로드.
 * @param {object} grid - tui-grid 인스턴스
 * @param {object} [opts] - { fileName='grid', sheetName='Sheet1', columns? }
 */
export async function exportGridToExcel(grid, opts = {}) {
  const ExcelJS = await loadExcelJS();
  const cols = opts.columns || dataColumns(grid);
  const data = grid.getData?.() || [];

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(opts.sheetName || 'Sheet1');
  ws.columns = cols.map((c) => ({ header: c.header || c.name, key: c.name, width: c.width ? Math.max(10, c.width / 7) : 18 }));
  data.forEach((row) => {
    const flat = {};
    cols.forEach((c) => { flat[c.name] = row[c.name]; });
    ws.addRow(flat);
  });
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).alignment = { vertical: 'middle' };

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${opts.fileName || 'grid'}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * .xlsx File 을 파싱하여 row 객체 배열로 반환. (헤더행 라벨 → 컬럼 name 매핑)
 * @param {File} file
 * @param {object} [opts] - { columns: [{name, header}], sheetIndex=0 }
 * @returns {Promise<Array<object>>}
 */
export async function importExcelToRows(file, opts = {}) {
  const ExcelJS = await loadExcelJS();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const ws = wb.worksheets[opts.sheetIndex || 0];
  if (!ws) return [];

  // 헤더 라벨 → name 매핑 (columns 제공 시). 없으면 헤더 라벨을 그대로 key 로.
  const headerToName = {};
  (opts.columns || []).forEach((c) => { headerToName[(c.header || c.name)] = c.name; });

  const headers = [];
  ws.getRow(1).eachCell((cell, col) => { headers[col] = String(cell.value ?? '').trim(); });

  const cellText = (v) => {
    if (v == null) return '';
    if (typeof v === 'object') return v.text ?? v.result ?? v.richText?.map((t) => t.text).join('') ?? String(v);
    return v;
  };

  const rows = [];
  ws.eachRow((row, idx) => {
    if (idx === 1) return; // 헤더
    const obj = {};
    row.eachCell((cell, col) => {
      const label = headers[col];
      if (!label) return;
      obj[headerToName[label] || label] = cellText(cell.value);
    });
    if (Object.keys(obj).length) rows.push(obj);
  });
  return rows;
}
