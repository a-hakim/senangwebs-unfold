const assert = require("node:assert/strict");
const { makeEditor, nodeAt } = require("../helpers");

function testExpandedStatePreservedAcrossTextareaEdit() {
  const { editor } = makeEditor({ theme: "light" });
  editor.render({ a: { b: 1 }, c: 2 });

  const nodeA = nodeAt(editor, ["a"]);
  editor.toggleNode(nodeA);
  assert.ok(nodeAt(editor, ["a", "b"]), "child visible after expand");

  // Simulate user typing in the textarea (debounced path)
  editor.textarea.value = JSON.stringify({ a: { b: 1, added: 2 }, c: 2 });
  editor.handleTextareaChange(false);

  assert.ok(
    nodeAt(editor, ["a", "added"]),
    "previously expanded node stays expanded"
  );
  assert.ok(nodeAt(editor, ["a", "b"]), "existing children preserved");
}

function testForceRenderCollapses() {
  const { editor } = makeEditor({ theme: "light" });
  editor.render({ a: { b: 1 } });
  editor.toggleNode(nodeAt(editor, ["a"]));

  editor.render({ a: { b: 1 } });
  assert.ok(nodeAt(editor, ["a"]), "parent present");
  assert.equal(nodeAt(editor, ["a"]).isExpanded, false);
}

function testKeysWithDotsDoNotCollide() {
  const { editor } = makeEditor({ theme: "light" });
  editor.render({ "a.b": { x: 1 }, a: { b: { y: 2 } } });

  const dotted = nodeAt(editor, ["a.b"]);
  const nested = nodeAt(editor, ["a"]);
  assert.ok(dotted, "dotted-key node found");
  assert.ok(nested, "nested node found");
  assert.notEqual(dotted, nested);

  // Expand dotted node, and the nested a → b chain
  editor.toggleNode(dotted);
  editor.toggleNode(nested);
  editor.toggleNode(nodeAt(editor, ["a", "b"]));

  editor.textarea.value = JSON.stringify({ "a.b": { x: 2 }, a: { b: { y: 3 } } });
  editor.handleTextareaChange(false);

  assert.ok(nodeAt(editor, ["a.b", "x"]), "dotted key stays expanded");
  assert.ok(nodeAt(editor, ["a", "b", "y"]), "nested key stays expanded");
}

module.exports = [
  {
    name: "expanded state preserved across textarea edit",
    fn: testExpandedStatePreservedAcrossTextareaEdit,
  },
  { name: "force render collapses nodes", fn: testForceRenderCollapses },
  { name: "keys containing dots do not collide in paths", fn: testKeysWithDotsDoNotCollide },
];
