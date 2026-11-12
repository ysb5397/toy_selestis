import { fields, generateProfile, validProfile, profileText } from './model.mjs';
import { shareResultImage } from './image-share.mjs';
import { renderResultImage } from './result-image.mjs';
const $ = id => document.getElementById(id);
let profile = null, running = false, generation = 0, count = 0, toastTimer;
let resultImage = null, imagePromise = Promise.resolve(null);
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
  prepareResultImage();
  window.ToyRuntime?.save();
}
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function start() {
  if (running) return;
  running = true; const token = ++generation; count++;
  resultImage = null;
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
    track.replaceChildren(...candidates.map(text => {
      const span = document.createElement('span'); span.className = 'reel-value'; span.textContent = text;
      // Keep long joke occupations inside the reel, including narrow phones.
      const length = [...text].length;
      span.style.fontSize = `min(35px, calc((100vw - 90px) / ${length}), ${410 / length}px)`;
      return span;
    }));
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
function prepareResultImage() {
  const token = generation;
  resultImage = null;
  $('share-image').disabled = true; $('share-image').textContent = '이미지 준비 중…';
  imagePromise = renderResultImage(document.querySelector('.story'), count).then(file => {
    if (token === generation) {
      resultImage = file;
      $('share-image').disabled = false; $('share-image').textContent = '↗ 이미지 공유';
    }
    return file;
  }).catch(() => {
    if (token === generation) {
      $('share-image').textContent = '이미지 생성 실패';
      toast('이미지를 만들지 못했어요. 텍스트 공유를 이용해 주세요.');
    }
    return null;
  });
}
function saveImage(file) {
  const url = URL.createObjectURL(file); const link = document.createElement('a');
  link.href = url; link.download = file.name; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
function showImagePreview(file) {
  const previousFocus = document.activeElement;
  const url = URL.createObjectURL(file);
  const dialog = document.createElement('dialog'); dialog.className = 'image-share-preview';
  dialog.setAttribute('aria-labelledby', 'image-share-title');
  const heading = document.createElement('h2'); heading.id = 'image-share-title'; heading.textContent = '이미지로 공유하기';
  const hint = document.createElement('p');
  hint.textContent = '이 브라우저에서는 바로 공유할 수 없어요. 이미지를 복사해 원하는 앱에 붙여 넣어 보세요.';
  const img = document.createElement('img'); img.src = url; img.alt = '공유할 love-maker 결과 이미지';
  const actions = document.createElement('div'); actions.className = 'preview-actions';
  if (navigator.clipboard?.write && typeof ClipboardItem === 'function') {
    const copy = document.createElement('button'); copy.textContent = '이미지 복사';
    copy.addEventListener('click', async () => {
      copy.disabled = true;
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': file })]);
        toast('이미지를 복사했어요. 원하는 앱에서 붙여 넣어 주세요.');
      } catch { hint.textContent = '이미지 복사가 제한된 브라우저예요. 브라우저 메뉴에서 외부 브라우저로 열어 다시 공유해 주세요.'; }
      finally { copy.disabled = false; }
    });
    actions.append(copy);
  } else hint.textContent = '이 브라우저에서는 바로 공유할 수 없어요. 이미지의 길게 누르기·우클릭 메뉴를 이용하거나, 외부 브라우저에서 다시 열어 주세요.';
  const close = document.createElement('button'); close.textContent = '닫기'; close.addEventListener('click', () => dialog.close());
  actions.append(close); dialog.append(heading, hint, img, actions); document.body.append(dialog);
  dialog.addEventListener('close', () => {
    URL.revokeObjectURL(url); dialog.remove(); previousFocus?.focus();
  }, { once: true });
  dialog.showModal();
}
$('download').addEventListener('click', async () => {
  if (!profile || running) return;
  const button = $('download'); button.disabled = true;
  try {
    const file = await imagePromise;
    if (!file) throw new Error('Image unavailable');
    saveImage(file); toast('결과 이미지를 저장했어요 ♡');
  } catch { toast('이미지 저장에 실패했어요. 텍스트 공유를 이용해 주세요.'); }
  finally { button.disabled = false; }
});
$('share-image').addEventListener('click', async () => {
  if (!resultImage || running) return;
  const file = resultImage, button = $('share-image'); button.disabled = true;
  try {
    // No rendering or awaited work before the native share sheet opens.
    const status = await shareResultImage(file);
    if (status === 'unsupported') {
      showImagePreview(file);
    }
  } catch {
    showImagePreview(file);
  } finally { if (resultImage === file) button.disabled = false; }
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
