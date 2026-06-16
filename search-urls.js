const fs = require('fs');
const path = require('path');

function searchFiles(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.next') {
        searchFiles(fullPath);
      }
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.json') || file.endsWith('.yaml') || file.endsWith('.yml')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('onrender.com') || content.includes('render.com') || content.includes('jobin-') || content.includes('vercel.app')) {
          console.log(`Match in ${fullPath}:`);
          const lines = content.split('\n');
          lines.forEach((line, index) => {
            if (line.includes('onrender.com') || line.includes('render.com') || line.includes('job-in') || line.includes('vercel.app') || line.includes('api-')) {
              console.log(`  Line ${index + 1}: ${line.trim()}`);
            }
          });
        }
      }
    }
  }
}

console.log('Searching in workspace...');
searchFiles('.');
