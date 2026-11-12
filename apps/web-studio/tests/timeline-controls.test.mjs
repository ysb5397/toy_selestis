import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { JSDOM } from "jsdom";
import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
const require = createRequire(import.meta.url);
const compile = (s, jsx = false) =>
  "data:text/javascript;base64," +
  Buffer.from(
    ts
      .transpileModule(s, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
          jsx: jsx ? ts.JsxEmit.ReactJSX : undefined,
        },
      })
      .outputText.replaceAll(
        '"react/jsx-runtime"',
        JSON.stringify(
          pathToFileURL(require.resolve("react/jsx-runtime")).href,
        ),
      ),
  ).toString("base64");
const motionUrl = compile(
  await readFile(new URL("../src/timeline.ts", import.meta.url), "utf8"),
);
const motion = await import(motionUrl);
let source = await readFile(
  new URL("../src/TimelinePanel.tsx", import.meta.url),
  "utf8",
);
source = source
  .replace(/import ['"]\.\/timeline\.css['"];?/, "")
  .replace(/['"]\.\/timeline['"]/, JSON.stringify(motionUrl))
  .replace(
    /from ['"]react['"]/,
    `from ${JSON.stringify(pathToFileURL(require.resolve("react")).href)}`,
  )
  .replace(
    /from ['"]lucide-react['"]/,
    `from ${JSON.stringify(pathToFileURL(require.resolve("lucide-react")).href)}`,
  );
const { TimelinePanel } = await import(compile(source, true));
async function setup(t, viewport = 800) {
  const dom = new JSDOM('<div id="root"></div>', { url: "http://localhost" });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  Object.defineProperty(dom.window.HTMLElement.prototype, "clientWidth", {
    get() {
      return this.classList.contains("tl-scroll") ? viewport : 0;
    },
    configurable: true,
  });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  };
  const callbacks = new Map();
  let raf = 0;
  globalThis.requestAnimationFrame = (fn) => {
    callbacks.set(++raf, fn);
    return raf;
  };
  globalThis.cancelAnimationFrame = (id) => callbacks.delete(id);
  const capture = new WeakMap();
  dom.window.HTMLElement.prototype.setPointerCapture = function (id) {
    capture.set(this, id);
  };
  dom.window.HTMLElement.prototype.hasPointerCapture = function (id) {
    return capture.get(this) === id;
  };
  dom.window.HTMLElement.prototype.releasePointerCapture = function () {
    capture.delete(this);
  };
  let state = {
    version: 1,
    loop: false,
    tracks: [
      {
        ...motion.createTrack("target", "Title", "slide"),
        start: 1,
        duration: 2,
      },
    ],
  };
  const changes = [],
    seeks = [];
  let set;
  function Host() {
    const [data, setData] = useState(state);
    set = setData;
    state = data;
    const onChange = (next) => {
      changes.push(next);
      setData(next);
    };
    return React.createElement(TimelinePanel, {
      data,
      selectedLabel: "Title",
      missing: [],
      disabled: false,
      onChange,
      onAdd: (preset, replace) => {
        assert.equal(replace, true);
        onChange({
          ...state,
          tracks: [motion.applyTrackPreset(state.tracks[0], preset)],
        });
        return state.tracks[0].id;
      },
      onSeek: (n) => seeks.push(n),
      onSelect: () => {},
      onClose: () => {},
    });
  }
  const root = createRoot(dom.window.document.getElementById("root"));
  await act(async () => root.render(React.createElement(Host)));
  const ruler = dom.window.document.querySelector(".tl-ruler");
  ruler.getBoundingClientRect = () => ({
    left: 190,
    width: 1100,
    top: 0,
    right: 1290,
    bottom: 30,
    height: 30,
  });
  const pointer = async (el, type, x, id = 7) => {
    const e = new dom.window.Event(type, { bubbles: true, cancelable: true });
    for (const [key, value] of Object.entries({
      clientX: x,
      pointerId: id,
      button: 0,
      buttons: type === "pointerup" ? 0 : 1,
    }))
      Object.defineProperty(e, key, { value });
    await act(async () => el.dispatchEvent(e));
  };
  t.after(async () => {
    await act(async () => root.unmount());
    dom.window.close();
    delete globalThis.window;
    delete globalThis.document;
  });
  return {
    dom,
    changes,
    seeks,
    callbacks,
    pointer,
    ruler,
    get state() {
      return state;
    },
    setState: async (data) => {
      await act(async () => set(data));
    },
  };
}
test("empty lane click-and-drag scrubs using the ruler origin and commits no document edit", async (t) => {
  const s = await setup(t),
    lane = s.dom.window.document.querySelector(".tl-lane");
  await s.pointer(lane, "pointerdown", 250);
  assert.equal(s.seeks.at(-1), 0.6);
  await s.pointer(lane, "pointermove", 590);
  assert.equal(s.seeks.at(-1), 4);
  await s.pointer(lane, "pointerup", 640);
  assert.equal(s.seeks.at(-1), 4.5);
  assert.equal(s.changes.length, 0);
});
test("the ruler fills the available width without rounding into a needless horizontal scroll", async (t) => {
  const s = await setup(t, 1255);
  assert.equal(
    s.dom.window.document.querySelector(".tl-sheet").style.width,
    "1255px",
  );
  assert.equal(s.ruler.style.width, "1065px");
});
test("playhead grip drags independently of its own bounding box", async (t) => {
  const s = await setup(t),
    grip = s.dom.window.document.querySelector(".tl-playhead-grip");
  await s.pointer(grip, "pointerdown", 290);
  await s.pointer(grip, "pointermove", 390);
  await s.pointer(grip, "pointerup", 390);
  assert.equal(s.seeks.at(-1), 2);
  assert.equal(s.changes.length, 0);
});
test("resize ignores click jitter and commits one length change on release", async (t) => {
  const s = await setup(t),
    grip = s.dom.window.document.querySelector(".tl-resize");
  await s.pointer(grip, "pointerdown", 490);
  await s.pointer(grip, "pointermove", 491);
  await s.pointer(grip, "pointerup", 491);
  assert.equal(s.changes.length, 0);
  await s.pointer(grip, "pointerdown", 490);
  await s.pointer(grip, "pointermove", 590);
  assert.equal(s.changes.length, 0);
  await s.pointer(grip, "pointerup", 590);
  assert.equal(s.changes.length, 1);
  assert.equal(s.state.tracks[0].duration, 3);
  assert.equal(s.state.tracks[0].start, 1);
});
test("the end diamond is the only resize handle and a click selects the last keyframe", async (t) => {
  const s = await setup(t),
    diamond = s.dom.window.document.querySelector(".tl-keyframe.tl-resize");
  assert.equal(s.dom.window.document.querySelectorAll(".tl-resize").length, 1);
  assert.equal(diamond.tagName, "BUTTON");
  assert.ok(diamond.querySelector("svg"));
  await s.pointer(diamond, "pointerdown", 490);
  await s.pointer(diamond, "pointerup", 490);
  await act(async () =>
    diamond.dispatchEvent(
      new s.dom.window.MouseEvent("click", { bubbles: true }),
    ),
  );
  assert.equal(s.changes.length, 0);
  assert.equal(s.seeks.at(-1), 3);
  assert.ok(
    s.dom.window.document
      .querySelector(".tl-frame-heading")
      .textContent.includes("2.00"),
  );
});
test("interior diamonds move keyframe time without resizing the clip", async (t) => {
  const s = await setup(t),
    track = s.state.tracks[0];
  await s.setState({
    ...s.state,
    tracks: [
      {
        ...track,
        frames: [
          track.frames[0],
          { ...track.frames[0], id: "middle", offset: 0.5 },
          track.frames[1],
        ],
      },
    ],
  });
  const middle = s.dom.window.document.querySelectorAll(".tl-keyframe")[1];
  assert.ok(!middle.classList.contains("tl-resize"));
  await s.pointer(middle, "pointerdown", 390);
  await s.pointer(middle, "pointermove", 440);
  await s.pointer(middle, "pointerup", 440);
  assert.equal(s.state.tracks[0].duration, 2);
  assert.equal(s.state.tracks[0].start, 1);
  assert.equal(s.state.tracks[0].frames[1].offset, 0.75);
});
test("preset selection applies immediately, resets the clock and starts a fresh preview", async (t) => {
  const s = await setup(t);
  const ruler = s.ruler;
  await s.pointer(ruler, "pointerdown", 440);
  await s.pointer(ruler, "pointerup", 440);
  assert.equal(s.seeks.at(-1), 2.5);
  const select = s.dom.window.document.querySelector(
    'select[aria-label="추가할 애니메이션"]',
  );
  await act(async () => {
    select.value = "rotate";
    select.dispatchEvent(new s.dom.window.Event("change", { bubbles: true }));
  });
  assert.equal(s.state.tracks[0].preset, "rotate");
  assert.equal(s.state.tracks[0].frames[0].rotate, -35);
  assert.equal(s.state.tracks[0].start, 1);
  assert.equal(s.state.tracks[0].duration, 2);
  assert.equal(s.seeks.at(-1), 0);
  assert.ok(
    s.dom.window.document.querySelector(
      'button[aria-label="타임라인 일시정지"]',
    ),
  );
  assert.ok(s.callbacks.size > 0);
});
test("scrubbing stops a playing preview before a queued animation frame can overwrite the seek", async (t) => {
  const s = await setup(t),
    select = s.dom.window.document.querySelector(
      'select[aria-label="추가할 애니메이션"]',
    );
  await act(async () => {
    select.value = "fade";
    select.dispatchEvent(new s.dom.window.Event("change", { bubbles: true }));
  });
  const oldTick = [...s.callbacks.values()][0];
  await s.pointer(s.ruler, "pointerdown", 290);
  await act(async () => oldTick(performance.now() + 1000));
  assert.equal(s.seeks.at(-1), 1);
  assert.ok(
    s.dom.window.document.querySelector('button[aria-label="타임라인 재생"]'),
  );
});
