const assert = require("node:assert/strict");
const { makeEditor } = require("../helpers");

function testDeclarativeDataSwuJsonAttribute() {
  const el = document.createElement("div");
  el.setAttribute("data-swu", "");
  el.setAttribute("data-swu-json", '{"from":"attribute"}');
  el.innerHTML = '<div data-input-wrapper></div><div data-swu-viewer-container></div>';
  document.body.appendChild(el);

  const editor = new SWU(el);
  assert.deepEqual(editor.getJson(), { from: "attribute" });
  editor.destroy();
  el.remove();
}

function testDeclarativeInlineScriptJson() {
  const el = document.createElement("div");
  el.setAttribute("data-swu", "");
  el.innerHTML =
    '<div data-input-wrapper></div>' +
    '<div data-swu-viewer-container></div>' +
    '<script type="application/json">{"from":"script"}<\/script>';
  document.body.appendChild(el);

  const editor = new SWU(el);
  assert.deepEqual(editor.getJson(), { from: "script" });
  editor.destroy();
  el.remove();
}

function testDeclarativeAttributesApplied() {
  const el = document.createElement("div");
  el.setAttribute("data-swu", "");
  el.setAttribute("data-swu-accent-color", "#ff0000");
  el.setAttribute("data-swu-theme", "dark");
  el.setAttribute("data-swu-direction", "vertical");
  el.innerHTML = '<div data-input-wrapper></div><div data-swu-viewer-container></div>';
  document.body.appendChild(el);

  const editor = new SWU(el);
  assert.equal(el.getAttribute("data-swu-theme"), "dark");
  assert.equal(el.getAttribute("data-swu-direction"), "vertical");
  assert.equal(
    el.style.getPropertyValue("--swu-accent-color"),
    "#ff0000"
  );
  editor.destroy();
  el.remove();
}

function testDestroyAllowsReInit() {
  const el = document.createElement("div");
  el.setAttribute("data-swu", "");
  el.innerHTML = '<div data-input-wrapper></div><div data-swu-viewer-container></div>';
  document.body.appendChild(el);

  const first = new SWU(el);
  assert.equal(el.SWU, first);
  first.destroy();
  assert.equal(el.SWU, undefined, "container.SWU cleared after destroy");

  // destroy() wipes the container; the declarative skeleton must be restored
  el.innerHTML = '<div data-input-wrapper></div><div data-swu-viewer-container></div>';
  const second = new SWU(el);
  assert.equal(el.SWU, second);
  assert.ok(second.rootNode, "re-initialized instance renders");
  second.destroy();
  el.remove();
}

function testDestroyIsIdempotent() {
  const { el, editor } = makeEditor({ theme: "light" });
  editor.destroy();
  assert.doesNotThrow(() => editor.destroy());
  assert.equal(el.innerHTML, "");
  assert.equal(editor.isDestroyed, true);
}

function testDestroyClearsState() {
  const { editor } = makeEditor({ theme: "light" });
  editor.render({ a: 1 });
  editor.destroy();
  assert.equal(editor.rootNode, null);
  assert.deepEqual(editor.history, []);
}

module.exports = [
  { name: "declarative data-swu-json attribute parsed", fn: testDeclarativeDataSwuJsonAttribute },
  { name: "declarative inline script JSON parsed", fn: testDeclarativeInlineScriptJson },
  { name: "declarative attributes applied", fn: testDeclarativeAttributesApplied },
  { name: "destroy clears container.SWU and allows re-init", fn: testDestroyAllowsReInit },
  { name: "destroy is idempotent", fn: testDestroyIsIdempotent },
  { name: "destroy clears state", fn: testDestroyClearsState },
];
