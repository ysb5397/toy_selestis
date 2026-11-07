const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { build } = require('./build-catalog.cjs');
const publicDir = path.resolve(__dirname, '../public');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
build(publicDir);
http.createServer((req, res) => {
  let route;
  try { route = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400).end(); return; }
  if (route === '/projects.json') {
    try { build(publicDir); } catch { res.writeHead(500).end('Catalog build failed'); return; }
  }
  const file = path.resolve(publicDir, '.' + route);
  if (file !== publicDir && !file.startsWith(publicDir + path.sep)) { res.writeHead(403).end(); return; }
  const candidates = route.endsWith('/') ? [path.join(file, 'index.html')] : [file, file + '.html', path.join(file, 'index.html')];
  const actual = candidates.find(p => {
    try { return fs.statSync(p).isFile() && fs.realpathSync(p).startsWith(fs.realpathSync(publicDir) + path.sep); } catch { return false; }
  });
  if (!actual) { res.writeHead(404).end('Not found'); return; }
  if (path.basename(actual) === 'index.html' && !route.endsWith('/')) { res.writeHead(302, { Location: route + '/' }).end(); return; }
  res.writeHead(200, { 'Content-Type': (types[path.extname(actual)] ?? 'application/octet-stream') + '; charset=utf-8', 'Cache-Control': 'no-cache' });
  fs.createReadStream(actual).pipe(res);
}).listen(4192, '127.0.0.1', () => console.log('Local: http://127.0.0.1:4192/ (Ctrl+C to stop)'));
