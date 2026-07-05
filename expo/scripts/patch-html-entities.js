const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '../node_modules/html-entities/lib/index.js');

if (!fs.existsSync(target)) {
  process.exit(0);
}

const content = fs.readFileSync(target, 'utf8');
if (content.startsWith("'worklet';")) {
  process.exit(0);
}

fs.writeFileSync(target, `'worklet';${content}`);
console.log('[postinstall] Patched html-entities for react-native-live-markdown');