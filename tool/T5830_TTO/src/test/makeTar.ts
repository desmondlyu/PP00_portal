const blockSize = 512;

function textBytes(value: string) {
  return new TextEncoder().encode(value);
}

export function makeTar(entries: Array<[string, string]>) {
  const blocks: BlobPart[] = [];

  for (const [name, content] of entries) {
    const header = new Uint8Array(blockSize);
    header.set(textBytes(name).subarray(0, 100));
    header.set(textBytes(content.length.toString(8).padStart(11, '0') + '\0'), 124);
    header[156] = '0'.charCodeAt(0);

    blocks.push(header, textBytes(content), new Uint8Array((blockSize - (content.length % blockSize)) % blockSize));
  }

  blocks.push(new Uint8Array(blockSize * 2));
  return new File(blocks, 'sample.tar');
}
