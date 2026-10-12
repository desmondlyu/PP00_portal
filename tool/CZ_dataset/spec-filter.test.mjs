import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import vm from "node:vm";

const root = dirname(fileURLToPath(import.meta.url));
const html = await readFile(join(root, "index.html"), "utf8");
const filterScript = html.match(
  /<script id="ft-spec-filter">([\s\S]*?)<\/script>/
)?.[1];

function loadFilter() {
  assert.ok(filterScript, "inline DATASHEET SPEC filter helper should exist");
  const window = {};
  vm.runInNewContext(filterScript, { window });
  return window.FtSpecFilter.filterSpecs;
}

const specs = [
  { item: "TCLQX", alignment: "NA", group: "Time" },
  { item: "TCLQX", alignment: "NA", group: "DC" },
  { item: "OTHER", alignment: "Yes", group: "Time" },
];

test("no selected values leave every spec visible", () => {
  const filterSpecs = loadFilter();
  assert.equal(filterSpecs(specs, {}).length, 3);
});

test("selected Item, alignment, and Group are combined with AND", () => {
  const filterSpecs = loadFilter();
  const result = filterSpecs(specs, {
    items: ["TCLQX"],
    alignments: ["NA"],
    groups: ["Time"],
  });

  assert.deepEqual(
    result.map((spec) => spec.item),
    ["TCLQX"]
  );
});
