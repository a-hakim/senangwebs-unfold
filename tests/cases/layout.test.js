const assert = require("node:assert/strict");
const { makeEditor, clickElement } = require("../helpers");

function testSvgBoundsCoverAllNodes() {
  const { el, editor } = makeEditor({ theme: "light" });
  const big = {};
  for (let i = 0; i < 30; i++) big["k" + i] = i;
  editor.render(big);

  const svg = el.querySelector(".swu-connectors");
  assert.ok(svg, "svg exists");
  const w = Number(svg.getAttribute("width"));
  const h = Number(svg.getAttribute("height"));
  assert.ok(w >= 8000, `svg width covers canvas (${w})`);
  assert.ok(h >= 8000, `svg height covers canvas (${h})`);
}

function testLargeArrayRendersWithoutError() {
  const { editor } = makeEditor({ theme: "light" });
  const arr = Array.from({ length: 100 }, (_, i) => i);
  assert.doesNotThrow(() => editor.render(arr));
  assert.equal(editor.getJson().length, 100);
}

function testNodeDelegationClickToggles() {
  const { editor } = makeEditor({ theme: "light" });
  editor.render({ a: { b: 1 } });

  const nodeA = editor.findNodeByPath(["a"]);
  assert.ok(nodeA && nodeA.el, "node element exists");

  clickElement(nodeA.el);
  assert.equal(nodeA.isExpanded, true, "click toggles node");
}

function testAllNodesHaveUniqueIds() {
  const { editor } = makeEditor({ theme: "light" });
  editor.render({ a: { x: 1 }, b: { y: 2 } });
  editor.expandAll();

  const ids = new Set();
  const els = document.querySelectorAll(".swu-node");
  els.forEach((el) => {
    assert.ok(el.id, "node has id");
    assert.ok(!ids.has(el.id), `duplicate id: ${el.id}`);
    ids.add(el.id);
  });
}

module.exports = [
  { name: "svg bounds cover all nodes", fn: testSvgBoundsCoverAllNodes },
  { name: "large array renders without error", fn: testLargeArrayRendersWithoutError },
  { name: "delegated click toggles expandable node", fn: testNodeDelegationClickToggles },
  { name: "node ids are unique", fn: testAllNodesHaveUniqueIds },
];
