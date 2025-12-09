/**
 * SenangWebs Unfold (SWU)
 * An advanced, interactive JavaScript library for visualizing and editing JSON data
 * @version 1.0.0
 */

class SWU {
  constructor(containerElement, options = {}) {
    if (!containerElement) {
      throw new Error("Container element is required");
    }

    this.container = containerElement;
    this.options = {
      json: options.json || options.inputJSON || {},
      textarea: options.textarea || null,
      canvasBackground: options.canvasBackground || "#e9ecef",
      accentColor: options.accentColor || "#3b82f6",
      theme: options.theme || "light",
      ...options,
    };

    // Internal state
    this.rootNode = null;
    this.debounceTimer = null;
    this.eventListeners = {};

    // Layout constants
    this.NODE_WIDTH = 220;
    this.NODE_HEIGHT = 70;
    this.H_SPACING = 150;
    this.V_SPACING = 30;
    this.CANVAS_CENTER_X = 4000;
    this.CANVAS_CENTER_Y = 4000;

    // Pan & Zoom state
    this.scale = 1;
    this.panX = 0;
    this.panY = 0;
    this.isDragging = false;
    this.startDragX = 0;
    this.startDragY = 0;

    this.init();
  }

  init() {
    this.setupDOM();
    this.applyTheme();
    this.setupEventListeners();

    // Load initial JSON
    if (typeof this.options.json === "string") {
      try {
        const parsed = JSON.parse(this.options.json);
        this.render(parsed);
      } catch (e) {
        console.error("Invalid initial JSON:", e);
        this.render({});
      }
    } else {
      this.render(this.options.json);
    }
  }

  setupDOM() {
    // Check if declarative setup
    const isDeclarative = this.container.hasAttribute("data-swu");

    if (isDeclarative) {
      this.setupDeclarativeDOM();
    } else {
      this.setupProgrammaticDOM();
    }
  }

  setupDeclarativeDOM() {
    // Find existing elements
    const inputWrapper = this.container.querySelector("[data-input-wrapper]");
    const viewerContainer = this.container.querySelector(
      "[data-swu-viewer-container]"
    );

    if (!inputWrapper || !viewerContainer) {
      throw new Error(
        "Declarative setup requires [data-input-wrapper] and [data-swu-viewer-container]"
      );
    }

    // Read attributes
    if (this.container.hasAttribute("data-swu-canvas-background")) {
      this.options.canvasBackground = this.container.getAttribute(
        "data-swu-canvas-background"
      );
    }
    if (this.container.hasAttribute("data-swu-accent-color")) {
      this.options.accentColor = this.container.getAttribute(
        "data-swu-accent-color"
      );
    }
    if (this.container.hasAttribute("data-swu-theme")) {
      this.options.theme = this.container.getAttribute("data-swu-theme");
    }

    // Setup input wrapper
    inputWrapper.className = "swu-input-wrapper";
    inputWrapper.innerHTML = `
      <textarea class="swu-textarea" placeholder="Paste your JSON here..."></textarea>
      <button class="swu-button swu-render-btn">Visualize</button>
    `;

    // Setup viewer
    viewerContainer.className = "swu-viewer-container";
    viewerContainer.style.backgroundColor = this.options.canvasBackground;
    viewerContainer.innerHTML = `
      <div class="swu-canvas">
        <svg class="swu-connectors"></svg>
        <div class="swu-nodes"></div>
      </div>
    `;

    // Store references
    this.textarea = inputWrapper.querySelector(".swu-textarea");
    this.renderBtn = inputWrapper.querySelector(".swu-render-btn");
    this.viewerContainer = viewerContainer;
    this.canvas = viewerContainer.querySelector(".swu-canvas");
    this.nodeContainer = viewerContainer.querySelector(".swu-nodes");
    this.connectorContainer = viewerContainer.querySelector(".swu-connectors");
  }

  setupProgrammaticDOM() {
    // Create structure
    this.container.innerHTML = `
      <div class="swu-container">
        <div class="swu-input-wrapper">
          <textarea class="swu-textarea" placeholder="Paste your JSON here..."></textarea>
          <button class="swu-button swu-render-btn">Visualize</button>
        </div>
        <div class="swu-viewer-container">
          <div class="swu-canvas">
            <svg class="swu-connectors"></svg>
            <div class="swu-nodes"></div>
          </div>
        </div>
      </div>
    `;

    // Store references
    this.textarea =
      this.options.textarea || this.container.querySelector(".swu-textarea");
    this.renderBtn = this.container.querySelector(".swu-render-btn");
    this.viewerContainer = this.container.querySelector(
      ".swu-viewer-container"
    );
    this.canvas = this.container.querySelector(".swu-canvas");
    this.nodeContainer = this.container.querySelector(".swu-nodes");
    this.connectorContainer = this.container.querySelector(".swu-connectors");

    // Apply background color
    this.viewerContainer.style.backgroundColor = this.options.canvasBackground;
  }

