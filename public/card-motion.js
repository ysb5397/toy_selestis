(() => {
  'use strict';
  const active = new Set();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  function mount(card, project) {
    if (project.author !== 'ysb5397') return;
    const targets = [...card.querySelectorAll(project.cover === 'lotto' ? '.cover-balls span' : '.map span')];
    if (!targets.length) return;
    const original = targets.map(el => el.style.transform);
    const progress = {value:0};
    let loop, returning, hovering=false, focused=false;
    const paint = () => targets.forEach((el,i) => {
      const amount=progress.value/100;
      const lotto=project.cover==='lotto';
      el.style.transform=`translateY(${-amount*(lotto?10:5)}px) rotate(${amount*(i%2?1:-1)*(lotto?9:3)}deg) scale(${1+amount*(lotto?.08:.055)})`;
    });
    function restore() {
      progress.value=0;
      targets.forEach((el,i)=>{if(original[i])el.style.transform=original[i];else el.style.removeProperty('transform');});
      active.delete(stop);
    }
    function stop(immediate=false) {
      loop?.pause(); returning?.cancel();
      if(immediate || reduced.matches || !window.anime?.animate){loop?.revert();restore();return;}
      returning=window.anime.animate(progress,{value:0,duration:220,ease:'outQuad',onUpdate:paint,onComplete:()=>{loop?.revert();restore();}});
    }
    function start() {
      if(reduced.matches || document.hidden || !window.anime?.createTimeline)return;
      returning?.cancel();loop?.revert();restore();active.add(stop);
      loop=window.anime.createTimeline({loop:true,loopDelay:1000,onUpdate:paint})
        .add(progress,{value:[0,100],duration:850,ease:'inOutSine'})
        .add(progress,{value:0,duration:850,ease:'inOutSine'});
    }
    card.addEventListener('pointerenter',e=>{if(e.pointerType==='touch')return;hovering=true;start();});
    card.addEventListener('pointerleave',()=>{hovering=false;if(!focused)stop();});
    card.addEventListener('pointercancel',()=>{hovering=false;stop(true);});
    card.addEventListener('focus',()=>{focused=card.matches(':focus-visible');if(focused)start();});
    card.addEventListener('blur',()=>{focused=false;if(!hovering)stop();});
  }
  function stopAll(){for(const stop of [...active])stop(true);}
  reduced.addEventListener('change',stopAll);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAll();});
  window.addEventListener('pagehide',stopAll);
  window.CardMotion={mount,stopAll};
})();
