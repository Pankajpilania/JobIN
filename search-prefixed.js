const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'apps', 'web', 'src');
const pattern = /(_col|_activeId|_id|_index|_key|_event|_ref)\b/;

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
    if (pattern.test(line)) {
      console.log(`${path.relative(__dirname, filePath)}:${idx + 1}: ${line.trim()}`);
    }
  });
});
