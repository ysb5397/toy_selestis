(() => {
'use strict';
const {topics,cases} = window.JavaInspectorData;
const comparison=window.JavaComparison;
const book=window.JavaHandbook;
const $ = id => document.getElementById(id);
const storageKey = 'java-inspector:v1';
let state = null, selected = new Set(topics.map(t=>t.id)), sound = false, audio;
let stampMotion = null;
const find = id => cases.find(c=>c.id===id);
const topicFor = id => topics.find(t=>t.id===id);
const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function load(){try{const s=JSON.parse(localStorage.getItem(storageKey));if(!s || !Array.isArray(s.deck) || !s.deck.length || s.deck.length>cases.length || new Set(s.deck).size!==s.deck.length || s.deck.some(id=>!find(id)) || !Number.isInteger(s.index) || s.index<0 || s.index>s.deck.length || !Array.isArray(s.answers) || s.answers.length!==s.index || s.answers.some((a,i)=>a.id!==s.deck[i]||typeof a.approved!=='boolean') || !Array.isArray(s.topics) || !s.topics.length || s.topics.some(id=>!topicFor(id))) return null;return s;}catch{return null;}}
function save(){try{localStorage.setItem(storageKey,JSON.stringify(state));}catch{$('saveNote').textContent='브라우저 저장을 사용할 수 없습니다. 이 탭을 닫으면 진행 상황이 사라질 수 있습니다.';}}
function tone(correct){if(!sound)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='square';o.frequency.setValueAtTime(correct?440:160,audio.currentTime);o.frequency.setValueAtTime(correct?660:120,audio.currentTime+.07);g.gain.setValueAtTime(.025,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.17);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+.18);}catch{}}
function shuffle(list){const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function setupTopics(){
 $('topics').innerHTML=topics.map(t=>`<label class="topic-option"><span class="topic-index">${t.icon}</span><div><strong>${t.name}</strong><small>${t.description} · ${cases.filter(c=>c.topic===t.id).length}건</small></div><input type="checkbox" value="${t.id}" checked aria-label="${t.name} 선택"></label>`).join('');
 $('topics').addEventListener('change',e=>{if(e.target.checked)selected.add(e.target.value);else selected.delete(e.target.value);updateSelection();});updateSelection();
}
function updateSelection(){const n=cases.filter(c=>selected.has(c.topic)).length;$('deckSummary').textContent=`${selected.size}개 주제 · 총 ${n}건의 서류`;$('start').disabled=!n;}
function currentCase(){return state?find(state.deck[state.pending?state.index-1:state.index]):null;}
function renderCode(c){
 const conceptual=c.kind==='concept';
 $('code').parentElement.setAttribute('aria-label',conceptual?'심사할 자바 개념 자료':'심사할 자바 코드');
 $('documentLabel').textContent=conceptual?'제출 자료 · 개념 심사':'제출 코드 · 실행 심사';
 $('contextLabel').textContent=conceptual?'Java 21 LTS · 설명의 타당성':'Java 21 LTS · main 내부¹';
 $('paperFoot').textContent=conceptual?'이 서류는 실행 출력이 아니라 파일·도구·상황에 대한 설명을 심사합니다.':'¹ 별도 안내가 없으면 클래스와 main 선언은 생략합니다. 컴파일 오류가 있으면 프로그램은 실행되지 않습니다.';
 $('code').innerHTML=c.code.split('\n').map((line,i)=>`<button class="code-line" type="button" data-compare-document="code:${i+1}" data-line="${String(i+1).padStart(2,'0')}" aria-pressed="false" aria-label="자료 ${i+1}행 선택: ${escape(line.trim()||'빈 행')}">${escape(line)}</button>`).join('\n');
}
function renderComparison(){
 const c=currentCase();if(!c)return;
 state.inspection=comparison.restore(c,state.inspection);const selection=state.inspection,proof=comparison.evidence(c,selection);
 const doc=comparison.documentFor(c,selection.documentId),rule=comparison.ruleFor(selection.ruleId);
 $('documentSelection').innerHTML=`<span>01 / 서류 항목</span><strong>${doc?escape(doc.label):'자료 한 행 또는 신청 내용 선택'}</strong>${doc?`<code>${escape(doc.text)}</code>`:''}`;
 $('ruleSelection').innerHTML=`<span>02 / 규정 조항</span><strong>${rule?escape(rule.title):'규정집에서 조항 선택'}</strong>`;
 for(const b of $('play').querySelectorAll('[data-compare-document]')){b.setAttribute('aria-pressed',String(b.dataset.compareDocument===selection.documentId));b.disabled=state.pending;}
 for(const b of $('rules').querySelectorAll('[data-compare-rule]')){b.setAttribute('aria-pressed',String(b.dataset.compareRule===selection.ruleId));b.disabled=state.pending||!comparison.ruleFor(b.dataset.compareRule);}
 $('compare').disabled=state.pending||!doc||!rule;$('clearComparison').disabled=state.pending||(!doc&&!rule);
 $('proofBadge').textContent=proof?'모순 확정 · 반려 가능':'모순 증거 없음';$('proofBadge').classList.toggle('has-proof',!!proof);
 $('deny').disabled=state.pending||!proof;
 $('deny').setAttribute('aria-describedby','comparisonResult');
 $('openEvidence').disabled=!proof;
 if(!state.pending)$('decisionHint').textContent=proof?'모순 증거가 확인되었습니다. 반려 도장을 찍을 수 있습니다.':'승인은 바로 가능합니다. 반려하려면 대조로 모순 증거를 먼저 확보하십시오.';
 const result=selection.checked?comparison.compare(c,selection.documentId,selection.ruleId):null;
 $('comparisonResult').className=`comparison-result${result?' '+result.status:''}`;
 $('comparisonResult').textContent=result?(result.status==='unrelated'?'비교 대상 아님 · '+result.message:result.status==='match'?`일치 · 규정 적용 결과: ${JSON.stringify(result.actualOutput)}. 신청 내용과 같습니다.`:`모순 확정 · 신청 내용: ${JSON.stringify(result.claimedOutput)} / 규정 적용 결과: ${JSON.stringify(result.actualOutput)}. 두 내용이 다릅니다.`):proof?'확정된 모순 증거를 보관 중입니다. 다른 항목을 대조해도 증거는 유지됩니다.':'서류와 규정을 각각 선택하여 대조하면 일치 여부를 확인할 수 있습니다.';
 $('evidence').hidden=!proof;
 $('evidence').innerHTML=proof?`<details><summary>증거 J-${escape(c.id.toUpperCase())} · ${escape(proof.ruleTitle)}</summary><p><strong>${escape(proof.documentLabel)}</strong>: <code>${escape(proof.documentText)}</code></p><div class="evidence-values"><span>신청 내용 <strong>${escape(JSON.stringify(proof.claimedOutput))}</strong></span><span>규정 적용 결과 <strong>${escape(JSON.stringify(proof.actualOutput))}</strong></span></div><p>${escape(proof.explanation)}</p><p class="evidence-note">Java 21 LTS · 제출 자료 전체의 문맥으로 확인한 증거</p></details>`:'';
}
function selectComparison(kind,id){
 if(!state||state.pending||$('play').hidden)return;const c=currentCase();if(!c)return;
 state.inspection=comparison.restore(c,state.inspection);const key=kind==='document'?'documentId':'ruleId';
 state.inspection[key]=state.inspection[key]===id?null:id;state.inspection.checked=false;renderComparison();save();
}
function runComparison(){
 if(!state||state.pending||$('play').hidden)return;const c=currentCase();if(!c)return;
 state.inspection=comparison.restore(c,state.inspection);if(!state.inspection.documentId||!state.inspection.ruleId)return;
 state.inspection.checked=true;const result=comparison.compare(c,state.inspection.documentId,state.inspection.ruleId);
 if(result.status==='contradiction')state.inspection.proof={documentId:result.documentId,ruleId:result.ruleId};
 renderComparison();save();
}
function show(section){for(const id of ['welcome','play','report'])$(id).hidden=id!==section;$('backToSetup').hidden=section==='welcome';document.querySelector('.game-shell').dataset.screen=section;}
function prepareAssets(root=document){
 for(const img of root.querySelectorAll('.tool-visual img, .stamp img')){
  const ready=()=>{img.parentElement.classList.add('asset-ready');img.parentElement.classList.remove('asset-failed');};
  const failed=()=>{img.parentElement.classList.remove('asset-ready');img.parentElement.classList.add('asset-failed');};
  img.addEventListener('load',ready);img.addEventListener('error',failed);
  if(img.complete){if(img.naturalWidth)ready();else failed();}
 }
}
function resetStamps(){
 cancelStampMotion();
 $('stamp').hidden=true;$('stamp').replaceChildren();$('stamp').className='stamp';
 $('stampPlaceholder').hidden=false;$('stampStatus').textContent='심사 대기';
 $('decisionTitle').textContent='신청 내용이 정확합니까?';$('decisionHint').textContent='제출 자료와 신청 내용이 일치해야 승인 대상입니다.';
 for(const id of ['approve','deny']){const b=$(id);b.disabled=false;b.classList.remove('is-selected');b.setAttribute('aria-pressed','false');}
}
function correctCount(){return state.answers.filter(a=>a.approved===find(a.id).valid).length;}
function updateStatus(){const total=state.deck.length,done=state.answers.length;$('dayLabel').textContent=`DAY ${String(Math.min(Math.floor(state.index/6)+1,Math.ceil(total/6))).padStart(2,'0')} / ${state.practice?'오답 재심사':'자바 코드 심사'}`;$('progress').textContent=`처리 ${done} / ${total}건`;$('score').textContent=`정확도 ${done?Math.round(correctCount()/done*100)+'%':'—'}`;}
function start(deck,practice=false){state={castSeed:practice?(state?.castSeed??1):Math.floor(Math.random()*4294967296),deck,topics:[...selected],index:0,answers:[],pending:false,practice};save();renderCase();}
function renderCase(){
 if(state.index>=state.deck.length){report();return;}
 show('play');updateStatus();const c=find(state.deck[state.index]);$('caseLabel').textContent=`신청서 ${String(state.index+1).padStart(3,'0')} / JAVA PROGRAM`;$('topicLabel').textContent=topicFor(c.topic).en;$('serial').textContent=`NO. J-${String(state.index+1).padStart(3,'0')}`;$('applicant').textContent=`${c.name}의 신청서`;$('caseTitle').textContent=c.title;$('documentTopic').textContent=topicFor(c.topic).name;$('code').textContent=c.code;$('context').textContent=c.context;$('claim').textContent=c.claim;$('speech').textContent=[`제출 자료의 검토를 부탁드립니다.`,`검토할 내용은 신청서에 적었습니다.`,`규정을 확인하고 심사해 주십시오.`,`신청 내용이 규정에 맞는지 확인해 주십시오.`][state.index%4];$('stamp').hidden=true;$('feedback').hidden=true;$('decision').hidden=false;setRightView('rules');book.render();drawScene(c.id);
 renderCode(c);resetStamps();renderComparison();save();if(state.pending)renderFeedback();
}
function cancelStampMotion(){
 if(!stampMotion)return;
 const motion=stampMotion;stampMotion=null;
 clearTimeout(motion.impactTimer);clearTimeout(motion.endTimer);motion.animation?.cancel();motion.ghost.remove();
 $('play').removeAttribute('aria-busy');document.querySelector('.signature-slot').classList.remove('is-impact');
}
function revealFeedback(){
 setRightView('feedback');$('play').dataset.pane='book';$('documentPane').setAttribute('aria-selected','false');$('bookPane').setAttribute('aria-selected','true');$('next')?.focus({preventScroll:true});
}
function animateStamp(approved){
 const source=$(approved?'approve':'deny').querySelector('.tool-visual');
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 if(reduced||!source.classList.contains('asset-ready')||typeof source.animate!=='function'){
  renderFeedback();tone(approved===find(state.answers.at(-1).id).valid);return;
 }
 cancelStampMotion();
 for(const id of ['approve','deny'])$(id).disabled=true;
 $('play').setAttribute('aria-busy','true');$('feedback').hidden=true;
 $('decisionTitle').textContent='심사 도장을 찍는 중입니다.';$('decisionHint').textContent='서류에 심사 결과를 남기고 있습니다.';
 const slot=document.querySelector('.signature-slot');
 // Bring the dedicated signing area into view before measuring the flight path.
 // The signing slot remains inside the desk; animation must not move the page.
 const from=source.getBoundingClientRect(),to=slot.getBoundingClientRect();
 const size=112,targetX=to.left+to.width/2-size/2,targetY=to.top+to.height/2-size+18;
 const startX=Math.max(8,Math.min(from.left,window.innerWidth-size-8));
 const startY=Math.max(12,Math.min(from.top,window.innerHeight-size-12));
 const dx=startX-targetX,dy=startY-targetY;
 const ghost=document.createElement('div');ghost.className=`stamp-flight ${approved?'approve':'deny'}`;ghost.setAttribute('aria-hidden','true');
 ghost.style.left=`${Math.round(targetX)}px`;ghost.style.top=`${Math.round(targetY)}px`;ghost.append(source.cloneNode(true));document.body.append(ghost);
 const motion={ghost,animation:null,impactTimer:null,endTimer:null,impacted:false};stampMotion=motion;
 const impact=()=>{
  if(stampMotion!==motion||motion.impacted)return;motion.impacted=true;
  renderFeedback({reveal:false});slot.classList.add('is-impact');
  tone(approved===find(state.answers.at(-1).id).valid);
 };
 const finish=()=>{
  if(stampMotion!==motion)return;impact();cancelStampMotion();revealFeedback();
 };
 try{
  motion.animation=ghost.animate([
   {transform:`translate(${dx}px, ${dy}px) rotate(-8deg)`,opacity:.8,offset:0},
   {transform:`translate(${dx*.55}px, ${Math.min(dy*.45,-46)}px) rotate(-5deg)`,opacity:1,offset:.24},
   {transform:'translate(0, -32px) rotate(0deg)',opacity:1,offset:.48},
   {transform:'translate(0, 9px) scaleY(.9)',opacity:1,offset:.58},
   {transform:'translate(0, 9px) scaleY(.9)',opacity:1,offset:.68},
   {transform:'translate(0, -35px) rotate(3deg)',opacity:1,offset:.86},
   {transform:'translate(0, -54px) rotate(3deg)',opacity:0,offset:1}
  ],{duration:760,easing:'linear',fill:'both'});
  motion.impactTimer=setTimeout(impact,440);motion.animation.onfinish=finish;
  // Completion must not depend solely on an animation event firing.
  motion.endTimer=setTimeout(finish,900);
 }catch{cancelStampMotion();renderFeedback();tone(approved===find(state.answers.at(-1).id).valid);}
}
function decide(approved){if(!state||state.pending||state.index>=state.deck.length||$('play').hidden)return;const c=currentCase(),proof=comparison.evidence(c,state.inspection);if(!approved&&!proof){$('comparisonResult').textContent='반려하려면 자료·신청 내용과 규정을 대조하여 모순 증거를 먼저 확보하십시오.';return;}state.answers.push({id:c.id,approved,evidence:approved?null:proof});state.index++;state.pending=true;renderComparison();save();animateStamp(approved);}
function renderFeedback({reveal=true}={}){
 const answer=state.answers.at(-1),c=find(answer.id),correct=answer.approved===c.valid;
 // The document stays on the just-judged case until the next button is pressed.
 $('applicant').textContent=`${c.name}의 신청서`;$('caseTitle').textContent=c.title;$('documentTopic').textContent=topicFor(c.topic).name;$('code').textContent=c.code;$('context').textContent=c.context;$('claim').textContent=c.claim;
 renderCode(c);$('caseLabel').textContent=`신청서 ${String(state.index).padStart(3,'0')} / 심사 완료`;$('topicLabel').textContent=topicFor(c.topic).en;$('serial').textContent=`NO. J-${String(state.index).padStart(3,'0')}`;renderComparison();drawScene(c.id,true);
 const verdict=answer.approved?'승인':'반려';
 $('decision').hidden=false;$('decisionTitle').textContent=`${verdict} 도장을 찍었습니다.`;$('decisionHint').textContent='아래 검토 결과를 확인하고 다음 신청자를 호출하십시오.';
 for(const id of ['approve','deny']){const b=$(id),chosen=(id==='approve')===answer.approved;b.disabled=true;b.classList.toggle('is-selected',chosen);b.setAttribute('aria-pressed',String(chosen));}
 $('stamp').hidden=false;$('stamp').className=`stamp ${answer.approved?'good':'bad'}`;
 $('stamp').innerHTML=`<img src="assets/stamp-${answer.approved?'approve':'reject'}-v1.png" alt="${verdict}" width="192" height="120"><span class="stamp-fallback">${verdict}</span>`;prepareAssets($('stamp'));
 $('stampPlaceholder').hidden=true;$('stampStatus').textContent=`${verdict} 처리 완료`;
 $('feedback').hidden=!reveal;$('feedback').className=`feedback${correct?'':' wrong'}`;
 $('feedback').innerHTML=`<p class="eyebrow">${correct?'검토 완료 / 정확한 판단':'정정 통지 / 규정 다시 확인'} · ${escape(c.concept)}</p><h2>${correct?'정확한 심사입니다.':'이번 서류는 '+(c.valid?'승인':'반려')+' 대상입니다.'}</h2><p>${escape(c.explanation)}</p><div class="feedback-rule"><h3>판정에 적용한 규정</h3><button id="reviewRule" type="button">관련 규정 읽기</button></div><button id="next" class="primary">${state.index===state.deck.length?'근무 성적표 보기':state.index%6===0?'다음 근무 시작하기':'다음 신청자 부르기'} <span>→</span></button>`;
 $('reviewRule').onclick=()=>{book.reveal(answer.evidence?.ruleId||c.comparison.ruleIds[0]);setRightView('rules');};
 $('showFeedback').disabled=false;
 $('speech').textContent=correct?'확인 감사합니다. 다음에 다시 방문하겠습니다.':'규정에 따른 차이를 확인했습니다.';updateStatus();$('next').onclick=()=>{cancelStampMotion();state.pending=false;save();renderCase();$('play').dataset.pane='document';$('documentPane').setAttribute('aria-selected','true');$('bookPane').setAttribute('aria-selected','false');};if(reveal)revealFeedback();
}
function report(){
 show('report');updateStatus();const count=correctCount(),total=state.deck.length,wrong=state.answers.filter(a=>a.approved!==find(a.id).valid),percent=Math.round(count/total*100);
 $('speech').textContent=percent===100?'모든 서류를 정확하게 심사했습니다. 수고하셨습니다.':'오늘 확인한 개념을 다음 심사에도 적용하십시오.';drawScene(0);$('caseLabel').textContent='일일 근무 보고서 / INSPECTION REPORT';$('topicLabel').textContent='근무 종료';
 $('report').innerHTML=`<p class="eyebrow">SHIFT COMPLETE</p><h1>${percent===100?'빈틈없는 심사관':percent>=70?'정확한 심사를 향한 한 걸음':'오늘의 학습 기록'}</h1><p>오늘의 근무가 끝났습니다. ${state.practice?'다시 검토한 서류에서':'자바 코드 신청서에서'} 확인한 규칙을 복습하십시오.</p><div class="report-stats"><div><strong>${count}<small>/${total}</small></strong><span>정확한 심사</span></div><div><strong>${percent}%</strong><span>심사 정확도</span></div><div><strong>${new Set(state.deck.map(id=>find(id).topic)).size}</strong><span>학습한 주제</span></div></div><div class="report-actions">${wrong.length?'<button id="retry" class="primary">틀린 서류 재심사 →</button>':''}<button id="newShift" class="secondary">주제 고르고 다시 출근</button></div><div class="review-list"><h2>서류 다시 펼쳐 보기</h2>${state.answers.map(a=>{const c=find(a.id);return `<details><summary>${a.approved===c.valid?'✓':'✕'} ${escape(c.title)} · ${escape(c.concept)} <span> / 정답: ${c.valid?'승인':'반려'}</span></summary><pre>${escape(c.code)}</pre><p>신청 내용: <strong>${escape(c.claim)}</strong><br>${escape(c.explanation)}</p></details>`;}).join('')}</div>`;
 if(wrong.length)$('retry').onclick=()=>start(shuffle(wrong.map(a=>a.id)),true);$('newShift').onclick=home;
}
function home(){cancelStampMotion();show('welcome');$('resume').hidden=!state;$('resume').textContent=state&&state.index===state.deck.length&&!state.pending?'이전 근무 성적표 보기 →':'이전 근무 이어하기 →';$('dayLabel').textContent='신입 심사관 연수';$('progress').textContent='근무 대기 중';$('score').textContent='정확도 —';$('caseLabel').textContent='입국 신청서 / JAVA PROGRAM';$('topicLabel').textContent='검토 전 규정집 확인 필수';$('speech').textContent='첫 근무 전 규정집을 확인하십시오.';drawScene(0);}
function drawScene(visitor,nod=false){
 window.JavaVisitor.setVisitor(typeof visitor==='string'?visitor:'welcome',Number.isInteger(state?.castSeed)?state.castSeed:1,{nod});
}
$('start').onclick=()=>start(shuffle(cases.filter(c=>selected.has(c.topic)).map(c=>c.id)));
$('approve').onclick=()=>decide(true);$('deny').onclick=()=>decide(false);$('resume').onclick=()=>{if(state.pending) {show('play');renderFeedback();}else renderCase();};$('backToSetup').onclick=home;
$('compare').onclick=runComparison;
$('clearComparison').onclick=()=>{if(!state||state.pending)return;const c=currentCase();state.inspection={...comparison.restore(c,state.inspection),documentId:null,ruleId:null,checked:false};renderComparison();save();};
$('play').addEventListener('click',e=>{const doc=e.target.closest('[data-compare-document]'),rule=e.target.closest('[data-compare-rule]');if(doc)selectComparison('document',doc.dataset.compareDocument);if(rule)selectComparison('rule',rule.dataset.compareRule);});
$('sound').onclick=()=>{sound=!sound;$('sound').textContent=`소리 ${sound?'켜짐':'꺼짐'}`;$('sound').setAttribute('aria-pressed',String(sound));if(sound)tone(true);};
document.addEventListener('keydown',e=>{if(e.repeat||e.ctrlKey||e.altKey||e.metaKey||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)||document.activeElement.isContentEditable||document.querySelector('dialog[open]'))return;if(e.key.toLowerCase()==='a')decide(true);if(e.key.toLowerCase()==='d')decide(false);});

