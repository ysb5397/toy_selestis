import type { Files } from "./document";
export const EASINGS = [
  "linear",
  "ease",
  "ease-in",
  "ease-out",
  "ease-in-out",
] as const;
export type Easing = (typeof EASINGS)[number];
export type MotionFrame = {
  id: string;
  offset: number;
  x: number;
  y: number;
  scale: number;
  rotate: number;
  opacity: number;
  easing?: Easing;
};
export type MotionTrack = {
  id: string;
  targetId: string;
  label: string;
  start: number;
  duration: number;
  easing: Easing;
  preset?: Preset;
  frames: MotionFrame[];
};
export type MotionData = { version: 1; loop: boolean; tracks: MotionTrack[] };
export const emptyMotion = (): MotionData => ({
  version: 1,
  loop: false,
  tracks: [],
});
export const MOTION_BEGIN = "// <web-studio:motion>";
export const MOTION_END = "// </web-studio:motion>";
const finite = (n: unknown, min: number, max: number) =>
  typeof n === "number" && Number.isFinite(n) && n >= min && n <= max;
export function validateMotion(data: unknown): data is MotionData {
  if (!data || typeof data !== "object") return false;
  const d = data as MotionData;
  if (
    d.version !== 1 ||
    typeof d.loop !== "boolean" ||
    !Array.isArray(d.tracks) ||
    d.tracks.length > 20
  )
    return false;
  const trackIds = new Set<string>(),
    targets = new Set<string>();
  return d.tracks.every((t) => {
    if (
      !t ||
      typeof t.id !== "string" ||
      !t.id ||
      trackIds.has(t.id) ||
      typeof t.targetId !== "string" ||
      !t.targetId ||
      targets.has(t.targetId) ||
      typeof t.label !== "string" ||
      !finite(t.start, 0, 59.9) ||
      !finite(t.duration, 0.1, 60) ||
      t.start + t.duration > 60.001 ||
      !EASINGS.includes(t.easing) ||
      (t.preset !== undefined &&
        !["fade", "slide", "scale", "rotate"].includes(t.preset)) ||
      !Array.isArray(t.frames) ||
      t.frames.length < 2 ||
      t.frames.length > 40
    )
      return false;
    trackIds.add(t.id);
    targets.add(t.targetId);
    let last = -1;
    const ids = new Set<string>();
    return (
      t.frames.every((f) => {
        if (
          !f ||
          typeof f.id !== "string" ||
          ids.has(f.id) ||
          !finite(f.offset, 0, 1) ||
          f.offset <= last ||
          !finite(f.x, -2000, 2000) ||
          !finite(f.y, -2000, 2000) ||
          !finite(f.scale, 0.05, 5) ||
          !finite(f.rotate, -1080, 1080) ||
          !finite(f.opacity, 0, 1) ||
          (f.easing !== undefined && !EASINGS.includes(f.easing))
        )
          return false;
        last = f.offset;
        ids.add(f.id);
        return true;
      }) &&
      t.frames[0].offset === 0 &&
      t.frames.at(-1)!.offset === 1
    );
  });
}
export function readMotion(js: string): { data: MotionData; error?: string } {
  const begin = js.indexOf(MOTION_BEGIN),
    end = js.indexOf(MOTION_END);
  if (begin < 0 && end < 0) return { data: emptyMotion() };
  try {
    if (
      begin < 0 ||
      end < begin ||
      js.indexOf(MOTION_BEGIN, begin + 1) >= 0 ||
      js.indexOf(MOTION_END, end + 1) >= 0
    )
      throw Error();
    const region = js.slice(begin + MOTION_BEGIN.length, end),
      match = region.match(/^\s*\/\* @motion-data ([\s\S]*?) \*\//);
    if (!match) throw Error();
    const data = JSON.parse(match[1]);
    if (!validateMotion(data)) throw Error();
    return { data };
  } catch {
    return {
      data: emptyMotion(),
      error:
        "JS 코드의 타임라인 데이터 형식을 확인해줘. 기존 코드는 덮어쓰지 않았어.",
    };
  }
}
export const safeJson = (data: unknown) =>
  JSON.stringify(data).replace(/</g, "\\u003c").replace(/\*/g, "\\u002a");
/** This exact runtime powers both sandbox scrubbing and exported HTML. */
export function motionRuntime(data: MotionData, auto = false) {
  return `;(()=>{
const data=${safeJson(data)};let animations=[],active=false,raf=0,started=0,position=0;
const end=Math.max(0,...data.tracks.map(t=>(t.start+t.duration)*1000));
const ensure=()=>{if(active)return;active=true;animations=data.tracks.flatMap(t=>{const el=document.getElementById(t.targetId);if(!el)return [];const frames=t.frames.map(f=>({offset:f.offset,transform:'translate('+f.x+'px, '+f.y+'px) rotate('+f.rotate+'deg) scale('+f.scale+')',opacity:f.opacity,easing:f.easing||t.easing}));const animation=el.animate(frames,{duration:t.duration*1000,fill:'both',easing:'linear'});animation.pause();return [{animation,start:t.start*1000,duration:t.duration*1000}];});};
const seek=ms=>{ensure();position=Math.max(0,Number(ms)||0);animations.forEach(a=>{a.animation.currentTime=Math.max(0,Math.min(a.duration,position-a.start));});};
const pause=()=>{cancelAnimationFrame(raf);raf=0;};
const play=()=>{pause();if(!end)return;started=performance.now()-position;const tick=now=>{let time=now-started;if(time>=end){if(data.loop){time%=end;started=now-time;}else{seek(end);raf=0;return;}}seek(time);raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);};
const clear=()=>{pause();animations.forEach(a=>a.animation.cancel());animations=[];active=false;position=0;};
window.__webStudioMotion?.clear();window.__webStudioMotion={seek,pause,play,clear};
${auto ? "seek(0);play();" : ""}
})();`;
}
export function writeMotion(js: string, data: MotionData) {
  if (!validateMotion(data)) throw new Error("타임라인 값이 올바르지 않아.");
  const parsed = readMotion(js);
  if (parsed.error) throw new Error(parsed.error);
  const region = `${MOTION_BEGIN}\n/* @motion-data ${safeJson(data)} */\n${motionRuntime(data, true)}\n${MOTION_END}`;
  const begin = js.indexOf(MOTION_BEGIN),
    end = js.indexOf(MOTION_END);
  return begin < 0
    ? `${js.trimEnd()}\n\n${region}\n`
    : js.slice(0, begin) + region + js.slice(end + MOTION_END.length);
}
export type Preset = "fade" | "slide" | "scale" | "rotate";
export function createTrack(
  targetId: string,
  label: string,
  preset: Preset = "slide",
): MotionTrack {
  const base = { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 };
  const first = {
    ...base,
    ...(preset === "fade"
      ? { opacity: 0 }
      : preset === "slide"
        ? { y: 32, opacity: 0 }
        : preset === "scale"
          ? { scale: 0.75, opacity: 0 }
          : { rotate: -35, opacity: 0 }),
  };
  return {
    id: crypto.randomUUID(),
    targetId,
    label,
    start: 0,
    duration: 1.2,
    easing: "ease-in-out",
    preset,
    frames: [
      { id: crypto.randomUUID(), offset: 0, ...first },
      { id: crypto.randomUUID(), offset: 1, ...base },
    ],
  };
}
export function applyTrackPreset(
  track: MotionTrack,
  preset: Preset,
): MotionTrack {
  return {
    ...track,
    preset,
    frames: createTrack(track.targetId, track.label, preset).frames,
  };
}
export function timelineTimeAt(
  clientX: number,
  rulerLeft: number,
  pixelsPerSecond: number,
  length: number,
) {
  return (
    Math.round(
      Math.max(0, Math.min(length, (clientX - rulerLeft) / pixelsPerSecond)) *
        1000,
    ) / 1000
  );
}
const curves: Record<Easing, [number, number, number, number]> = {
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
  "ease-in": [0.42, 0, 1, 1],
  "ease-out": [0, 0, 0.58, 1],
  "ease-in-out": [0.42, 0, 0.58, 1],
};
export function easeValue(progress: number, easing: Easing) {
  const p = Math.max(0, Math.min(1, progress));
  if (p === 0 || p === 1) return p;
  if (easing === "linear") return p;
  const [x1, y1, x2, y2] = curves[easing];
  const cubic = (t: number, a: number, b: number) =>
    3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t * t * b + t ** 3;
  let lo = 0,
    hi = 1;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (cubic(mid, x1, x2) < p) lo = mid;
    else hi = mid;
  }
  return cubic((lo + hi) / 2, y1, y2);
}
export function sampleTrack(
  track: MotionTrack,
  seconds: number,
): Omit<MotionFrame, "id" | "easing"> {
  const offset = Math.max(
    0,
    Math.min(1, (seconds - track.start) / track.duration),
  );
  const end = track.frames.findIndex((f) => f.offset >= offset);
  const b = track.frames[Math.max(0, end)],
    a = track.frames[Math.max(0, end - 1)];
  const fraction =
    b.offset === a.offset
      ? 0
      : easeValue(
          (offset - a.offset) / (b.offset - a.offset),
          a.easing || track.easing,
        );
  const mix = (key: "x" | "y" | "scale" | "rotate" | "opacity") =>
    a[key] + (b[key] - a[key]) * fraction;
  return {
    offset,
    x: mix("x"),
    y: mix("y"),
    scale: mix("scale"),
    rotate: mix("rotate"),
    opacity: mix("opacity"),
  };
}
export function motionFiles(files: Files, data: MotionData): Files {
  return { ...files, js: writeMotion(files.js, data) };
}
