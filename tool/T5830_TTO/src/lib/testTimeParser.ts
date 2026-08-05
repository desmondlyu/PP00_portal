import type { ParsedTestRow } from '../types/analysis';

const sitePattern = /_S(\d{4})/;
const timePattern = /:(\d{3}):/;
const testHeaderPattern = /\/{2,}\s*(\d+)\s*,\s*([^,]+?)\s*\/{2,}/;
const x1x2Pattern = /X1\s*=\s*([^;]+);\s*X2\s*=\s*([^;)]+)/;
const xPattern = /X\s*=\s*([a-zA-Z0-9_.-]+(?:\s*~\s*[a-zA-Z0-9_.-]+)?)/;
const excludedSweepKeywords = [
  'cam',
  'readback',
  'repair',
  'check_uv',
  'check_final_info',
  'positive_gate_stress',
  'ifr_mark',
  'pulse_chip_erase_loop',
  'dr_check',
  'outlier'
];

function siteFromFileName(fileName: string) {
  const match = sitePattern.exec(fileName);
  return `Site_${Number.parseInt(match?.[1] ?? '9999', 10).toString().padStart(2, '0')}`;
}

export function parseTestTimeText(text: string, fileName: string): ParsedTestRow[] {
  const rows: ParsedTestRow[] = [];
  const site = siteFromFileName(fileName);
  let currentTouchdown: number | undefined;
  let step = 1;
  let sweepInfo = 'None';
  const testNoByItem = new Map<string, number>();

  for (const line of text.split(/\r?\n/)) {
    const testHeader = testHeaderPattern.exec(line);
    if (testHeader) {
      testNoByItem.set(testHeader[2].trim(), Number.parseInt(testHeader[1], 10));
    }

    if (line.includes('####')) {
      sweepInfo = 'None';
      continue;
    }

    const range = x1x2Pattern.exec(line);
    const single = range ? undefined : xPattern.exec(line);
    if (range) {
      sweepInfo = `${range[1].trim()}~${range[2].trim()}`;
    } else if (single) {
      sweepInfo = single[1].replace(/\s/g, '');
    }

    const markerIndex = line.indexOf('<<< Test Time >>>');
    if (markerIndex < 0) continue;

    const touchdownMatch = timePattern.exec(line.slice(0, markerIndex));
    const touchdown = Number.parseInt(touchdownMatch?.[1] ?? '1', 10);
    if (touchdown !== currentTouchdown) {
      currentTouchdown = touchdown;
      step = 1;
    }

    const fields = line.slice(markerIndex + '<<< Test Time >>>'.length)
      .split(',')
      .map((field) => field.trim())
      .filter(Boolean);
    if (fields.length < 3) continue;

    const testItem = fields[1];
    const timeSeconds = Number.parseFloat(fields[2]);
    if (!Number.isFinite(timeSeconds)) continue;

    const row: ParsedTestRow = {
      site,
      touchdown: `TD_${touchdown}`,
      step: step++,
      testItem,
      sweepInfo: excludedSweepKeywords.some((keyword) => testItem.toLowerCase().includes(keyword))
        ? 'None'
        : sweepInfo,
      timeSeconds
    };
    const testNo = testNoByItem.get(testItem);
    if (testNo !== undefined) row.testNo = testNo;
    rows.push(row);
  }

  return rows;
}
