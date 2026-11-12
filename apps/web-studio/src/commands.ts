import {
  atPath,
  canContain,
  parse,
  pathOf,
  treeOf,
  type Files,
} from "./document";
import {
  readMotion,
  writeMotion,
  validateMotion,
  createTrack,
  applyTrackPreset,
  type Preset,
} from "./timeline";
import {
  ACTIONS,
  readInteractions,
  writeInteractions,
  type ActionKind,
  type Interaction,
} from "./interactions";

export type CommandName =
  | "getDocument"
  | "addElement"
  | "setText"
  | "setStyles"
  | "setAttribute"
  | "moveElement"
  | "removeElement"
  | "replaceCode"
  | "setTimeline"
  | "addAnimationTrack"
  | "saveInteraction"
  | "removeInteraction";
export type CommandInput = {
  name: CommandName;
  args: Record<string, unknown>;
  revision?: string;
};
export type CommandResult =
  | {
      ok: true;
      files: Files;
      revision: string;
      nodeId?: string;
      trackId?: string;
      ruleId?: string;
      document?: ReturnType<typeof describeDocument>;
    }
  | { ok: false; error: { code: string; message: string } };
const str = { type: "string" };
const target = { nodeId: str };
const spec = (
  description: string,
  required: string[],
  properties: Record<string, unknown>,
  readOnly = false,
) => ({
  description,
  readOnly,
  parameters: {
    type: "object",
    required,
    properties,
    additionalProperties: false,
  },
});
/** Provider-neutral tool definitions. Mutations must also carry the current revision. */
export const commandCatalog = {
  saveInteraction: spec(
    "클릭할 요소와 대상 요소를 연결한다. ruleId를 생략하면 추가, 지정하면 수정한다. HTML id를 자동 부여하며 사용자 JS와 타임라인은 보존한다.",
    ["nodeId", "targetNodeId", "action"],
    {
      ...target,
      targetNodeId: str,
      action: { type: "string", enum: Object.keys(ACTIONS) },
      className: str,
      ruleId: str,
    },
  ),
  removeInteraction: spec(
    "동작 연결 하나를 삭제한다. HTML 요소는 유지한다.",
    ["ruleId"],
    { ruleId: str },
  ),
  setTimeline: spec(
    "타임라인 전체를 변경한다. 기존 사용자 JS는 보존하며 관리 영역의 키프레임·시간·easing을 갱신한다. getDocument의 motion 형식을 사용한다.",
    ["data"],
    {
      data: {
        type: "object",
        description:
          "version:1, loop:boolean, tracks: MotionTrack[] (최대20). 각 트랙: id,targetId,label,start,duration,easing,frames. 각 프레임: id,offset(0~1),x,y,scale,rotate,opacity,easing?",
      },
    },
  ),
  addAnimationTrack: spec(
    "선택 요소에 안정적인 HTML id와 애니메이션 트랙 하나를 추가한다. 요소당 한 트랙이며 반환된 trackId로 편집한다.",
    ["nodeId", "preset"],
    {
      ...target,
      preset: { type: "string", enum: ["fade", "slide", "scale", "rotate"] },
      replaceExisting: {
        type: "boolean",
        description:
          "true이면 기존 트랙의 시작·길이·easing을 유지하고 프리셋 키프레임을 교체한다.",
      },
    },
  ),
  getDocument: spec(
    "현재 HTML/CSS/JS, 요소 트리와 문서 버전을 읽는다. 요소 ID는 해당 버전에서만 유효하다.",
    [],
    {},
    true,
  ),
  addElement: spec(
    "부모 안에 HTML 요소 하나를 추가한다. parentId=null은 body. index를 생략하면 맨 끝.",
    ["parentId", "html"],
    {
      parentId: { type: ["string", "null"] },
      html: str,
      index: { type: "integer", minimum: 0 },
    },
  ),
  setText: spec(
    "자식 요소가 없는 요소의 텍스트를 바꾼다. 구조를 지우는 작업은 거부한다.",
    ["nodeId", "text"],
    { ...target, text: str },
  ),
  setStyles: spec(
    "인라인 CSS 속성을 수정한다. kebab-case 속성명과 문자열 값을 사용하며 빈 값은 제거한다.",
    ["nodeId", "styles"],
    { ...target, styles: { type: "object", additionalProperties: str } },
  ),
  setAttribute: spec(
    "요소의 HTML 속성을 변경한다. null은 제거. 이벤트 핸들러는 JS 탭에서 편집한다.",
    ["nodeId", "name", "value"],
    { ...target, name: str, value: { type: ["string", "null"] } },
  ),
  moveElement: spec(
    "요소를 다른 부모의 자식 위치로 옮긴다. 순환 및 HTML 구조가 깨지는 이동은 거부한다.",
    ["nodeId", "parentId"],
    {
      ...target,
      parentId: { type: ["string", "null"] },
      index: { type: "integer", minimum: 0 },
    },
  ),
  removeElement: spec(
    "요소와 자식을 삭제한다. 편집 기록으로 되돌릴 수 있다.",
    ["nodeId"],
    target,
  ),
  replaceCode: spec(
    "html/css/js 중 한 파일의 전체 코드를 교체한다.",
    ["file", "code"],
    { file: { type: "string", enum: ["html", "css", "js"] }, code: str },
  ),
} as const;
export function revisionOf(files: Files) {
  let hash = 2166136261;
  for (const c of JSON.stringify(files)) {
    hash ^= c.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}
export function describeDocument(files: Files) {
  const doc = parse(files.html);
  const map = (n: ReturnType<typeof treeOf>[number]): unknown => ({
    id: `node:${n.id}`,
    tag: n.tag,
    label: n.label,
    children: n.children.map(map),
  });
  return {
    revision: revisionOf(files),
    files,
    roots: treeOf(doc).map(map),
    motion: readMotion(files.js),
    interactions: readInteractions(files.js),
    idScope:
      "IDs are valid only for this revision. Read again after a mutation.",
  };
}
class CommandError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
function fail(code: string, message: string): never {
  throw new CommandError(code, message);
}
function stringArg(args: Record<string, unknown>, key: string) {
  if (typeof args[key] !== "string")
    fail("INVALID_ARGUMENT", `${key}: 문자열이 필요해.`);
  return args[key] as string;
}
function resolve(doc: Document, id: unknown, body = false) {
  if (body && id === null) return doc.body;
  if (typeof id !== "string" || !id.startsWith("node:"))
    fail("INVALID_TARGET", "getDocument에서 받은 요소 ID를 사용해.");
  const el = atPath(doc, id.slice(5));
  if (!el) fail("NOT_FOUND", "요소가 없어. 문서를 다시 읽어봐.");
  return el;
}
function insert(parent: Element, el: Element, index: unknown) {
  if (!canContain(parent))
    fail("INVALID_PARENT", "이 요소에는 자식을 넣을 수 없어.");
  if (
    index !== undefined &&
    (!Number.isInteger(index) ||
      Number(index) < 0 ||
      Number(index) > parent.children.length)
  )
    fail("INVALID_INDEX", "자식 위치가 범위를 벗어났어.");
  parent.insertBefore(
    el,
    index === undefined ? null : parent.children[Number(index)] || null,
  );
}
export function executeCommand(
  files: Files,
  input: CommandInput,
): CommandResult {
  try {
    if (!input || !Object.hasOwn(commandCatalog, input.name))
      fail("UNKNOWN_COMMAND", "지원하지 않는 명령이야.");
    const args = input.args;
    if (!args || typeof args !== "object" || Array.isArray(args))
      fail("INVALID_ARGUMENT", "명령 인자가 필요해.");
    const definition = commandCatalog[input.name];
    for (const key of definition.parameters.required)
      if (!(key in args)) fail("INVALID_ARGUMENT", `${key} 인자가 필요해.`);
    for (const key of Object.keys(args))
      if (!(key in definition.parameters.properties))
        fail("INVALID_ARGUMENT", `알 수 없는 인자: ${key}`);
    if (input.name === "getDocument")
      return {
        ok: true,
        files,
        revision: revisionOf(files),
        document: describeDocument(files),
      };
    if (input.revision !== revisionOf(files))
      fail(
        "STALE_REVISION",
        "문서가 변경됐어. getDocument로 현재 구조를 다시 읽어봐.",
      );
    if (input.name === "replaceCode") {
      const file = stringArg(args, "file");
      if (!["html", "css", "js"].includes(file))
        fail("INVALID_ARGUMENT", "html/css/js 중 하나를 선택해.");
      const next = { ...files, [file]: stringArg(args, "code") };
      return { ok: true, files: next, revision: revisionOf(next) };
    }
    if (input.name === "setTimeline") {
      if (!validateMotion(args.data))
        fail("INVALID_TIMELINE", "타임라인 값이 올바르지 않아.");
      const next = { ...files, js: writeMotion(files.js, args.data) };
      return { ok: true, files: next, revision: revisionOf(next) };
    }
    if (
      input.name === "saveInteraction" ||
      input.name === "removeInteraction"
    ) {
      const parsed = readInteractions(files.js);
      if (parsed.error) fail("INVALID_INTERACTIONS", parsed.error);
      let rules = parsed.data.rules;
      const d = parse(files.html);
      let ruleId: string;
      if (input.name === "removeInteraction") {
        ruleId = stringArg(args, "ruleId");
        if (!rules.some((r) => r.id === ruleId))
          fail("NOT_FOUND", "동작 연결이 없어.");
        rules = rules.filter((r) => r.id !== ruleId);
      } else {
        const source = resolve(d, args.nodeId),
          targetEl = resolve(d, args.targetNodeId);
        const action = stringArg(args, "action");
        if (!Object.hasOwn(ACTIONS, action))
          fail("INVALID_ARGUMENT", "지원하는 동작을 선택해.");
        if (args.ruleId !== undefined && typeof args.ruleId !== "string")
          fail("INVALID_ARGUMENT", "ruleId는 문자열이어야 해.");
        if (
          args.ruleId !== undefined &&
          !rules.some((r) => r.id === args.ruleId)
        )
          fail("NOT_FOUND", "동작 연결이 없어.");
        if (args.ruleId === undefined && rules.length >= 50)
          fail("RULE_LIMIT", "동작 연결은 50개까지 추가할 수 있어.");
        if (args.className !== undefined && typeof args.className !== "string")
          fail("INVALID_ARGUMENT", "className은 문자열이어야 해.");
        const className =
          typeof args.className === "string" ? args.className.trim() : "";
        if (
          action === "toggleClass" &&
          (!className || /[\s\u0000]/.test(className))
        )
          fail("INVALID_ARGUMENT", "공백 없는 클래스 이름 하나를 입력해.");
        const ensureId = (el: Element) => {
          if (
            el.id &&
            Array.from(d.querySelectorAll("[id]")).filter((n) => n.id === el.id)
              .length > 1
          )
            fail(
              "DUPLICATE_ID",
              "요소 ID가 중복돼 있어. 속성에서 고유한 ID를 지정해줘.",
            );
          if (!el.id) {
            do {
              el.id = "action-" + crypto.randomUUID().slice(0, 8);
            } while (
              Array.from(d.querySelectorAll("[id]")).some(
                (n) => n !== el && n.id === el.id,
              )
            );
          }
          return el.id;
        };
        ruleId =
          typeof args.ruleId === "string" ? args.ruleId : crypto.randomUUID();
        const rule: Interaction = {
          id: ruleId,
          sourceId: ensureId(source),
          targetId: ensureId(targetEl),
          event: "click",
          action: action as ActionKind,
          ...(action === "toggleClass" ? { className } : {}),
        };
        rules =
          args.ruleId === undefined
            ? [...rules, rule]
            : rules.map((r) => (r.id === ruleId ? rule : r));
      }
      const next = {
        ...files,
        html: d.body.innerHTML,
        js: writeInteractions(files.js, { version: 1, rules }),
      };
      return { ok: true, files: next, revision: revisionOf(next), ruleId };
    }
    if (input.name === "addAnimationTrack") {
      const d = parse(files.html),
        el = resolve(d, args.nodeId),
        preset = stringArg(args, "preset");
      if (!["fade", "slide", "scale", "rotate"].includes(preset))
        fail("INVALID_ARGUMENT", "지원하는 애니메이션 프리셋을 선택해.");
      const parsed = readMotion(files.js);
      if (parsed.error) fail("INVALID_TIMELINE", parsed.error);
      if (
        !el.id ||
        Array.from(d.querySelectorAll("[id]")).filter((n) => n.id === el.id)
          .length > 1
      )
        el.id = "motion-" + crypto.randomUUID().slice(0, 8);
      const existing = parsed.data.tracks.find((t) => t.targetId === el.id);
      if (
        args.replaceExisting !== undefined &&
        typeof args.replaceExisting !== "boolean"
      )
        fail("INVALID_ARGUMENT", "replaceExisting은 true 또는 false여야 해.");
      if (existing) {
        const next = args.replaceExisting
          ? {
              ...files,
              js: writeMotion(files.js, {
                ...parsed.data,
                tracks: parsed.data.tracks.map((t) =>
                  t.id === existing.id
                    ? applyTrackPreset(t, preset as Preset)
                    : t,
                ),
              }),
            }
          : files;
        return {
          ok: true,
          files: next,
          revision: revisionOf(next),
          nodeId: "node:" + pathOf(el),
          trackId: existing.id,
        };
      }
      if (parsed.data.tracks.length >= 20)
        fail("TRACK_LIMIT", "트랙은 20개까지 추가할 수 있어.");
      const track = createTrack(
        el.id,
        el.classList[0] ||
          el.textContent?.trim().slice(0, 24) ||
          el.tagName.toLowerCase(),
        preset as Preset,
      );
      const next = {
        ...files,
        html: d.body.innerHTML,
        js: writeMotion(files.js, {
          ...parsed.data,
          tracks: [...parsed.data.tracks, track],
        }),
      };
      return {
        ok: true,
        files: next,
        revision: revisionOf(next),
        nodeId: "node:" + pathOf(el),
        trackId: track.id,
      };
    }
    const doc = parse(files.html);
    let changed: Element | null = null;
    switch (input.name) {
      case "addElement": {
        const parent = resolve(doc, args.parentId, true),
          template = doc.createElement("template");
        template.innerHTML = stringArg(args, "html");
        if (
          template.content.children.length !== 1 ||
          Array.from(template.content.childNodes).some(
            (n) => n.nodeType === 3 && n.textContent?.trim(),
          )
        )
          fail("INVALID_HTML", "HTML 요소를 하나씩 추가해.");
        changed = template.content.firstElementChild!;
        if (
          changed.matches("script,style,html,head,body") ||
          changed.querySelector("script,style")
        )
          fail("INVALID_HTML", "스크립트와 스타일은 해당 코드 탭에서 편집해.");
        insert(parent, changed, args.index);
        break;
      }
      case "setText": {
        changed = resolve(doc, args.nodeId);
        if (changed.children.length || !canContain(changed))
          fail(
            "HAS_CHILDREN",
            "텍스트만 있는 요소를 선택해. 자식 구조는 유지해야 해.",
          );
        changed.textContent = stringArg(args, "text");
        break;
      }
      case "setStyles": {
        changed = resolve(doc, args.nodeId);
        if (
          !args.styles ||
          typeof args.styles !== "object" ||
          Array.isArray(args.styles)
        )
          fail("INVALID_ARGUMENT", "CSS 속성 객체가 필요해.");
        const style = (changed as HTMLElement).style;
        for (const [key, value] of Object.entries(args.styles)) {
          if (
            typeof value !== "string" ||
            !/^(-{0,2}[a-zA-Z][\w-]*)$/.test(key)
          )
            fail("INVALID_STYLE", "CSS 속성명과 문자열 값을 확인해.");
          if (value && !key.startsWith("--")) {
            const probe = doc.createElement("div").style;
            probe.setProperty(key, value);
            if (!probe.getPropertyValue(key))
              fail("INVALID_STYLE", `${key}: 올바른 CSS 값을 입력해.`);
          }
          style.setProperty(key, value);
        }
        if (!style.length) changed.removeAttribute("style");
        break;
      }
      case "setAttribute": {
        changed = resolve(doc, args.nodeId);
        const key = stringArg(args, "name");
        if (
          !/^[a-zA-Z_:][\w:.-]*$/.test(key) ||
          /^on/i.test(key) ||
          key.startsWith("data-ion-")
        )
          fail("INVALID_ATTRIBUTE", "이 속성은 직접 바꿀 수 없어.");
        if (args.value === null) changed.removeAttribute(key);
        else changed.setAttribute(key, stringArg(args, "value"));
        break;
      }
      case "moveElement": {
        changed = resolve(doc, args.nodeId);
        const parent = resolve(doc, args.parentId, true);
        if (changed === parent || changed.contains(parent))
          fail("CYCLE", "자기 자신이나 자식 안으로 옮길 수 없어.");
        changed.remove();
        insert(parent, changed, args.index);
        break;
      }
      case "removeElement": {
        resolve(doc, args.nodeId).remove();
        break;
      }
    }
    // Browser reparsing must preserve the same element structure, or the transaction is rejected.
    const html = doc.body.innerHTML;
    const reopened = parse(html);
    if (reopened.body.innerHTML !== html)
      fail(
        "INVALID_STRUCTURE",
        "브라우저가 이 부모·자식 구조를 유지할 수 없어. 다른 부모를 선택해.",
      );
    const next = { ...files, html };
    return {
      ok: true,
      files: next,
      revision: revisionOf(next),
      ...(changed ? { nodeId: `node:${pathOf(changed)}` } : {}),
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: error instanceof CommandError ? error.code : "COMMAND_FAILED",
        message: error instanceof Error ? error.message : "작업에 실패했어.",
      },
    };
  }
}
