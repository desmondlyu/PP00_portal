// ponytail: 1:1 移植 dashboard.py 的 PRODUCT_METADATA + get_sort_key

export type ProductMeta = { Process: string; Size: string; Voltage: string };

let _metadata: Record<string, ProductMeta> = {
  TC8258:    { Process: 'F45', Size: '32M',  Voltage: '1.8' },
  TC8257:    { Process: 'F45', Size: '128M', Voltage: '1.2' },
  AAG070:    { Process: 'F58', Size: '512M', Voltage: '3.0' },
  EAG077:    { Process: 'F58', Size: '512M', Voltage: '1.8' },
  EAG085:    { Process: 'F58', Size: '512M', Voltage: '1.8' },
  EAG0850S0: { Process: 'F58', Size: '512M', Voltage: '1.8' },
  FAG091:    { Process: 'F45', Size: '128M', Voltage: '1.8' },
  FAG102:    { Process: 'F45', Size: '8M',   Voltage: '1.8' },
  FAG103:    { Process: 'F45', Size: '256M', Voltage: '1.8' },
  EAG104:    { Process: 'F58', Size: '256M', Voltage: '1.2' },
  AAG106:    { Process: 'F58', Size: '512M', Voltage: '3.0' },
  EAG108:    { Process: 'F58', Size: '256M', Voltage: '1.8' },
  FAG109:    { Process: 'F45', Size: '64M',  Voltage: '1.8' },
  FAG111:    { Process: 'F45', Size: '16M',  Voltage: '1.8' },
  FAG112:    { Process: 'F45', Size: '32M',  Voltage: '1.8' },
  FAG113:    { Process: 'F45', Size: '32M',  Voltage: '1.8' },
  EAG115:    { Process: 'F58', Size: '128M', Voltage: '1.8' },
  EAG116:    { Process: 'F58', Size: '64M',  Voltage: '1.8' },
  AAG117:    { Process: 'F58', Size: '512M', Voltage: '1.8' },
  EAG118:    { Process: 'F58', Size: '512M', Voltage: '1.2' },
  EAG119:    { Process: 'F58', Size: '512M', Voltage: '1.8' },
  EAG120:    { Process: 'F58', Size: '128K', Voltage: '1.2' },
  EAG121:    { Process: 'F58', Size: '16M',  Voltage: '1.2' },
  EAG122:    { Process: 'F58', Size: '64M',  Voltage: '1.2' },
  EAG123:    { Process: 'F58', Size: '32M',  Voltage: '1.2' },
  EAG124:    { Process: 'F58', Size: '8M',   Voltage: '1.2' },
  AAG127:    { Process: 'F58', Size: '128M', Voltage: '3.0' },
  AAG128:    { Process: 'F58', Size: '32M',  Voltage: '3.0' },
  AAG129:    { Process: 'F58', Size: '64M',  Voltage: '3.0' },
  EAG131:    { Process: 'F58', Size: '256M', Voltage: '1.8' },
  EAG132:    { Process: 'F58', Size: '128M', Voltage: '1.8' },
  EAG133:    { Process: 'F58', Size: '32M',  Voltage: '1.8' },
  EAG134:    { Process: 'F58', Size: '64M',  Voltage: '1.8' },
  FAG135:    { Process: 'F45', Size: '128M', Voltage: '1.2' },
  FAG136:    { Process: 'F45', Size: '32M',  Voltage: '1.8' },
  FAG138:    { Process: 'F45', Size: '128M', Voltage: '1.8' },
  EAG142:    { Process: 'F45', Size: '512M', Voltage: '1.8' },
};

// ponytail: 允許匯入覆蓋，但保留 getter 讓其他模組正常引用
export const PRODUCT_METADATA: Record<string, ProductMeta> = _metadata;

/** 合併新產品清單（新增 + 覆蓋） */
export function mergeProductMetadata(incoming: Record<string, ProductMeta>) {
  Object.assign(_metadata, incoming);
}

/** 匯出目前完整清單 */
export function exportProductMetadata(): Record<string, ProductMeta> {
  return { ..._metadata };
}

/** Python get_sort_key: F45 < F58, then voltage ascending, then name */
export function getProductSortKey(name: string): [number, number, string] {
  const meta = PRODUCT_METADATA[name];
  const process = meta?.Process ?? 'Z_Unknown';
  const voltageStr = meta?.Voltage ?? '99';

  const pGroup = process.startsWith('F45') ? 1 : process.startsWith('F58') ? 2 : 99;

  let vVal: number;
  if (voltageStr === '1.2') vVal = 1.2;
  else if (voltageStr === '1.8') vVal = 1.8;
  else if (voltageStr === '1.8-3') vVal = 1.9;
  else if (voltageStr === '3' || voltageStr === '3.0') vVal = 3.0;
  else vVal = 99.0;

  return [pGroup, vVal, name];
}

/** Compare two products using the Python sort order */
export function compareProducts(a: string, b: string): number {
  const ka = getProductSortKey(a);
  const kb = getProductSortKey(b);
  return ka[0] - kb[0] || ka[1] - kb[1] || ka[2].localeCompare(kb[2]);
}

/** Look up metadata for a product, returns defaults if unknown */
export function getProductMeta(name: string): ProductMeta {
  return PRODUCT_METADATA[name] ?? { Process: 'N/A', Size: 'N/A', Voltage: 'N/A' };
}
