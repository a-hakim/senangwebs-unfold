const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  url: "http://localhost/",
  pretendToBeVisual: true,
});

global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.HTMLInputElement = dom.window.HTMLInputElement;
global.Event = dom.window.Event;
global.FocusEvent = dom.window.FocusEvent;
global.KeyboardEvent = dom.window.KeyboardEvent;
global.MouseEvent = dom.window.MouseEvent;
global.WheelEvent = dom.window.WheelEvent;
global.Node = dom.window.Node;
global.Element = dom.window.Element;
global.SVGElement = dom.window.SVGElement;
global.navigator = dom.window.navigator;
global.getComputedStyle = dom.window.getComputedStyle;
global.requestAnimationFrame = dom.window.requestAnimationFrame;
global.cancelAnimationFrame = dom.window.cancelAnimationFrame;

global.SWU = require("../dist/swu.js");

const casesDir = path.join(__dirname, "cases");
const files = fs
  .readdirSync(casesDir)
  .filter((f) => f.endsWith(".test.js"))
  .sort();

let passed = 0;
let failed = 0;
const failures = [];

for (const file of files) {
  const tests = require(path.join(casesDir, file));
  for (const t of tests) {
    try {
      t.fn();
      passed++;
      console.log(`  ok - ${file} > ${t.name}`);
    } catch (e) {
      failed++;
      failures.push({ file, name: t.name, error: e });
      console.error(`FAIL - ${file} > ${t.name}`);
      console.error(`      ${e && e.stack ? e.stack.split("\n").slice(0, 4).join("\n      ") : e}`);
    }
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
