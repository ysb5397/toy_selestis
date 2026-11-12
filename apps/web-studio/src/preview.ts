import { parse, pathOf, type Files } from "./document";
import { readMotion, motionRuntime } from "./timeline";
export function previewHtml(
  files: Files,
  running: boolean,
  selected: string | null,
) {
  const doc = parse(files.html);
  Array.from(doc.body.querySelectorAll("*")).forEach((el) =>
    el.setAttribute("data-ion-path", pathOf(el)),
  );
  doc
    .querySelectorAll("script,style,link,meta,base,iframe,object,embed")
    .forEach((el) => el.remove());
  if (!running)
    doc.querySelectorAll("*").forEach((el) =>
      Array.from(el.attributes).forEach((a) => {
        if (a.name.startsWith("on")) el.removeAttribute(a.name);
      }),
    );
  const css = files.css.replace(/<\/style/gi, "<\\/style");
  const selectedCss =
    !running && selected
      ? `[data-ion-path="${selected}"] { outline: 2px solid #66cbb0 !important; outline-offset: 3px !important; }`
      : "";
  const bridge = `${!running ? motionRuntime(readMotion(files.js).data, false) : ""}\n(()=>{const send=(type,payload)=>parent.postMessage({ion:true,type,payload},'*');
window.addEventListener('error',e=>send('error',e.message));
window.addEventListener('unhandledrejection',e=>send('error',String(e.reason)));
const selectionStyle=document.createElement('style');document.head.appendChild(selectionStyle);
window.addEventListener('message',e=>{if(e.source!==parent||e.data?.type!=='ion-highlight')return;const path=e.data.path;selectionStyle.textContent=typeof path==='string'&&/^\\d+(\\.\\d+)*$/.test(path)?'[data-ion-path="'+path+'"] { outline: 2px solid #66cbb0 !important; outline-offset: 3px !important; }':'';});
window.addEventListener('scroll',()=>send('scroll',{x:scrollX,y:scrollY}),{passive:true});
window.addEventListener('message',e=>{if(e.source===parent&&e.data?.type==='ion-scroll')window.scrollTo(e.data.x,e.data.y);});
window.addEventListener('message',e=>{if(e.source!==parent)return;if(e.data?.type==='studio-motion-seek')window.__webStudioMotion?.seek(e.data.seconds*1000);if(e.data?.type==='studio-motion-clear')window.__webStudioMotion?.clear();});
window.addEventListener('message',e=>{if(e.source===parent&&e.data?.type==='studio-motion-focus'&&typeof e.data.targetId==='string')document.getElementById(e.data.targetId)?.scrollIntoView({block:'center',inline:'nearest'});});
${!running ? `document.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();const el=e.target.closest('[data-ion-path]');if(el)send('select',el.getAttribute('data-ion-path'));},true);` : ""}})();`;
  return `<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src https: data: blob:; font-src data:; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'"><style>${css}</style><style>${selectedCss}${!running ? "[data-ion-path]:hover { cursor: crosshair; }" : ""}</style></head><body>${doc.body.innerHTML}<script>${bridge}<\/script>${running ? `<script>${files.js.replace(/<\/script/gi, "<\\/script")}<\/script>` : ""}</body></html>`;
}
