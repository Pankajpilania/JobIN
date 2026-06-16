const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'apps', 'web', 'src');

const targets = [
  { name: 'uppercase', pattern: /\buppercase\s*:/ },
  { name: 'lowercase', pattern: /\blowercase\s*:/ },
  { name: 'capitalize', pattern: /\bcapitalize\s*:/ },
  { name: 'italic', pattern: /\bitalic\s*:/ },
  { name: 'underline', pattern: /\bunderline\s*:/ },
  { name: 'absolute', pattern: /\babsolute\s*:/ },
  { name: 'relative', pattern: /\brelative\s*:/ },
  { name: 'fixed', pattern: /\bfixed\s*:/ },
  { name: 'sticky', pattern: /\bsticky\s*:/ },
  { name: 'static', pattern: /\bstatic\s*:/ },
  { name: 'hidden', pattern: /\bhidden\s*:/ },
  { name: 'block', pattern: /\bblock\s*:/ },
  { name: 'inline', pattern: /\binline\s*:/ },
  { name: 'pointer', pattern: /\bpointer\s*:/ },
  { name: 'truncate', pattern: /\btruncate\s*:/ },
  { name: 'srOnly', pattern: /\bsrOnly\s*:/ },
  { name: 'animate', pattern: /\banimate\s*:/ },
  { name: 'rounded', pattern: /\brounded\s*:/ },
  { name: 'shadow', pattern: /\bshadow\s*:/ },
  { name: 'leadingRelaxed', pattern: /\bleadingRelaxed\s*:/ },
  { name: 'leadingNone', pattern: /\bleadingNone\s*:/ },
  { name: 'leadingTight', pattern: /\bleadingTight\s*:/ },
  { name: 'leadingSnug', pattern: /\bleadingSnug\s*:/ },
  { name: 'leadingNormal', pattern: /\bleadingNormal\s*:/ },
  { name: 'leadingLoose', pattern: /\bleadingLoose\s*:/ },
  { name: 'trackingTight', pattern: /\btrackingTight\s*:/ },
  { name: 'trackingNormal', pattern: /\btrackingNormal\s*:/ },
  { name: 'trackingWide', pattern: /\btrackingWide\s*:/ },
  { name: 'trackingWidest', pattern: /\btrackingWidest\s*:/ },
  { name: 'trackingLoose', pattern: /\btrackingLoose\s*:/ },
  { name: 'fontBold', pattern: /\bfontBold\s*:/ },
  { name: 'fontSemibold', pattern: /\bfontSemibold\s*:/ },
  { name: 'fontMedium', pattern: /\bfontMedium\s*:/ },
  { name: 'fontLight', pattern: /\bfontLight\s*:/ },
  { name: 'fontNormal', pattern: /\bfontNormal\s*:/ },
  { name: 'fontBlack', pattern: /\bfontBlack\s*:/ },
  { name: 'justifyText', pattern: /\bjustifyText\s*:/ },
  { name: 'justifyStart', pattern: /\bjustifyStart\s*:/ },
  { name: 'justifyEnd', pattern: /\bjustifyEnd\s*:/ },
  { name: 'justifyCenter', pattern: /\bjustifyCenter\s*:/ },
  { name: 'justifyBetween', pattern: /\bjustifyBetween\s*:/ },
  { name: 'justifyAround', pattern: /\bjustifyAround\s*:/ },
  { name: 'justifyEvenly', pattern: /\bjustifyEvenly\s*:/ },
  { name: 'itemsCenter', pattern: /\bitemsCenter\s*:/ },
  { name: 'itemsStart', pattern: /\bitemsStart\s*:/ },
  { name: 'itemsEnd', pattern: /\bitemsEnd\s*:/ },
  { name: 'itemsStretch', pattern: /\bitemsStretch\s*:/ },
  { name: 'itemsBaseline', pattern: /\bitemsBaseline\s*:/ },
  { name: 'roundedFull', pattern: /\broundedFull\s*:/ },
  { name: 'roundedLg', pattern: /\broundedLg\s*:/ },
  { name: 'roundedMd', pattern: /\broundedMd\s*:/ },
  { name: 'roundedSm', pattern: /\broundedSm\s*:/ },
  { name: 'roundedXl', pattern: /\broundedXl\s*:/ },
  { name: 'roundedNone', pattern: /\broundedNone\s*:/ },
  { name: 'shadowSm', pattern: /\bshadowSm\s*:/ },
  { name: 'shadowMd', pattern: /\bshadowMd\s*:/ },
  { name: 'shadowLg', pattern: /\bshadowLg\s*:/ },
  { name: 'shadowXl', pattern: /\bshadowXl\s*:/ },
  { name: 'shadowNone', pattern: /\bshadowNone\s*:/ },
  { name: 'shadowInner', pattern: /\bshadowInner\s*:/ },
  { name: 'overflowHidden', pattern: /\boverflowHidden\s*:/ },
  { name: 'overflowAuto', pattern: /\boverflowAuto\s*:/ },
  { name: 'overflowScroll', pattern: /\boverflowScroll\s*:/ },
  { name: 'overflowVisible', pattern: /\boverflowVisible\s*:/ }
];

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

console.log("Scanning for fake CSS properties in style props...");

let totalFound = 0;

walkDir(srcDir, (filePath) => {
  const ext = path.extname(filePath);
  if (ext !== '.tsx' && ext !== '.ts') return;

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    targets.forEach(target => {
      if (target.pattern.test(line)) {
        console.log(`[FOUND] ${path.relative(__dirname, filePath)}:${idx + 1} -> ${target.name}: "${line.trim()}"`);
        totalFound++;
      }
    });
  });
});

console.log(`\nScan complete. Found ${totalFound} issues.`);
