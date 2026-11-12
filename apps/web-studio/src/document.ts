export type Files = { html: string; css: string; js: string };
export const initial: Files = {
  html: `<main class="page">
  <nav class="navigation">
    <a class="brand" href="#">form & field<span>®</span></a>
    <div class="nav-links"><a href="#collection">Collection</a><a href="#about">Our approach</a></div>
    <a class="contact" href="mailto:hello@example.com">Let’s talk ↗</a>
  </nav>
  <section class="hero" id="about">
    <div class="eyebrow"><span class="dot"></span> INDEPENDENT DESIGN STUDIO · SEOUL</div>
    <h1>Good things.<br>Thoughtfully <em>made.</em></h1>
    <p class="intro">작은 디테일에서 시작되는 새로운 가능성.<br>우리는 일상에 오래 머무는 경험을 만듭니다.</p>
    <a class="primary" href="#collection">Explore our collection <span>↗</span></a>
  </section>
  <section class="collection" id="collection">
    <div class="section-heading"><span>SELECTED OBJECTS</span><span>01 — 03</span></div>
    <div class="objects">
      <article class="object"><div class="art art-one"><div class="arch"></div><span>01</span></div><div class="caption"><h2>Quiet structure</h2><span>Objects / 2026</span></div></article>
      <article class="object"><div class="art art-two"><div class="orb"></div><span>02</span></div><div class="caption"><h2>A softer perspective</h2><span>Exploration / 2026</span></div></article>
      <article class="object"><div class="art art-three"><div class="steps"><i></i><i></i><i></i></div><span>03</span></div><div class="caption"><h2>Room to grow</h2><span>Spaces / 2026</span></div></article>
    </div>
  </section>
  <footer><span>Made with intention.</span><span>© form & field 2026</span></footer>
</main>`,
  css: `* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; background: #f5f4ef; color: #292c27; font-family: Arial, "Malgun Gothic", sans-serif; }
a { color: inherit; text-decoration: none; }
.page { max-width: 1200px; margin: auto; padding: 0 46px; }
.navigation { height: 88px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #d9dbd1; gap: 20px; }
.brand { font-size: 23px; font-weight: 750; letter-spacing: -1.3px; }.brand span { font-size: 12px; vertical-align: top; margin-left: 3px; }
.nav-links { display: flex; gap: 25px; font-size: 11px; }.contact { font-size: 11px; }
.hero { padding: 64px 0 55px; }
.eyebrow { font-size: 9px; letter-spacing: 1.6px; display: flex; align-items: center; gap: 9px; }.dot { height: 6px; width: 6px; background: #7b8c55; border-radius: 50%; }
h1 { font-size: clamp(38px, 6.5vw, 78px); line-height: 1.04; font-weight: 500; letter-spacing: -4px; margin: 29px 0 22px; }h1 em { font-family: Georgia, serif; color: #788460; font-weight: 400; }
.intro { font-size: 11px; line-height: 1.9; color: #787c72; }
.primary { display: inline-flex; align-items: center; justify-content: space-between; gap: 28px; padding: 14px 17px; background: #303a2e; color: #fff; font-size: 10px; margin-top: 14px; border-radius: 3px; }
.section-heading { display: flex; justify-content: space-between; font-size: 9px; letter-spacing: 1.1px; margin-bottom: 16px; }.objects { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.art { height: 180px; position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden; }.art > span { position: absolute; left: 12px; bottom: 12px; font-size: 9px; color: #626354; }
.art-one { background: #e1e1d7; }.arch { width: 88px; height: 120px; border-radius: 50px 50px 0 0; border: 24px solid #b0b49e; border-bottom: 0; transform: rotate(-12deg); box-shadow: 14px 16px 18px #0002; }
.art-two { background: #e8dfd2; }.orb { height: 108px; width: 108px; border-radius: 50%; background: radial-gradient(circle at 30% 25%, #e5d2b7, #b1906b 65%, #816346); box-shadow: 15px 20px 18px #715b3533; }
.art-three { background: #dce0d8; }.steps { display: flex; align-items: flex-end; transform: skewY(-12deg); filter: drop-shadow(12px 13px 7px #0002); }.steps i { width: 32px; background: #8e9b86; height: 46px; }.steps i:nth-child(2) { height: 78px; background: #a6b09c; }.steps i:nth-child(3) { height: 110px; background: #bbc3b1; }
.caption { display: flex; flex-direction: column; gap: 6px; margin-top: 13px; }.caption h2 { font-size: 11px; font-weight: 500; margin: 0; }.caption > span { color: #91948b; font-size: 9px; }
footer { display: flex; justify-content: space-between; padding: 35px 0 25px; color: #8c9085; font-size: 9px; }
@media (max-width: 560px) { .page { padding: 0 22px; }.navigation { height: 72px; }.nav-links { display: none; }.hero { padding-top: 45px; }h1 { letter-spacing: -2px; }.objects { grid-template-columns: 1fr; }.art { height: 220px; } }
`,
  js: `// 실행 모드에서만 JavaScript가 실행됩니다.
// 예: 제목이 서서히 나타나는 애니메이션
const title = document.querySelector('h1');
title?.animate(
  [{ opacity: 0, transform: 'translateY(20px)' },
   { opacity: 1, transform: 'translateY(0)' }],
  { duration: 800, easing: 'ease-out', fill: 'both' }
);`,
};
export type TreeNode = {
  id: string;
  tag: string;
  label: string;
  children: TreeNode[];
};
export function parse(html: string) {
  return new DOMParser().parseFromString(html, "text/html");
}
export function pathOf(el: Element): string {
  const indices: number[] = [];
  let current: Element | null = el;
  while (current && current.parentElement && current.tagName !== "BODY") {
    indices.unshift(
      Array.from(current.parentElement.children).indexOf(current),
    );
    current = current.parentElement;
  }
  return indices.join(".");
}
export function atPath(doc: Document, path: string): Element | null {
  if (!/^\d+(\.\d+)*$/.test(path)) return null;
  let el: Element = doc.body;
  for (const part of path.split(".")) {
    const child = el.children[Number(part)];
    if (!child) return null;
    el = child;
  }
  return el;
}
export function treeOf(doc: Document): TreeNode[] {
  const walk = (el: Element): TreeNode => ({
    id: pathOf(el),
    tag: el.tagName.toLowerCase(),
    label:
      el.id ||
      el.classList[0] ||
      el.textContent?.trim().slice(0, 20) ||
      el.tagName.toLowerCase(),
    children: Array.from(el.children).map(walk),
  });
  return Array.from(doc.body.children).map(walk);
}
export const voidTags = new Set([
  "AREA",
  "BASE",
  "BR",
  "COL",
  "EMBED",
  "HR",
  "IMG",
  "INPUT",
  "LINK",
  "META",
  "PARAM",
  "SOURCE",
  "TRACK",
  "WBR",
]);
export function canContain(el: Element) {
  return (
    !voidTags.has(el.tagName) &&
    !["SCRIPT", "STYLE", "TEXTAREA", "TITLE"].includes(el.tagName)
  );
}
export function exportHtml(files: Files) {
  return `<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>My website</title>\n<style>${files.css.replace(/<\/style/gi, "<\\/style")}</style>\n</head>\n<body>\n${files.html}\n<script>${files.js.replace(/<\/script/gi, "<\\/script")}</script>\n</body>\n</html>`;
}
export function importHtml(text: string): Files {
  const doc = parse(text);
  const css = Array.from(doc.querySelectorAll("style"))
    .map((n) => n.textContent)
    .join("\n");
  const js = Array.from(doc.querySelectorAll("script:not([src])"))
    .map((n) => n.textContent)
    .join("\n");
  doc.querySelectorAll("style,script").forEach((n) => n.remove());
  return { html: doc.body.innerHTML.trim(), css, js };
}
