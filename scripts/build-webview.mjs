import { build } from 'esbuild';
import { cp, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

async function ensureDir(dir) {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

await ensureDir('media');

await build({
  entryPoints: ['webview-src/previewApp.ts'],
  outfile: 'media/preview.js',
  bundle: true,
  format: 'iife',
  target: 'es2020',
  sourcemap: process.env.NODE_ENV !== 'production',
  minify: process.env.NODE_ENV === 'production'
});

if (existsSync('webview-src/styles.css')) {
  await cp('webview-src/styles.css', 'media/styles.css');
}

console.log('Built webview assets.');


