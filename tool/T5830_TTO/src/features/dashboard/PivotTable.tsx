import { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import type { MasterSummaryRow } from '../../types/analysis';
import { compareProducts } from '../../lib/productMetadata';

type ValueField = 'Grand_Total_Time' | 'Total_Merged_Count';
type DownloadHandler = (blob: Blob, filename: string) => void;
type ProductMeta = {
  product: string;
  process: string;
  size: string;
  voltage: string;
  totalTime: number;
  totalCount: number;
};
type DataRow = {
  label: string;
  values: number[];
  total: number;
};
type RenderRow = {
  label: string;
  values: Array<number | string>;
  total: number | string;
  isMetadata?: boolean;
};

const shellStyle = {
  overflowX: 'auto' as const,
  background: '#0f172a',
  border: '1px solid rgba(148, 163, 184, 0.25)',
  borderRadius: 12,
  padding: 12
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  background: '#111827',
  color: '#f8fafc',
  fontSize: 14,
  minWidth: 720
};

const headerCellStyle = {
  border: '1px solid rgba(148, 163, 184, 0.2)',
  background: '#1f2937',
  color: '#f8fafc',
  padding: '8px 12px',
  textAlign: 'center' as const,
  whiteSpace: 'nowrap' as const
};

const rowHeaderStyle = {
  ...headerCellStyle,
  textAlign: 'left' as const,
  position: 'sticky' as const,
  left: 0,
  zIndex: 1,
  minWidth: 220
};

const metadataHeaderStyle = {
  ...rowHeaderStyle,
  background: '#273449',
  color: '#e2e8f0'
};

const metadataCellStyle = {
  border: '1px solid rgba(148, 163, 184, 0.2)',
  background: '#1e293b',
  color: '#e2e8f0',
  padding: '8px 12px',
  textAlign: 'center' as const,
  whiteSpace: 'nowrap' as const
};

const buttonStyle = {
  marginBottom: 12,
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid rgba(148, 163, 184, 0.35)',
  background: '#1d4ed8',
  color: '#eff6ff',
  cursor: 'pointer'
};

function alphaColor(hex: string, alpha: number) {
  const value = hex.replace('#', '');
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function normalize(value: number, columnValues: number[]) {
  const max = Math.max(...columnValues, 0);
  const min = Math.min(...columnValues, 0);
  if (max === min) return value > 0 ? 1 : 0;
  return (value - min) / (max - min);
}

function cellStyle(value: number, columnValues: number[], heatColor: string) {
  const ratio = normalize(value, columnValues);
  return {
    border: '1px solid rgba(148, 163, 184, 0.2)',
    backgroundColor: alphaColor(heatColor, ratio * 0.5),
    color: '#f8fafc',
    padding: '8px 12px',
    textAlign: 'right' as const,
    whiteSpace: 'nowrap' as const
  };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function formatValue(value: number, valueField: ValueField) {
  return valueField === 'Grand_Total_Time' ? value.toFixed(2) : Math.round(value).toString();
}

function formatRatio(value: number) {
  return `${value.toFixed(2)}%`;
}

function buildProducts(rows: MasterSummaryRow[]) {
  const productMap = new Map<string, ProductMeta>();
  for (const row of rows) {
    const existing = productMap.get(row.Product);
    if (existing) {
      existing.totalTime += row.Grand_Total_Time;
      existing.totalCount += row.Total_Merged_Count;
      continue;
    }
    productMap.set(row.Product, {
      product: row.Product,
      process: row.Process,
      size: row.Size,
      voltage: row.Voltage,
      totalTime: row.Grand_Total_Time,
      totalCount: row.Total_Merged_Count
    });
  }
  return [...productMap.values()].sort((left, right) => compareProducts(left.product, right.product));
}

function buildPivotRows(rows: MasterSummaryRow[], products: ProductMeta[], valueField: ValueField) {
  const itemMap = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const productValues = itemMap.get(row.Test_Item_Merged) ?? new Map<string, number>();
    productValues.set(row.Product, (productValues.get(row.Product) ?? 0) + row[valueField]);
    itemMap.set(row.Test_Item_Merged, productValues);
  }
  return [...itemMap.entries()]
    .map(([label, valuesByProduct]) => {
      const values = products.map(({ product }) => valuesByProduct.get(product) ?? 0);
      return {
        label,
        values,
        total: values.reduce((sum, value) => sum + value, 0)
      };
    })
    .sort((left, right) => right.total - left.total || left.label.localeCompare(right.label));
}

function buildRatioRows(rows: MasterSummaryRow[], products: ProductMeta[]) {
  const itemMap = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const productValues = itemMap.get(row.Test_Item_Merged) ?? new Map<string, number>();
    productValues.set(row.Product, (productValues.get(row.Product) ?? 0) + row.Grand_Total_Time);
    itemMap.set(row.Test_Item_Merged, productValues);
  }
  return [...itemMap.entries()]
    .map(([label, valuesByProduct]) => {
      const values = products.map(({ product, totalTime }) => {
        const value = valuesByProduct.get(product) ?? 0;
        return totalTime > 0 ? (value / totalTime) * 100 : 0;
      });
      return {
        label,
        values,
        total: values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
      };
    })
    .sort((left, right) => right.total - left.total || left.label.localeCompare(right.label));
}

function buildSheetData(headers: string[], renderRows: RenderRow[], formatter: (value: number) => string) {
  return [
    headers,
    ...renderRows.map((row) => [
      row.label,
      ...row.values.map((value) => typeof value === 'number' ? formatter(value) : value),
      typeof row.total === 'number' ? formatter(row.total) : row.total
    ])
  ];
}

function exportWorkbook(
  sheetName: string,
  headers: string[],
  renderRows: RenderRow[],
  formatter: (value: number) => string,
  filename: string,
  onDownload?: DownloadHandler
) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(buildSheetData(headers, renderRows, formatter));
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  const blob = new Blob([XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  if (onDownload) {
    onDownload(blob, filename);
    return;
  }
  downloadBlob(blob, filename);
}

function DataTable({
  title,
  headers,
  renderRows,
  numericRows,
  totalLabel,
  formatter,
  heatColor,
  filename,
  sheetName,
  onDownload,
  defaultCollapsed = true
}: {
  title: string;
  headers: string[];
  renderRows: RenderRow[];
  numericRows: DataRow[];
  totalLabel: string;
  formatter: (value: number) => string;
  heatColor: string;
  filename: string;
  sheetName: string;
  onDownload?: DownloadHandler;
  defaultCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [tableWidth, setTableWidth] = useState(720);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const columnValues = headers.slice(1).map((_, index) => numericRows.map((row) =>
    index === headers.length - 2 ? row.total : row.values[index]
  ));

  useEffect(() => {
    if (collapsed || !tableRef.current) return;
    const updateWidth = () => setTableWidth(tableRef.current?.scrollWidth ?? 720);
    updateWidth();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updateWidth);
    observer.observe(tableRef.current);
    return () => observer.disconnect();
  }, [collapsed, headers.length, renderRows.length]);

  useEffect(() => {
    const top = topScrollRef.current;
    const bottom = bottomScrollRef.current;
    if (!top || !bottom) return;
    const syncTop = () => { bottom.scrollLeft = top.scrollLeft; };
    const syncBottom = () => { top.scrollLeft = bottom.scrollLeft; };
    top.addEventListener('scroll', syncTop);
    bottom.addEventListener('scroll', syncBottom);
    return () => {
      top.removeEventListener('scroll', syncTop);
      bottom.removeEventListener('scroll', syncBottom);
    };
  }, [collapsed]);

  return (
    <section aria-label={title}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <button
          type="button"
          style={buttonStyle}
          onClick={() => exportWorkbook(sheetName, headers, renderRows, formatter, filename, onDownload)}
        >
          下載 Excel
        </button>
        <button
          type="button"
          style={{ ...buttonStyle, background: collapsed ? '#475569' : '#64748b' }}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? '展開' : '收合'}
        </button>
      </div>
      {!collapsed && (
        <>
        <div ref={topScrollRef} className="pivot-top-scroll" aria-label={`${title} 上方水平捲軸`}>
          <div style={{ width: tableWidth, height: 1 }} />
        </div>
        <div ref={bottomScrollRef} style={shellStyle}>
          <table ref={tableRef} style={tableStyle}>
            <thead>
              <tr>
                <th scope="col" style={rowHeaderStyle}>測項</th>
                {headers.slice(1).map((header) => <th key={header} scope="col" style={headerCellStyle}>{header}</th>)}
              </tr>
            </thead>
            <tbody>
              {renderRows.map((row) => (
                <tr key={row.label}>
                  <th scope="row" style={row.isMetadata ? metadataHeaderStyle : rowHeaderStyle}>{row.label}</th>
                  {row.values.map((value, index) => (
                    <td
                      key={`${row.label}-${headers[index + 1]}`}
                      style={row.isMetadata || typeof value !== 'number'
                        ? metadataCellStyle
                        : cellStyle(value, columnValues[index], heatColor)}
                    >
                      {typeof value === 'number' ? formatter(value) : value}
                    </td>
                  ))}
                  <td
                    style={row.isMetadata || typeof row.total !== 'number'
                      ? metadataCellStyle
                      : cellStyle(row.total, columnValues[columnValues.length - 1], heatColor)}
                  >
                    {typeof row.total === 'number' ? formatter(row.total) : row.total}
                  </td>
                </tr>
              ))}
            </tbody>
            <caption style={{ captionSide: 'bottom', color: '#94a3b8', paddingTop: 12 }}>{totalLabel}</caption>
          </table>
        </div>
        </>
      )}
    </section>
  );
}

export function PivotTable({
  rows,
  valueField,
  onDownload,
  defaultCollapsed
}: {
  rows: MasterSummaryRow[];
  valueField: ValueField;
  onDownload?: DownloadHandler;
  defaultCollapsed?: boolean;
}) {
  const data = useMemo(() => {
    const products = buildProducts(rows);
    const numericRows = buildPivotRows(rows, products, valueField);
    const metadataRows: RenderRow[] = [
      {
        label: valueField === 'Grand_Total_Time' ? '📌 [產品總測試時間]' : '📌 [產品總測試次數]',
        values: products.map((product) => valueField === 'Grand_Total_Time'
          ? product.totalTime.toFixed(2)
          : Math.round(product.totalCount).toString()),
        total: 'N/A',
        isMetadata: true
      },
      {
        label: '🏭 [製程]',
        values: products.map((product) => product.process || 'N/A'),
        total: 'N/A',
        isMetadata: true
      },
      {
        label: '📦 [容量]',
        values: products.map((product) => product.size || 'N/A'),
        total: 'N/A',
        isMetadata: true
      },
      {
        label: '⚡ [電壓]',
        values: products.map((product) => product.voltage ? `${product.voltage}V` : 'N/A'),
        total: 'N/A',
        isMetadata: true
      }
    ];
    const renderRows = [
      ...metadataRows,
      ...numericRows.map((row) => ({
        label: row.label,
        values: row.values,
        total: row.total
      }))
    ];
    return {
      headers: ['測項', ...products.map((product) => product.product), '🌟 總計 (Total)'],
      renderRows,
      numericRows
    };
  }, [rows, valueField]);

  return (
    <DataTable
      title={valueField === 'Grand_Total_Time' ? 'Pivot Table Time' : 'Pivot Table Count'}
      headers={data.headers}
      renderRows={data.renderRows}
      numericRows={data.numericRows}
      totalLabel="Python 風格跨產品 Pivot Table"
      formatter={(value) => formatValue(value, valueField)}
      heatColor={valueField === 'Grand_Total_Time' ? '#FF8C00' : '#5DADE2'}
      filename={valueField === 'Grand_Total_Time' ? 'pivot-total-time.xlsx' : 'pivot-total-count.xlsx'}
      sheetName={valueField === 'Grand_Total_Time' ? 'Pivot_Time' : 'Pivot_Count'}
      onDownload={onDownload}
      defaultCollapsed={defaultCollapsed}
    />
  );
}

export function RatioTable({
  rows,
  onDownload
}: {
  rows: MasterSummaryRow[];
  onDownload?: DownloadHandler;
}) {
  const data = useMemo(() => {
    const products = buildProducts(rows);
    const numericRows = buildRatioRows(rows, products);
    const metadataRows: RenderRow[] = [
      {
        label: '📌 [產品總測試時間]',
        values: products.map((product) => product.totalTime.toFixed(2)),
        total: '-',
        isMetadata: true
      },
      {
        label: '🏭 [製程]',
        values: products.map((product) => product.process || 'N/A'),
        total: '-',
        isMetadata: true
      },
      {
        label: '📦 [容量]',
        values: products.map((product) => product.size || 'N/A'),
        total: '-',
        isMetadata: true
      },
      {
        label: '⚡ [電壓]',
        values: products.map((product) => product.voltage ? `${product.voltage}V` : 'N/A'),
        total: '-',
        isMetadata: true
      }
    ];
    const renderRows = [
      ...metadataRows,
      ...numericRows.map((row) => ({
        label: row.label,
        values: row.values,
        total: row.total
      }))
    ];
    return {
      headers: ['測項', ...products.map((product) => product.product), '🌟 平均佔比 (Avg)'],
      renderRows,
      numericRows
    };
  }, [rows]);

  return (
    <DataTable
      title="Ratio Table"
      headers={data.headers}
      renderRows={data.renderRows}
      numericRows={data.numericRows}
      totalLabel="各測項佔產品總測試時間比例"
      formatter={formatRatio}
      heatColor="#4ade80"
      filename="pivot-ratio.xlsx"
      sheetName="Pivot_Ratio"
      onDownload={onDownload}
    />
  );
}
