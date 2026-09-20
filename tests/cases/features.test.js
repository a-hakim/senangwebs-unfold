const assert = require("node:assert/strict");
const {
  makeEditor,
  clickElement,
  commitKeyRename,
} = require("../helpers");

function testAddChildToObject() {
  const { editor } = makeEditor({ theme: "light" });
  editor.render({ a: 1 });

  const root = editor.rootNode;
  const addBtn = root.el.querySelector(".swu-action-add");
  assert.ok(addBtn, "add button rendered on root");

  clickElement(addBtn);
  const data = editor.getJson();
  assert.ok(Object.prototype.hasOwnProperty.call(data, "newField"));
  assert.equal(data.newField, null);

  // An edit input should be open on the new child's key
  const freshRoot = editor.rootNode;
  freshRoot.isExpanded = true;
  const child = editor.findNodeByPath(["newField"]);
  assert.ok(child, "new child node exists");
  const input = child.keyEl.querySelector("input");
  assert.ok(input, "key edit input opened after add");
}

function testAddItemToArray() {
  const { editor } = makeEditor({ theme: "light" });
  editor.render([1, 2]);

  const root = editor.rootNode;
  const addBtn = root.el.querySelector(".swu-action-add");
  clickElement(addBtn);

  assert.deepEqual(editor.getJson(), [1, 2, null]);
}

function testDeleteNodeFromObject() {
  const { editor } = makeEditor({ theme: "light" });
  editor.render({ keep: 1, drop: 2 });

  const node = editor.findNodeByPath(["drop"]);
  const delBtn = node.el.querySelector(".swu-action-delete");
  assert.ok(delBtn, "delete button rendered");

  clickElement(delBtn);
  assert.deepEqual(editor.getJson(), { keep: 1 });
}

function testDeleteNodeFromArrayReindexes() {
  const { editor } = makeEditor({ theme: "light" });
  editor.render(["a", "b", "c"]);

  const node = editor.findNodeByPath(["1"]);
  clickElement(node.el.querySelector(".swu-action-delete"));

  assert.deepEqual(editor.getJson(), ["a", "c"]);
  assert.deepEqual(editor.rootNode.children.map((c) => c.key), ["0", "1"]);
}

function testUndoRedo() {
  const { editor } = makeEditor({ theme: "light" });
  editor.render({ step: 1 });

  const node = editor.findNodeByPath(["step"]);
  editor.enterEditMode(node.valueEl, node);
  const input = node.valueEl.querySelector("input");
  input.value = "2";
  input.dispatchEvent(new window.Event("blur"));

  assert.deepEqual(editor.getJson(), { step: 2 });

  assert.equal(editor.undo(), true);
  assert.deepEqual(editor.getJson(), { step: 1 });

  assert.equal(editor.redo(), true);
  assert.deepEqual(editor.getJson(), { step: 2 });
}

function testUndoAtBoundaryIsNoop() {
  const { editor } = makeEditor({ theme: "light" });
  // Initial render snapshots {}; render({a:1}) snapshots again
  editor.render({ a: 1 });

  assert.equal(editor.undo(), true);
  assert.deepEqual(editor.getJson(), {});
  assert.equal(editor.undo(), false);

  assert.equal(editor.redo(), true);
  assert.deepEqual(editor.getJson(), { a: 1 });
  assert.equal(editor.redo(), false);
}

function testExpandAllCollapseAll() {
  const { editor } = makeEditor({ theme: "light" });
  editor.render({ a: { b: { c: 1 } }, d: 2 });

  editor.expandAll();
  assert.ok(editor.findNodeByPath(["a", "b", "c"]), "deeply expanded");

  editor.collapseAll();
  const nodeA = editor.findNodeByPath(["a"]);
  assert.equal(nodeA.isExpanded, false);
  assert.ok(editor.findNodeByPath(["a"]), "collapsed nodes still resolvable");
}

function testSearchFindsNestedValueAndExpandsPath() {
  const { editor } = makeEditor({ theme: "light" });
  editor.render({ a: { deep: { target: "needle" } } });

  editor.search("needle");
  assert.equal(editor.searchMatches.length, 1);
  assert.ok(
    editor.findNodeByPath(["a", "deep", "target"]),
    "path expanded to match"
  );
}

function testSearchByKey() {
  const { editor } = makeEditor({ theme: "light" });
  editor.render({ a: { specialKey: 1 }, other: 2 });

  editor.search("special");
  assert.equal(editor.searchMatches.length, 1);
  assert.deepEqual(editor.searchMatches[0], ["a", "specialKey"]);
}

function testReadOnlyMode() {
  const { el, editor } = makeEditor({ theme: "light", readOnly: true });
  editor.render({ a: 1 });

  assert.equal(editor.textarea, null, "no textarea in read-only mode");
  assert.equal(
    el.querySelector(".swu-input-wrapper"),
    null,
    "input pane hidden"
  );
  assert.equal(
    el.querySelector(".swu-node-actions"),
    null,
    "no action buttons"
  );
  assert.doesNotThrow(() => editor.addChild(editor.rootNode));
  assert.equal(editor.enterEditMode(null, editor.rootNode), undefined);
}

function testZoomAndFitMethodsExistAndRun() {
  const { editor } = makeEditor({ theme: "light" });
  editor.render({ a: 1 });

  assert.doesNotThrow(() => editor.zoomIn());
  assert.doesNotThrow(() => editor.zoomOut());
  assert.doesNotThrow(() => editor.resetView());
  // fitToView bails out with zero-size rects in jsdom; still must not throw
  assert.doesNotThrow(() => editor.fitToView());
}

module.exports = [
  { name: "add child to object opens key edit", fn: testAddChildToObject },
  { name: "add item to array appends null", fn: testAddItemToArray },
  { name: "delete node from object", fn: testDeleteNodeFromObject },
  { name: "delete node from array reindexes", fn: testDeleteNodeFromArrayReindexes },
  { name: "undo/redo restore snapshots", fn: testUndoRedo },
  { name: "undo/redo at boundary is no-op", fn: testUndoAtBoundaryIsNoop },
  { name: "expandAll/collapseAll", fn: testExpandAllCollapseAll },
  { name: "search finds nested value and expands path", fn: testSearchFindsNestedValueAndExpandsPath },
  { name: "search matches by key", fn: testSearchByKey },
  { name: "read-only mode hides editing affordances", fn: testReadOnlyMode },
  { name: "zoom/fit methods run without error", fn: testZoomAndFitMethodsExistAndRun },
];
