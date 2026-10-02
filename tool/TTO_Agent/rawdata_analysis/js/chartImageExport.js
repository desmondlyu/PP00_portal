(function attachChartImageExport(global) {
  const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
    for (let bit = 0; bit < 8; bit += 1) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
    return value >>> 0;
  });

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
    return (crc ^ 0xffffffff) >>> 0;
  }

  function renderPng(renderChart, palette) {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 600;
    const chart = renderChart(canvas, { responsive: false, animation: false, devicePixelRatio: 2, events: [] });
    if (!chart) return null;
    try {
      const legend = chart.options.plugins.legend;
      legend.labels.color = palette.text;
      legend.title.color = palette.text;
      for (const scale of Object.values(chart.options.scales)) {
        if (scale.ticks) scale.ticks.color = palette.muted;
        if (scale.grid) scale.grid.color = palette.border;
        if (scale.title) scale.title.color = palette.muted;
      }
      chart.update("none");

      const output = document.createElement("canvas");
      output.width = canvas.width;
      output.height = canvas.height;
      const context = output.getContext("2d", { alpha: false });
      if (!context) throw new Error("無法建立圖表圖片的 Canvas。");
      context.fillStyle = palette.background;
      context.fillRect(0, 0, output.width, output.height);
      context.drawImage(canvas, 0, 0);
      const dataUrl = output.toDataURL("image/png");
      if (!dataUrl.startsWith("data:image/png;base64,")) throw new Error("無法產生圖表 PNG 圖片。");
      return Uint8Array.from(atob(dataUrl.slice(dataUrl.indexOf(",") + 1)), (character) => character.charCodeAt(0));
    } finally {
      chart.destroy();
    }
  }

  async function createZip(files) {
    if (!files.length) throw new Error("目前沒有可打包的圖表圖片。");
    if (typeof CompressionStream === "undefined") {
      throw new Error("目前瀏覽器不支援圖片 ZIP 壓縮，請改用最新版 Chrome 或 Edge。");
    }
    const parts = [];
    const directory = [];
    const encoder = new TextEncoder();
    const now = new Date();
    const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    let offset = 0;
    let directorySize = 0;

    for (const file of files) {
      const name = encoder.encode(file.name);
      const compressed = new Uint8Array(await new Response(
        new Blob([file.data]).stream().pipeThrough(new CompressionStream("deflate-raw")),
      ).arrayBuffer());
      const checksum = crc32(file.data);
      // ZIP filenames use UTF-8 (bit 11); DEFLATE data must omit the zlib wrapper.
      const local = new Uint8Array(30);
      const header = new DataView(local.buffer);
      header.setUint32(0, 0x04034b50, true);
      header.setUint16(4, 20, true);
      header.setUint16(6, 0x0800, true);
      header.setUint16(8, 8, true);
      header.setUint16(10, time, true);
      header.setUint16(12, date, true);
      header.setUint32(14, checksum, true);
      header.setUint32(18, compressed.length, true);
      header.setUint32(22, file.data.length, true);
      header.setUint16(26, name.length, true);
      parts.push(local, name, compressed);

      const central = new Uint8Array(46);
      const entry = new DataView(central.buffer);
      entry.setUint32(0, 0x02014b50, true);
      entry.setUint16(4, 20, true);
      entry.setUint16(6, 20, true);
      entry.setUint16(8, 0x0800, true);
      entry.setUint16(10, 8, true);
      entry.setUint16(12, time, true);
      entry.setUint16(14, date, true);
      entry.setUint32(16, checksum, true);
      entry.setUint32(20, compressed.length, true);
      entry.setUint32(24, file.data.length, true);
      entry.setUint16(28, name.length, true);
      entry.setUint32(42, offset, true);
      directory.push(central, name);
      directorySize += central.length + name.length;
      offset += local.length + name.length + compressed.length;
    }

    const end = new Uint8Array(22);
    const footer = new DataView(end.buffer);
    footer.setUint32(0, 0x06054b50, true);
    footer.setUint16(8, files.length, true);
    footer.setUint16(10, files.length, true);
    footer.setUint32(12, directorySize, true);
    footer.setUint32(16, offset, true);
    return new Blob([...parts, ...directory, end], { type: "application/zip" });
  }

  global.TtoChartImageExport = { renderPng, createZip };
})(globalThis);
