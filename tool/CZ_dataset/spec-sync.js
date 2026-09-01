(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.FtSpecSync = factory();
  }
})(typeof globalThis === "object" ? globalThis : this, function () {
  const fields = new Set(["min", "typ", "max"]);
  const invalidSpecMessage = "規格必須是數字、空白或有效的 VCC/VIO 公式";

  function parseRawSpecValue(rawValue, row) {
    const raw = String(rawValue ?? "").trim();
    if (raw === "") {
      return { valid: true, raw: null, value: null };
    }

    const numeric = Number(raw);
    if (Number.isFinite(numeric)) {
      return { valid: true, raw, value: numeric };
    }

    const expression = raw.toUpperCase().replace(/\s+/g, "");
    if (!expression.includes("VCC") && !expression.includes("VIO")) {
      return { valid: false, raw, value: null, message: invalidSpecMessage };
    }

    const vcc = Number.parseFloat(row?.vcc);
    const vio = Number.parseFloat(row?.vio);
    if (expression.includes("VCC") && !Number.isFinite(vcc)) {
      return { valid: false, raw, value: null, message: invalidSpecMessage };
    }
    if (expression.includes("VIO") && !Number.isFinite(vio)) {
      return { valid: false, raw, value: null, message: invalidSpecMessage };
    }

    const substituted = expression
      .replace(/VCC/g, String(vcc))
      .replace(/VIO/g, String(vio));
    if (!/^[0-9.+\-*/()]+$/.test(substituted)) {
      return { valid: false, raw, value: null, message: invalidSpecMessage };
    }

    try {
      const value = Function(
        '"use strict"; return (' + substituted + ")"
      )();
      return Number.isFinite(value)
        ? { valid: true, raw, value: Number(value.toFixed(12)) }
        : { valid: false, raw, value: null, message: invalidSpecMessage };
    } catch {
      return { valid: false, raw, value: null, message: invalidSpecMessage };
    }
  }

  function applySpecEdit({
    specs,
    data,
    specRowIdx,
    field,
    rawValue,
    resolveValue,
    getLinkedSpecRowIds,
    recalculateRow,
  }) {
    if (!fields.has(field)) {
      throw new Error(`Unsupported spec field: ${field}`);
    }

    const target = specs.find(
      (spec) => String(spec.rowIdx) === String(specRowIdx)
    );
    if (!target) {
      return {
        specs,
        data,
        changed: false,
        error: "找不到對應的規格列",
      };
    }

    const context =
      data.find(
        (row) => String(row.specRowIdx) === String(specRowIdx)
      ) || target;
    const linkedIds = new Set(
      Array.from(
        getLinkedSpecRowIds
          ? getLinkedSpecRowIds(target, data)
          : [String(target.rowIdx)]
      ).map(String)
    );
    const rawField = `raw${field[0].toUpperCase()}${field.slice(1)}`;
    const parsedByRowIdx = new Map();

    for (const spec of specs) {
      if (!linkedIds.has(String(spec.rowIdx))) continue;
      const specContext =
        data.find(
          (row) => String(row.specRowIdx) === String(spec.rowIdx)
        ) || context;
      const parsed = parseRawSpecValue(rawValue, specContext);
      if (!parsed.valid) {
        return {
          specs,
          data,
          changed: false,
          error: parsed.message || "規格格式無效",
        };
      }
      parsedByRowIdx.set(String(spec.rowIdx), parsed);
    }

    const nextSpecs = specs.map((spec) => {
      if (!linkedIds.has(String(spec.rowIdx))) return spec;
      const parsed = parsedByRowIdx.get(String(spec.rowIdx));
      return {
        ...spec,
        [field]: parsed.value,
        [rawField]: parsed.raw,
      };
    });
    const nextSpecByRowIdx = new Map(
      nextSpecs.map((spec) => [String(spec.rowIdx), spec])
    );
    const nextData = data.map((row) => {
      const spec = nextSpecByRowIdx.get(String(row.specRowIdx));
      if (!spec || !linkedIds.has(String(row.specRowIdx))) return row;
      return recalculateRow(
        row,
        spec,
        parsedByRowIdx.get(String(row.specRowIdx))
      );
    });

    return {
      specs: nextSpecs,
      data: nextData,
      changed: true,
      error: null,
    };
  }

  return { applySpecEdit };
});