function setRightView(view){
 if(view==='feedback'&&!state?.pending)return;
 if(!$('rulebook').hidden)book.capture();
 const feedback=view==='feedback';$('rulebook').hidden=feedback;$('feedback').hidden=!feedback;
 $('showRules').setAttribute('aria-pressed',String(!feedback));$('showFeedback').setAttribute('aria-pressed',String(feedback));$('showFeedback').disabled=!state?.pending;
 if(!feedback)book.render();
}
function openHandbook(){
 const trigger=document.activeElement;book.capture();$('handbookContent').append($('bookBrowser'));$('handbookDialog').showModal();book.render();$('useRule').disabled=true;$('closeHandbook').focus();
 $('handbookDialog').addEventListener('close',()=>{book.capture();$('rulebook').append($('bookBrowser'));book.render();trigger?.focus();},{once:true});
}
$('openHandbook').onclick=openHandbook;$('previewBookCompact').onclick=openHandbook;$('closeHandbook').onclick=()=>{book.capture();$('handbookDialog').close();};$('handbookDialog').addEventListener('cancel',()=>book.capture());
$('openHandbookPlay').onclick=()=>{$('helpDialog').showModal();$('closeHelp').focus();};$('closeHelp').onclick=()=>$('helpDialog').close();
$('showRules').onclick=()=>setRightView('rules');$('showFeedback').onclick=()=>setRightView('feedback');
$('openEvidence').onclick=()=>{if($('evidence').hidden)return;$('evidenceDialog').showModal();$('closeEvidence').focus();};$('closeEvidence').onclick=()=>$('evidenceDialog').close();
for(const [id,pane] of [['documentPane','document'],['bookPane','book']])$(id).onclick=()=>{$('play').dataset.pane=pane;$('documentPane').setAttribute('aria-selected',String(pane==='document'));$('bookPane').setAttribute('aria-selected',String(pane==='book'));};
book.onChange=()=>{if(state&&!$('play').hidden)renderComparison();else $('useRule').disabled=true;};
prepareAssets();setupTopics();state=load();home();
})();
