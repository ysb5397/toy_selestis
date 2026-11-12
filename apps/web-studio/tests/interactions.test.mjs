import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { JSDOM } from "jsdom";
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
const interactionsUrl = compile(
  await readFile(new URL("../src/interactions.ts", import.meta.url), "utf8"),
);
const {
  readInteractions,
  writeInteractions,
  interactionRuntime,
  validateInteractions,
} = await import(interactionsUrl);
const docUrl = compile(
  await readFile(new URL("../src/document.ts", import.meta.url), "utf8"),
);
const motionUrl = compile(
  await readFile(new URL("../src/timeline.ts", import.meta.url), "utf8"),
);
const commandUrl = compile(
  (await readFile(new URL("../src/commands.ts", import.meta.url), "utf8"))
    .replace('"./document"', JSON.stringify(docUrl))
    .replace('"./timeline"', JSON.stringify(motionUrl))
    .replace('"./interactions"', JSON.stringify(interactionsUrl)),
);
const { executeCommand, revisionOf } = await import(commandUrl);
const { exportHtml, importHtml } = await import(docUrl);
globalThis.DOMParser = new JSDOM("").window.DOMParser;
const rule = (action = "toggle", extra = {}) => ({
  id: "one",
  sourceId: "button",
  targetId: "target",
  event: "click",
  action,
  ...extra,
});
const data = (...rules) => ({ version: 1, rules });
const run = (files, name, args) =>
  executeCommand(files, { name, args, revision: revisionOf(files) });
