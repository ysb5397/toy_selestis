/* Shared update detection and per-project state. No server or service worker required. */
(() => {
  'use strict';
  const meta = name => document.querySelector(`meta[name="${name}"]`)?.content;
  const release = meta('toy:build');
  const schema = Number(meta('toy:state-version') || 1);
  const route = location.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '').replace(/\/$/, '') || '/';
  const key = `toy:progress:${route}`;
  let adapter, ready = false, timer, checking = false, dismissed, dialog, lastData;
  const read = () => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };
  function save() {
    if (!adapter) return true;
    if (!ready) return false;
    try {
      const data=adapter.capture(), encoded=JSON.stringify(data);
      if(encoded!==lastData){localStorage.setItem(key, JSON.stringify({schema, savedAt:Date.now(), data}));lastData=encoded;}
      return true;
    }
    catch { return false; }
  }
  function resetToHome() {
    try { localStorage.removeItem(key); sessionStorage.setItem('toy:update-notice', '업데이트로 진행 상태가 초기화됐어. 프로젝트를 다시 골라 줘.'); } catch {}
    location.replace('/');
  }
  async function register(next) {
    adapter = next;
    const previous = read();
    if (previous && previous.schema !== schema) { resetToHome(); return; }
    try { if (previous) await adapter.restore(previous.data); }
    catch (error) { console.warn('Saved project state could not be restored:', error.message); resetToHome(); return; }
    ready = true;
    save();
    document.addEventListener('input', schedule);
    document.addEventListener('change', schedule);
    document.addEventListener('click', schedule);
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(save, 150); }
  function show(update) {
    if (dialog?.open) return;
    const previousFocus = document.activeElement;
    dialog = document.createElement('dialog');
    dialog.className = 'toy-update';
    dialog.setAttribute('aria-labelledby', 'toy-update-title');
    const title = document.createElement('h2'); title.id='toy-update-title'; title.textContent='새 버전이 준비됐어';
    const text = document.createElement('p');
    const compatible = update.pages[route]?.schema === schema;
    text.textContent = compatible ? '진행 상태를 저장하고 새 버전을 불러올게.' : '이번 업데이트에서는 진행 상태를 이어갈 수 없어. 업데이트하면 상태를 초기화하고 메인으로 이동해.';
    const status = document.createElement('p'); status.setAttribute('role','status');
    const actions = document.createElement('div');
    const later = document.createElement('button'); later.textContent='나중에';
    const apply = document.createElement('button'); apply.textContent=compatible?'저장하고 업데이트':'메인으로 이동'; apply.className='toy-update-primary';
    const close = () => { dismissed=update.release; dialog.close(); dialog.remove(); previousFocus?.focus(); };
    later.onclick=close;
    dialog.addEventListener('cancel', e => { e.preventDefault(); close(); });
    apply.onclick=async () => {
      apply.disabled=true;
      // Recheck because another deployment may have arrived while this modal was open.
      try {
        const latest=await fetchManifest();
        if (latest.release!==update.release) { dialog.close(); dialog.remove(); show(latest); return; }
        if (compatible) {
          if (!save()) { status.textContent='진행 상태를 저장하지 못했어. 브라우저 저장 공간 설정을 확인하고 다시 시도해 줘.'; return; }
          location.reload();
        } else resetToHome();
      } catch { status.textContent='업데이트를 확인하지 못했어. 인터넷 연결을 확인하고 다시 시도해 줘.'; }
      finally { apply.disabled=false; }
    };
    actions.append(later,apply); dialog.append(title,text,status,actions); document.body.append(dialog); dialog.showModal();
  }
  async function fetchManifest() {
    const response=await fetch('/version.json',{cache:'no-store'});
    if (!response.ok) throw Error('Version unavailable');
    const value=await response.json();
    if (typeof value.release!=='string' || !value.pages || !Object.values(value.pages).every(p=>Number.isInteger(p.schema)&&p.schema>0)) throw Error('Invalid manifest');
    return value;
  }
  async function check() {
    if (!release || checking || document.hidden) return;
    checking=true;
    try { const latest=await fetchManifest(); if (latest.release!==release && latest.release!==dismissed) show(latest); }
    catch { /* Offline tabs can keep working. */ }
    finally { checking=false; }
  }
  window.ToyRuntime = {register, save, check};
  window.addEventListener('pagehide', save);
  document.addEventListener('visibilitychange',()=>{ if(document.hidden)save();else check(); });
  window.addEventListener('focus',check);
  window.addEventListener('DOMContentLoaded',()=>{
    try {
      const notice=sessionStorage.getItem('toy:update-notice');
      if (route==='/' && notice) { const p=document.createElement('p');p.className='toy-update-notice';p.setAttribute('role','status');p.textContent=notice;document.body.prepend(p);sessionStorage.removeItem('toy:update-notice'); }
    } catch {}
    check();setInterval(check,60000);setInterval(save,2000);
  });
})();
