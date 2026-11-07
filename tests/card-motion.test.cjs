const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const anime=require('../public/shared/vendor/anime-4.5.0.umd.min.js');
test('anime timeline travels out and back, waits only at zero, and repeats',()=>{
 const progress={value:0};
 const timeline=anime.createTimeline({autoplay:false,loop:true,loopDelay:1000})
 .add(progress,{value:[0,100],duration:850,ease:'inOutSine'})
 .add(progress,{value:0,duration:850,ease:'inOutSine'});
 for(const [time,value] of [[0,0],[425,50],[850,100],[1275,50],[1700,0],[2200,0],[2700,0],[3125,50]]){timeline.seek(time);assert(Math.abs(progress.value-value)<.01,`at ${time}ms`);}
 timeline.revert();
});
test('only selected author animates; exit restores transforms and reduced motion prevents loops',()=>{
 const media={matches:false,addEventListener(){}},events={},style={transform:'',removeProperty(){this.transform='';}},target={style};
 let created=0,paused=0,cancelled=0,progress,update;
 const mock={createTimeline(options){created++;update=options.onUpdate;return {add(object){progress=object;return this;},pause(){paused++;},revert(){}};},animate(object,options){object.value=0;options.onUpdate();options.onComplete();return {cancel(){cancelled++;}};}};
 const window={anime:mock,matchMedia:()=>media,addEventListener(){}},document={hidden:false,addEventListener(){}};
 const card={querySelectorAll:()=>[target],addEventListener:(name,handler)=>events[name]=handler,matches:()=>false};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../public/card-motion.js'),'utf8'),{window,document});
 window.CardMotion.mount(card,{author:'ggm',cover:'lotto'});assert.equal(Object.keys(events).length,0);
 window.CardMotion.mount(card,{author:'ysb5397',cover:'lotto'});events.pointerenter({pointerType:'mouse'});assert.equal(created,1);
 progress.value=100;update();assert(style.transform.includes('-10px'));
 events.pointerleave();assert.equal(style.transform,'');assert.equal(paused,1);
 events.pointerenter({pointerType:'mouse'});window.CardMotion.stopAll();assert.equal(style.transform,'');assert.equal(paused,2);
 media.matches=true;events.pointerenter({pointerType:'mouse'});assert.equal(created,2);
 media.matches=false;events.pointerenter({pointerType:'touch'});assert.equal(created,2);assert(cancelled>=1);
});
