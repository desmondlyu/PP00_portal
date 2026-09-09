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

  function throwIfAborted(signal) {
    if (signal?.aborted) throw new DOMException("TGZ 分析已取消。", "AbortError");
  }

  async function forEachTgzRawdataTextMemberChunked(file, handlers = {}) {
    if (!/\.tgz$/i.test(file.name)) throw new Error("只支援 .TGZ 壓縮檔。");
    if (typeof DecompressionStream === "undefined") {
      throw new Error("目前瀏覽器不支援 .TGZ 串流解析，請改用最新版 Chrome 或 Edge。");
    }

    const signal = handlers.signal;
    const reader = file.stream().pipeThrough(new DecompressionStream("gzip")).getReader();
    let pending = new Uint8Array(0);

    async function take(length) {
      throwIfAborted(signal);
      const chunks = [];
      let remaining = length;
      while (remaining > 0) {
        throwIfAborted(signal);
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
        throwIfAborted(signal);
        const chunk = await take(Math.min(length, 64 * 1024));
        length -= chunk.length;
      }
    }

    while (true) {
      throwIfAborted(signal);
      const header = await take(BLOCK_SIZE);
      if (header.every((byte) => byte === 0)) break;

      const name = readString(header, 0, 100);
      const size = readSize(header);
      if (isRawdataTextMember(name)) {
        const member = {
          path: name,
          name: name.split("/").at(-1),
          size,
        };
        await handlers.onStart?.(member);
        let remaining = size;
        while (remaining > 0) {
          const chunk = await take(Math.min(remaining, 64 * 1024));
          await handlers.onChunk?.(chunk);
          remaining -= chunk.length;
        }
        await handlers.onEnd?.(member);
      } else {
        await skip(size);
      }
      const padding = (BLOCK_SIZE - size % BLOCK_SIZE) % BLOCK_SIZE;
      if (padding) await skip(padding);
    }
  }

  async function forEachTgzRawdataTextMember(file, onMember) {
    let decoder = new TextDecoder();
    let text = "";
    await forEachTgzRawdataTextMemberChunked(file, {
      onStart(nextMember) {
        decoder = new TextDecoder();
        text = "";
      },
      onChunk(chunk) {
        text += decoder.decode(chunk, { stream: true });
      },
      async onEnd(nextMember) {
        text += decoder.decode();
        await onMember({
          name: nextMember.name,
          text,
        });
      },
    });
  }

  global.forEachTgzRawdataTextMember = forEachTgzRawdataTextMember;
  global.forEachTgzRawdataTextMemberChunked = forEachTgzRawdataTextMemberChunked;
  if (typeof module !== "undefined") {
    module.exports = { forEachTgzRawdataTextMember, forEachTgzRawdataTextMemberChunked };
  }
})(typeof window === "undefined" ? globalThis : window);
