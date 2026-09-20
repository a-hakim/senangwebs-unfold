function createContainer() {
  const el = document.createElement("div");
  document.body.appendChild(el);
  return el;
}

function makeEditor(options = {}) {
  const el = createContainer();
  const editor = new SWU(el, options);
  return { el, editor };
}

function nodeAt(editor, path) {
  return editor.findNodeByPath(path);
}

function commitValueEdit(editor, node, text) {
  editor.enterEditMode(node.valueEl, node);
  const input = node.valueEl.querySelector("input");
  if (!input) throw new Error("Edit input not rendered");
  input.value = text;
  input.dispatchEvent(new window.Event("blur"));
}

function cancelValueEdit(editor, node, text) {
  editor.enterEditMode(node.valueEl, node);
  const input = node.valueEl.querySelector("input");
  input.value = text;
  input.dispatchEvent(
    new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true })
  );
  input.dispatchEvent(new window.Event("blur"));
}

function commitKeyRename(editor, node, newKey) {
  editor.enterKeyEditMode(node.keyEl, node);
  const input = node.keyEl.querySelector("input");
  if (!input) throw new Error("Key edit input not rendered");
  input.value = newKey;
  input.dispatchEvent(new window.Event("blur"));
}

function clickElement(el) {
  el.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
}

function dblClickElement(el) {
  el.dispatchEvent(new window.MouseEvent("dblclick", { bubbles: true }));
}

module.exports = {
  createContainer,
  makeEditor,
  nodeAt,
  commitValueEdit,
  cancelValueEdit,
  commitKeyRename,
  clickElement,
  dblClickElement,
};
