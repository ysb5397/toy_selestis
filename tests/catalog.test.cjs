const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { metadata, collect, build } = require('../scripts/build-catalog.cjs');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'toy-catalog-test-'));
  t.after(() => {
    const resolved = path.resolve(root);
    if (!resolved.startsWith(path.resolve(os.tmpdir()) + path.sep + 'toy-catalog-test-')) throw Error('Unsafe fixture cleanup');
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  return { root, put(file, content) { const destination = path.join(root, file); fs.mkdirSync(path.dirname(destination), { recursive: true }); fs.writeFileSync(destination, content); } };
}

test('metadata comes from HTML; author comes from the first directory, including nested projects', () => {
  const p = metadata(`<head><meta content='x > 1 &amp; y &lt; 2' name='description'><title>만들기 &amp; 배우기 · toy.</title><meta name="toy:tags" content="연습, 실험"></head>`, '민수/deep/my quiz.html');
  assert.equal(p.author, '민수'); assert.equal(p.title, '만들기 & 배우기');
  assert.equal(p.description, 'x > 1 & y < 2'); assert.deepEqual(p.tags, ['연습', '실험']);
  assert.equal(p.url, '/%EB%AF%BC%EC%88%98/deep/my%20quiz');
  assert.equal(metadata('<title>홈</title>', 'alice/game/index.html').url, '/alice/game/');
});

test('optional overrides, body heading fallback, filenames and ignored markup', () => {
  assert.equal(metadata('<h1>첫 번째<br>실험</h1>', 'alice/page.html').title, '첫 번째 실험');
  assert.equal(metadata('', 'root-demo.html').title, 'root demo');
  assert.equal(metadata('', 'root-demo.html').author, '공용');
  assert.equal(metadata('<head><!--<title>가짜</title>--><script>const x="<title>또 가짜</title>"</script><title>진짜</title></head>', 'a/x.html').title, '진짜');
  assert.equal(metadata('<meta name="toy:hidden" content="true">', 'a/hidden.html'), null);
  assert.equal(metadata('<title>Original</title><meta name="toy:title" content="Custom"><meta name="toy:cover" content="sequence">', 'a/x.html').cover, 'sequence');
  assert.equal(metadata('<meta name="toy:cover" content="__proto__">', 'a/x.html').cover, 'code');
  assert.equal(metadata('<title>&#x1F9EA; &#128640;</title>', 'a/x.html').title, '🧪 🚀');
});

test('adding, editing and removing HTML rebuilds the catalog without maintaining a list', t => {
  const f = fixture(t);
  f.put('index.html', '<title>공통 메인</title>'); f.put('404.html', '<title>404</title>');
  f.put('alice/one.html', '<title>첫 작품</title>'); f.put('bob/deep/two.html', '<title>두 번째</title>');
  f.put('alice/app.js', 'ignored'); f.put('alice/assets/demo.html', '<title>asset</title>');
  f.put('.hidden/test.html', '<title>hidden</title>'); f.put('bob/secret.html', '<meta name="toy:hidden" content="true">');
  assert.deepEqual(collect(f.root).map(p => [p.author, p.url]), [['alice', '/alice/one'], ['bob', '/bob/deep/two']]);
  build(f.root); const before = fs.readFileSync(path.join(f.root, 'projects.json'), 'utf8');
  build(f.root); assert.equal(fs.readFileSync(path.join(f.root, 'projects.json'), 'utf8'), before, 'build must be deterministic');
  f.put('carol/new.html', '<title>새 작품</title>'); assert.equal(build(f.root).projects.length, 3);
  f.put('alice/one.html', '<title>수정한 작품</title>'); assert.equal(build(f.root).projects.find(p => p.author === 'alice').title, '수정한 작품');
  fs.unlinkSync(path.join(f.root, 'bob/deep/two.html')); assert.equal(build(f.root).projects.length, 2);
});

test('symlinked author folders are not scanned outside public', t => {
  const f = fixture(t), outside = fixture(t); outside.put('private.html', '<title>private</title>');
  try { fs.symlinkSync(outside.root, path.join(f.root, 'linked'), process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) { if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) { t.skip('symlinks unavailable'); return; } throw error; }
  assert.equal(collect(f.root).length, 0);
});

class Element {
  constructor(tag = 'div') { this.tagName = tag; this.children = []; this.attrs = {}; this.events = {}; this.hidden = false; this.textContent = ''; this.innerHTML = ''; this.value = ''; }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; }
  setAttribute(key, value) { this.attrs[key] = value; }
  addEventListener(key, callback) { this.events[key] = callback; }
  focus() { this.focused = true; }
}
async function homepage(responses) {
  const nodes = Object.fromEntries(['projects', 'catalogMessage', 'projectCount', 'catalogSummary', 'catalogRetry', 'catalogTools', 'projectSearch', 'searchClear', 'filterReset', 'categoryFilters', 'resultSummary'].map(id => [id, new Element()]));
  const context = { document: { getElementById: id => nodes[id], createElement: tag => new Element(tag) }, fetch: async () => {
    const response = responses.shift(); if (response instanceof Error) throw response;
    return { ok: true, json: async () => response };
  } };
  vm.createContext(context); vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/catalog-filters.js'), 'utf8'), context); vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/catalog.js'), 'utf8'), context);
  await new Promise(setImmediate); return nodes;
}
function project(overrides = {}) { return { id: 'alice/new.html', url: '/alice/new', title: '새 프로젝트', description: '소개', author: 'alice', tags: [], cover: 'code', ...overrides }; }