  applyTheme() {
    if (this.options.theme === "dark") {
      this.container.setAttribute("data-swu-theme", "dark");
    }

    // Apply accent color as CSS variable
    if (this.options.accentColor) {
      this.container.style.setProperty(
        "--swu-accent-color",
        this.options.accentColor
      );
    }
  }

  setupEventListeners() {
    // Textarea live editing
    this.textarea.addEventListener("input", () => {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.handleTextareaChange(false);
      }, 500);
    });

    // Force render button
    this.renderBtn.addEventListener("click", () => {
      this.handleTextareaChange(true);
    });

    // Pan & Zoom
    this.viewerContainer.addEventListener("wheel", (e) => this.handleWheel(e));
    this.viewerContainer.addEventListener("mousedown", (e) =>
      this.handleMouseDown(e)
    );
    this.viewerContainer.addEventListener("mouseup", () =>
      this.handleMouseUp()
    );
    this.viewerContainer.addEventListener("mouseleave", () =>
      this.handleMouseUp()
    );
    this.viewerContainer.addEventListener("mousemove", (e) =>
      this.handleMouseMove(e)
    );
  }

  handleTextareaChange(force = false) {
    const expandedPaths = new Set();

    // Preserve expanded state
    if (this.rootNode && !force) {
      this.collectExpandedPaths(this.rootNode, expandedPaths);
    }

    try {
      const data = JSON.parse(this.textarea.value);
      this.rootNode = this.createNode("root", data, null, expandedPaths);

      if (force) {
        this.centerView();
      }

      this.updateTransform();
      this.layoutAndDraw();

      this.textarea.classList.remove("invalid");
      this.textarea.classList.add("valid");

      this.emit("onChange", this.getJson());
    } catch (e) {
      if (force) {
        alert("Invalid JSON! Please check the syntax.");
      }
      this.textarea.classList.remove("valid");
      this.textarea.classList.add("invalid");
      this.emit("onError", e);
    }
  }

  collectExpandedPaths(node, paths) {
    if (node.isExpanded) {
      paths.add(this.getNodePath(node));
    }
    if (node.children) {
      node.children.forEach((child) => this.collectExpandedPaths(child, paths));
    }
  }

  getNodePath(node) {
    const path = [];
    let current = node;
    while (current) {
      path.unshift(current.key);
      current = current.parent;
    }
    return path.join(".");
  }

  createNode(key, value, parent = null, expandedPaths = new Set()) {
    const isExpandable =
      typeof value === "object" &&
      value !== null &&
      Object.keys(value).length > 0;

    const node = {
      key,
      value,
      parent,
      id: `node-${Math.random().toString(36).substr(2, 9)}`,
      x: 0,
      y: 0,
      isExpanded: false,
      children: [],
      el: null,
      subtreeHeight: this.NODE_HEIGHT,
      isExpandable: isExpandable,
    };

    const path = this.getNodePath(node);
    if (expandedPaths.has(path)) {
      node.isExpanded = true;
      if (node.isExpandable) {
        node.children = Object.keys(node.value).map((childKey) =>
          this.createNode(childKey, node.value[childKey], node, expandedPaths)
        );
      }
    }

    return node;
  }

  toggleNode(node) {
    if (!node.isExpandable) return;

    node.isExpanded = !node.isExpanded;

    if (node.isExpanded && node.children.length === 0) {
      node.children = Object.keys(node.value).map((key) =>
        this.createNode(key, node.value[key], node)
      );
    }

    this.layoutAndDraw();
  }

  layoutAndDraw() {
    if (!this.rootNode) return;

    this.calculateSubtreeHeights(this.rootNode);
    this.positionNodes(
      this.rootNode,
      this.CANVAS_CENTER_X,
      this.CANVAS_CENTER_Y
    );
    this.draw();
  }

  calculateSubtreeHeights(node) {
    if (!node.isExpanded || node.children.length === 0) {
      node.subtreeHeight = this.NODE_HEIGHT;
      return;
    }

    let totalHeight = 0;
    node.children.forEach((child) => {
      this.calculateSubtreeHeights(child);
      totalHeight += child.subtreeHeight;
    });

    node.subtreeHeight =
      totalHeight + (node.children.length - 1) * this.V_SPACING;
  }

  positionNodes(node, x, y) {
    node.x = x;
    node.y = y;

    if (!node.isExpanded || node.children.length === 0) return;

    let currentY = y - node.subtreeHeight / 2;
    node.children.forEach((child) => {
      this.positionNodes(
        child,
        x + this.NODE_WIDTH + this.H_SPACING,
        currentY + child.subtreeHeight / 2
      );
      currentY += child.subtreeHeight + this.V_SPACING;
    });
  }

  draw() {
    const fragment = document.createDocumentFragment();
    const connectors = [];

    const traverse = (node) => {
      if (!node.el) {
        node.el = this.createNodeElement(node);
      }
      this.updateNodeElement(node);
      fragment.appendChild(node.el);

      if (node.isExpanded) {
        node.children.forEach((child) => {
          connectors.push(this.drawConnector(node, child));
          traverse(child);
        });
      }
    };

    if (this.rootNode) traverse(this.rootNode);

    this.nodeContainer.innerHTML = "";
    this.nodeContainer.appendChild(fragment);

    this.connectorContainer.innerHTML = "";
    connectors.forEach((c) => this.connectorContainer.appendChild(c));
  }

  updateNodeElement(node) {
    node.el.style.transform = `translate(${node.x}px, ${
      node.y - this.NODE_HEIGHT / 2
    }px)`;
  }

  createNodeElement(node) {
    const el = document.createElement("div");
    el.id = node.id;
    el.className = "swu-node";
    if (node.isExpandable) el.classList.add("expandable");

    const keyEl = document.createElement("div");
    const valueEl = document.createElement("div");

    this.renderKey(keyEl, node);
    this.renderValue(valueEl, node);

    el.appendChild(keyEl);
    el.appendChild(valueEl);

    // Expandable click
    if (node.isExpandable) {
      el.addEventListener("click", (e) => {
        if (e.target === el || e.target === valueEl) {
          this.toggleNode(node);
        }
      });
    } else {
      // Value editing
      valueEl.addEventListener("dblclick", () => {
        this.enterEditMode(valueEl, node);
      });
    }

    // Key editing (only for object properties, not array indices)
    if (node.parent && !Array.isArray(node.parent.value)) {
      keyEl.addEventListener("dblclick", () => {
        this.enterKeyEditMode(keyEl, node);
      });
    }

    return el;
  }

  renderKey(keyEl, node) {
    keyEl.innerHTML = "";
    keyEl.className = "swu-key";
    keyEl.textContent = node.key === "root" ? "JSON Root" : node.key;

    if (node.parent && !Array.isArray(node.parent.value)) {
      keyEl.classList.add("editable");
      keyEl.title = "Double-click to edit key";
    }
  }

  renderValue(valueEl, node) {
    valueEl.innerHTML = "";
    valueEl.className = "swu-value";
    const value = node.value;

    if (node.isExpandable) {
      const typeText = Array.isArray(value)
        ? `Array[${value.length}]`
        : "{...} Object";
      valueEl.innerHTML = `${typeText} <span class="unfold-hint">(click to unfold)</span>`;
    } else {
      valueEl.classList.add("editable");
      valueEl.title = "Double-click to edit value";
      valueEl.textContent = JSON.stringify(value);

      if (value === null) {
        valueEl.classList.add("swu-value-null");
      } else {
        valueEl.classList.add(`swu-value-${typeof value}`);
      }
    }
  }

  enterEditMode(valueEl, node) {
    const input = document.createElement("input");
    input.className = "swu-edit-input";
    input.value = JSON.stringify(node.value);

    const save = () => {
      let newValue;
      try {
        newValue = JSON.parse(input.value);
      } catch (e) {
        // If not valid JSON, treat as string
        newValue = input.value;
      }

      node.value = newValue;
      node.parent.value[node.key] = newValue;
      this.renderValue(valueEl, node);
      this.updateRawJson();
    };

    input.addEventListener("blur", save);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        input.blur();
      }
      if (e.key === "Escape") {
        this.renderValue(valueEl, node);
      }
    });

    valueEl.innerHTML = "";
    valueEl.appendChild(input);
    input.focus();
    input.select();
  }

  enterKeyEditMode(keyEl, node) {
    const oldKey = node.key;
    const input = document.createElement("input");
    input.className = "swu-edit-input";
    input.value = oldKey;

    const save = () => {
      const newKey = input.value.trim();

      if (
        newKey &&
        newKey !== oldKey &&
        !node.parent.value.hasOwnProperty(newKey)
      ) {
        const parentNode = node.parent;
        const parentObject = parentNode.value;
        const newParentObject = {};

        // Rebuild object to preserve key order
        for (const key in parentObject) {
          if (Object.prototype.hasOwnProperty.call(parentObject, key)) {
            if (key === oldKey) {
              newParentObject[newKey] = node.value;
            } else {
              newParentObject[key] = parentObject[key];
            }
          }
        }

        // Replace the old object
        if (parentNode.parent) {
          parentNode.parent.value[parentNode.key] = newParentObject;
        } else {
          this.rootNode.value = newParentObject;
        }

        parentNode.value = newParentObject;
        node.key = newKey;
        this.updateRawJson();
      }

      this.renderKey(keyEl, node);
    };

    input.addEventListener("blur", save);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        input.blur();
      }
      if (e.key === "Escape") {
        this.renderKey(keyEl, node);
      }
    });

    keyEl.innerHTML = "";
    keyEl.appendChild(input);
    input.focus();
    input.select();
  }

  updateRawJson() {
    this.textarea.value = JSON.stringify(this.rootNode.value, null, 2);
    this.textarea.classList.remove("invalid");
    this.textarea.classList.add("valid");
    this.emit("onChange", this.getJson());
  }

  drawConnector(fromNode, toNode) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const fromX = fromNode.x + this.NODE_WIDTH;
    const fromY = fromNode.y;
    const toX = toNode.x;
    const toY = toNode.y;

    const d = `M ${fromX} ${fromY} C ${fromX + this.H_SPACING / 2} ${fromY}, ${
      toX - this.H_SPACING / 2
    } ${toY}, ${toX} ${toY}`;

    path.setAttribute("d", d);
    path.setAttribute("stroke", "var(--swu-line-color)");
    path.setAttribute("stroke-width", "2");
    path.setAttribute("fill", "none");

    return path;
  }

  handleWheel(e) {
    e.preventDefault();

    const rect = this.viewerContainer.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.2, Math.min(2.5, this.scale * delta));

    this.panX = mouseX - (mouseX - this.panX) * (newScale / this.scale);
    this.panY = mouseY - (mouseY - this.panY) * (newScale / this.scale);
    this.scale = newScale;

    this.updateTransform();
  }

  handleMouseDown(e) {
    if (e.target.closest(".swu-node")) return;

    this.isDragging = true;
    this.startDragX = e.clientX - this.panX;
    this.startDragY = e.clientY - this.panY;
    this.viewerContainer.style.cursor = "grabbing";
  }

  handleMouseUp() {
    this.isDragging = false;
    this.viewerContainer.style.cursor = "grab";
  }

  handleMouseMove(e) {
    if (this.isDragging) {
      this.panX = e.clientX - this.startDragX;
      this.panY = e.clientY - this.startDragY;
      this.updateTransform();
    }
  }

  updateTransform() {
    this.canvas.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
  }

  centerView() {
    this.panX =
      this.viewerContainer.clientWidth / 2 - this.CANVAS_CENTER_X * this.scale;
    this.panY =
      this.viewerContainer.clientHeight / 2 - this.CANVAS_CENTER_Y * this.scale;
  }

  // Public API Methods
  render(json) {
    if (typeof json === "string") {
      this.textarea.value = json;
      this.handleTextareaChange(true);
    } else {
      this.textarea.value = JSON.stringify(json, null, 2);
      this.handleTextareaChange(true);
    }
  }

  getJson() {
    if (this.rootNode) {
      return this.rootNode.value;
    }
    return null;
  }

  destroy() {
    // Remove event listeners
    this.viewerContainer.removeEventListener("wheel", this.handleWheel);
    this.viewerContainer.removeEventListener("mousedown", this.handleMouseDown);
    this.viewerContainer.removeEventListener("mouseup", this.handleMouseUp);
    this.viewerContainer.removeEventListener("mouseleave", this.handleMouseUp);
    this.viewerContainer.removeEventListener("mousemove", this.handleMouseMove);

    // Clear content
    this.container.innerHTML = "";

    // Clear references
    this.rootNode = null;
    this.eventListeners = {};
  }

  // Event emitter
  on(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  emit(event, data) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach((callback) => callback(data));
    }
  }
}

// Auto-initialize declarative instances
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-swu]").forEach((el) => {
      if (!el.SWU) {
        el.SWU = new SWU(el);
      }
    });
  });
}

// Export for different module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = SWU;
}

export default SWU;
