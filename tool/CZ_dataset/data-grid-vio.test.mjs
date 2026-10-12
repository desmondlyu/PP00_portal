import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import vm from "node:vm";
import { parse } from "@babel/parser";
import React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";

const root = dirname(fileURLToPath(import.meta.url));
const html = await readFile(join(root, "index.html"), "utf8");
const bundle = html.match(
  /<script type="module" crossorigin>([\s\S]*?)<\/script>/
)?.[1];
assert.ok(bundle, "CZ Dataset inline module should exist");
const ast = parse(bundle, { sourceType: "module" });
const names = new Set(["cfe", "Ii", "hy", "gm"]);
const componentSource = ast.program.body
  .filter((node) => node.type === "FunctionDeclaration" && names.has(node.id.name))
  .map((node) => bundle.slice(node.start, node.end))
  .join("\n");
const context = vm.createContext({ ct: React, Q: jsxRuntime });
vm.runInContext(componentSource, context);
const gridNode = ast.program.body.find(
  (node) => node.type === "FunctionDeclaration" && node.id.name === "cfe"
);
const filterNode = gridNode.body.body
  .flatMap((node) => node.declarations ?? [])
  .find((node) => node.id.name === "B").init.arguments[0];
const filterSource = bundle.slice(filterNode.start, filterNode.end);

// Synthetic display data; these are not production measurements.
function row(overrides = {}) {
  return {
    product: "TEST",
    temp: "130",
    vcc: 1.6,
    vio: 1.1,
    metric: "Average",
    item: "TEST ITEM",
    description: "UI fixture",
    group: "DC",
    alignment: "NA",
    dummy_rd: "",
    value: 1.08,
    specMin: 1.4,
    specTyp: null,
    specMax: null,
    value_spec_ratio: 0.7714,
    judge: "Fail",
    typ_judge: "",
    ...overrides,
  };
}

function renderGrid(rows) {
  return renderToStaticMarkup(
    React.createElement(context.cfe, {
      compareData: rows,
      originalDataMap: new Map(),
      onCellValueChange() {},
      onResetAll() {},
    })
  );
}

function rowCells(markup) {
  const body = markup.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1] ?? "";
  return Array.from(body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g), ([, cells]) =>
    Array.from(cells.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g), ([, value]) => value)
  );
}

function filterRows(rows, { vccs = [], vios = [] } = {}) {
  return vm.runInNewContext(`(${filterSource})()`, {
    e: rows,
    i: "",
    a: [],
    l: vccs,
    selectedVios: vios,
    p: [],
    w: [],
    v: [],
    c: ["Fail"],
    h: [],
    g: [],
    F() {},
  });
}

test("Data Grid places the VIO multi-select immediately after Vcc", () => {
  const markup = renderGrid([row()]);
  const labels = Array.from(
    markup.matchAll(/<label class="dropdown-label">([^<]+)<\/label>/g),
    ([, label]) => label
  );
  assert.equal(labels[labels.indexOf("Vcc") + 1], "VIO");
  assert.equal(labels.length, 9);
});

test("Data Grid displays VIO immediately after Vcc using three decimal places", () => {
  const markup = renderGrid([row({ vio: 1.1 }), row({ vio: 1.2 })]);
  const head = markup.match(/<thead>([\s\S]*?)<\/thead>/)?.[1] ?? "";
  const headers = Array.from(
    head.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g),
    ([, label]) => label
  );
  assert.equal(headers[headers.indexOf("Vcc") + 1], "VIO");
  assert.equal(headers.length, 17);
  const cells = rowCells(markup);
  assert.equal(cells[0][7], "1.600V");
  assert.equal(cells[0][8], "1.100V");
  assert.equal(cells[1][8], "1.200V");
  assert.equal(cells[0][9], "Average");
});

test("Data Grid shows a dash for missing VIO without treating zero as missing", () => {
  const markup = renderGrid(
    [null, undefined, "", NaN, 0].map((vio) => row({ vio }))
  );
  assert.deepEqual(
    rowCells(markup).map((cells) => cells[8]),
    ["-", "-", "-", "-", "0.000V"]
  );
});

test("empty Data Grid message spans the new VIO column", () => {
  const markup = renderGrid([]);
  assert.match(markup, /<td colSpan="17"|<td colspan="17"/);
});

test("Data Grid filters can wrap without squeezing the new VIO control", () => {
  const markup = renderGrid([row()]);
  assert.match(markup, /class="grid-controls" style="flex-wrap:wrap"/);
  assert.match(markup, /grid-template-columns:repeat\(auto-fit, minmax\(96px, 1fr\)\)/);
  assert.match(markup, /min-width:0/);
});

test("empty VIO selection keeps all rows visible", () => {
  const rows = [row({ vio: 1.1 }), row({ vio: 1.2 }), row({ vio: null })];
  assert.equal(filterRows(rows).length, 3);
});

test("selected VIO values filter independently and intersect with Vcc", () => {
  const rows = [
    row({ vcc: 1.6, vio: 1.1 }),
    row({ vcc: 1.6, vio: 1.2 }),
    row({ vcc: 1.8, vio: 1.2 }),
    row({ vcc: 1.8, vio: 1.3 }),
  ];
  assert.equal(filterRows(rows, { vios: ["1.2"] }).length, 2);
  assert.equal(filterRows(rows, { vios: ["1.1", "1.2"] }).length, 3);
  const result = filterRows(rows, { vccs: ["1.6"], vios: ["1.2"] });
  assert.equal(result.length, 1);
  assert.equal(result[0].vcc, 1.6);
  assert.equal(result[0].vio, 1.2);
  assert.equal(filterRows(rows, { vccs: ["1.6"], vios: ["1.3"] }).length, 0);
});

test("blank VIO filtering excludes the valid zero voltage", () => {
  const rows = [row({ vio: null }), row({ vio: NaN }), row({ vio: 0 })];
  assert.equal(filterRows(rows, { vios: ["Blank"] }).length, 2);
  const zero = filterRows(rows, { vios: ["0"] });
  assert.equal(zero.length, 1);
  assert.equal(zero[0].vio, 0);
});
