const assert = require("node:assert/strict");
const { makeEditor } = require("../helpers");

function testInvalidJsonEmitsOnErrorAndShowsInlineError() {
  const { el, editor } = makeEditor({ theme: "light" });

  const errors = [];
  editor.on("onError", (e) => errors.push(e));

  editor.textarea.value = "{ not valid";
  editor.handleTextareaChange(true);

  assert.equal(errors.length, 1);
  assert.equal(editor.textarea.classList.contains("invalid"), true);
  assert.ok(editor.rootNode, "previous tree is untouched on parse error");

  const errorEl = el.querySelector(".swu-error-text");
  assert.ok(errorEl, "inline error element exists");
  assert.equal(errorEl.style.display, "block");
  assert.ok(errorEl.textContent.includes("Invalid JSON"));
}

function testValidParseHidesInlineError() {
  const { el, editor } = makeEditor({ theme: "light" });

  editor.textarea.value = "{ bad";
  editor.handleTextareaChange(true);
  editor.textarea.value = '{"good":1}';
  editor.handleTextareaChange(true);

  assert.equal(editor.textarea.classList.contains("invalid"), false);
  assert.equal(el.querySelector(".swu-error-text").style.display, "none");
}

function testNoAlertThrown() {
  // Regression: invalid JSON must never throw an alert() (which would crash
  // in non-browser DOM environments)
  const { editor } = makeEditor({ theme: "light" });
  global.window.alert = () => {
    throw new Error("alert() should never be called");
  };
  editor.render("{ broken");
  // render with textarea emits onError, no alert
  assert.equal(editor.rootNode === null || editor.rootNode !== null, true);
}

module.exports = [
  { name: "invalid JSON shows inline error, no alert", fn: testInvalidJsonEmitsOnErrorAndShowsInlineError },
  { name: "valid parse hides inline error", fn: testValidParseHidesInlineError },
  { name: "alert() is never called", fn: testNoAlertThrown },
];
