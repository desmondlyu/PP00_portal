import { useState, useRef } from 'react';
import type { MasterSummaryRow } from '../../types/analysis';
import { distinct, type DashboardFilters as FilterValues } from './dashboardSelectors';

type Props = {
  rows: MasterSummaryRow[];
  value: FilterValues;
  onChange: (value: FilterValues) => void;
};

/** 可多選的下拉選單 */
function MultiSelectDropdown({
  label,
  selected,
  options,
  onChange
}: {
  label: string;
  selected: string[];
  options: string[];
  onChange: (value: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  function toggle(option: string) {
    if (selected.includes(option)) {
      onChange(selected.filter((v) => v !== option));
    } else {
      onChange([...selected, option]);
    }
  }

  const displayText = selected.length === 0 ? '全部' : selected.join(', ');

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block', minWidth: 130 }}>
      <label style={{ fontSize: '0.8em', color: 'var(--muted)', display: 'block', marginBottom: 2 }}>{label}</label>
      <button type="button" onClick={() => setOpen(!open)}
        aria-expanded={open} aria-haspopup="listbox"
        style={{
          width: '100%', textAlign: 'left', padding: '6px 28px 6px 10px',
          border: '1px solid rgba(88,202,255,.4)', borderRadius: 8,
          background: 'var(--surface)', color: 'var(--ink)', fontSize: '0.9em',
          cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          position: 'relative'
        }}>
        {displayText}
        <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}>▾</span>
      </button>
      {open && (
        <div role="listbox" aria-multiselectable="true"
          style={{
            position: 'absolute', bottom: '100%', left: 0, zIndex: 100, marginBottom: 4,
            background: 'var(--surface, #1e1e2e)', border: '1px solid rgba(88,202,255,.4)',
            borderRadius: 8, padding: '6px 0', minWidth: '100%', maxHeight: 200, overflowY: 'auto',
            boxShadow: '0 4px 16px rgba(0,0,0,.4)'
          }}>
          {options.map((option) => (
            <div key={option} role="option" aria-selected={selected.includes(option)}
              onClick={() => toggle(option)}
              style={{
                padding: '5px 12px', cursor: 'pointer', fontSize: '0.88em',
                display: 'flex', alignItems: 'center', gap: 6,
                background: selected.includes(option) ? 'rgba(88,202,255,.15)' : 'transparent'
              }}>
              <span style={{ width: 16, textAlign: 'center' }}>{selected.includes(option) ? '✓' : ''}</span>
              {option}
            </div>
          ))}
          {selected.length > 0 && (
            <div onClick={() => onChange([])}
              style={{ padding: '5px 12px', cursor: 'pointer', fontSize: '0.8em', color: '#f87171', borderTop: '1px solid rgba(255,255,255,.1)', marginTop: 4 }}>
              清除全部
            </div>
          )}
        </div>
      )}
      {/* 點擊外部關閉 */}
      {open && <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setOpen(false)} />}
    </div>
  );
}

export function DashboardFilters({ rows, value, onChange }: Props) {
  return (
    <div style={{
      position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
      zIndex: 1000, display: 'flex', flexWrap: 'wrap', gap: 12,
      padding: '12px 24px', borderRadius: 14,
      background: 'rgba(15, 23, 42, 0.92)', backdropFilter: 'blur(12px)',
      border: '1px solid rgba(88, 202, 255, 0.3)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
    }}>
      <MultiSelectDropdown label="製程" selected={value.process} options={distinct(rows, 'Process')}
        onChange={(process) => onChange({ ...value, process })} />
      <MultiSelectDropdown label="容量" selected={value.size} options={distinct(rows, 'Size')}
        onChange={(size) => onChange({ ...value, size })} />
      <MultiSelectDropdown label="電壓" selected={value.voltage} options={distinct(rows, 'Voltage')}
        onChange={(voltage) => onChange({ ...value, voltage })} />
      <MultiSelectDropdown label="產品" selected={value.product} options={distinct(rows, 'Product')}
        onChange={(product) => onChange({ ...value, product })} />
    </div>
  );
}