test('homepage renders titles, author badges and nested links safely as text', async () => {
  const malicious = '<img src=x onerror=alert(1)>';
  const nodes = await homepage([{ version: 1, projects: [project({ title: malicious, author: malicious, cover: '__proto__' })] }]);
  assert.equal(nodes.projectCount.textContent, '01'); assert.equal(nodes.projects.attrs['aria-busy'], 'false');
  assert.equal(nodes.projects.children.length, 1);
  const link = nodes.projects.children[0], body = link.children[1];
  assert.equal(link.href, '/alice/new'); assert.equal(body.children[1].textContent, malicious);
  assert.equal(body.children[3].children[2].textContent, malicious);
  assert(!link.children[0].innerHTML.includes(malicious)); assert(link.children[0].innerHTML.includes('code-cover'));
});

test('homepage handles empty catalogs, failures, retries and unsafe URL schemes', async () => {
  const empty = await homepage([{ version: 1, projects: [] }]);
  assert.equal(empty.projectCount.textContent, '00'); assert.equal(empty.catalogMessage.hidden, false);
  const fail = await homepage([new Error('offline'), { version: 1, projects: [project()] }]);
  assert.equal(fail.catalogRetry.hidden, false); await fail.catalogRetry.events.click();
  assert.equal(fail.catalogRetry.hidden, true); assert.equal(fail.projects.children.length, 1);
  for (const url of ['javascript:alert(1)', '//other.example', '/\\other.example']) {
    const nodes = await homepage([{ version: 1, projects: [project({ url })] }]);
    assert.equal(nodes.projects.children.length, 0); assert.equal(nodes.catalogRetry.hidden, false);
  }
});

test('homepage search, category buttons, result counts, clear and reset work together', async () => {
  const nodes=await homepage([{version:1,projects:[project({title:'회로 실험실',cover:'circuit'}),project({title:'시퀀스 실험실',author:'bob',cover:'sequence'}),project({title:'PICK+O',description:'로또 번호',cover:'lotto'})]}]);
  assert.equal(nodes.projects.children.length,3);assert.equal(nodes.catalogTools.hidden,false);
  nodes.projectSearch.value='ALICE';nodes.projectSearch.events.input();assert.equal(nodes.projects.children.length,2);assert.equal(nodes.searchClear.hidden,false);
  const circuit=nodes.categoryFilters.children.find(b=>b.children[0].textContent==='회로 실습');circuit.events.click();assert.equal(nodes.projects.children.length,1);assert.equal(circuit.attrs['aria-pressed'],'true');assert.equal(nodes.projectCount.textContent,'03');assert.equal(nodes.resultSummary.textContent,'전체 3개 중 1개 · 회로 실습');
  nodes.projectSearch.value='로또';nodes.projectSearch.events.input();assert.equal(nodes.projects.children.length,0);assert.equal(nodes.catalogMessage.hidden,false);assert.equal(nodes.filterReset.hidden,false);
  nodes.searchClear.events.click();assert.equal(nodes.projects.children.length,2);assert.equal(circuit.attrs['aria-pressed'],'true');assert(nodes.projectSearch.focused);
  nodes.filterReset.events.click();assert.equal(nodes.projects.children.length,3);assert.equal(nodes.filterReset.hidden,true);assert.equal(nodes.searchClear.hidden,true);
  nodes.projectSearch.value='없는 검색어';nodes.projectSearch.events.input();nodes.projectSearch.events.keydown({key:'Escape',preventDefault(){}});assert.equal(nodes.projectSearch.value,'');assert.equal(nodes.projects.children.length,3);
});

test('current author directories, project files and deployment hook stay connected', () => {
  const root = path.resolve(__dirname, '../public'), projects = collect(root);
  assert(projects.some(p => p.author === 'ggm' && p.url === '/ggm/prac_circuit'));
  assert(projects.some(p => p.author === 'ysb5397' && p.url === '/ysb5397/quiz'));
  for (const p of projects) assert(fs.existsSync(path.join(root, p.id)));
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../wrangler.jsonc'), 'utf8'));
  assert.equal(config.build.command, 'node scripts/build-catalog.cjs');
  assert.equal(config.assets.directory, './public');
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert(index.includes('src="./catalog.js"')); assert(!index.includes('href="/quiz"'));
});
