const assert = require("node:assert/strict");
const SWU = require("../dist/swu.js");

function createInstance() {
  const instance = Object.create(SWU.prototype);
  instance.container = { innerHTML: "rendered" };
  instance.rootNode = {};
  instance.debounceTimer = null;
  instance.eventListeners = {};
  instance.domEventListeners = [];
  instance.isDestroyed = false;
  return instance;
}

function testEventUnsubscribe() {
  const instance = createInstance();
  const received = [];
  const unsubscribe = instance.on("onChange", (value) => received.push(value));

  instance.emit("onChange", 1);
  unsubscribe();
  instance.emit("onChange", 2);

  assert.deepEqual(received, [1]);
}

function testOffRemovesAllEventListeners() {
  const instance = createInstance();
  let calls = 0;

  instance.on("onChange", () => calls++);
  instance.on("onChange", () => calls++);
  instance.off("onChange");
  instance.emit("onChange");

  assert.equal(calls, 0);
}

function testDestroyRemovesDOMListeners() {
  const instance = createInstance();
  const target = new EventTarget();
  let calls = 0;
  const handler = () => calls++;

  instance.addDOMEventListener(target, "change", handler);
  target.dispatchEvent(new Event("change"));
  instance.destroy();
  target.dispatchEvent(new Event("change"));
  instance.destroy();

  assert.equal(calls, 1);
  assert.equal(instance.container.innerHTML, "");
  assert.equal(instance.rootNode, null);
  assert.equal(instance.isDestroyed, true);
}

testEventUnsubscribe();
testOffRemovesAllEventListeners();
testDestroyRemovesDOMListeners();

console.log("All tests passed.");
