(() => {
  'use strict';
  const grid = document.getElementById('projects');
  const message = document.getElementById('catalogMessage');
  const count = document.getElementById('projectCount');
  const summary = document.getElementById('catalogSummary');
  const retry = document.getElementById('catalogRetry');
  const tools = document.getElementById('catalogTools');
  const search = document.getElementById('projectSearch');
  const clear = document.getElementById('searchClear');
  const reset = document.getElementById('filterReset');
  const categoryFilters = document.getElementById('categoryFilters');
  const resultSummary = document.getElementById('resultSummary');
  const filters = CatalogFilters;
  let projects = [], selectedCategory = '', loaded = false, categoryButtons = [], projectCards = new Map();
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  const covers = {
    lotto: '<span class="cover-label">PICK+O / NUMBER LAB</span><div class="cover-balls"><span>7</span><span>12</span><span>23</span><span>34</span><span>42</span></div>',
    grid: '<span class="cover-label">LOGIC & PRACTICE</span><div class="map"><span>1</span><span>1</span><span>0</span><span>0</span><span>1</span><span>1</span><span>0</span><span>0</span></div>',
    circuit: '<span class="cover-label">CIRCUIT PLAYGROUND</span><svg viewBox="0 0 260 120" width="100%" height="120" class="cover-svg"><g fill="none" stroke="#6e8d72" stroke-width="3" stroke-linejoin="round"><path d="M 20 38 H 80 M 20 82 H 80 M 150 60 H 235"/><path d="M 80 26 H 116 A 34 34 0 0 1 116 94 H 80 Z" fill="#f6f9f1"/><circle cx="20" cy="38" r="8" fill="#c7e69e"/><circle cx="20" cy="82" r="8" fill="#c7e69e"/><circle cx="235" cy="60" r="15" fill="#c7e69e"/></g><text x="105" y="65" text-anchor="middle" fill="#496a47" font-family="monospace" font-size="15">&amp;</text></svg>',
    sequence: '<span class="cover-label">SEQUENCE PLAYGROUND</span><svg viewBox="0 0 260 120" width="100%" height="120" class="cover-svg"><path d="M 20 9 H 240" stroke="#d75c53" stroke-width="3" stroke-linecap="round"/><path d="M 20 111 H 240" stroke="#539ac4" stroke-width="3" stroke-linecap="round"/><g stroke="#70896b" stroke-width="2.5" fill="none"><path d="M 90 9 V 27 M 90 57 V 69 M 90 95 V 111 M 90 54 L 102 30 M 90 20 H 166 V 30 M 166 51 V 61 H 90 M 166 49 L 176 32"/><circle cx="90" cy="28" r="3" fill="#f6f9ef"/><circle cx="90" cy="56" r="3" fill="#f6f9ef"/><circle cx="90" cy="82" r="13" fill="#cee5b5"/></g><text x="90" y="87" text-anchor="middle" fill="#4b6d42" font-size="14" font-family="system-ui,sans-serif">R</text></svg>',
    code: '<span class="cover-label">SMALL IDEA, REAL PROJECT</span><div class="code-cover"><span>&lt;</span><span>/</span><span>&gt;</span></div>'
  };
  function card(project) {
    const link = element('a', 'project');
    // Catalog data supplies text, never markup or arbitrary URL schemes.
    if (typeof project.url !== 'string' || !project.url.startsWith('/') || project.url.startsWith('//') || project.url.includes('\\')) throw Error('Invalid project URL');
    link.href = project.url;
    const kind = Object.hasOwn(covers, project.cover) ? project.cover : 'code';
    const cover = element('div', 'cover cover-' + kind);
    cover.setAttribute('aria-hidden', 'true');
    cover.innerHTML = covers[kind];
    const body = element('div', 'project-body');
    const tags = element('div', 'tags');
    for (const tag of project.tags.length ? project.tags : [filters.categoryOf(project)]) tags.append(element('span', 'tag', tag));
    body.append(tags, element('h3', '', project.title), element('p', 'description', project.description || '직접 열어서 이 프로젝트를 살펴봐.'));
    const author = element('div', 'author');
    author.append(element('span', 'author-avatar', [...project.author][0]?.toUpperCase() || '?'), element('span', 'author-label', '만든 사람'), element('strong', 'author-name', project.author));
    body.append(author);
    const bottom = element('div', 'card-bottom');
    const arrow = element('span', 'arrow', '↗');
    arrow.setAttribute('aria-hidden', 'true');
    bottom.append(element('span', 'open', '프로젝트 열기'), arrow);
    body.append(bottom);
    link.append(cover, body);
    return link;
  }
  function renderResults() {
    if (!loaded) return;
    const query = search.value || '';
    const matches = filters.filter(projects, { query, category: selectedCategory });
    grid.replaceChildren(...matches.map(project => projectCards.get(project)));
    clear.hidden = !query;
    reset.hidden = !query && !selectedCategory;
    for (const item of categoryButtons) {
      const active = item.category === selectedCategory;
      item.button.setAttribute('aria-pressed', String(active));
      item.button.className = active ? 'category-filter active' : 'category-filter';
    }
    resultSummary.textContent = `전체 ${projects.length}개 중 ${matches.length}개` + (selectedCategory ? ` · ${selectedCategory}` : '');
    message.hidden = matches.length > 0;
    message.textContent = !projects.length ? '아직 등록된 프로젝트가 없어. 첫 번째 프로젝트를 기다리고 있어!' : !matches.length ? '검색 조건에 맞는 프로젝트가 없어. 검색어를 바꾸거나 필터를 초기화해 봐.' : '';
  }
  function renderCategories() {
    const items = filters.categories(projects);
    if (selectedCategory && !items.some(item => item.name === selectedCategory)) selectedCategory = '';
    categoryButtons = [{ name: '전체', category: '', count: projects.length }, ...items.map(item => ({ ...item, category: item.name }))].map(item => {
      const button = element('button', 'category-filter');
      button.type = 'button';
      button.append(element('span', '', item.name), element('span', 'category-count', String(item.count)));
      button.setAttribute('aria-controls', 'projects');
      button.addEventListener('click', () => { selectedCategory = item.category; renderResults(); });
      return { button, category: item.category };
    });
    categoryFilters.replaceChildren(...categoryButtons.map(item => item.button));
  }
  async function load() {
    loaded = false;
    tools.hidden = true;
    grid.setAttribute('aria-busy', 'true');
    message.textContent = '프로젝트를 불러오는 중이야…';
    message.hidden = false;
    retry.hidden = true;
    try {
      const response = await fetch('./projects.json', { cache: 'no-cache' });
      if (!response.ok) throw Error('Catalog request failed');
      const catalog = await response.json();
      if (catalog.version !== 1 || !Array.isArray(catalog.projects)) throw Error('Invalid catalog');
      const incoming = catalog.projects;
      // Validate the complete catalog before exposing a partial list.
      for (const p of incoming) {
        if (typeof p.title !== 'string' || typeof p.description !== 'string' || typeof p.author !== 'string' || !Array.isArray(p.tags)) throw Error('Invalid project');
        if (typeof p.url !== 'string' || !p.url.startsWith('/') || p.url.startsWith('//') || /[\\\u0000-\u0020]/u.test(p.url)) throw Error('Invalid project URL');
      }
      projects = incoming;
      projectCards = new Map(projects.map(project => [project, card(project)]));
      count.textContent = String(projects.length).padStart(2, '0');
      summary.textContent = `${new Set(projects.map(p => p.author)).size}명의 제작자 · ${projects.length}개의 작은 실험`;
      loaded = true;
      tools.hidden = !projects.length;
      renderCategories();
      renderResults();
    } catch (error) {
      grid.replaceChildren();
      count.textContent = '—';
      summary.textContent = '';
      message.textContent = '프로젝트 목록을 불러오지 못했어. 잠시 후 다시 시도해 줘.';
      message.hidden = false;
      retry.hidden = false;
    } finally { grid.setAttribute('aria-busy', 'false'); }
  }
  search.addEventListener('input', renderResults);
  search.addEventListener('keydown', event => { if (event.key === 'Escape' && search.value) { event.preventDefault(); search.value = ''; renderResults(); } });
  clear.addEventListener('click', () => { search.value = ''; renderResults(); search.focus(); });
  reset.addEventListener('click', () => { search.value = ''; selectedCategory = ''; renderResults(); search.focus(); });
  retry.addEventListener('click', load);
  load();
})();
