import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const html = fs.readFileSync(new URL("./index.html", import.meta.url), "utf8");
const script = html.match(
  /<script id="analysis-core">([\s\S]*?)<\/script>/,
)?.[1];
const context = vm.createContext({});
vm.runInContext(script || "globalThis.Analysis = {}", context);
const A = context.Analysis;
const dl = (...rows) =>
  [
    "header",
    "header",
    "header",
    "header",
    "header",
    "<X> <Y> <ISB> <ICC> <CAT>",
    ...rows,
  ].join("\n");
test("DL import retains missing cells, stable IDs and numeric CAT category", () => {
  assert.equal(typeof A.parseDL, "function");
  const d = A.parseDL(dl("0 0 N/A 2 1", "1 0 *** 3 2", "2 0 4 5 1", "bad row"));
  assert.equal(d.rows.length, 3);
  assert.equal(d.skipped, 1);
  assert.equal(d.rows[0].ISB, null);
  assert.equal(d.rows[1].ISB, null);
  assert.equal(d.rows[2]._id, 2);
  assert.equal(d.fields.find((f) => f.name === "CAT").type, "category");
});
test("parser rejects missing coordinate columns and duplicated headers", () => {
  assert.equal(typeof A.parseDL, "function");
  assert.throws(() => A.parseDL("a\nb\nc\nd\ne\n<X> <ISB>\n0 1"), /X.*Y/);
  assert.throws(() => A.parseDL("a\nb\nc\nd\ne\n<X> <Y> <X>\n0 1 2"), /重複/);
});
test("log samples exclude zero, negative and missing, keeping original IDs", () => {
  assert.equal(typeof A.samples, "function");
  const rows = [
    { _id: 4, a: 0, b: 2 },
    { _id: 9, a: 1, b: 3 },
    { _id: 10, a: null, b: 4 },
    { _id: 11, a: -2, b: 5 },
  ];
  const s = A.samples(rows, "a", "b", "log", "linear");
  assert.equal(s.length, 1);
  assert.equal(s[0].row._id, 9);
});
test("multiple X and Y produce all separate chart pairs", () => {
  assert.equal(typeof A.pairs, "function");
  assert.equal(
    JSON.stringify(A.pairs({ type: "scatter", x: ["a", "b"], y: ["c", "d"] })),
    JSON.stringify([
      ["a", "c"],
      ["b", "c"],
      ["a", "d"],
      ["b", "d"],
    ]),
  );
});
test("histogram assigns each finite observation once including upper bound", () => {
  assert.equal(typeof A.histogram, "function");
  const bins = A.histogram(
    [
      { v: 0, row: { _id: 1 } },
      { v: 1, row: { _id: 2 } },
      { v: 2, row: { _id: 3 } },
      { v: 2, row: { _id: 4 } },
    ],
    2,
  );
  assert.equal(bins.length, 2);
  assert.equal(bins[0].items.length, 1);
  assert.equal(bins[1].items.length, 3);
});
test("selection uses stable row IDs across filtering and supports empty replacement", () => {
  assert.equal(typeof A.selectRect, "function");
  const pts = [
    { px: 10, py: 10, row: { _id: 99 } },
    { px: 20, py: 20, row: { _id: 7 } },
  ];
  assert.equal(
    JSON.stringify(A.selectRect(pts, { x: 0, y: 0, w: 15, h: 15 })),
    JSON.stringify([99]),
  );
  assert.equal(A.selectRect(pts, { x: 30, y: 30, w: 1, h: 1 }).length, 0);
});
test("box statistics preserve original min/max whisker convention", () => {
  assert.equal(typeof A.summary, "function");
  const s = A.summary([1, 2, 3, 4, 100, null, NaN]);
  assert.equal(s.n, 5);
  assert.equal(s.median, 3);
  assert.equal(s.min, 1);
  assert.equal(s.max, 100);
  assert.equal(A.summary([]), null);
});
test("layout validation strips unknown fields and data, rejects invalid schemas", () => {
  assert.equal(typeof A.validateLayout, "function");
  const fields = [
    { name: "a", type: "number" },
    { name: "CAT", type: "category" },
  ];
  const l = A.validateLayout(
    {
      version: 1,
      wafer: "a",
      rows: ["SECRET"],
      charts: [
        {
          type: "scatter",
          x: ["a", "<script>"],
          y: ["a"],
          group: "CAT",
          xScale: "evil",
        },
      ],
    },
    fields,
  );
  assert.equal(l.rows, undefined);
  assert.equal(l.charts[0].x.length, 1);
  assert.equal(l.charts[0].xScale, "linear");
  assert.throws(() => A.validateLayout({ version: 99 }, fields), /版本/);
});
test("CSV preserves negative numbers while escaping text formulas", () => {
  assert.equal(typeof A.csvCell, "function");
  assert.equal(A.csvCell(-12), '"-12"');
  assert.equal(A.csvCell("=1+1"), '"\'=1+1"');
  assert.equal(A.csvCell(null), '""');
});
test("numeric and category filters combine without treating missing as zero", () => {
  assert.equal(typeof A.filterRows, "function");
  const rows = [
    { _id: 1, a: null, CAT: 1 },
    { _id: 2, a: -2, CAT: 1 },
    { _id: 3, a: 3, CAT: 2 },
    { _id: 4, a: 0, CAT: 1 },
  ];
  const rules = [
    { field: "a", type: "number", min: -3, max: 1 },
    { field: "CAT", type: "category", values: ["1"] },
  ];
  assert.equal(
    JSON.stringify(A.filterRows(rows, rules).map((r) => r._id)),
    JSON.stringify([2, 4]),
  );
  assert.equal(
    A.filterRows(rows, [{ field: "CAT", type: "category", values: [] }]).length,
    0,
  );
});
test("group counts retain all distinct categories without rescanning the sample", () => {
  assert.equal(typeof A.groupCounts, "function");
  let visits = 0;
  const rows = Array.from({ length: 20000 }, (_, i) => ({ key: String(i) }));
  const counts = A.groupCounts(rows, (r) => {
    visits++;
    return r.key;
  });
  assert.equal(visits, 20000);
  assert.equal(counts.size, 20000);
  assert.equal(counts.get("19999"), 1);
});