function page(
  rules,
  target = '<div id="target" style="display:flex!important">Content</div>',
) {
  return new JSDOM(
    `<button id="button"><span id="child">Toggle</span></button>${target}<script>${interactionRuntime(data(...rules))}</script>`,
    { runScripts: "dangerously" },
  );
}
test("nested click toggles visibility and restores inline display and priority", () => {
  const dom = page([rule()]),
    { document, getComputedStyle } = dom.window;
  const target = document.getElementById("target");
  document.getElementById("child").click();
  assert.equal(target.hidden, true);
  assert.equal(getComputedStyle(target).display, "none");
  document.getElementById("button").click();
  assert.equal(target.hidden, false);
  assert.equal(getComputedStyle(target).display, "flex");
  assert.equal(target.style.getPropertyPriority("display"), "important");
  dom.window.close();
});
test("show is idempotent and hide remains hidden on repeated clicks", () => {
  for (const action of ["show", "hide"]) {
    const dom = page([rule(action)]),
      { document, getComputedStyle } = dom.window;
    document.getElementById("button").click();
    document.getElementById("button").click();
    assert.equal(
      getComputedStyle(document.getElementById("target")).display,
      action === "show" ? "flex" : "none",
    );
    dom.window.close();
  }
});
test("show reveals a target initially hidden by CSS or hidden attribute", () => {
  for (const target of [
    '<style>#target{display:none!important}</style><div id="target">Hidden</div>',
    '<div hidden id="target">Hidden</div>',
  ]) {
    const dom = page([rule("show")], target),
      { document, getComputedStyle } = dom.window;
    document.getElementById("button").click();
    assert.equal(document.getElementById("target").hidden, false);
    assert.notEqual(
      getComputedStyle(document.getElementById("target")).display,
      "none",
    );
    dom.window.close();
  }
});
test("class toggling works and missing or duplicate targets are skipped", () => {
  const dom = page([rule("toggleClass", { className: "is-active" })]);
  const doc = dom.window.document,
    target = doc.getElementById("target");
  doc.getElementById("button").click();
  assert.ok(target.classList.contains("is-active"));
  doc.getElementById("button").click();
  assert.ok(!target.classList.contains("is-active"));
  doc.body.appendChild(target.cloneNode(true));
  doc.getElementById("button").click();
  assert.ok(!target.classList.contains("is-active"));
  target.remove();
  doc.getElementById("target").remove();
  assert.doesNotThrow(() => doc.getElementById("button").click());
  dom.window.close();
});
test("managed region round trips without changing custom JS or motion code", async () => {
  const { writeMotion, emptyMotion } = await import(motionUrl);
  const original =
    writeMotion("window.before = 1;", emptyMotion()) + "\nwindow.after = 2;";
  const written = writeInteractions(original, data(rule()));
  assert.ok(written.startsWith(original));
  assert.deepEqual(readInteractions(written).data, data(rule()));
  assert.deepEqual(
    readInteractions(writeInteractions(written, data())).data,
    data(),
  );
  assert.equal(written.match(/<web-studio:interactions>/g).length, 1);
  assert.ok(writeInteractions(written, data()).includes("window.after = 2;"));
});
test("malformed managed data and invalid class tokens are rejected", () => {
  for (const value of [
    data(rule("toggleClass", { className: "two classes" })),
    data(rule("nope")),
    data(rule(), rule()),
  ])
    assert.equal(validateInteractions(value), false);
  const invalid =
    "// <web-studio:interactions>\n/* @interaction-data broken */\n// </web-studio:interactions>";
  assert.ok(readInteractions(invalid).error);
  assert.throws(() => writeInteractions(invalid, data()));
  assert.ok(
    !writeInteractions(
      "",
      data(rule("toggleClass", { className: "</script>*/" })),
    ).includes("</script>"),
  );
});
test("editing the managed JSON changes both the panel data and executed behavior", () => {
  const written = writeInteractions("", data(rule()));
  const changed = written.replace(
    '"action":"toggle"',
    '"action":"toggleClass","className":"active"',
  );
  assert.equal(readInteractions(changed).data.rules[0].action, "toggleClass");
  const dom = new JSDOM(
    `<button id="button">Click</button><div id="target">Content</div><script>${changed}</script>`,
    { runScripts: "dangerously" },
  );
  dom.window.document.getElementById("button").click();
  assert.ok(
    dom.window.document.getElementById("target").classList.contains("active"),
  );
  assert.equal(dom.window.document.getElementById("target").hidden, false);
  dom.window.close();
});
const files = {
  html: "<main><button><span>Open</span></button><section>Content</section></main>",
  css: "",
  js: "window.keep = 1;",
};
test("interaction commands create stable IDs, edit, move and delete atomically", () => {
  const added = run(files, "saveInteraction", {
    nodeId: "node:0.0",
    targetNodeId: "node:0.1",
    action: "toggle",
  });
  assert.equal(added.ok, true);
  const first = readInteractions(added.files.js).data.rules[0];
  assert.ok(first.sourceId.startsWith("action-"));
  assert.ok(first.targetId.startsWith("action-"));
  const changed = run(added.files, "saveInteraction", {
    nodeId: "node:0.0",
    targetNodeId: "node:0.1",
    action: "toggleClass",
    className: "active",
    ruleId: added.ruleId,
  });
  assert.equal(changed.ok, true);
  assert.equal(readInteractions(changed.files.js).data.rules.length, 1);
  assert.equal(
    readInteractions(changed.files.js).data.rules[0].sourceId,
    first.sourceId,
  );
  const moved = run(changed.files, "moveElement", {
    nodeId: "node:0.1",
    parentId: null,
  });
  assert.deepEqual(
    readInteractions(moved.files.js).data,
    readInteractions(changed.files.js).data,
  );
  const removed = run(moved.files, "removeInteraction", { ruleId: first.id });
  assert.equal(removed.ok, true);
  assert.equal(readInteractions(removed.files.js).data.rules.length, 0);
  assert.equal(removed.files.html, moved.files.html);
  assert.ok(removed.files.js.startsWith("window.keep = 1;"));
});
test("commands reject duplicate IDs, stale versions and invalid edits", () => {
  const args = {
    nodeId: "node:0.0",
    targetNodeId: "node:0.1",
    action: "toggle",
  };
  const duplicates = {
    ...files,
    html: '<main><button id="same">Open</button><section id="same">Text</section></main>',
  };
  assert.equal(
    run(duplicates, "saveInteraction", args).error.code,
    "DUPLICATE_ID",
  );
  assert.equal(
    executeCommand(files, { name: "saveInteraction", args, revision: "old" })
      .error.code,
    "STALE_REVISION",
  );
  assert.equal(
    run(files, "saveInteraction", { ...args, ruleId: "missing" }).error.code,
    "NOT_FOUND",
  );
  assert.equal(
    run(files, "saveInteraction", {
      ...args,
      action: "toggleClass",
      className: "one two",
    }).error.code,
    "INVALID_ARGUMENT",
  );
});
test("exported HTML retains working interactions and reimported data", () => {
  const added = run(files, "saveInteraction", {
    nodeId: "node:0.0",
    targetNodeId: "node:0.1",
    action: "toggle",
  });
  const html = exportHtml(added.files, "Test");
  const dom = new JSDOM(html, { runScripts: "dangerously" });
  dom.window.document.querySelector("button").click();
  assert.equal(dom.window.document.querySelector("section").hidden, true);
  assert.deepEqual(
    readInteractions(importHtml(html).js).data,
    readInteractions(added.files.js).data,
  );
  dom.window.close();
});
