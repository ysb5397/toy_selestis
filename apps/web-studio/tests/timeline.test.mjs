import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { JSDOM } from "jsdom";
const source = await readFile(
  new URL("../src/timeline.ts", import.meta.url),
  "utf8",
);
const url =
  "data:text/javascript;base64," +
  Buffer.from(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
  ).toString("base64");
const {
  emptyMotion,
  validateMotion,
  createTrack,
  readMotion,
  writeMotion,
  motionRuntime,
  sampleTrack,
  applyTrackPreset,
  timelineTimeAt,
  easeValue,
  MOTION_BEGIN,
} = await import(url);
test("preset replacement preserves the clip identity and timing but resets keyframes", () => {
  const track = createTrack("target", "Original", "slide");
  track.start = 1.25;
  track.duration = 3;
  track.easing = "ease-out";
  track.frames.splice(1, 0, { ...track.frames[0], id: "middle", offset: 0.5 });
  const before = JSON.stringify(track),
    next = applyTrackPreset(track, "rotate");
  assert.equal(next.id, track.id);
  assert.equal(next.targetId, track.targetId);
  assert.equal(next.label, track.label);
  assert.equal(next.start, 1.25);
  assert.equal(next.duration, 3);
  assert.equal(next.easing, "ease-out");
  assert.equal(next.preset, "rotate");
  assert.equal(next.frames.length, 2);
  assert.equal(next.frames[0].rotate, -35);
  assert.equal(next.frames[1].rotate, 0);
  assert.equal(JSON.stringify(track), before);
});
test("scrub coordinates use the ruler origin at every zoom and after horizontal scrolling", () => {
  assert.equal(timelineTimeAt(250, 190, 100, 10), 0.6);
  assert.equal(timelineTimeAt(250, 90, 100, 10), 1.6);
  assert.equal(timelineTimeAt(250, 190, 60, 10), 1);
  assert.equal(timelineTimeAt(350, 190, 160, 10), 1);
  assert.equal(timelineTimeAt(100, 190, 100, 10), 0);
  assert.equal(timelineTimeAt(2000, 190, 100, 10), 10);
});
const make = () => ({
  version: 1,
  loop: false,
  tracks: [createTrack("title", "Title", "slide")],
});
test("managed JS round trips, escapes script/comment delimiters and keeps custom JS", () => {
  const data = make();
  data.tracks[0].label = "</script> */  ";
  const js = writeMotion("window.original = 1;", data);
  assert.equal(readMotion(js).error, undefined);
  assert.deepEqual(readMotion(js).data, data);
  assert.ok(js.startsWith("window.original = 1;"));
  assert.ok(!js.includes("</script>"));
  const changed = writeMotion(js, { ...data, loop: true });
  assert.equal(changed.split(MOTION_BEGIN).length, 2);
  assert.equal(readMotion(changed).data.loop, true);
});
test("malformed managed regions refuse edits rather than erasing custom code", () => {
  for (const js of [
    MOTION_BEGIN,
    "// </web-studio:motion>",
    MOTION_BEGIN + "\n/* @motion-data {} */\n// </web-studio:motion>",
  ]) {
    assert.ok(readMotion(js).error);
    assert.throws(() => writeMotion(js, emptyMotion()));
  }
});
test("invalid timings, duplicate targets and unordered frames are rejected", () => {
  const data = make();
  assert.equal(validateMotion(data), true);
  assert.equal(
    validateMotion({
      ...data,
      tracks: [...data.tracks, { ...data.tracks[0], id: "new" }],
    }),
    false,
  );
  assert.equal(
    validateMotion({
      ...data,
      tracks: [{ ...data.tracks[0], start: 59, duration: 2 }],
    }),
    false,
  );
  assert.equal(
    validateMotion({
      ...data,
      tracks: [
        { ...data.tracks[0], frames: [...data.tracks[0].frames].reverse() },
      ],
    }),
    false,
  );
  assert.equal(
    validateMotion({ ...data, tracks: [{ ...data.tracks[0], easing: "bad" }] }),
    false,
  );
});
test("easing and keyframe sampling distinguish acceleration from deceleration", () => {
  assert.ok(easeValue(0.25, "ease-in") < 0.25);
  assert.ok(easeValue(0.25, "ease-out") > 0.25);
  assert.ok(Math.abs(easeValue(0.5, "ease-in-out") - 0.5) < 1e-6);
  const track = createTrack("a", "A", "slide");
  const sample = sampleTrack(track, 0.6);
  assert.ok(Math.abs(sample.y - 16) < 1e-5);
  assert.ok(Math.abs(sample.opacity - 0.5) < 1e-5);
  track.frames[0].easing = "ease-in";
  assert.ok(sampleTrack(track, 0.3).opacity < 0.25);
  assert.equal(sampleTrack(track, 100).opacity, 1);
  assert.equal(sampleTrack(track, -1).y, 32);
});
function runtime(data, auto = false) {
  const dom = new JSDOM('<h1 id="title">Hello</h1>', {
    runScripts: "outside-only",
  });
  const animations = [],
    callbacks = new Map();
  let id = 0;
  dom.window.HTMLElement.prototype.animate = function (frames, options) {
    const a = {
      frames,
      options,
      currentTime: 0,
      cancelled: false,
      pause() {},
      cancel() {
        this.cancelled = true;
      },
    };
    animations.push(a);
    return a;
  };
  dom.window.performance.now = () => 0;
  dom.window.requestAnimationFrame = (fn) => {
    callbacks.set(++id, fn);
    return id;
  };
  dom.window.cancelAnimationFrame = (n) => callbacks.delete(n);
  dom.window.eval(motionRuntime(data, auto));
  return { dom, animations, callbacks };
}
test("scrubbing uses the same keyframes, clamps clip-local time and clears effects", () => {
  const data = make();
  data.tracks[0].start = 1;
  const r = runtime(data);
  assert.equal(r.animations.length, 0);
  r.dom.window.__webStudioMotion.seek(1600);
  assert.equal(r.animations[0].currentTime, 600);
  assert.equal(r.animations[0].frames[0].easing, "ease-in-out");
  r.dom.window.__webStudioMotion.seek(500);
  assert.equal(r.animations[0].currentTime, 0);
  r.dom.window.__webStudioMotion.seek(9000);
  assert.equal(r.animations[0].currentTime, 1200);
  r.dom.window.__webStudioMotion.clear();
  assert.equal(r.animations[0].cancelled, true);
  r.dom.window.__webStudioMotion.seek(1000);
  assert.equal(r.animations.length, 2);
  r.dom.window.close();
});
test("export runtime loops all tracks on one global clock and ignores missing targets", () => {
  const data = make();
  data.loop = true;
  data.tracks[0].start = 1;
  const missing = createTrack("absent", "Missing", "fade");
  missing.duration = 0.3;
  data.tracks.push(missing);
  const r = runtime(data, true);
  assert.equal(r.animations.length, 1);
  const tick = [...r.callbacks.values()][0];
  tick(2400);
  assert.equal(r.animations[0].currentTime, 0);
  r.dom.window.__webStudioMotion.pause();
  r.dom.window.close();
});
test("generated runtime does not accidentally call the previous JS expression", () => {
  const r = new JSDOM('<h1 id="title">Hello</h1>', {
    runScripts: "outside-only",
  });
  r.window.HTMLElement.prototype.animate = () => ({
    pause() {},
    cancel() {},
    currentTime: 0,
  });
  r.window.requestAnimationFrame = () => 1;
  r.window.cancelAnimationFrame = () => {};
  r.window.eval(
    writeMotion(
      "window.called = 0; window.fn = () => {window.called++}",
      make(),
    ),
  );
  assert.equal(r.window.called, 0);
  assert.equal(typeof r.window.fn, "function");
  r.window.close();
});
