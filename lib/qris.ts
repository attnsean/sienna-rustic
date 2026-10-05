/**
 * QRIS Utility to convert Static QRIS to Dynamic QRIS with amount
 * Based on EMVCo standard used by QRIS (ASPI/BI)
 */

export function generateQRIS(staticQRIS: string, amount: number | string): string {
  // Check if it's a valid QRIS string (should start with 000201)
  if (!staticQRIS.startsWith("000201")) {
    return staticQRIS;
  }

  // 1. Remove CRC (last 4 characters) and Tag 63 Length 04 if present
  let baseQRIS = staticQRIS.slice(0, -4);
  if (baseQRIS.endsWith("6304")) {
    baseQRIS = baseQRIS.slice(0, -4);
  }

  // 2. Prepare Amount Tag (Tag 54)
  // Format: "54" + length + amount
  const strAmount = amount.toString();
  const amountTag = "54" + strAmount.length.toString().padStart(2, '0') + strAmount;

  // 3. Handle Tag 54 in the string
  // If Tag 54 already exists, replace it. Otherwise, insert before Tag 58 (Currency) or Tag 63 (CRC)
  if (baseQRIS.includes("54")) {
    // Regex to find tag 54 and its value
    const regex = /54\d{2}\d+/;
    baseQRIS = baseQRIS.replace(regex, amountTag);
  } else {
    // Insert before Tag 58 (Country Code usually Tag 58 or Tag 59)
    // Most QRIS have Tag 58 at the end before 63.
    // We'll insert it before Tag 58 if found, else just append.
    const tag58Index = baseQRIS.indexOf("5802ID");
    if (tag58Index !== -1) {
      baseQRIS = baseQRIS.slice(0, tag58Index) + amountTag + baseQRIS.slice(tag58Index);
    } else {
      baseQRIS += amountTag;
    }
  }

  // 4. Recalculate CRC-16 (CCITT-FALSE)
  const crc = crc16(baseQRIS + "6304");
  return baseQRIS + "6304" + crc.toUpperCase();
}

/**
 * CRC-16 CCITT-FALSE calculation
 */
function crc16(data: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
    }
  }
  return (crc & 0xFFFF).toString(16).padStart(4, '0');
}
