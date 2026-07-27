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

export async function readRawdataTextMembers(
  file: File,
  onProgress?: (progress: TarProgress) => void,
  signal?: AbortSignal
): Promise<TarTextMember[]> {
  if (!file.name.toLowerCase().endsWith('.tar')) {
    throw new Error('只支援 .tar 壓縮檔；.tgz 與 .tar.gz 無法處理。');
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
