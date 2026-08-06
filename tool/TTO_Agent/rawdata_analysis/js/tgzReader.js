(function attachTgzReader(global) {
  const BLOCK_SIZE = 512;

  function readString(block, start, length) {
    return new TextDecoder().decode(block.subarray(start, start + length)).split("\0", 1)[0].trim();
  }

  function readSize(block) {
    const value = readString(block, 124, 12);
    const size = Number.parseInt(value, 8);
    if (!Number.isSafeInteger(size) || size < 0) throw new Error("TGZ 內的 TAR 檔案格式無效。");
    return size;
  }

  function isRawdataTextMember(name) {
    const parts = name.split("/").filter(Boolean);
    const homeIndex = parts.findIndex((part) => part.toLowerCase() === "home");
    return homeIndex >= 0 &&
      parts[homeIndex + 2]?.toLowerCase() === "rawdata" &&
      /\.txt$/i.test(parts.at(-1) || "") &&
      !parts.includes("..");
  }

  async function forEachTgzRawdataTextMember(file, onMember) {
    if (!/\.tgz$/i.test(file.name)) throw new Error("只支援 .TGZ 壓縮檔。");
    if (typeof DecompressionStream === "undefined") {
      throw new Error("目前瀏覽器不支援 .TGZ 串流解析，請改用最新版 Chrome 或 Edge。");
    }

    const reader = file.stream().pipeThrough(new DecompressionStream("gzip")).getReader();
    let pending = new Uint8Array(0);

    async function take(length) {
      const chunks = [];
      let remaining = length;
      while (remaining > 0) {
        if (!pending.length) {
          const next = await reader.read();
          if (next.done || !next.value) throw new Error("TGZ 內容不完整或格式錯誤。");
          pending = next.value;
        }
        const count = Math.min(remaining, pending.length);
        chunks.push(pending.subarray(0, count));
        pending = pending.subarray(count);
        remaining -= count;
      }
      if (chunks.length === 1) return chunks[0];
      const result = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      return result;
    }

    async function skip(length) {
      while (length > 0) {
        const chunk = await take(Math.min(length, 64 * 1024));
        length -= chunk.length;
      }
    }

    while (true) {
      const header = await take(BLOCK_SIZE);
      if (header.every((byte) => byte === 0)) break;

      const name = readString(header, 0, 100);
      const size = readSize(header);
      if (isRawdataTextMember(name)) {
        await onMember({
          name: name.split("/").at(-1),
          text: new TextDecoder().decode(await take(size))
        });
      } else {
        await skip(size);
      }
      const padding = (BLOCK_SIZE - size % BLOCK_SIZE) % BLOCK_SIZE;
      if (padding) await skip(padding);
    }
  }

  global.forEachTgzRawdataTextMember = forEachTgzRawdataTextMember;
  if (typeof module !== "undefined") module.exports = { forEachTgzRawdataTextMember };
})(typeof window === "undefined" ? globalThis : window);
