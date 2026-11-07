(() => {
  'use strict';
  const active = new Set();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  function mount(card, project) {
    if (project.author !== 'ysb5397') return;
    const lotto=project.cover==='lotto';
    const targets = [...card.querySelectorAll(lotto ? '.lotto-ball' : '.map span')];
    const shadows=lotto?[...card.querySelectorAll('.lotto-shadow')]:[];
    if (!targets.length) return;
    const original = targets.map(el => el.style.transform);
    const progress = {value:0};
    let loop, returning, hovering=false, focused=false;
    const paint = () => targets.forEach((el,i) => {
      if(!lotto){const amount=progress.value/100;el.style.transform=`translateY(${-amount*5}px) rotate(${amount*(i%2?1:-1)*3}deg) scale(${1+amount*.055})`;return;}
      // One shared playhead makes the entire choreography reversible, including staggering.
      const amount=Math.min(1,Math.max(0,(progress.value-i*4)/80));
      const arc=Math.sin(amount*Math.PI),side=i%2?1:-1;
      const height=[25,39,30,43,34,27][i]||30;
      const x=arc*side*4,y=-amount*height-arc*7;
      el.style.transform=`translate3d(${x}px,${y}px,${amount*(i%2?12:20)}px) rotate(${side*(amount*24+arc*10)}deg) scale(${1+amount*.06+arc*.025},${1+amount*.06-arc*.015})`;
      if(shadows[i]){shadows[i].style.transform=`scale(${1-amount*.4},${1-amount*.2})`;shadows[i].style.opacity=String(.65-amount*.38);}
    });
    function restore() {
      progress.value=0;
      targets.forEach((el,i)=>{if(original[i])el.style.transform=original[i];else el.style.removeProperty('transform');});
      shadows.forEach(el=>{el.style.removeProperty('transform');el.style.removeProperty('opacity');});
      active.delete(stop);
    }
    function stop(immediate=false) {
      loop?.pause(); returning?.cancel();
      if(immediate || reduced.matches || !window.anime?.animate){loop?.revert();restore();return;}
      returning=window.anime.animate(progress,{value:0,duration:lotto?420:220,ease:'outCubic',onUpdate:paint,onComplete:()=>{loop?.revert();restore();}});
    }
    function start() {
      if(reduced.matches || document.hidden || !window.anime?.createTimeline)return;
      returning?.cancel();loop?.revert();restore();active.add(stop);
      loop=window.anime.createTimeline({loop:true,loopDelay:1000,onUpdate:paint})
        .add(progress,{value:[0,100],duration:lotto?1500:850,ease:'inOutSine'})
        .add(progress,{value:0,duration:lotto?1500:850,ease:'inOutSine'});
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
