const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'apps/web-studio');
const check = spawnSync(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', path.join(source, 'tsconfig.json')], { cwd: root, stdio: 'inherit' });
if (check.status !== 0) process.exit(check.status || 1);
(async () => {
  const { build } = await import('vite');
  await build({ root: source, configFile: false, base: '/ysb5397/web-studio/', build: { outDir: path.join(root, 'public/ysb5397/web-studio'), emptyOutDir: true, sourcemap: false, assetsDir: 'assets' } });
})().catch(error => { console.error(error.message); process.exitCode = 1; });
