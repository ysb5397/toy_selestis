/* All parts share a 96×112 grid. Appearance never depends on the verdict. */
(() => {
'use strict';
const choices={
 face:[['soft','부드러운 얼굴'],['square','각진 얼굴'],['round','둥근 얼굴']],
 skin:[['light','밝은 피부'],['warm','따뜻한 피부'],['tan','구릿빛 피부'],['deep','짙은 피부']],
 hair:[['crop','짧은 머리'],['part','가르마'],['bob','단발'],['curl','곱슬'],['long','긴 머리'],['none','민머리']],
 hairColor:[['brown','갈색'],['black','검정'],['auburn','적갈색'],['gray','회색']],
 outfit:[['shirt','셔츠'],['cardigan','카디건'],['jacket','재킷'],['vest','조끼']],
 fabric:[['olive','올리브'],['slate','청회색'],['brown','갈색'],['wine','버건디']],
 glasses:[['none','안경 없음'],['round','둥근 안경'],['square','사각 안경']],
 accessory:[['none','장식 없음'],['badge','명찰'],['earring','귀걸이'],['tie','넥타이']]
};
const skins={light:['#edc7a2','#d3a17d','#f8dbc0'],warm:['#d7a57c','#b97e58','#edbc91'],tan:['#b78059','#915b40','#ce9b71'],deep:['#87563f','#633d30','#a77552']};
const hairs={brown:['#59402e','#382c24','#805b3d'],black:['#34352f','#222923','#53554b'],auburn:['#794733','#4d3027','#a36b49'],gray:['#838379','#53584e','#b1afa0']};
const fabrics={olive:['#62684c','#424c38','#879071'],slate:['#536a70','#354b53','#7d9294'],brown:['#79614d','#514536','#a18a6a'],wine:['#77514e','#503b3a','#a27669']};
const ink='#293029',cream='#d9d2b6';
function hash(text){let value=2166136261;for(const c of String(text)){value^=c.charCodeAt(0);value=Math.imul(value,16777619);}return value>>>0;}
function normalizeConfig(input){if(!input||typeof input!=='object')return null;const result={};for(const [key,values] of Object.entries(choices)){if(!values.some(([v])=>v===input[key]))return null;result[key]=input[key];}return result;}
function createConfig(seed,identity){let n=hash(`${seed}:${identity}`);const next=()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};return Object.fromEntries(Object.entries(choices).map(([key,values])=>[key,values[Math.floor(next()*values.length)][0]]));}
const $=id=>document.getElementById(id),rig=$('visitorRig'),body=$('visitorBody'),head=$('visitorHead');
let config=createConfig(1,'welcome'),currentKey='';
function pen(canvas){const ctx=canvas.getContext('2d');if(!ctx)return null;ctx.clearRect(0,0,96,112);ctx.imageSmoothingEnabled=false;return (x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};}
function drawBody(c){const r=pen(body);if(!r)return;const [cloth,shade,light]=fabrics[c.fabric],[skin,dark]=skins[c.skin];
 // Shoulders, sleeves, and neck use identical attachment points for every outfit.
 r(34,57,28,12,ink);r(37,57,22,16,skin);r(37,58,5,12,dark);
 r(24,68,48,6,ink);r(16,74,64,10,ink);r(10,84,76,28,ink);r(20,76,56,36,cloth);r(12,86,8,26,shade);r(76,86,8,26,shade);r(22,73,13,8,light);r(61,73,13,8,light);
 r(15,91,3,16,light);r(79,92,3,15,cloth);r(24,82,3,25,shade);r(69,82,3,25,shade);
 r(38,67,20,45,cream);r(45,73,6,39,'#b9b49a');
 if(c.outfit==='shirt'){r(26,75,44,37,cloth);r(38,67,9,8,cream);r(49,67,9,8,cream);r(46,77,4,35,light);for(let y=81;y<110;y+=10)r(47,y,2,2,ink);r(58,83,10,9,shade);r(58,82,10,2,light);}
 if(c.outfit==='cardigan'){r(32,72,5,40,shade);r(59,72,5,40,shade);r(35,76,4,36,light);r(57,76,3,36,light);r(36,69,9,6,cream);r(51,69,9,6,cream);for(let y=87;y<110;y+=9)r(58,y,2,2,cream);r(24,98,10,2,light);r(63,98,10,2,light);}
 if(c.outfit==='jacket'){r(29,70,9,10,light);r(34,78,7,11,light);r(38,87,5,9,light);r(58,70,9,10,light);r(55,78,7,11,light);r(51,87,5,9,light);r(25,91,10,11,shade);r(61,91,10,11,shade);r(25,90,10,3,light);r(61,90,10,3,light);r(29,95,2,2,cream);r(65,95,2,2,cream);}
 if(c.outfit==='vest'){r(12,86,9,26,cream);r(75,86,9,26,cream);r(28,72,9,40,cloth);r(59,72,9,40,cloth);r(34,79,7,33,cloth);r(55,79,7,33,cloth);r(40,91,16,21,cloth);r(46,92,3,20,shade);for(let y=95;y<112;y+=7)r(48,y,2,2,cream);}
 if(c.accessory==='tie'){r(44,73,8,5,'#59443b');r(46,78,5,17,'#775647');r(44,95,9,4,'#775647');}
 if(c.accessory==='badge'){r(64,81,3,6,ink);r(59,86,13,15,ink);r(61,88,9,11,cream);r(63,90,5,4,'#91977b');r(63,96,5,1,'#777d63');}
}
function drawHead(c){const r=pen(head);if(!r)return;const [skin,shadow,highlight]=skins[c.skin],[hair,dark,light]=hairs[c.hairColor];
 // Rear hair sits behind the face; front hair and glasses share the head pivot.
 if(['bob','long'].includes(c.hair)){r(21,17,54,c.hair==='long'?55:42,dark);r(25,13,46,50,hair);r(22,30,7,c.hair==='long'?42:29,hair);r(67,28,7,c.hair==='long'?44:31,hair);r(24,35,3,19,light);}
 const width=c.face==='round'?46:c.face==='square'?44:42,left=48-width/2;
 r(left,20,width,30,ink);r(left+3,17,width-6,38,ink);r(left+6,51,width-12,9,ink);r(left-3,34,4,13,shadow);r(left+width-1,34,4,13,skin);
 r(left+2,23,width-4,26,skin);r(left+5,20,width-10,34,skin);r(left+8,51,width-16,7,skin);r(left+3,25,4,23,shadow);r(left+8,23,8,4,highlight);r(left+width-9,29,3,16,highlight);
 if(c.face==='square'){r(left+4,48,width-8,8,skin);r(left+8,55,width-16,3,shadow);}else{r(left+8,50,width-16,6,skin);r(left+12,56,width-24,2,shadow);}
 r(33,32,9,2,dark);r(55,32,9,2,dark);r(35,37,4,4,ink);r(57,37,4,4,ink);r(35,37,1,1,cream);r(57,37,1,1,cream);r(47,39,3,7,shadow);r(43,50,11,2,'#855c45');
 if(c.hair!=='none'){
  r(25,18,46,8,dark);r(29,12,38,9,hair);r(34,9,28,8,dark);r(34,12,25,5,hair);r(26,22,5,16,hair);r(65,21,5,15,hair);
  if(c.hair==='crop'){r(29,18,38,9,hair);r(31,18,5,4,light);r(43,16,8,4,light);r(59,19,6,4,light);}
  if(c.hair==='part'){r(31,15,32,9,hair);r(29,21,25,7,hair);r(31,27,15,5,hair);r(54,17,3,10,dark);r(34,17,12,3,light);r(59,21,7,6,hair);}
  if(['bob','long'].includes(c.hair)){r(27,16,42,12,hair);r(28,26,17,7,hair);r(33,31,9,3,hair);r(48,25,9,4,hair);r(59,26,9,8,hair);r(32,18,17,3,light);r(26,39,4,13,light);}
  if(c.hair==='curl'){for(const [x,y] of [[26,18],[33,11],[43,9],[54,10],[62,15],[67,23],[24,27]]){r(x,y,9,9,dark);r(x+2,y+1,6,6,hair);r(x+2,y+1,3,2,light);}r(30,24,7,6,hair);r(43,21,7,7,hair);r(57,24,7,7,hair);}
 }
 if(c.glasses!=='none'){
  const y=35;r(29,y,16,2,ink);r(53,y,16,2,ink);r(29,y+8,16,2,ink);r(53,y+8,16,2,ink);r(28,y+2,2,6,ink);r(44,y+2,2,6,ink);r(52,y+2,2,6,ink);r(68,y+2,2,6,ink);r(46,y+3,6,2,ink);r(25,y+2,4,2,ink);r(70,y+2,3,2,ink);
  if(c.glasses==='round'){r(29,y,2,2,skin);r(43,y,2,2,skin);r(53,y,2,2,skin);r(67,y,2,2,skin);r(29,y+8,2,2,skin);r(43,y+8,2,2,skin);r(53,y+8,2,2,skin);r(67,y+8,2,2,skin);}
 }
 if(c.accessory==='earring'){r(left-2,47,2,5,'#d9b669');r(left+width,47,2,5,'#d9b669');}
}
function render(){drawBody(config);drawHead(config);rig.dataset.look=JSON.stringify(config);rig.setAttribute('aria-label',`${choices.hair.find(([v])=>v===config.hair)[1]}, ${choices.outfit.find(([v])=>v===config.outfit)[1]} 차림의 방문자`);}
function setVisitor(nextIdentity,nextSeed,{nod=false}={}){
 const nextKey=`${nextSeed}:${nextIdentity}`,changed=currentKey!==nextKey;currentKey=nextKey;config=createConfig(nextSeed,nextIdentity);render();
 if(changed){rig.classList.remove('is-entering','is-nodding');void rig.offsetWidth;rig.classList.add('is-entering');}
 else if(nod){rig.classList.remove('is-nodding');void rig.offsetWidth;rig.classList.add('is-nodding');}
}
document.addEventListener('visibilitychange',()=>rig.classList.toggle('is-paused',document.hidden));
document.querySelector('.scene').classList.add('has-visitor');
window.JavaVisitor={createConfig,normalizeConfig,setVisitor};render();
})();
