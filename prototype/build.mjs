// Builds two outputs from the same sources:
//   index.html          – local site that loads styles.css and js/*.js
//   dist/preview.html   – single self-contained file (everything inlined) for sharing
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(join(root, p), 'utf8');
const scripts = ['js/demo-businesses.js', 'js/street-scene.js', 'js/stall.js', 'js/marketplace.js'];

const head = `<title>Temecula Homegrown</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="Temecula Homegrown: an illustrated artisan market on Old Town Front Street. Phase 1 visual prototype.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..700&family=Young+Serif&display=swap">`;
const body = read('body.html');

writeFileSync(join(root, 'index.html'), `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${head}
<link rel="stylesheet" href="styles.css">
</head>
<body>
${body}
${scripts.map((s) => `<script src="${s}"></script>`).join('\n')}
</body>
</html>
`);

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist/preview.html'), `${head}
<style>
${read('styles.css')}
</style>
${body}
${scripts.map((s) => `<script>\n${read(s)}\n</script>`).join('\n')}
`);
console.log('built index.html and dist/preview.html');
