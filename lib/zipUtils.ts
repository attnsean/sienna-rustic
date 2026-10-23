/**
 * Pure TypeScript ZIP Archive Generator
 * Zero external dependencies. Browser & Node.js compatible.
 * Generates valid standard PKZip (.zip) archives.
 */

export interface ZipFileEntry {
  name: string;
  data: string | Uint8Array | ArrayBuffer;
}

// Precomputed CRC32 table
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  CRC_TABLE[i] = c >>> 0;
}

function calculateCrc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ data[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function stringToBytes(str: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str);
  }
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i) & 0xFF;
  }
  return bytes;
}

/**
 * Creates a valid ZIP archive as Uint8Array from an array of files
 */
export function createZipArchive(files: ZipFileEntry[]): Uint8Array {
  const fileRecords: {
    nameBytes: Uint8Array;
    dataBytes: Uint8Array;
    crc: number;
    offset: number;
    size: number;
  }[] = [];

  const chunks: Uint8Array[] = [];
  let currentOffset = 0;

  // Process files & build local headers
  for (const file of files) {
    const nameBytes = stringToBytes(file.name);
    let dataBytes: Uint8Array;

    if (typeof file.data === 'string') {
      dataBytes = stringToBytes(file.data);
    } else if (file.data instanceof Uint8Array) {
      dataBytes = file.data;
    } else if (file.data instanceof ArrayBuffer) {
      dataBytes = new Uint8Array(file.data);
    } else {
      dataBytes = new Uint8Array(0);
    }

    const crc = calculateCrc32(dataBytes);
    const size = dataBytes.length;

    // Local Header (30 bytes + name)
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(localHeader.buffer);

    view.setUint32(0, 0x04034B50, true); // Local file header signature
    view.setUint16(4, 20, true);          // Version needed to extract (2.0)
    view.setUint16(6, 0x0800, true);      // General purpose bit flag (UTF-8)
    view.setUint16(8, 0, true);           // Compression method (0 = store)
    view.setUint16(10, 0x4800, true);     // File last mod time (09:00:00)
    view.setUint16(12, 0x5D41, true);     // File last mod date (2026-10-20)
    view.setUint32(14, crc, true);        // CRC-32
    view.setUint32(18, size, true);       // Compressed size
    view.setUint32(22, size, true);       // Uncompressed size
    view.setUint16(26, nameBytes.length, true); // File name length
    view.setUint16(28, 0, true);          // Extra field length

    localHeader.set(nameBytes, 30);

    chunks.push(localHeader);
    chunks.push(dataBytes);

    fileRecords.push({
      nameBytes,
      dataBytes,
      crc,
      offset: currentOffset,
      size
    });

    currentOffset += localHeader.length + dataBytes.length;
  }

  // Central Directory
  const centralDirStart = currentOffset;
  let centralDirSize = 0;

  for (const record of fileRecords) {
    const cdHeader = new Uint8Array(46 + record.nameBytes.length);
    const view = new DataView(cdHeader.buffer);

    view.setUint32(0, 0x02014B50, true); // Central directory signature
    view.setUint16(4, 20, true);          // Version made by
    view.setUint16(6, 20, true);          // Version needed
    view.setUint16(8, 0x0800, true);      // UTF-8 flag
    view.setUint16(10, 0, true);          // Compression method
    view.setUint16(12, 0x4800, true);     // Time
    view.setUint16(14, 0x5D41, true);     // Date
    view.setUint32(16, record.crc, true); // CRC-32
    view.setUint32(20, record.size, true);// Compressed size
    view.setUint32(24, record.size, true);// Uncompressed size
    view.setUint16(28, record.nameBytes.length, true); // Name length
    view.setUint16(30, 0, true);          // Extra field length
    view.setUint16(32, 0, true);          // Comment length
    view.setUint16(34, 0, true);          // Disk number start
    view.setUint16(36, 0, true);          // Internal attributes
    view.setUint32(38, 0, true);          // External attributes
    view.setUint32(42, record.offset, true); // Relative offset of local header

    cdHeader.set(record.nameBytes, 46);
    chunks.push(cdHeader);
    centralDirSize += cdHeader.length;
  }

  // End of Central Directory Record (22 bytes)
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054B50, true);      // EOCD signature
  eocdView.setUint16(4, 0, true);               // Disk number
  eocdView.setUint16(6, 0, true);               // Central dir disk
  eocdView.setUint16(8, fileRecords.length, true);  // Disk entries
  eocdView.setUint16(10, fileRecords.length, true); // Total entries
  eocdView.setUint32(12, centralDirSize, true); // Central dir size
  eocdView.setUint32(16, centralDirStart, true);// Central dir offset
  eocdView.setUint16(20, 0, true);              // Comment length
  chunks.push(eocd);

  // Combine into single Uint8Array
  let totalLength = 0;
  for (const c of chunks) totalLength += c.length;

  const result = new Uint8Array(totalLength);
  let writeOffset = 0;
  for (const c of chunks) {
    result.set(c, writeOffset);
    writeOffset += c.length;
  }

  return result;
}

/**
 * Trigger browser download of ZIP file
 */
export function downloadZipInBrowser(filename: string, files: ZipFileEntry[]): void {
  const zipBytes = createZipArchive(files);
  const blob = new Blob([zipBytes.buffer as ArrayBuffer], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.zip') ? filename : filename + '.zip';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
