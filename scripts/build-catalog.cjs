const fs = require('node:fs');
const path = require('node:path');

const IGNORED_DIRS = new Set(['node_modules', 'assets', 'vendor']);
const ENTITIES = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ', copy: '©' };
function decode(text) {
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (whole, name) => {
    if (name[0] !== '#') return ENTITIES[name.toLowerCase()] ?? whole;
    const value = name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
    return value > 0 && value <= 0x10ffff && !(value >= 0xd800 && value <= 0xdfff) ? String.fromCodePoint(value) : whole;
  });
}
function plain(text) { return decode(text.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim(); }
function attributes(tag) {
  const result = {};
  for (const match of tag.matchAll(/([^\s=<>"'`/]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    result[match[1].toLowerCase()] = decode(match[2] ?? match[3] ?? match[4]);
  }
  return result;
}
function metadata(html, relative) {
  const cleaned = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  const head = cleaned.match(/<head\b[^>]*>([\s\S]*?)<\/head\s*>/i)?.[1] ?? cleaned.split(/<body\b/i)[0];
  const meta = {};
  for (const tag of head.match(/<meta\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi) ?? []) {
    const attrs = attributes(tag);
    const key = (attrs.name ?? attrs.property ?? '').toLowerCase();
    if (key && attrs.content !== undefined) meta[key] = attrs.content.trim();
  }
  if (/^(true|1|yes)$/i.test(meta['toy:hidden'] ?? '')) return null;
  const fallback = path.posix.basename(relative).replace(/\.html?$/i, '').replace(/[_-]+/g, ' ');
  const title = meta['toy:title'] || plain(head.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1] ?? '') || plain(cleaned.match(/<h1\b[^>]*>([\s\S]*?)<\/h1\s*>/i)?.[1] ?? '') || fallback;
  const description = meta.description || meta['og:description'] || '';
  const text = title + ' ' + description;
  const guessedCover = /PICK\+O|로또|복권/i.test(text) ? 'lotto' : /시퀀스|릴레이|sequence/i.test(text) ? 'sequence' : /카르노|퀴즈|quiz|karnaugh/i.test(text) ? 'grid' : /회로|게이트|circuit/i.test(text) ? 'circuit' : 'code';
  const cover = ['sequence', 'grid', 'circuit', 'code', 'lotto'].includes(meta['toy:cover']) ? meta['toy:cover'] : guessedCover;
  const tags = (meta['toy:tags'] || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 4);
  const parts = relative.split('/');
  const encoded = parts.map(encodeURIComponent).join('/');
  const url = '/' + (encoded.endsWith('/index.html') ? encoded.slice(0, -10) : encoded.endsWith('.html') ? encoded.slice(0, -5) : encoded);
  return { id: relative, url, title: title.replace(/\s*[·|]\s*toy\.\s*$/i, ''), description, author: parts.length > 1 ? parts[0] : '공용', tags, cover };
}
function collect(publicDir) {
  const entries = [];
  function visit(directory, segments = []) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.isSymbolicLink()) continue;
      const next = [...segments, entry.name];
      if (entry.isDirectory()) { if (!IGNORED_DIRS.has(entry.name)) visit(path.join(directory, entry.name), next); continue; }
      if (!entry.isFile() || !/\.html?$/i.test(entry.name) || /^404\.html?$/i.test(entry.name) || (!segments.length && entry.name === 'index.html')) continue;
      const relative = next.join('/');
      const project = metadata(fs.readFileSync(path.join(directory, entry.name), 'utf8'), relative);
      if (project) entries.push(project);
    }
  }
  visit(publicDir);
  return entries.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}
function build(publicDir) {
  const catalog = { version: 1, projects: collect(publicDir) };
  const destination = path.join(publicDir, 'projects.json');
  const json = JSON.stringify(catalog, null, 2) + '\n';
  if (!fs.existsSync(destination) || fs.readFileSync(destination, 'utf8') !== json) fs.writeFileSync(destination, json);
  return catalog;
}
if (require.main === module) {
  const catalog = build(path.resolve(__dirname, '../public'));
  console.log(`Project catalog: ${catalog.projects.length} HTML pages / ${new Set(catalog.projects.map(p => p.author)).size} authors.`);
}
module.exports = { attributes, metadata, collect, build };
