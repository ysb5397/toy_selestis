export type ActionKind = "toggle" | "show" | "hide" | "toggleClass";
export type Interaction = {
  id: string;
  sourceId: string;
  targetId: string;
  event: "click";
  action: ActionKind;
  className?: string;
};
export type InteractionData = { version: 1; rules: Interaction[] };
export const ACTIONS = {
  toggle: "표시·숨김 전환",
  show: "표시하기",
  hide: "숨기기",
  toggleClass: "클래스 전환",
} as const;
const BEGIN = "// <web-studio:interactions>";
const END = "// </web-studio:interactions>";
const empty = (): InteractionData => ({ version: 1, rules: [] });
export function validateInteractions(value: unknown): value is InteractionData {
  if (!value || typeof value !== "object") return false;
  const data = value as InteractionData;
  if (
    data.version !== 1 ||
    !Array.isArray(data.rules) ||
    data.rules.length > 50
  )
    return false;
  const ids = new Set<string>();
  return data.rules.every((rule) => {
    if (
      !rule ||
      typeof rule.id !== "string" ||
      !rule.id ||
      ids.has(rule.id) ||
      typeof rule.sourceId !== "string" ||
      !rule.sourceId ||
      typeof rule.targetId !== "string" ||
      !rule.targetId ||
      rule.event !== "click" ||
      !Object.hasOwn(ACTIONS, rule.action) ||
      (rule.className !== undefined && typeof rule.className !== "string") ||
      (rule.action === "toggleClass" &&
        (!rule.className || /[\s\u0000]/.test(rule.className)))
    )
      return false;
    ids.add(rule.id);
    return true;
  });
}
export function readInteractions(js: string): {
  data: InteractionData;
  error?: string;
} {
  const begin = js.indexOf(BEGIN),
    end = js.indexOf(END);
  if (begin < 0 && end < 0) return { data: empty() };
  try {
    if (
      begin < 0 ||
      end < begin ||
      js.indexOf(BEGIN, begin + 1) >= 0 ||
      js.indexOf(END, end + 1) >= 0
    )
      throw Error();
    const region = js.slice(begin + BEGIN.length, end);
    const match =
      region.match(
        /const data=\/\* @interaction-data \*\/([\s\S]*?)\/\* @interaction-data-end \*\//,
      ) || region.match(/^\s*\/\* @interaction-data ([\s\S]*?) \*\//);
    if (!match) throw Error();
    const data = JSON.parse(match[1]);
    if (!validateInteractions(data)) throw Error();
    return { data };
  } catch {
    return {
      data: empty(),
      error:
        "JS의 동작 연결 데이터 형식을 확인해줘. 기존 코드는 덮어쓰지 않았어.",
    };
  }
}
export function interactionRuntime(data: InteractionData) {
  const json = JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/\*/g, "\\u002a");
  return `;(()=>{
const data=/* @interaction-data */${json}/* @interaction-data-end */,savedDisplay=new WeakMap();
const unique=id=>{const matches=Array.from(document.querySelectorAll('[id]')).filter(el=>el.id===id);return matches.length===1?matches[0]:null;};
const hide=el=>{if(!savedDisplay.has(el))savedDisplay.set(el,{value:el.style.getPropertyValue('display'),priority:el.style.getPropertyPriority('display')});el.hidden=true;el.style.setProperty('display','none','important');};
const show=el=>{if(!el.hidden&&getComputedStyle(el).display!=='none')return;el.hidden=false;const saved=savedDisplay.get(el);if(saved){el.style.setProperty('display',saved.value,saved.priority);savedDisplay.delete(el);}if(getComputedStyle(el).display==='none')el.style.setProperty('display','revert','important');};
document.addEventListener('click',event=>{
  if(!(event.target instanceof Element))return;
  const sources=[];for(let el=event.target;el;el=el.parentElement)sources.push(el);
  for(const source of sources)for(const rule of data.rules){
    if(unique(rule.sourceId)!==source)continue;
    const target=unique(rule.targetId);if(!target)continue;
    event.preventDefault();
    if(rule.action==='toggleClass')target.classList.toggle(rule.className);
    else if(rule.action==='hide')hide(target);
    else if(rule.action==='show')show(target);
    else if(target.hidden||getComputedStyle(target).display==='none')show(target);else hide(target);
  }
});
})();`;
}
export function writeInteractions(js: string, data: InteractionData) {
  if (!validateInteractions(data)) throw Error("동작 연결 값이 올바르지 않아.");
  const parsed = readInteractions(js);
  if (parsed.error) throw Error(parsed.error);
  const region = `${BEGIN}\n${interactionRuntime(data)}\n${END}`;
  const begin = js.indexOf(BEGIN),
    end = js.indexOf(END);
  return begin < 0
    ? `${js.trimEnd()}\n\n${region}\n`
    : js.slice(0, begin) + region + js.slice(end + END.length);
}
