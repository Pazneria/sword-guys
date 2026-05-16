export interface PngInfo {
  width: number;
  height: number;
  bitDepth: number;
  colorType: number;
  hasAlpha: boolean;
}

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

const readUint32 = (bytes: Uint8Array, offset: number) =>
  ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;

export const parsePngInfo = (bytes: Uint8Array): PngInfo | null => {
  if (bytes.length < 33) return null;
  for (let index = 0; index < PNG_SIGNATURE.length; index += 1) {
    if (bytes[index] !== PNG_SIGNATURE[index]) return null;
  }
  const chunkType = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
  if (chunkType !== 'IHDR') return null;
  const colorType = bytes[25];
  return {
    width: readUint32(bytes, 16),
    height: readUint32(bytes, 20),
    bitDepth: bytes[24],
    colorType,
    hasAlpha: colorType === 4 || colorType === 6
  };
};
