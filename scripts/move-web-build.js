const fs = require('fs');
const path = require('path');

const source = path.join(__dirname, '..', 'dist', 'web-build');
const target = path.join(__dirname, '..', 'dist', 'web');

// Remove target if exists
if (fs.existsSync(target)) {
  fs.rmSync(target, { recursive: true });
}

// Move entire web-build folder to web
fs.renameSync(source, target);

console.log('✓ Moved web build to dist/web');
