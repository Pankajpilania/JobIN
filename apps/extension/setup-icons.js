import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use the new square app icon (indigo/violet gradient with J+arrow mark)
const srcPath = 'C:\\Users\\pilan\\.gemini\\antigravity\\brain\\6a19703d-7171-4e16-ae97-e976515fda12\\jobin_icon_square_1781455144559.png';
const destDir = path.join(__dirname, 'icons');

if (!fs.existsSync(srcPath)) {
  console.error(`Error: Source logo not found at: ${srcPath}`);
  process.exit(1);
}

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
  console.log(`Created directory: ${destDir}`);
}

const targetIcons = ['icon16.png', 'icon32.png', 'icon48.png', 'icon128.png'];

targetIcons.forEach(iconName => {
  const destPath = path.join(destDir, iconName);
  fs.copyFileSync(srcPath, destPath);
  console.log(`Copied icon to: ${destPath}`);
});

console.log('Successfully set up all Chrome Extension icons!');
