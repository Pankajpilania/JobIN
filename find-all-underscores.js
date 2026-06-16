const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'apps', 'web', 'src');
const pattern = /\b_[a-zA-Z0-9_]+/g;

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
    while ((match = pattern.exec(line)) !== null) {
      const variable = match[0];
      // Exclude standard callback arguments
      if (['_event', '_req', '_res', '_next', '_', '__'].includes(variable)) continue;
      console.log(`${path.relative(__dirname, filePath)}:${idx + 1}: ${variable} -> "${line.trim()}"`);
    }
  });
});
