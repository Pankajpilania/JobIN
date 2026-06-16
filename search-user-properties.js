const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'apps', 'web', 'src');
const pattern = /\buser\?\.(a-zA-Z0-9_]+)/g; // wait, let's make it a correct regex: /\buser\?\.([a-zA-Z0-9_]+)/g

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

walkDir(srcDir, (filePath) => {
  const ext = path.extname(filePath);
  if (ext !== '.tsx' && ext !== '.ts') return;

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    let match;
    const regex = /\buser\?\.([a-zA-Z0-9_]+)/g;
    while ((match = regex.exec(line)) !== null) {
      const prop = match[1];
      console.log(`${path.relative(__dirname, filePath)}:${idx + 1}: ${prop} -> "${line.trim()}"`);
    }
  });
});
