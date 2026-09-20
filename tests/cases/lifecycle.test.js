const assert = require("node:assert/strict");
const { makeEditor } = require("../helpers");

function testEventUnsubscribe() {
  const { editor } = makeEditor({ theme: "light" });
  const received = [];
  const unsubscribe = editor.on("onChange", (value) => received.push(value));

  editor.emit("onChange", 1);
  unsubscribe();
  editor.emit("onChange", 2);

  assert.deepEqual(received, [1]);
}

function testOffRemovesAllEventListeners() {
  const { editor } = makeEditor({ theme: "light" });
  let calls = 0;

  editor.on("onChange", () => calls++);
  editor.on("onChange", () => calls++);
  editor.off("onChange");
  editor.emit("onChange");

  assert.equal(calls, 0);
}

function testEmitSurvivesThrowingListener() {
  const { editor } = makeEditor({ theme: "light" });
  const received = [];

  editor.on("onChange", () => {
    throw new Error("boom");
  });
  editor.on("onChange", (v) => received.push(v));

  assert.doesNotThrow(() => editor.emit("onChange", 1));
  assert.deepEqual(received, [1]);
}

module.exports = [
  { name: "event unsubscribe via returned function", fn: testEventUnsubscribe },
  { name: "off(event) removes all listeners", fn: testOffRemovesAllEventListeners },
  { name: "throwing listener does not break others", fn: testEmitSurvivesThrowingListener },
];
