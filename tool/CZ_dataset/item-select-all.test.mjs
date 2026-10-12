import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import vm from "node:vm";
import { parse } from "@babel/parser";

const root = dirname(fileURLToPath(import.meta.url));
const html = await readFile(join(root, "index.html"), "utf8");
const bundle = html.match(
  /<script type="module" crossorigin>([\s\S]*?)<\/script>/
)?.[1];
assert.ok(bundle, "CZ Dataset inline module should exist");
const ast = parse(bundle, { sourceType: "module" });
const dropdown = ast.program.body.find(
  (node) => node.type === "FunctionDeclaration" && node.id.name === "Ii"
);
assert.ok(dropdown, "shared Item dropdown should exist");
const declarations = dropdown.body.body.flatMap((node) => node.declarations ?? []);
const expression = (name) => {
  const node = declarations.find((entry) => entry.id.name === name)?.init;
  assert.ok(node, `dropdown expression ${name} should exist`);
  return bundle.slice(node.start, node.end);
};
const selectAllSource = expression("p");
const filteredOptionsSource = expression("g");

function findDescriptionFilter(node) {
  if (!node || typeof node !== "object") return null;
  if (
    node.type === "ObjectProperty" &&
    node.key.name === "filterFunction" &&
    node.value.type === "ArrowFunctionExpression"
  ) return node.value;
  for (const child of Object.values(node)) {
    for (const entry of Array.isArray(child) ? child : [child]) {
      const result = findDescriptionFilter(entry);
      if (result) return result;
    }
  }
  return null;
}
const chartFilter = findDescriptionFilter(ast.program);
assert.ok(chartFilter, "Charts Item/Description search should exist");
const chartFilterSource = bundle.slice(chartFilter.start, chartFilter.end);

// Synthetic Item names and descriptions, not production data.
const items = ["VOH SINGLE", "VOH DUAL", "VIL", "ICC"];
function selectAll({
  keyword = "",
  selected = [],
  hasSearch = true,
  descriptions = null,
} = {}) {
  const calls = [];
  const context = vm.createContext({
    t: items,
    r: selected,
    c: keyword,
    s: hasSearch,
    i: (value) => value,
    p: descriptions ?? [],
    n: (values) => calls.push(Array.from(values)),
  });
  vm.runInContext(
    `const o = ${descriptions ? chartFilterSource : "null"};
     const g = ${filteredOptionsSource};
     (${selectAllSource})();`,
    context
  );
  return calls;
}

test("searched Item select-all replaces unrelated selections with matching Items", () => {
  assert.deepEqual(
    selectAll({ keyword: "VOH", selected: ["ICC"] }),
    [["VOH SINGLE", "VOH DUAL"]]
  );
});

test("Item select-all follows the existing case-insensitive search", () => {
  assert.deepEqual(
    selectAll({ keyword: "vOh", selected: items }),
    [["VOH SINGLE", "VOH DUAL"]]
  );
});

test("clearing the search restores select-all of the complete Item list", () => {
  assert.deepEqual(selectAll({ selected: ["VIL"] }), [items]);
});

test("no matching Items preserves the current selection instead of selecting everything", () => {
  assert.deepEqual(
    selectAll({ keyword: "NO_MATCH", selected: ["ICC"] }),
    []
  );
});

test("Charts select-all includes matches from Description search", () => {
  assert.deepEqual(
    selectAll({
      keyword: "test output",
      selected: ["ICC"],
      descriptions: [
        { item: "VOH SINGLE", description: "Test Output voltage" },
        { item: "VOH DUAL", description: "Other description" },
      ],
    }),
    [["VOH SINGLE"]]
  );
});

test("non-search dropdowns retain the original complete select-all behavior", () => {
  assert.deepEqual(
    selectAll({ keyword: "VOH", hasSearch: false }),
    [items]
  );
});
