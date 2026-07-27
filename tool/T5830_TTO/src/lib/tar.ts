const blockSize = 512;
const rawdataPrefix = 'home/winbond/rawdata/';

export type TarTextMember = {
  name: string;
  text: string;
};

export type TarProgress = {
  bytesRead: number;
  totalBytes: number;
  memberName?: string;
};

function isEmptyBlock(block: Uint8Array) {
  return block.every((byte) => byte === 0);
}

function readString(block: Uint8Array, start: number, length: number) {
  const value = new TextDecoder().decode(block.subarray(start, start + length));
  return value.split('\0', 1)[0].trim();
}

function readSize(block: Uint8Array) {
  const value = readString(block, 124, 12);
  if (!value) return 0;

  const size = Number.parseInt(value, 8);
  if (!Number.isSafeInteger(size) || size < 0) {
    throw new Error('TAR member size is invalid');
  }
  return size;
}

function isSafeRawdataTextMember(name: string) {
  return (
    name.startsWith(rawdataPrefix) &&
    name.endsWith('.txt') &&
    !name.slice(rawdataPrefix.length).split('/').includes('..')
  );
}

function nextBlockOffset(payloadEnd: number) {
  return Math.ceil(payloadEnd / blockSize) * blockSize;
}

function readAsArrayBuffer(blob: Blob) {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.readAsArrayBuffer(blob);
  });
}

function readAsText(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(reader.result as string);
    reader.readAsText(blob);
  });
}

async function readStreamMembers(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  let pending: Uint8Array<ArrayBufferLike> = new Uint8Array(0);
  const members: TarTextMember[] = [];

  async function readBytes(length: number) {
    const chunks: Uint8Array[] = [];
    let remaining = length;
    while (remaining > 0) {
      if (pending.length === 0) {
        const next = await reader.read();
        if (next.done || !next.value) throw new Error('TAR stream ended unexpectedly');
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

  async function skipBytes(length: number) {
    let remaining = length;
    while (remaining > 0) {
      if (pending.length === 0) {
        const next = await reader.read();
        if (next.done || !next.value) throw new Error('TAR stream ended unexpectedly');
        pending = next.value;
      }
      const count = Math.min(remaining, pending.length);
      pending = pending.subarray(count);
      remaining -= count;
    }
  }

  while (true) {
    const header = await readBytes(blockSize);
    if (isEmptyBlock(header)) break;

    const name = readString(header, 0, 100);
    const size = readSize(header);
    if (isSafeRawdataTextMember(name)) {
      const payload = await readBytes(size);
      members.push({ name, text: new TextDecoder().decode(payload) });
    } else {
      await skipBytes(size);
    }
    const padding = (blockSize - (size % blockSize)) % blockSize;
    if (padding) await skipBytes(padding);
  }

  return members;
}

export async function readRawdataTextMembers(
  file: File,
  onProgress?: (progress: TarProgress) => void,
  signal?: AbortSignal
): Promise<TarTextMember[]> {
  // ponytail: .tgz 已在主線程解壓，Worker 端直接解析 tar
  const lowerName = file.name.toLowerCase();
  if (!lowerName.endsWith('.tar') && !lowerName.endsWith('.tgz') && !lowerName.endsWith('.tar.gz')) {
    throw new Error('只支援 .tar 或 .tgz (.tar.gz) 格式的壓縮檔。');
  }

  if (lowerName.endsWith('.tgz') || lowerName.endsWith('.tar.gz')) {
    if (typeof DecompressionStream === 'undefined' || !file.stream) {
      throw new Error('目前瀏覽器不支援大型 .tgz 串流解析，請改用最新版 Chrome 或 Edge。');
    }
    return readStreamMembers(file.stream().pipeThrough(new DecompressionStream('gzip')));
  }

  const members: TarTextMember[] = [];
  let offset = 0;

  while (offset + blockSize <= file.size) {
    if (signal?.aborted) throw new DOMException('Analysis cancelled', 'AbortError');

    const header = new Uint8Array(await readAsArrayBuffer(file.slice(offset, offset + blockSize)));
    if (isEmptyBlock(header)) break;

    const name = readString(header, 0, 100);
    const size = readSize(header);
    const payloadStart = offset + blockSize;
    const payloadEnd = payloadStart + size;

    if (payloadEnd > file.size) {
      throw new Error('TAR member payload exceeds archive boundary');
    }

    if (isSafeRawdataTextMember(name)) {
      members.push({
        name,
        text: await readAsText(file.slice(payloadStart, payloadEnd))
      });
    }

    offset = nextBlockOffset(payloadEnd);
    onProgress?.({ bytesRead: Math.min(offset, file.size), totalBytes: file.size, memberName: name });
  }

  return members;
}
