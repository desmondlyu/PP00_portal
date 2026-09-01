import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import vm from "node:vm";

const root = dirname(fileURLToPath(import.meta.url));
const source = await readFile(join(root, "spec-sync.js"), "utf8");
const module = { exports: {} };
vm.runInNewContext(source, {
  module,
  exports: module.exports,
  globalThis: {},
});
const { applySpecEdit } = module.exports;

const specs = [
  {
    rowIdx: 10,
    item: "VIL",
    description: "shared",
    min: -500,
    typ: null,
    max: 300,
    rawMin: "-500",
    rawTyp: null,
    rawMax: "VCC*0.3",
  },
  {
    rowIdx: 11,
    item: "VIL",
    description: "different",
    min: -500,
    typ: null,
    max: 360,
    rawMin: "-500",
    rawTyp: null,
    rawMax: "VCC*0.3",
  },
  {
    rowIdx: 12,
    item: "VIL",
    description: "shared",
    min: -500,
    typ: null,
    max: 390,
    rawMin: "-500",
    rawTyp: null,
    rawMax: "VCC*0.3",
  },
  {
    rowIdx: 20,
    item: "OTHER",
    description: "other",
    min: 0,
    typ: null,
    max: 5,
    rawMin: "0",
    rawTyp: null,
    rawMax: "5",
  },
];

const data = [
  {
    specRowIdx: 10,
    item: "VIL",
    description: "shared",
    group: "Time",
    value: 250,
    specMin: -500,
    specTyp: null,
    specMax: 300,
    judge: "Pass",
    typ_judge: "N/A",
    value_spec_ratio: 1.2,
    vcc: 1000,
  },
  {
    specRowIdx: 11,
    item: "VIL",
    description: "different",
    group: "Time",
    value: 250,
    specMin: -500,
    specTyp: null,
    specMax: 360,
    judge: "Pass",
    typ_judge: "N/A",
    value_spec_ratio: 1.44,
    vcc: 1200,
  },
  {
    specRowIdx: 12,
    item: "VIL",
    description: "shared",
    group: "Time",
    value: 250,
    specMin: -500,
    specTyp: null,
    specMax: 390,
    judge: "Pass",
    typ_judge: "N/A",
    value_spec_ratio: 1.56,
    vcc: 1300,
  },
  {
    specRowIdx: 20,
    item: "OTHER",
    description: "other",
    group: "DC",
    value: 2,
    specMin: 0,
    specTyp: null,
    specMax: 5,
    judge: "Pass",
    typ_judge: "N/A",
    value_spec_ratio: 2.5,
    vcc: 1000,
    vio: 1800,
  },
];

function linkedSpecRowIds(spec) {
  return new Set(
    data
      .filter((row) => row.item === spec.item)
      .map((row) => String(row.specRowIdx))
  );
}

function resolveValue(rawValue, row) {
  const raw = String(rawValue ?? "").trim();
  if (raw === "") return { valid: true, raw: null, value: null };
  if (raw === "VCC*0.3") {
    return { valid: true, raw, value: Number(row.vcc) * 0.3 };
  }
  const value = Number(raw);
  return Number.isFinite(value)
    ? { valid: true, raw, value }
    : { valid: false, raw, value: null, message: "規格必須是數字或有效公式" };
}

function recalculateRow(row, spec) {
  const next = {
    ...row,
    specMin: spec.min,
    specTyp: spec.typ,
    specMax: spec.max,
  };
  const max = next.specMax;
  next.judge = max !== null && next.value > max ? "Fail" : "Pass";
  next.value_spec_ratio =
    max !== null && next.value !== 0 ? max / next.value : null;
  return next;
}

test("修改 Max 只更新相同 specRowIdx 的規格與資料列", () => {
  const result = applySpecEdit({
    specs,
    data,
    specRowIdx: 20,
    field: "max",
    rawValue: "3",
    resolveValue,
    getLinkedSpecRowIds: linkedSpecRowIds,
    recalculateRow,
  });

  assert.equal(result.changed, true);
  assert.equal(result.specs.find((row) => row.rowIdx === 20).max, 3);
  assert.equal(result.data.find((row) => row.specRowIdx === 20).specMax, 3);
  assert.equal(result.data.find((row) => row.specRowIdx === 20).judge, "Pass");
  assert.equal(result.specs.find((row) => row.rowIdx === 10).max, 300);
});

