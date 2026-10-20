// Run with PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs if not installed locally.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH
    ? { executablePath: process.env.CHROMIUM_PATH }
    : {}),
  args: ["--no-sandbox"],
});
const page = await browser.newPage({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 2,
});
const errors = [],
  requests = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("request", (r) => {
  if (/^https?:/.test(r.url())) requests.push(r.url());
});
const settle = () =>
  page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
const state = () =>
  page.evaluate(() => ({
    rows: S.rows.length,
    active: activeRows().length,
    selected: [...S.selected],
    charts: S.charts.map((c) => ({ ...c })),
    rules: S.rules.length,
  }));
try {
  await page.goto(new URL("./index.html", import.meta.url).href);
  await page.click("#demo");
  await settle();
  let s = await state();
  assert.equal(s.charts.length, 3);
  assert.equal(s.rows, 1789);
  // Real drag-and-drop adds a second Y parameter and produces independent axes.
  await page
    .locator('[data-field="VTH"]')
    .dragTo(page.locator("[data-chart]").first().locator('[data-role="y"]'));
  await settle();
  assert.equal(
    await page.locator("[data-chart]").first().locator(".facet").count(),
    2,
  );
  // Category colors stay identical when a plot omits one category.
  assert.equal(
    await page.evaluate(
      () =>
        groupInfo(S.rows, "CAT").color("2") ===
        groupInfo(
          S.rows.filter((r) => r.CAT === 2),
          "CAT",
        ).color("2"),
    ),
    true,
  );
  // Select the wafer's bottom-right area via pointer input, then explicitly filter.
  const box = await page.locator("#wafer").boundingBox();
  await page.mouse.move(box.x + box.width * 0.62, box.y + box.height * 0.58);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.88, {
    steps: 6,
  });
  await page.mouse.up();
  await settle();
  s = await state();
  assert.ok(s.selected.length > 0);
  assert.equal(s.active, s.rows);
  const count = s.selected.length;
  await page.click("#filter-selection");
  await settle();
  assert.equal((await state()).active, count);
  await page.click("#clear-selection");
  await settle();
  assert.equal((await state()).active, count);
  assert.equal((await state()).selected.length, 0);
  await page.click("#reset-filter");
  await settle();
  assert.equal((await state()).active, 1789);
  // Exact filters retain the old min/max workflow.
  await page.locator("#filters-panel summary").click();
  await page.selectOption("#filter-field", "ISB");
  await page.fill("#filter-min", "1");
  await page.click("#apply-filter");
  await settle();
  assert.equal(
    await page.evaluate(() => activeRows().every((r) => r.ISB >= 1)),
    true,
  );
  assert.ok((await state()).active < 1789);
  await page.click("#reset-filter");
  await settle();
  await page.selectOption("#filter-field", "CAT");
  await page.locator('[data-category="1"]').uncheck();
  await page.locator('[data-category="2"]').uncheck();
  await page.click("#apply-filter");
  await settle();
  assert.equal(
    await page.evaluate(() => activeRows().every((r) => r.CAT === 3)),
    true,
  );
  await page.click("#reset-filter");
  await settle();
  // Click path also works without drag: add field to a new chart.
  await page.click("#add-chart");
  await page.locator('[data-field="ISB"]').click();
  await page.click('[data-assign="x"]');
  await page.locator('[data-field="ICC"]').click();
  await page.click('[data-assign="y"]');
  await settle();
  assert.equal((await state()).charts.at(-1).x[0], "ISB");
  await page
    .locator("[data-chart]")
    .last()
    .locator('[data-action="copy"]')
    .click();
  assert.equal((await state()).charts.length, 5);
  await page
    .locator("[data-chart]")
    .last()
    .locator('[data-action="delete"]')
    .click();
  assert.equal((await state()).charts.length, 4);
  // Serialized layout contains configuration only, and round-trips through file input.
  let pending = page.waitForEvent("download");
  await page.click("#save-layout");
  let dl = await pending;
  const saved = await fs.readFile(await dl.path(), "utf8");
  const layout = JSON.parse(saved);
  assert.equal(layout.rows, undefined);
  assert.equal(layout.charts.length, 4);
  await page
    .locator("[data-chart]")
    .last()
    .locator('[data-action="delete"]')
    .click();
  await page.setInputFiles("#layout-file", {
    name: "layout.json",
    mimeType: "application/json",
    buffer: Buffer.from(saved),
  });
  await settle();
  assert.equal((await state()).charts.length, 4);
  pending = page.waitForEvent("download");
  await page.click("#wafer-png");
  dl = await pending;
  const png = await fs.readFile(await dl.path());
  assert.equal(png.subarray(1, 4).toString(), "PNG");
  pending = page.waitForEvent("download");
  await page.click("#export");
  dl = await pending;
  const csv = await fs.readFile(await dl.path(), "utf8");
  assert.ok(csv.includes('"-24"'));
  assert.ok(!csv.includes('"\'-24"'));
  // Histogram brush and scatter selection must highlight the same stable die IDs.
  const hist = page
    .locator("[data-chart]")
    .filter({ has: page.locator('option[value="hist"][selected]') })
    .first();
  const histCanvas = await hist.locator("canvas").boundingBox();
  await page.mouse.move(histCanvas.x + 55, histCanvas.y + 30);
  await page.mouse.down();
  await page.mouse.move(histCanvas.x + 100, histCanvas.y + 160);
  await page.mouse.up();
  await settle();
  assert.ok((await state()).selected.length > 0);
  // Reload malformed/missing/constant data; parser message, log scale and empty filters remain usable.
  const source = [
    "a",
    "b",
    "c",
    "d",
    "e",
    "<X> <Y> <ISB> <ICC> <CAT>",
    "-1 0 N/A 2 1",
    "0 0 0 2 1",
    "1 0 -1 2 2",
    "2 0 1 2 2",
    "2 0 1 2 2",
    "bad row",
  ].join("\n");
  await page.setInputFiles("#file", {
    name: "edge.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(source),
  });
  await settle();
  assert.equal((await state()).rows, 5);
  assert.ok(await page.locator("#notice").isVisible());
  await page
    .locator("[data-chart]")
    .first()
    .locator('[data-setting="xScale"]')
    .selectOption("log");
  await settle();
  assert.match(await page.locator(".plot-note").first().textContent(), /N=2/);
  await page.selectOption("#filter-field", "ISB");
  await page.fill("#filter-min", "999");
  await page.click("#apply-filter");
  await settle();
  assert.equal((await state()).active, 0);
  assert.equal(await page.locator("#reset-filter").isDisabled(), false);
  await page.click("#reset-filter");
  // Untrusted field content is rendered as text, never markup.
  const hostile = [
    "a",
    "b",
    "c",
    "d",
    "e",
    "<X> <Y> <img/onerror=alert(1)>",
    "0 0 1",
  ].join("\n");
  await page.setInputFiles("#file", {
    name: "<img src=x onerror=alert(1)>.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(hostile),
  });
  await settle();
  assert.equal(await page.locator("#filename img").count(), 0);
  await page.evaluate(() => demo());
  await settle();
  await page
    .locator('[data-field="VTH"]')
    .dragTo(page.locator("[data-chart]").first().locator('[data-role="y"]'));
  await settle();
  if (process.env.SCREENSHOT_DIR)
    await page.screenshot({
      path: process.env.SCREENSHOT_DIR + "/cp-desktop.png",
      fullPage: true,
    });
  for (const width of [1100, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await settle();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
      true,
      `overflow at ${width}`,
    );
    assert.ok((await page.locator("#wafer").boundingBox()).width > 0);
  }
  if (process.env.SCREENSHOT_DIR)
    await page.screenshot({
      path: process.env.SCREENSHOT_DIR + "/cp-mobile.png",
      fullPage: true,
    });
  assert.deepEqual(errors, []);
  assert.deepEqual(requests, []);
  console.log(
    "PASS: offline import, drag/drop, multiple Y, selection/filter, CAT/min-max, chart lifecycle, layout, PNG/CSV, log/missing/constant/empty, escaping, responsive. No JS errors or network requests.",
  );
} finally {
  await browser.close();
}
