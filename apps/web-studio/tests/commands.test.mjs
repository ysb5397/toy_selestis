import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { JSDOM } from "jsdom";
globalThis.DOMParser = new JSDOM("").window.DOMParser;
const compile = (source) =>
  "data:text/javascript;base64," +
  Buffer.from(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
  ).toString("base64");
const documentUrl = compile(
  await readFile(new URL("../src/document.ts", import.meta.url), "utf8"),
);
const motionSource = await readFile(
  new URL("../src/timeline.ts", import.meta.url),
  "utf8",
);
const motionUrl =
  "data:text/javascript;base64," +
  Buffer.from(
    ts.transpileModule(motionSource, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
  ).toString("base64");
const source = (
  await readFile(new URL("../src/commands.ts", import.meta.url), "utf8")
)
  .replace(/["']\.\/document["']/, JSON.stringify(documentUrl))
  .replace(/["']\.\/timeline["']/, JSON.stringify(motionUrl))
  .replace(
    /["']\.\/interactions["']/,
    JSON.stringify(
      compile(
        await readFile(
          new URL("../src/interactions.ts", import.meta.url),
          "utf8",
        ),
      ),
    ),
  );
const { executeCommand, revisionOf, commandCatalog } = await import(
  compile(source)
);
const initial = {
  html: "<main><section><h2>Title</h2><p>Text</p></section><aside></aside></main>",
  css: "",
  js: "",
};
const run = (files, name, args, revision = revisionOf(files)) =>
  executeCommand(files, { name, args, revision });
test("animation attachment is atomic, stable across moves and never duplicates a target", async () => {
  const { readMotion } = await import(motionUrl);
  const first = run(initial, "addAnimationTrack", {
    nodeId: "node:0.0.0",
    preset: "slide",
  });
  assert.equal(first.ok, true);
  assert.ok(first.trackId);
  assert.ok(first.files.html.includes('id="motion-'));
  const again = run(first.files, "addAnimationTrack", {
    nodeId: "node:0.0.0",
    preset: "fade",
  });
  assert.equal(again.revision, first.revision);
  assert.equal(again.trackId, first.trackId);
  const moved = run(first.files, "moveElement", {
    nodeId: "node:0.0.0",
    parentId: "node:0.1",
  });
  assert.equal(moved.ok, true);
  assert.equal(
    readMotion(moved.files.js).data.tracks[0].targetId,
    readMotion(first.files.js).data.tracks[0].targetId,
  );
});
test("timeline commands validate edits and keep custom JS intact", async () => {
  const { readMotion } = await import(motionUrl);
  const original = { ...initial, js: "window.keep = 1;" };
  const attached = run(original, "addAnimationTrack", {
    nodeId: "node:0.0.0",
    preset: "fade",
  });
  const data = readMotion(attached.files.js).data;
  data.tracks[0].duration = 2;
  const updated = run(attached.files, "setTimeline", { data });
  assert.equal(updated.ok, true);
  assert.ok(updated.files.js.startsWith("window.keep = 1;"));
  assert.equal(readMotion(updated.files.js).data.tracks[0].duration, 2);
  data.tracks[0].duration = -1;
  assert.equal(
    run(updated.files, "setTimeline", { data }).error.code,
    "INVALID_TIMELINE",
  );
});
test("removing a target leaves recoverable track data instead of retargeting another element", async () => {
  const { readMotion } = await import(motionUrl);
  const attached = run(initial, "addAnimationTrack", {
    nodeId: "node:0.0.0",
    preset: "scale",
  });
  const removed = run(attached.files, "removeElement", {
    nodeId: "node:0.0.0",
  });
  assert.equal(removed.ok, true);
  assert.equal(readMotion(removed.files.js).data.tracks.length, 1);
  assert.ok(
    !removed.files.html.includes(
      readMotion(removed.files.js).data.tracks[0].targetId,
    ),
  );
});

test("read command exposes revision-scoped targets and tool schemas", () => {
  const r = run(initial, "getDocument", {});
  assert.equal(r.ok, true);
  assert.equal(r.document.roots[0].id, "node:0");
  assert.equal(r.revision, revisionOf(initial));
  for (const d of Object.values(commandCatalog))
    assert.equal(d.parameters.additionalProperties, false);
});
test("reapplying a preset changes the existing track atomically without adding a second track", async () => {
  const { readMotion } = await import(motionUrl);
  const first = run(initial, "addAnimationTrack", {
    nodeId: "node:0.0.0",
    preset: "slide",
  });
  const data = readMotion(first.files.js).data;
  data.tracks[0].start = 0.8;
  data.tracks[0].duration = 2.5;
  data.tracks[0].easing = "linear";
  const timed = run(first.files, "setTimeline", { data });
  const result = run(timed.files, "addAnimationTrack", {
    nodeId: "node:0.0.0",
    preset: "scale",
    replaceExisting: true,
  });
  const tracks = readMotion(result.files.js).data.tracks;
  assert.equal(result.ok, true);
  assert.equal(tracks.length, 1);
  assert.equal(result.trackId, first.trackId);
  assert.equal(tracks[0].start, 0.8);
  assert.equal(tracks[0].duration, 2.5);
  assert.equal(tracks[0].easing, "linear");
  assert.equal(tracks[0].frames[0].scale, 0.75);
  assert.equal(tracks[0].preset, "scale");
  assert.equal(result.files.html, timed.files.html);
  assert.equal(
    run(timed.files, "addAnimationTrack", {
      nodeId: "node:0.0.0",
      preset: "fade",
      replaceExisting: "yes",
    }).error.code,
    "INVALID_ARGUMENT",
  );
});
test("stale mutations are rejected after a document change", () => {
  const first = run(initial, "setText", { nodeId: "node:0.0.0", text: "New" });
  assert.equal(first.ok, true);
  const stale = run(
    first.files,
    "removeElement",
    { nodeId: "node:0.0.1" },
    revisionOf(initial),
  );
  assert.equal(stale.ok, false);
  assert.equal(stale.error.code, "STALE_REVISION");
});
test("adding then styling then editing text use actual serialized HTML", () => {
  let r = run(initial, "addElement", { parentId: "node:0.1", html: "<p></p>" });
  assert.equal(r.ok, true);
  const id = r.nodeId;
  r = run(r.files, "setStyles", {
    nodeId: id,
    styles: { padding: "12px", color: "#ff0000" },
  });
  assert.equal(r.ok, true);
  r = run(r.files, "setText", { nodeId: id, text: "Hello <world>" });
  assert.equal(r.ok, true);
  assert.match(r.files.html, /Hello &lt;world&gt;/);
  assert.match(r.files.html, /padding: 12px/);
});
test("text edits cannot erase child structure", () => {
  const r = run(initial, "setText", { nodeId: "node:0.0", text: "oops" });
  assert.equal(r.ok, false);
  assert.equal(r.error.code, "HAS_CHILDREN");
  assert.match(initial.html, /<h2>Title/);
});
test("invalid CSS fails atomically without applying preceding fields", () => {
  const before = JSON.stringify(initial);
  const r = run(initial, "setStyles", {
    nodeId: "node:0.0",
    styles: { padding: "8px", color: "not-a-color" },
  });
  assert.equal(r.ok, false);
  assert.equal(r.error.code, "INVALID_STYLE");
  assert.equal(JSON.stringify(initial), before);
});
test("move supports sibling order and rejects cycles", () => {
  let r = run(initial, "moveElement", {
    nodeId: "node:0.0.1",
    parentId: "node:0.0",
    index: 0,
  });
  assert.equal(r.ok, true);
  assert.match(r.files.html, /<section><p>Text<\/p><h2>/);
  r = run(initial, "moveElement", { nodeId: "node:0", parentId: "node:0.0" });
  assert.equal(r.ok, false);
  assert.equal(r.error.code, "CYCLE");
});
test("void parents and reparse-breaking HTML are rejected", () => {
  const files = { ...initial, html: "<main><img><p>Text</p></main>" };
  let r = run(files, "addElement", {
    parentId: "node:0.0",
    html: "<h2>Bad</h2>",
  });
  assert.equal(r.ok, false);
  assert.equal(r.error.code, "INVALID_PARENT");
  r = run(files, "addElement", {
    parentId: "node:0.1",
    html: "<section>Bad</section>",
  });
  assert.equal(r.ok, false);
  assert.equal(r.error.code, "INVALID_STRUCTURE");
});
test("unknown tools, extra arguments and invalid target IDs are rejected", () => {
  assert.equal(run(initial, "toString", {}).error.code, "UNKNOWN_COMMAND");
  assert.equal(
    run(initial, "getDocument", { unexpected: true }).error.code,
    "INVALID_ARGUMENT",
  );
  assert.equal(
    run(initial, "removeElement", { nodeId: "node:99" }).error.code,
    "NOT_FOUND",
  );
});
test("attributes can be removed and event handlers cannot be introduced", () => {
  const files = { ...initial, html: '<p id="old">Text</p>' };
  let r = run(files, "setAttribute", {
    nodeId: "node:0",
    name: "id",
    value: null,
  });
  assert.equal(r.ok, true);
  assert.equal(r.files.html, "<p>Text</p>");
  r = run(files, "setAttribute", {
    nodeId: "node:0",
    name: "onclick",
    value: "alert(1)",
  });
  assert.equal(r.ok, false);
  assert.equal(r.error.code, "INVALID_ATTRIBUTE");
});
test("remove and code replacement preserve unrelated files", () => {
  let r = run(initial, "removeElement", { nodeId: "node:0.1" });
  assert.equal(r.ok, true);
  assert.ok(!r.files.html.includes("aside"));
  r = run(r.files, "replaceCode", { file: "css", code: "body { color:red; }" });
  assert.equal(r.ok, true);
  assert.equal(r.files.js, "");
  assert.equal(r.files.css, "body { color:red; }");
});
