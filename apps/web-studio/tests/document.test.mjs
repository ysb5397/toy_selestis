import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { JSDOM } from "jsdom";

const browser = new JSDOM("");
globalThis.DOMParser = browser.window.DOMParser;
const source = await readFile(
  new URL("../src/document.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl =
  "data:text/javascript;base64," + Buffer.from(compiled).toString("base64");
const { parse, pathOf, atPath, treeOf, canContain, exportHtml, importHtml } =
  await import(moduleUrl);
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
const previewSource = (
  await readFile(new URL("../src/preview.ts", import.meta.url), "utf8")
)
  .replace(/["']\.\/document["']/, JSON.stringify(moduleUrl))
  .replace(/["']\.\/timeline["']/, JSON.stringify(motionUrl));
const previewCompiled = ts.transpileModule(previewSource, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const { previewHtml } = await import(
  "data:text/javascript;base64," +
    Buffer.from(previewCompiled).toString("base64")
);

test("nested paths resolve the same element despite text and comment nodes", () => {
  const doc = parse(
    "<main>hello<!-- comment --><section><h2>Title</h2><p>Text <b>bold</b></p></section></main>",
  );
  for (const el of doc.body.querySelectorAll("*"))
    assert.equal(atPath(doc, pathOf(el)), el);
  assert.equal(treeOf(doc)[0].children[0].children[1].children[0].tag, "b");
  assert.equal(atPath(doc, "0.9"), null);
  assert.equal(atPath(doc, '0"]'), null);
});
test("reparenting remains synchronized after serialization and reparsing", () => {
  const doc = parse(
    '<main><section id="a"><p>Move me</p></section><section id="b"></section></main>',
  );
  const item = doc.querySelector("p");
  doc.querySelector("#b").appendChild(item);
  const path = pathOf(item),
    reopened = parse(doc.body.innerHTML);
  assert.equal(atPath(reopened, path).parentElement.id, "b");
  assert.equal(treeOf(reopened)[0].children[0].children.length, 0);
});
test("up and down preserve sibling order and node contents", () => {
  const doc = parse("<main><p>A</p><p>B</p><p>C</p></main>");
  const b = doc.querySelectorAll("p")[1];
  b.previousElementSibling.before(b);
  assert.equal(doc.querySelector("main").textContent, "BAC");
  b.nextElementSibling.after(b);
  assert.equal(doc.querySelector("main").textContent, "ABC");
});
test("void elements cannot receive child blocks", () => {
  const doc = parse("<main><img><input><br><section></section></main>");
  assert.equal(canContain(doc.querySelector("img")), false);
  assert.equal(canContain(doc.querySelector("input")), false);
  assert.equal(canContain(doc.querySelector("br")), false);
  assert.equal(canContain(doc.querySelector("section")), true);
});
test("export and reimport preserve content, CSS and JS", () => {
  const files = {
    html: "<main><p>한글 &amp; content</p></main>",
    css: "body { color: red; }",
    js: 'document.title = "hello";',
  };
  assert.deepEqual(importHtml(exportHtml(files)), files);
});
test("embedded closing script tags cannot escape the generated JS element", () => {
  const html = exportHtml({
    html: "<p>Hello</p>",
    css: "",
    js: 'const text = "</script><script>bad()</script>";',
  });
  const doc = parse(html);
  assert.equal(doc.querySelectorAll("script").length, 1);
  assert.match(doc.querySelector("script").textContent, /<\\\/script>/);
});
test("preview keeps runtime selection attributes out of exported source and strips embedded scripts", () => {
  const files = {
    html: '<main><p onclick="alert(1)">Hello</p><script>bad()</script></main>',
    css: "p {color:red}",
    js: 'console.log("run")',
  };
  const edit = parse(previewHtml(files, false, null));
  assert.equal(edit.querySelector("p").hasAttribute("onclick"), false);
  assert.ok(edit.querySelector("p").hasAttribute("data-ion-path"));
  assert.ok(!edit.querySelector("main script"));
  assert.ok(!exportHtml(files).includes("data-ion-path"));
  assert.ok(!edit.body.textContent.includes('console.log("run")'));
  const run = parse(previewHtml(files, true, null));
  assert.ok(run.body.textContent.includes('console.log("run")'));
  assert.match(
    run.querySelector("meta[http-equiv]").content,
    /connect-src 'none'/,
  );
});
test("preview bridge JavaScript parses in edit and execution modes", () => {
  for (const mode of [false, true]) {
    const doc = parse(
      previewHtml(
        { html: "<p>Test</p>", css: "", js: "const x=1;" },
        mode,
        null,
      ),
    );
    for (const script of doc.scripts)
      assert.doesNotThrow(() => new Function(script.textContent));
  }
});
