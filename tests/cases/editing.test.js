const assert = require("node:assert/strict");
const {
  makeEditor,
  nodeAt,
  commitValueEdit,
  cancelValueEdit,
  commitKeyRename,
} = require("../helpers");

function testValueEditCommit() {
  const { editor } = makeEditor({ theme: "light" });
  editor.render({ a: "old", b: 1 });

  const node = nodeAt(editor, ["a"]);
  assert.ok(node, "node for key 'a' not found");

  commitValueEdit(editor, node, '"new"');
  assert.deepEqual(editor.getJson(), { a: "new", b: 1 });
}

function testPrimitiveRootValueEdit() {
  const { editor } = makeEditor({ theme: "light" });
  editor.render(42);

  // Regression: editing a primitive root must not crash on null parent
  commitValueEdit(editor, editor.rootNode, '"root-string"');
  assert.equal(editor.getJson(), "root-string");
}

function testValueEditTypeChangeToObject() {
  const { editor } = makeEditor({ theme: "light" });
  editor.render({ a: "plain", b: 1 });

  const node = nodeAt(editor, ["a"]);
  commitValueEdit(editor, node, '{"nested":true}');

  // Regression: node must become expandable after type change
  const fresh = nodeAt(editor, ["a"]);
  assert.equal(fresh.isExpandable, true, "node should be expandable");
  assert.deepEqual(editor.getJson(), { a: { nested: true }, b: 1 });

  // And it can be unfolded
  editor.toggleNode(fresh);
  assert.ok(nodeAt(editor, ["a", "nested"]), "child node not created");
}

function testKeyRenamePreservesOrder() {
  const { editor } = makeEditor({ theme: "light" });
  editor.render({ first: 1, second: 2, third: 3 });

  const node = nodeAt(editor, ["second"]);
  commitKeyRename(editor, node, "renamed");

  assert.deepEqual(Object.keys(editor.getJson()), [
    "first",
    "renamed",
    "third",
  ]);
  assert.equal(editor.getJson().renamed, 2);
}

function testKeyRenameToProtoIsSafe() {
  const { editor } = makeEditor({ theme: "light" });
  editor.render({ normal: 5 });

  const node = nodeAt(editor, ["normal"]);
  commitKeyRename(editor, node, "__proto__");

  const data = editor.getJson();
  // Must be an own enumerable property, not a prototype mutation
  assert.ok(
    Object.prototype.hasOwnProperty.call(data, "__proto__"),
    "__proto__ should be an own property"
  );
  assert.equal(data.__proto__, 5);
  assert.equal(JSON.parse(JSON.stringify(editor.rootNode.value)).__proto__, 5);
}

function testEscapeCancelsValueEdit() {
  const { editor } = makeEditor({ theme: "light" });
  editor.render({ a: "keep" });

  const node = nodeAt(editor, ["a"]);
  cancelValueEdit(editor, node, '"discarded"');
  assert.deepEqual(editor.getJson(), { a: "keep" });
}

function testOnNodeEditEvent() {
  const { editor } = makeEditor({ theme: "light" });
  editor.render({ outer: { inner: 1 } });

  editor.expandAll();
  const node = nodeAt(editor, ["outer", "inner"]);
  assert.ok(node, "inner node not found");

  const events = [];
  editor.on("onNodeEdit", (e) => events.push(e));

  commitValueEdit(editor, node, "99");
  assert.equal(events.length, 1);
  assert.equal(events[0].path, "outer.inner");
  assert.equal(events[0].oldValue, 1);
  assert.equal(events[0].newValue, 99);
}

function testOnKeyRenameEvent() {
  const { editor } = makeEditor({ theme: "light" });
  editor.render({ a: 1, b: 2 });

  const node = nodeAt(editor, ["a"]);
  const events = [];
  editor.on("onKeyRename", (e) => events.push(e));

  commitKeyRename(editor, node, "z");
  assert.equal(events.length, 1);
  assert.equal(events[0].oldKey, "a");
  assert.equal(events[0].newKey, "z");
}

function testDuplicateKeyRenameRejected() {
  const { editor } = makeEditor({ theme: "light" });
  editor.render({ a: 1, b: 2 });

  const node = nodeAt(editor, ["a"]);
  commitKeyRename(editor, node, "b");

  const data = editor.getJson();
  assert.deepEqual(Object.keys(data), ["a", "b"]);
}

module.exports = [
  { name: "value edit commit updates data", fn: testValueEditCommit },
  { name: "primitive root value edit does not crash", fn: testPrimitiveRootValueEdit },
  { name: "value type change to object becomes expandable", fn: testValueEditTypeChangeToObject },
  { name: "key rename preserves order", fn: testKeyRenamePreservesOrder },
  { name: "key rename to __proto__ stays own property", fn: testKeyRenameToProtoIsSafe },
  { name: "escape cancels value edit", fn: testEscapeCancelsValueEdit },
  { name: "onNodeEdit event carries path/old/new", fn: testOnNodeEditEvent },
  { name: "onKeyRename event carries oldKey/newKey", fn: testOnKeyRenameEvent },
  { name: "duplicate key rename rejected", fn: testDuplicateKeyRenameRejected },
];
