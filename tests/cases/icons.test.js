const assert = require("node:assert/strict");
const { makeEditor } = require("../helpers");

const EXPECTED_TOOLBAR_ICONS = [
  "magnifying-glass-plus",
  "magnifying-glass-minus",
  "home",
  "magnifying-glass-focus",
  "arrow-rotate-ccw",
  "arrow-rotate-cw",
  "chevron-double-down",
  "chevron-double-up",
];

function testToolbarUsesSenangStartIcons() {
  const { el } = makeEditor({ theme: "light" });

  const icons = [...el.querySelectorAll(".swu-toolbar ss-icon")];
  const names = icons.map((i) => i.getAttribute("icon"));

  for (const expected of EXPECTED_TOOLBAR_ICONS) {
    assert.ok(names.includes(expected), `missing icon: ${expected}`);
  }
  assert.equal(names.length, EXPECTED_TOOLBAR_ICONS.length);

  // Fallback glyphs are hidden while ss-icon is not yet defined
  const fallbacks = [...el.querySelectorAll(".swu-toolbar .swu-icon-fallback")];
  assert.equal(fallbacks.length, EXPECTED_TOOLBAR_ICONS.length);
}

function testToolbarHasUndoRedoButtons() {
  const { el, editor } = makeEditor({ theme: "light" });
  editor.render({ a: 1 });

  const undoBtn = el.querySelector('[data-swu-tool="undo"]');
  const redoBtn = el.querySelector('[data-swu-tool="redo"]');
  assert.ok(undoBtn && redoBtn, "undo/redo toolbar buttons exist");

  // Undo restores the initial empty snapshot
  undoBtn.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  assert.deepEqual(editor.getJson(), {});
}

function testNodeActionsUseIcons() {
  const { el, editor } = makeEditor({ theme: "light" });
  editor.render({ a: 1, b: 2 });

  const addIcon = el.querySelector(".swu-action-add ss-icon");
  const delIcon = el.querySelector(".swu-action-delete ss-icon");
  assert.ok(addIcon, "add button has ss-icon");
  assert.equal(addIcon.getAttribute("icon"), "plus");
  assert.ok(delIcon, "delete button has ss-icon");
  assert.equal(delIcon.getAttribute("icon"), "trash");
}

function testIconsDisabledOption() {
  const { el, editor } = makeEditor({ theme: "light", icons: false });

  assert.equal(el.getAttribute("data-swu-no-icons"), "");
  assert.equal(el.querySelector("ss-icon"), null, "no ss-icon elements");

  // Fallback glyphs are present instead
  const fallbacks = el.querySelectorAll(".swu-icon-fallback");
  assert.ok(fallbacks.length > 0, "fallback glyphs rendered");

  // Buttons still functional
  editor.render({ a: 1 });
  const addBtn = editor.rootNode.el.querySelector(".swu-action-add");
  assert.ok(addBtn, "add button still rendered");
  addBtn.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  assert.ok(
    Object.prototype.hasOwnProperty.call(editor.getJson(), "newField"),
    "add still works without icons"
  );
}

module.exports = [
  { name: "toolbar uses SenangStart Icons", fn: testToolbarUsesSenangStartIcons },
  { name: "toolbar undo/redo buttons work", fn: testToolbarHasUndoRedoButtons },
  { name: "node actions use plus/trash icons", fn: testNodeActionsUseIcons },
  { name: "icons: false renders fallback glyphs", fn: testIconsDisabledOption },
];
