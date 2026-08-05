import { useState } from 'react';
import type { MasterSummaryRow } from '../../types/analysis';
import type { MappingRow } from '../../lib/workbook';

type TreeLevel = 'mode' | 'operation' | 'test-item' | 'original-item' | 'raw-test-item';
type TreeNode = {
  key: string;
  label: string;
  level: TreeLevel;
  time: number;
  children: TreeNode[];
  stationRatio?: number;
  ratioTouchdown?: string;
};

const levelLabels: Record<TreeLevel, string> = {
  mode: 'Mode',
  operation: 'Operation',
  'test-item': 'Test_Item_Merged',
  'original-item': 'Original_Item_Name',
  'raw-test-item': 'Test_Item'
};

function rowTime(row: MasterSummaryRow) {
  return Number(row.Station_Time ?? row.Grand_Total_Time) || 0;
}

function maxTouchdownRatio(row: MasterSummaryRow) {
  const ratios = Object.entries(row.touchdownStats ?? {})
    .map(([touchdown, stats]) => ({ touchdown, ratio: stats.ratio }))
    .sort((left, right) => right.ratio - left.ratio || left.touchdown.localeCompare(right.touchdown, undefined, { numeric: true }));
  if (ratios[0]) return ratios[0];
  if (row.Test_Item_Station_Ratio !== undefined) return { touchdown: 'TD_1', ratio: row.Test_Item_Station_Ratio };
  return undefined;
}

function buildTree(rows: MasterSummaryRow[], mapping: MappingRow[]) {
  const lookup = new Map(mapping.map((item) => [item.Original_Item_Name.trim(), item]));
  const root = new Map<string, TreeNode>();
  const getOrCreate = (parent: Map<string, TreeNode>, label: string, level: TreeLevel, key: string) => {
    const existing = parent.get(key);
    if (existing) return existing;
    const node: TreeNode = { key, label, level, time: 0, children: [] };
    parent.set(key, node);
    return node;
  };

  for (const row of rows) {
    const mapped = lookup.get(row.Original_Item_Name.trim());
    const labels = [
      ['mode', mapped?.Mode?.trim() || 'Not Classified'],
      ['operation', mapped?.Operation?.trim() || 'Not Classified'],
      ['test-item', row.Test_Item_Merged],
      ['original-item', row.Original_Item_Name],
      ['raw-test-item', row.Test_Item?.trim() || row.Original_Item_Name.replace(/_\(M\)$/i, '')]
    ] as const;
    const time = rowTime(row);
    let children = root;
    let parent: TreeNode | undefined;
    const path: string[] = [];
    for (const [level, label] of labels) {
      path.push(label);
      const node = getOrCreate(children, label, level, path.join('\0'));
      node.time += time;
      const touchdownRatio = level === 'raw-test-item' ? maxTouchdownRatio(row) : undefined;
      if (touchdownRatio && (node.stationRatio === undefined || touchdownRatio.ratio > node.stationRatio)) {
        node.stationRatio = touchdownRatio.ratio;
        node.ratioTouchdown = touchdownRatio.touchdown;
      }
      if (parent) parent.children = [...children.values()];
      parent = node;
      children = new Map(parent.children.map((child) => [child.key, child]));
    }
  }

  return [...root.values()].sort((a, b) => b.time - a.time || a.label.localeCompare(b.label));
}

function TreeNodeView({ node, total, expanded, onToggle, depth }: {
  node: TreeNode;
  total: number;
  expanded: Set<string>;
  onToggle: (key: string) => void;
  depth: number;
}) {
  const isExpanded = expanded.has(node.key);
  const hasChildren = node.children.length > 0;
  const ratio = (node.level === 'raw-test-item' && node.stationRatio !== undefined
    ? node.stationRatio
    : node.time / (total || 0.000001) * 100).toFixed(2);
  return (
    <div className={`sunburst-tree-branch sunburst-tree-depth-${depth}`}>
      <button
        type="button"
        className={`sunburst-tree-node ${node.level}`}
        aria-expanded={hasChildren ? isExpanded : undefined}
        onClick={() => hasChildren && onToggle(node.key)}
      >
        <span className="sunburst-tree-node-label">
          {hasChildren ? (isExpanded ? '▾' : '▸') : '•'} {node.label}
        </span>
        <span className="sunburst-tree-node-meta">
          <span>{node.level === 'raw-test-item' && node.ratioTouchdown
            ? `${levelLabels[node.level]} · ${node.ratioTouchdown}`
            : levelLabels[node.level]}</span>
          <strong>{ratio}%</strong>
        </span>
      </button>
      {isExpanded && hasChildren && (
        <div className="sunburst-tree-children">
          {node.children.map((child) => (
            <TreeNodeView key={child.key} node={child} total={total} expanded={expanded} onToggle={onToggle} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function SunburstTree({ rows, mapping = [], title }: {
  rows: MasterSummaryRow[];
  mapping?: MappingRow[];
  title: string;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const nodes = buildTree(rows, mapping);
  const total = nodes.reduce((sum, node) => sum + node.time, 0);

  function toggleNode(key: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <section className="sunburst-tree" aria-label={`${title} 關聯樹`}>
      <h3>{title} 關聯樹</h3>
      <p className="sunburst-tree-hint">點擊節點展開 Mode → Operation → Test Item Merged → Original Item → Test Item</p>
      {nodes.map((node) => (
        <TreeNodeView key={node.key} node={node} total={total} expanded={expanded} onToggle={toggleNode} depth={0} />
      ))}
    </section>
  );
}
