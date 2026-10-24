import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const extensionDir = path.dirname(fileURLToPath(import.meta.url));
const iconSizes = [16, 32, 48, 128];

for (const size of iconSizes) {
  const iconPath = path.join(extensionDir, 'icons', `icon${size}.png`);
  if (!fs.existsSync(iconPath)) {
    throw new Error(`Missing extension icon: ${iconPath}`);
  }

  const icon = fs.readFileSync(iconPath);
  const isPng =
    icon.length >= 24 &&
    icon.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (!isPng || icon.readUInt32BE(16) !== size || icon.readUInt32BE(20) !== size) {
    throw new Error(`Expected a valid ${size}x${size} PNG extension icon at ${iconPath}`);
  }
}

console.log('Verified Chrome extension icons.');