test("Time 群組修改只同步同 Item 與 Description 的規格列", () => {
  const result = applySpecEdit({
    specs,
    data,
    specRowIdx: 10,
    field: "max",
    rawValue: "200",
    resolveValue,
    getLinkedSpecRowIds: linkedSpecRowIds,
    recalculateRow,
  });

  assert.equal(result.specs.find((row) => row.rowIdx === 10).max, 200);
  assert.equal(result.specs.find((row) => row.rowIdx === 11).max, 360);
  assert.equal(result.specs.find((row) => row.rowIdx === 12).max, 200);
  assert.equal(result.data.find((row) => row.specRowIdx === 10).specMax, 200);
  assert.equal(result.data.find((row) => row.specRowIdx === 11).specMax, 360);
  assert.equal(result.data.find((row) => row.specRowIdx === 12).specMax, 200);
  assert.equal(result.specs.find((row) => row.rowIdx === 20).max, 5);
});

test("空白會清除規格，VCC 公式保留原文且使用 Value 相同單位", () => {
  const cleared = applySpecEdit({
    specs,
    data,
    specRowIdx: 10,
    field: "typ",
    rawValue: " ",
    resolveValue,
    getLinkedSpecRowIds: linkedSpecRowIds,
    recalculateRow,
  });
  assert.equal(cleared.specs.find((row) => row.rowIdx === 10).typ, null);
  assert.equal(cleared.specs.find((row) => row.rowIdx === 10).rawTyp, null);

  const formula = applySpecEdit({
    specs,
    data,
    specRowIdx: 10,
    field: "max",
    rawValue: "VCC*0.3",
    resolveValue,
    getLinkedSpecRowIds: linkedSpecRowIds,
    recalculateRow,
  });
  assert.equal(formula.specs.find((row) => row.rowIdx === 10).rawMax, "VCC*0.3");
  assert.equal(formula.specs.find((row) => row.rowIdx === 10).max, 300);
  assert.equal(formula.data.find((row) => row.specRowIdx === 10).specMax, 300);
  assert.equal(formula.specs.find((row) => row.rowIdx === 11).max, 360);
  assert.equal(formula.data.find((row) => row.specRowIdx === 11).specMax, 360);
  assert.equal(formula.specs.find((row) => row.rowIdx === 12).max, 390);
  assert.equal(formula.data.find((row) => row.specRowIdx === 12).specMax, 390);

  const vioFormula = applySpecEdit({
    specs,
    data,
    specRowIdx: 20,
    field: "max",
    rawValue: "VIO*0.5",
    resolveValue,
    getLinkedSpecRowIds: linkedSpecRowIds,
    recalculateRow,
  });
  assert.equal(vioFormula.specs.find((row) => row.rowIdx === 20).max, 900);
});

test("無效規格拒絕修改並保留原本 specs 與 data", () => {
  for (const rawValue of ["not-a-spec", "abc123", "VCC*0.3foo"]) {
    const result = applySpecEdit({
      specs,
      data,
      specRowIdx: 20,
      field: "max",
      rawValue,
      resolveValue,
      getLinkedSpecRowIds: linkedSpecRowIds,
      recalculateRow,
    });

    assert.equal(result.changed, false);
    assert.equal(result.error, "規格必須是數字、空白或有效的 VCC/VIO 公式");
    assert.deepEqual(result.specs, specs);
    assert.deepEqual(result.data, data);
  }
});

test("更新是不可變的，原始規格可繼續作為 Summary C 基準", () => {
  const before = structuredClone(specs);
  const result = applySpecEdit({
    specs,
    data,
    specRowIdx: 20,
    field: "max",
    rawValue: "3",
    resolveValue,
    getLinkedSpecRowIds: linkedSpecRowIds,
    recalculateRow,
  });

  assert.deepEqual(specs, before);
  assert.equal(result.specs.find((row) => row.rowIdx === 20).max, 3);
  assert.notEqual(result.specs, specs);
});
