import { fields, generateProfile, validProfile, profileText } from './model.mjs';
const $ = id => document.getElementById(id);
let profile = null, running = false, generation = 0, count = 0, toastTimer;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const ROW_HEIGHT = 156, VALUE_HEIGHT = 58;
let animations = [];
const rows = fields.map((field, index) => {
  const row = document.createElement('div'); row.className = 'reel-row'; row.style.top = `${index * ROW_HEIGHT}px`;
  const label = document.createElement('span'); label.className = 'reel-label'; label.textContent = `${String(index + 1).padStart(2, '0')} / ${field.label}`;
  const window = document.createElement('div'); window.className = 'value-window';
  const track = document.createElement('div'); track.className = 'value-track';
  window.append(track); row.append(label, window); $('reel-track').append(row);
  return { row, track, field };
});
function cancelAnimations() { animations.forEach(animation => animation.cancel()); animations = []; }
async function animate(element, frames, options) {
  const animation = element.animate(frames, { ...options, fill: 'forwards' }); animations.push(animation);
  try { await animation.finished; } catch { /* Skipping cancels the current reveal. */ }
}
function toast(message) {
  $('toast').textContent = message; $('toast').classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 3200);
}
function complete() {
  if (!profile) return;
  generation++; running = false;
  cancelAnimations();
  $('welcome').hidden = true; $('reel').hidden = true; $('summary').hidden = false;
  $('traits').replaceChildren(...fields.map(field => {
    const row = document.createElement('div'); row.className = 'summary-row';
    const label = document.createElement('dt'); label.textContent = field.label;
    const value = document.createElement('dd'); value.textContent = profile[field.key];
    row.append(label, value); return row;
  }));
  $('stage').className = 'stage is-done'; $('progress').style.width = '100%';
  $('stage-label').textContent = `YOUR LOVE IS HERE · #${String(count).padStart(3, '0')}`;
  $('machine-description').textContent = profile.married === '기혼' ? '앗, 이미 짝이 있네요! 다시 운명에 맡겨 볼까요?' : '이 조합, 어때요? 마음에 들면 저장해 두세요.';
  $('counter').textContent = '12 / 12 · COMPLETE';
  $('story-status').textContent = '우연히 만들어진, 오늘의 설렘.';
  $('start').disabled = false; $('start-label').textContent = '새로운 인연 만나기';
  $('skip').hidden = true; $('result-actions').hidden = false;
  $('traits').setAttribute('aria-busy', 'false');
  $('action-hint').textContent = '다시 눌러도 괜찮아요. 우연은 계속되니까.';
  $('announcement').textContent = `오늘의 인연이 도착했어요. ${fields.map(f => `${f.label} ${profile[f.key]}`).join(', ')}`;
  window.ToyRuntime?.save();
}
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function start() {
  if (running) return;
  running = true; const token = ++generation; count++;
  cancelAnimations();
  profile = generateProfile(document.querySelector('input[name="gender"]:checked').value);
  $('start').disabled = true; $('start-label').textContent = '인연을 만드는 중…';
  $('skip').hidden = false; $('result-actions').hidden = true;
  $('stage').className = 'stage is-running'; $('progress').style.width = '0%';
  $('welcome').hidden = true; $('summary').hidden = true; $('reel').hidden = false;
  $('story-status').textContent = '하나씩 멈추는 순간, 인연이 가까워져요.';
  $('action-hint').textContent = '위에서 아래로 흐르다 멈추는, 오늘의 우연.';
  document.querySelector('.story').scrollIntoView({ block: 'start', behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  $('traits').setAttribute('aria-busy', 'true');
  $('announcement').textContent = '12가지 랜덤 프로필을 만들고 있어요.';
  const selectedGender = document.querySelector('input[name="gender"]:checked').value;
  rows.forEach(({ row, track, field }) => {
    row.className = 'reel-row';
    // Values travel downward from the last child to the chosen first value.
    const candidates = [profile[field.key], ...Array.from({ length: 14 }, () => field.key === 'gender' && selectedGender !== 'all' ? profile.gender : field.values[Math.floor(Math.random() * field.values.length)])];
    track.replaceChildren(...candidates.map(text => { const span = document.createElement('span'); span.className = 'reel-value'; span.textContent = text; return span; }));
    track.style.transform = `translateY(-${14 * VALUE_HEIGHT}px)`;
  });
  if ($('fast').checked || reducedMotion.matches) { complete(); return; }
  for (let index = 0; index < rows.length; index++) {
    if (token !== generation) return;
    const { row, track, field } = rows[index];
    rows.forEach(({ row: item }, i) => item.className = `reel-row${i < index ? ' settled' : i === index ? ' active' : ''}`);
    $('counter').textContent = `${String(index + 1).padStart(2, '0')} / 12 · ${field.label}`;
    const center = $('reel').clientHeight / 2 - ROW_HEIGHT / 2;
    const from = index === 0 ? center - 130 : center - (index - 1) * ROW_HEIGHT;
    await animate($('reel-track'), [{ transform: `translateY(${from}px)` }, { transform: `translateY(${center - index * ROW_HEIGHT}px)` }], { duration: 440, easing: 'cubic-bezier(.22,.8,.3,1)' });
    if (token !== generation) return;
    await animate(track, [{ transform: `translateY(-${14 * VALUE_HEIGHT}px)` }, { transform: 'translateY(0)' }], { duration: 980, easing: 'cubic-bezier(.12,.6,.16,1)' });
    if (token !== generation) return;
    row.classList.add('locked');
    $('announcement').textContent = `${field.label}, ${profile[field.key]}`;
    $('progress').style.width = `${(index + 1) / fields.length * 100}%`;
    await wait(480);
  }
  if (token === generation) complete();
}
$('start').addEventListener('click', start);
$('skip').addEventListener('click', () => { if (running) complete(); });
$('share').addEventListener('click', async () => {
  if (!profile || running) return;
  const text = profileText(profile);
  try {
    if (navigator.share) await navigator.share({ title: 'love-maker · 오늘의 인연', text, url: location.href });
    else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(`${text}\n${location.href}`); toast('결과를 복사했어요. 친구에게 붙여 넣어 보세요!'); }
    else { showCopy(text); }
  } catch (error) { if (error.name !== 'AbortError') showCopy(text); }
});
function showCopy(text) {
  const dialog = document.createElement('dialog'); dialog.style.cssText = 'background:#201b26;color:#eee;border:1px solid #655273;border-radius:14px;padding:24px;width:min(90vw,400px)';
  const heading = document.createElement('h2'); heading.textContent = '결과를 복사해서 공유해요'; heading.style.fontSize = '16px';
  const area = document.createElement('textarea'); area.value = `${text}\n${location.href}`; area.readOnly = true; area.style.cssText = 'width:100%;height:300px;padding:12px;margin-bottom:16px';
  const close = document.createElement('button'); close.textContent = '닫기'; close.onclick = () => dialog.close();
  dialog.append(heading, area, close); document.body.append(dialog); dialog.addEventListener('close', () => dialog.remove(), { once: true }); dialog.showModal(); area.focus(); area.select();
}
$('download').addEventListener('click', async () => {
  if (!profile || running) return;
  const button = $('download'); button.disabled = true;
  try {
    await document.fonts.ready;
    const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1440;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#121014'; ctx.fillRect(0, 0, 1080, 1440);
    ctx.textAlign = 'center'; ctx.fillStyle = '#cba5f7'; ctx.font = '40px system-ui'; ctx.fillText('♡ love-maker', 540, 125);
    ctx.fillStyle = '#f2f2f2'; ctx.font = 'bold 52px system-ui'; ctx.fillText('오늘의 인연이 도착했어요!', 540, 225);
    ctx.fillStyle = '#99909f'; ctx.font = '24px system-ui'; ctx.fillText('12가지의 우연이 모여, 하나의 인연으로.', 540, 281);
    fields.forEach((field, index) => {
      const y = 365 + index * 72;
      ctx.fillStyle = '#352b3d'; ctx.fillRect(100, y + 24, 880, 1);
      ctx.textAlign = 'left'; ctx.fillStyle = '#a99ab6'; ctx.font = '26px system-ui'; ctx.fillText(field.label, 100, y);
      ctx.textAlign = 'right'; ctx.fillStyle = '#f2eafa'; ctx.font = 'bold 32px system-ui'; ctx.fillText(profile[field.key], 980, y);
    });
    ctx.textAlign = 'center'; ctx.fillStyle = '#8e809b'; ctx.font = '22px system-ui'; ctx.fillText('재미로 즐기는 가상의 프로필 · BY YSB5397', 540, 1320);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Image generation failed');
    const url = URL.createObjectURL(blob); const link = document.createElement('a');
    link.href = url; link.download = `love-maker-${String(count).padStart(3, '0')}.png`; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000); toast('결과 이미지를 저장했어요 ♡');
  } catch { toast('이미지 저장에 실패했어요. 결과 공유를 이용해 주세요.'); }
  finally { button.disabled = false; }
});
window.ToyRuntime?.register({
  capture: () => ({ profile, count, gender: document.querySelector('input[name="gender"]:checked').value, fast: $('fast').checked }),
  restore: data => {
    if (!data || !['all', 'male', 'female'].includes(data.gender) || (data.profile !== null && !validProfile(data.profile)) || !Number.isSafeInteger(data.count) || data.count < 0 || typeof data.fast !== 'boolean') throw new Error('Invalid saved profile');
    document.querySelector(`input[name="gender"][value="${data.gender}"]`).checked = true;
    $('fast').checked = data.fast; count = data.count; profile = data.profile;
    if (profile) complete();
  },
});
