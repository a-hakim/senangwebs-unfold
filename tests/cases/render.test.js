const assert = require("node:assert/strict");
const { makeEditor, nodeAt } = require("../helpers");

function testObjectRoundTrip() {
  const { el, editor } = makeEditor({ theme: "light" });
  const data = { a: 1, b: "x", c: [true, null], d: { e: 2 } };
  editor.render(data);
  assert.deepEqual(editor.getJson(), data);

  // Nodes drawn for root and its expandable children
  const nodes = el.querySelectorAll(".swu-node");
  assert.ok(nodes.length >= 3, `expected nodes, got ${nodes.length}`);
}

function testArrayRootRoundTrip() {
  const { editor } = makeEditor({ theme: "light" });
  editor.render([1, "two", { three: 3 }]);
  assert.deepEqual(editor.getJson(), [1, "two", { three: 3 }]);
}

function testPrimitiveRootRoundTrip() {
  const { editor } = makeEditor({ theme: "light" });
  editor.render(42);
  assert.equal(editor.getJson(), 42);

  // String JSON payloads are treated as serialized JSON text
  editor.render(JSON.stringify("hello"));
  assert.equal(editor.getJson(), "hello");

  editor.render(null);
  assert.equal(editor.getJson(), null);
}

function testFalsyValuesRoundTrip() {
  const { editor } = makeEditor({ theme: "light" });
  editor.render({ zero: 0, empty: "", bool: false, nul: null });
  const data = editor.getJson();
  assert.equal(data.zero, 0);
  assert.equal(data.empty, "");
  assert.equal(data.bool, false);
  assert.equal(data.nul, null);
}

function testStringJsonInput() {
  const { editor } = makeEditor({ theme: "light" });
  editor.render('{"x":[1,2]}');
  assert.deepEqual(editor.getJson(), { x: [1, 2] });
}

function testRenderNoArgRelayouts() {
  const { editor } = makeEditor({ theme: "light" });
  editor.render({ a: 1 });
  assert.doesNotThrow(() => editor.render());
  assert.deepEqual(editor.getJson(), { a: 1 });
}

function testGetJsonReturnsClone() {
  const { editor } = makeEditor({ theme: "light" });
  editor.render({ a: 1 });
  const snapshot = editor.getJson();
  snapshot.a = 999;
  assert.equal(editor.getJson().a, 1);
}

module.exports = [
  { name: "object round-trip render", fn: testObjectRoundTrip },
  { name: "array root round-trip render", fn: testArrayRootRoundTrip },
  { name: "primitive root round-trip render", fn: testPrimitiveRootRoundTrip },
  { name: "falsy values round-trip render", fn: testFalsyValuesRoundTrip },
  { name: "string JSON input render", fn: testStringJsonInput },
  { name: "render() with no args re-layouts", fn: testRenderNoArgRelayouts },
  { name: "getJson returns a deep clone", fn: testGetJsonReturnsClone },
];
