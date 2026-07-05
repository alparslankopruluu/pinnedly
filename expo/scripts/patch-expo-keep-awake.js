const fs = require('fs');
const path = require('path');

const target = path.join(
  __dirname,
  '../node_modules/expo-keep-awake/src/index.ts'
);

if (!fs.existsSync(target)) {
  process.exit(0);
}

const marker = 'activateKeepAwakeAsync(tagOrDefault).catch(() => {})';
let content = fs.readFileSync(target, 'utf8');

if (content.includes(marker)) {
  process.exit(0);
}

const oldBlock = `    activateKeepAwakeAsync(tagOrDefault).then(() => {
      if (isMounted && ExpoKeepAwake.addListenerForTag && options?.listener) {
        addListener(tagOrDefault, options.listener);
      }
    });`;

const newBlock = `    activateKeepAwakeAsync(tagOrDefault)
      .catch(() => {
        // Android dev client may mount before Activity is ready.
      })
      .then(() => {
        if (isMounted && ExpoKeepAwake.addListenerForTag && options?.listener) {
          addListener(tagOrDefault, options.listener);
        }
      });`;

if (!content.includes(oldBlock)) {
  console.warn('[postinstall] expo-keep-awake patch skipped: source changed');
  process.exit(0);
}

content = content.replace(oldBlock, newBlock);
fs.writeFileSync(target, content);
console.log('[postinstall] Patched expo-keep-awake to suppress activate race on Android');