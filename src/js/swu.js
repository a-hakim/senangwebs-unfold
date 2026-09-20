/**
 * SenangWebs Unfold (SWU)
 * An advanced, interactive JavaScript library for visualizing and editing JSON data
 * @version 1.1.1
 */

import "../css/swu.css";

class SWU {
  static _instanceCounter = 0;
  static _iconScriptRequested = false;

  constructor(containerElement, options = {}) {
    if (!containerElement) {
      throw new Error("Container element is required");
    }

    this.container = containerElement;
    this.options = {
      json:
        options.json !== undefined
          ? options.json
          : options.inputJSON !== undefined
          ? options.inputJSON
          : {},
      textarea: options.textarea || null,
      canvasBackground: options.canvasBackground || "#e9ecef",
      accentColor: options.accentColor || "#3b82f6",
      theme: options.theme || "light",
      direction: options.direction || "horizontal",
      ...options,
    };

    // Internal state
    this.rootNode = null;
    this.debounceTimer = null;
    this.eventListeners = {};
    this.domEventListeners = [];
    this.isDestroyed = false;
    this.instanceId = ++SWU._instanceCounter;
    this.nodeIdCounter = 0;
    this._jsonExplicitlyProvided =
      options.json !== undefined || options.inputJSON !== undefined;

    // Undo / redo history
    this.history = [];
    this.historyIndex = -1;

    // Pointer / pan / pinch state
    this.pointers = new Map();
    this.pinchState = null;
    this.lastTap = null;

    // Search state
    this.searchMatches = [];
    this.searchIndex = -1;
    this.searchTimer = null;

    // Auto theme (prefers-color-scheme) when no explicit theme given
    this.autoTheme = options.autoTheme !== false && options.theme === undefined;
    if (
      this.autoTheme &&
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function"
    ) {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      this.options.theme = mq.matches ? "dark" : "light";
      this.mediaQuery = mq;
    }

    this.readOnly = this.options.readOnly === true;
    this.autoFit = this.options.autoFit === true;
    this.useIcons = this.options.icons !== false;

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

    // Expose the instance on the container (used by declarative access
    // like el.SWU, and convenient for API consumers)
    try {
      this.container.SWU = this;
    } catch (e) {
      /* non-extensible container */
    }
  }

  init() {
    this.setupDOM();
    this.applyTheme();
    this.setupEventListeners();
    this.loadIcons();

    // Read-only mode: skip textarea/input listeners setup already handled

    // Auto-fit on first meaningful size observation
    if (
      this.autoFit &&
      typeof ResizeObserver !== "undefined" &&
      this.viewerContainer
    ) {
      let firstObservation = true;
      this.resizeObserver = new ResizeObserver(() => {
        if (firstObservation) {
          firstObservation = false;
          this.centerView();
          this.updateTransform();
        } else {
          this.fitToView();
        }
      });
      this.resizeObserver.observe(this.viewerContainer);
    }

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
    if (this.container.hasAttribute("data-swu-direction")) {
      this.options.direction = this.container.getAttribute("data-swu-direction");
    }

    // Initial JSON: JS API option wins, then data attribute, then inline script
    if (!this._jsonExplicitlyProvided) {
      if (this.container.hasAttribute("data-swu-json")) {
        try {
          this.options.json = JSON.parse(
            this.container.getAttribute("data-swu-json")
          );
        } catch (e) {
          console.error("SWU: invalid data-swu-json attribute:", e);
        }
      } else {
        const inlineScript = this.container.querySelector(
          'script[type="application/json"]'
        );
        if (inlineScript) {
          try {
            this.options.json = JSON.parse(inlineScript.textContent);
          } catch (e) {
            console.error("SWU: invalid inline JSON script:", e);
          }
        }
      }
    }

    // Setup viewer
    viewerContainer.className = "swu-viewer-container";
    viewerContainer.style.backgroundColor = this.options.canvasBackground;
    viewerContainer.innerHTML = `
      <div class="swu-canvas">
        <svg class="swu-connectors"></svg>
        <div class="swu-nodes"></div>
      </div>
      ${this.buildToolbarHTML()}
    `;

    // Store references
    this.textarea = inputWrapper.querySelector(".swu-textarea");
    this.renderBtn = inputWrapper.querySelector(".swu-render-btn");
    this.errorEl = inputWrapper.querySelector(".swu-error-text");

    if (this.readOnly) {
      inputWrapper.style.display = "none";
      this.textarea = null;
      this.renderBtn = null;
    }
    this.searchEl = viewerContainer.querySelector(".swu-search");
    this.viewerContainer = viewerContainer;
    this.canvas = viewerContainer.querySelector(".swu-canvas");
    this.nodeContainer = viewerContainer.querySelector(".swu-nodes");
    this.connectorContainer = viewerContainer.querySelector(".swu-connectors");
    this.nodeContainer.setAttribute("role", "tree");
  }

  setupProgrammaticDOM() {
    // Create structure
    this.container.innerHTML = `
      <div class="swu-container">
        ${
          this.readOnly
            ? ""
            : `<div class="swu-input-wrapper">
          <textarea class="swu-textarea" placeholder="Paste your JSON here..."></textarea>
          <div class="swu-error-text" style="display:none;"></div>
          <button class="swu-button swu-render-btn">Visualize</button>
        </div>`
        }
        <div class="swu-viewer-container">
          <div class="swu-canvas">
            <svg class="swu-connectors"></svg>
            <div class="swu-nodes"></div>
          </div>
          ${this.buildToolbarHTML()}
        </div>
      </div>
    `;

    // Store references
    this.textarea =
      this.options.textarea || this.container.querySelector(".swu-textarea");
    this.renderBtn = this.container.querySelector(".swu-render-btn");
    this.errorEl = this.container.querySelector(".swu-error-text");
    this.searchEl = this.container.querySelector(".swu-search");
    this.viewerContainer = this.container.querySelector(
      ".swu-viewer-container"
    );
    this.canvas = this.container.querySelector(".swu-canvas");
    this.nodeContainer = this.container.querySelector(".swu-nodes");
    this.connectorContainer = this.container.querySelector(".swu-connectors");
    this.nodeContainer.setAttribute("role", "tree");

    // Apply background color
    this.viewerContainer.style.backgroundColor = this.options.canvasBackground;
  }

  buildIconHTML(iconName, fallback) {
    if (this.useIcons) {
      return `<ss-icon icon="${iconName}" aria-hidden="true"></ss-icon><span class="swu-icon-fallback" aria-hidden="true">${fallback}</span>`;
    }
    return `<span class="swu-icon-fallback" aria-hidden="true">${fallback}</span>`;
  }

  buildIconElement(iconName, fallback) {
    const frag = document.createDocumentFragment();
    if (this.useIcons) {
      const icon = document.createElement("ss-icon");
      icon.setAttribute("icon", iconName);
      icon.setAttribute("aria-hidden", "true");
      frag.appendChild(icon);
    }
    const fallbackEl = document.createElement("span");
    fallbackEl.className = "swu-icon-fallback";
    fallbackEl.setAttribute("aria-hidden", "true");
    fallbackEl.textContent = fallback;
    frag.appendChild(fallbackEl);
    return frag;
  }

  loadIcons() {
    if (!this.useIcons || typeof customElements === "undefined") return;
    if (customElements.get("ss-icon")) return;
    if (SWU._iconScriptRequested) return;
    SWU._iconScriptRequested = true;

    const url =
      this.options.iconScriptUrl ||
      "https://unpkg.com/@bookklik/senangstart-icons/dist/senangstart-icon.min.js";
    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    document.head.appendChild(script);
  }

  buildToolbarHTML() {
    return `
      <div class="swu-toolbar">
        <button class="swu-tool-btn" data-swu-tool="zoom-in" title="Zoom in">${this.buildIconHTML("magnifying-glass-plus", "+")}</button>
        <button class="swu-tool-btn" data-swu-tool="zoom-out" title="Zoom out">${this.buildIconHTML("magnifying-glass-minus", "&minus;")}</button>
        <button class="swu-tool-btn" data-swu-tool="reset" title="Reset view">${this.buildIconHTML("home", "&#8962;")}</button>
        <button class="swu-tool-btn" data-swu-tool="fit" title="Fit to view">${this.buildIconHTML("magnifying-glass-focus", "&#9910;")}</button>
        <span class="swu-toolbar-sep"></span>
        <button class="swu-tool-btn" data-swu-tool="undo" title="Undo (Ctrl/Cmd+Z)">${this.buildIconHTML("arrow-rotate-ccw", "&#8630;")}</button>
        <button class="swu-tool-btn" data-swu-tool="redo" title="Redo (Ctrl/Cmd+Shift+Z)">${this.buildIconHTML("arrow-rotate-cw", "&#8631;")}</button>
        <span class="swu-toolbar-sep"></span>
        <button class="swu-tool-btn" data-swu-tool="expand-all" title="Expand all">${this.buildIconHTML("chevron-double-down", "&#8862;")}</button>
        <button class="swu-tool-btn" data-swu-tool="collapse-all" title="Collapse all">${this.buildIconHTML("chevron-double-up", "&#8863;")}</button>
        <input class="swu-search" type="text" placeholder="Search&hellip;" spellcheck="false" />
      </div>
    `;
  }

  applyTheme() {
    if (this.options.theme === "dark") {
      this.container.setAttribute("data-swu-theme", "dark");
    } else {
      this.container.removeAttribute("data-swu-theme");
    }

    // Apply direction attribute
    if (this.options.direction) {
      this.container.setAttribute("data-swu-direction", this.options.direction);
    }

    if (this.readOnly) {
      this.container.setAttribute("data-swu-readonly", "");
    }

    if (!this.useIcons) {
      this.container.setAttribute("data-swu-no-icons", "");
    }

    // Apply accent color as CSS variable
    if (this.options.accentColor) {
      this.container.style.setProperty(
        "--swu-accent-color",
        this.options.accentColor
      );
    }

    // React to OS theme changes when using auto theme
    if (
      this.autoTheme &&
      this.mediaQuery &&
      typeof this.mediaQuery.addEventListener === "function"
    ) {
      const handler = (e) => {
        this.options.theme = e.matches ? "dark" : "light";
        if (this.options.theme === "dark") {
          this.container.setAttribute("data-swu-theme", "dark");
        } else {
          this.container.removeAttribute("data-swu-theme");
        }
      };
      this.mediaQuery.addEventListener("change", handler);
      this.domEventListeners.push({
        target: this.mediaQuery,
        event: "change",
        handler,
      });
    }
  }

  setupEventListeners() {
    // Textarea live editing
    if (this.textarea) {
      this.addDOMEventListener(this.textarea, "input", () => {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
          this.handleTextareaChange(false);
        }, 500);
      });
    }

    // Force render button
    if (this.renderBtn) {
      this.addDOMEventListener(this.renderBtn, "click", () => {
        this.handleTextareaChange(true);
      });
    }

    // Pan & Zoom (pointer events: mouse, touch and pen)
    this.addDOMEventListener(
      this.viewerContainer,
      "wheel",
      (e) => this.handleWheel(e),
      { passive: false }
    );
    this.addDOMEventListener(this.viewerContainer, "pointerdown", (e) =>
      this.handlePointerDown(e)
    );
    this.addDOMEventListener(this.viewerContainer, "pointermove", (e) =>
      this.handlePointerMove(e)
    );
    this.addDOMEventListener(this.viewerContainer, "pointerup", (e) =>
      this.handlePointerUp(e)
    );
    this.addDOMEventListener(this.viewerContainer, "pointercancel", (e) =>
      this.handlePointerUp(e)
    );
    this.addDOMEventListener(this.viewerContainer, "pointerleave", () =>
      this.handlePanEnd()
    );

    // Node interaction via event delegation (survives node re-renders)
    this.addDOMEventListener(this.nodeContainer, "click", (e) =>
      this.handleNodeClick(e)
    );
    this.addDOMEventListener(this.nodeContainer, "dblclick", (e) =>
      this.handleNodeDblClick(e)
    );

    // Toolbar (zoom, fit, expand/collapse all)
    this.addDOMEventListener(this.viewerContainer, "click", (e) => {
      const btn = e.target.closest("[data-swu-tool]");
      if (!btn) return;
      const action = btn.getAttribute("data-swu-tool");
      if (action === "zoom-in") this.zoomIn();
      else if (action === "zoom-out") this.zoomOut();
      else if (action === "reset") this.resetView();
      else if (action === "fit") this.fitToView();
      else if (action === "undo") this.undo();
      else if (action === "redo") this.redo();
      else if (action === "expand-all") this.expandAll();
      else if (action === "collapse-all") this.collapseAll();
    });

    // Search
    if (this.searchEl) {
      this.addDOMEventListener(this.searchEl, "input", () => {
        clearTimeout(this.searchTimer);
        this.searchTimer = setTimeout(() => {
          this.search(this.searchEl.value);
        }, 250);
      });
      this.addDOMEventListener(this.searchEl, "keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.jumpToMatch(this.searchIndex + 1);
        }
      });
    }

    // Keyboard shortcuts (undo/redo, node toggle)
    this.addDOMEventListener(this.container, "keydown", (e) =>
      this.handleKeyDown(e)
    );
  }

  isEditableTarget(e) {
    return !!e.target.closest("input, textarea, .swu-edit-input");
  }

  addDOMEventListener(target, event, handler, options) {
    target.addEventListener(event, handler, options);
    this.domEventListeners.push({ target, event, handler, options });
  }

  handleTextareaChange(force = false) {
    if (this.isDestroyed || !this.textarea) return;

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
      this.pushHistory();

      this.textarea.classList.remove("invalid");
      this.textarea.classList.add("valid");
      this.hideInlineError();

      this.emit("onChange", this.getJson());
    } catch (e) {
      this.textarea.classList.remove("valid");
      this.textarea.classList.add("invalid");
      this.showInlineError(e);
      this.emit("onError", e);
    }
  }

  showInlineError(e) {
    if (this.errorEl) {
      this.errorEl.textContent = `Invalid JSON: ${e.message}`;
      this.errorEl.style.display = "block";
    }
  }

  hideInlineError() {
    if (this.errorEl) {
      this.errorEl.style.display = "none";
    }
  }

  collectExpandedPaths(node, paths) {
    if (node.isExpanded) {
      paths.add(this.getNodePath(node));
    } else if (node === this.rootNode) {
      // Explicitly remember that the root was collapsed by the user
      paths.add("__swu_root_collapsed__");
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
    // Use an unlikely separator so keys containing "." don't collide
    return path.join("\u0000");
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
      id: `swu-${this.instanceId}-node-${++this.nodeIdCounter}`,
      x: 0,
      y: 0,
      isExpanded: false,
      children: [],
      el: null,
      subtreeHeight: this.NODE_HEIGHT,
      subtreeWidth: this.NODE_WIDTH,
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
    } else if (
      parent === null &&
      node.isExpandable &&
      !expandedPaths.has("__swu_root_collapsed__")
    ) {
      // Root starts expanded so the graph is immediately useful
      node.isExpanded = true;
      node.children = Object.keys(node.value).map((childKey) =>
        this.createNode(childKey, node.value[childKey], node, expandedPaths)
      );
    }

    return node;
  }

  toggleNode(node) {
    if (!node.isExpandable) return;

    node.isExpanded = !node.isExpanded;

    if (node.el) {
      node.el.setAttribute("aria-expanded", String(node.isExpanded));
    }

    if (node.isExpanded && node.children.length === 0) {
      node.children = Object.keys(node.value).map((key) =>
        this.createNode(key, node.value[key], node)
      );
    }

    this.emit(node.isExpanded ? "onNodeExpand" : "onNodeCollapse", node);

    this.layoutAndDraw();
  }

  layoutAndDraw() {
    if (!this.rootNode) return;

    this.calculateSubtreeSizes(this.rootNode);
    this.positionNodes(
      this.rootNode,
      this.CANVAS_CENTER_X,
      this.CANVAS_CENTER_Y
    );
    this.draw();

    // Second pass: measure real DOM sizes, then re-layout with accurate values
    this.measureNodes();
    this.calculateSubtreeSizes(this.rootNode);
    this.positionNodes(
      this.rootNode,
      this.CANVAS_CENTER_X,
      this.CANVAS_CENTER_Y
    );
    this.draw();
  }

  getNodeWidth(node) {
    return Math.max(this.NODE_WIDTH, node.measuredWidth || 0);
  }

  getNodeHeight(node) {
    return Math.max(this.NODE_HEIGHT, node.measuredHeight || 0);
  }

  measureNodes() {
    const traverse = (node) => {
      if (node.el && node.el.isConnected) {
        const w = node.el.offsetWidth;
        const h = node.el.offsetHeight;
        if (w > 0) node.measuredWidth = w;
        if (h > 0) node.measuredHeight = h;
      }
      if (node.isExpanded) {
        node.children.forEach(traverse);
      }
    };
    if (this.rootNode) traverse(this.rootNode);
  }

  updateSvgBounds() {
    if (!this.rootNode) return;

    let maxX = 0;
    let maxY = 0;
    const traverse = (node) => {
      maxX = Math.max(maxX, node.x + this.getNodeWidth(node));
      maxY = Math.max(maxY, node.y + this.getNodeHeight(node));
      if (node.isExpanded) {
        node.children.forEach(traverse);
      }
    };
    traverse(this.rootNode);

    const width = Math.max(this.CANVAS_CENTER_X * 2, maxX + this.H_SPACING);
    const height = Math.max(this.CANVAS_CENTER_Y * 2, maxY + this.V_SPACING);
    this.connectorContainer.setAttribute("width", width);
    this.connectorContainer.setAttribute("height", height);
  }

  calculateSubtreeSizes(node) {
    if (!node.isExpanded || node.children.length === 0) {
      node.subtreeHeight = this.getNodeHeight(node);
      node.subtreeWidth = this.getNodeWidth(node);
      return;
    }

    let totalHeight = 0;
    let totalWidth = 0;
    node.children.forEach((child) => {
      this.calculateSubtreeSizes(child);
      totalHeight += child.subtreeHeight;
      totalWidth += child.subtreeWidth;
    });

    node.subtreeHeight =
      totalHeight + (node.children.length - 1) * this.V_SPACING;
    node.subtreeWidth =
      totalWidth + (node.children.length - 1) * this.H_SPACING;
  }

  positionNodes(node, x, y) {
    node.x = x;
    node.y = y;

    if (!node.isExpanded || node.children.length === 0) return;

    if (this.options.direction === "vertical") {
      // Vertical: children spread horizontally below the parent
      const vGap = this.V_SPACING * 3;
      const nodeHeight = this.getNodeHeight(node);
      let currentX = x - node.subtreeWidth / 2;
      node.children.forEach((child) => {
        this.positionNodes(
          child,
          currentX + child.subtreeWidth / 2,
          y + nodeHeight + vGap
        );
        currentX += child.subtreeWidth + this.H_SPACING;
      });
    } else {
      // Horizontal (default): children stacked vertically to the right
      const nodeWidth = this.getNodeWidth(node);
      let currentY = y - node.subtreeHeight / 2;
      node.children.forEach((child) => {
        this.positionNodes(
          child,
          x + nodeWidth + this.H_SPACING,
          currentY + child.subtreeHeight / 2
        );
        currentY += child.subtreeHeight + this.V_SPACING;
      });
    }
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
    this.updateSvgBounds();
  }

  updateNodeElement(node) {
    node.el.style.transform = `translate(${node.x}px, ${
      node.y - this.getNodeHeight(node) / 2
    }px)`;
  }

  createNodeElement(node) {
    const el = document.createElement("div");
    el.id = node.id;
    el.className = "swu-node";
    el._swuNode = node;
    el.tabIndex = 0;

    if (node.isExpandable) {
      el.classList.add("expandable");
      el.setAttribute("role", "treeitem");
      el.setAttribute("aria-expanded", String(node.isExpanded));
      el.setAttribute(
        "aria-label",
        `${node.key === "root" ? "JSON Root" : node.key} (expandable)`
      );
    } else {
      el.setAttribute("role", "treeitem");
    }

    const keyEl = document.createElement("div");
    const valueEl = document.createElement("div");

    this.renderKey(keyEl, node);
    this.renderValue(valueEl, node);

    node.keyEl = keyEl;
    node.valueEl = valueEl;
    el.appendChild(keyEl);
    el.appendChild(valueEl);

    // Hover actions: add child / delete (hidden in read-only mode)
    if (!this.readOnly) {
      const actions = document.createElement("div");
      actions.className = "swu-node-actions";

      if (typeof node.value === "object" && node.value !== null) {
        const addBtn = document.createElement("button");
        addBtn.className = "swu-action swu-action-add";
        addBtn.title = Array.isArray(node.value)
          ? "Add item"
          : "Add property";
        addBtn.appendChild(
          this.buildIconElement("plus", "+")
        );
        actions.appendChild(addBtn);
      }

      if (node.parent) {
        const delBtn = document.createElement("button");
        delBtn.className = "swu-action swu-action-delete";
        delBtn.title = "Delete";
        delBtn.appendChild(
          this.buildIconElement("trash", "\u00d7")
        );
        actions.appendChild(delBtn);
      }

      if (actions.children.length > 0) {
        el.appendChild(actions);
      }
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

  setObjectKey(obj, key, value) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      Object.defineProperty(obj, key, {
        value,
        writable: true,
        enumerable: true,
        configurable: true,
      });
    } else {
      obj[key] = value;
    }
  }

  refreshNodeType(node, valueEl) {
    const isExpandable =
      typeof node.value === "object" &&
      node.value !== null &&
      Object.keys(node.value).length > 0;

    if (isExpandable === node.isExpandable) {
      this.renderValue(valueEl, node);
      return;
    }

    node.isExpandable = isExpandable;
    node.children = [];
    node.isExpanded = false;

    if (node.el) {
      node.el.classList.toggle("expandable", isExpandable);
    }
    this.renderValue(valueEl, node);
  }

  enterEditMode(valueEl, node) {
    if (this.readOnly || this.isDestroyed || !node.el) return;

    const input = document.createElement("input");
    input.className = "swu-edit-input";
    input.value = JSON.stringify(node.value);
    let cancelled = false;
    const oldValue = node.value;

    const save = () => {
      if (cancelled) return;

      let newValue;
      try {
        newValue = JSON.parse(input.value);
      } catch (e) {
        // If not valid JSON, treat as string
        newValue = input.value;
      }

      node.value = newValue;
      if (node.parent) {
        this.setObjectKey(node.parent.value, node.key, newValue);
      } else {
        this.rootNode.value = newValue;
      }
      this.refreshNodeType(node, valueEl);
      this.updateRawJson();
      this.pushHistory();
      this.emit("onNodeEdit", {
        path: this.getDisplayPath(node),
        oldValue,
        newValue,
      });
    };

    input.addEventListener("blur", save);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        input.blur();
      }
      if (e.key === "Escape") {
        cancelled = true;
        this.renderValue(valueEl, node);
      }
    });

    valueEl.innerHTML = "";
    valueEl.appendChild(input);
    input.focus();
    input.select();
  }

  enterKeyEditMode(keyEl, node) {
    if (this.readOnly || this.isDestroyed || !node.el) return;

    const oldKey = node.key;
    const input = document.createElement("input");
    input.className = "swu-edit-input";
    input.value = oldKey;
    let cancelled = false;

    const save = () => {
      if (cancelled) return;

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
        Object.keys(parentObject).forEach((key) => {
          if (key === oldKey) {
            this.setObjectKey(newParentObject, newKey, node.value);
          } else {
            this.setObjectKey(newParentObject, key, parentObject[key]);
          }
        });

        // Replace the old object
        if (parentNode.parent) {
          this.setObjectKey(
            parentNode.parent.value,
            parentNode.key,
            newParentObject
          );
        } else {
          this.rootNode.value = newParentObject;
        }

        parentNode.value = newParentObject;
        node.key = newKey;
        this.updateRawJson();
        this.pushHistory();
        this.emit("onKeyRename", {
          path: this.getDisplayPath(parentNode),
          oldKey,
          newKey,
        });
      }

      this.renderKey(keyEl, node);
    };

    input.addEventListener("blur", save);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        input.blur();
      }
      if (e.key === "Escape") {
        cancelled = true;
        this.renderKey(keyEl, node);
      }
    });

    keyEl.innerHTML = "";
    keyEl.appendChild(input);
    input.focus();
    input.select();
  }

  updateRawJson() {
    if (this.textarea) {
      this.textarea.value = JSON.stringify(this.rootNode.value, null, 2);
      this.textarea.classList.remove("invalid");
      this.textarea.classList.add("valid");
    }
    this.hideInlineError();
    this.emit("onChange", this.getJson());
  }

  // ----- Mutations (add / delete / edit) -----

  refresh() {
    if (!this.rootNode) return;

    // Preserve expanded state across the rebuild
    const expandedPaths = new Set();
    this.collectExpandedPaths(this.rootNode, expandedPaths);

    this.rootNode = this.createNode(
      "root",
      this.rootNode.value,
      null,
      expandedPaths
    );
    this.updateRawJson();
    this.layoutAndDraw();
    this.pushHistory();
  }

  getPathKeys(node) {
    const keys = [];
    let current = node;
    while (current && current.parent) {
      keys.unshift(current.key);
      current = current.parent;
    }
    return keys;
  }

  getDisplayPath(node) {
    return this.getPathKeys(node).join(".");
  }

  findNodeByPath(path) {
    let node = this.rootNode;
    for (const key of path) {
      if (!node || !node.isExpandable || node.children.length === 0) {
        return null;
      }
      const child = node.children.find((c) => c.key === key);
      if (!child) return null;
      node = child;
    }
    return node;
  }

  addChild(node) {
    if (
      this.readOnly ||
      typeof node.value !== "object" ||
      node.value === null
    ) {
      return;
    }

    const parentPath = this.getPathKeys(node);
    const isArray = Array.isArray(node.value);
    let childKey;

    if (isArray) {
      node.value.push(null);
      childKey = node.value.length - 1;
    } else {
      childKey = "newField";
      let i = 1;
      while (Object.prototype.hasOwnProperty.call(node.value, childKey)) {
        childKey = `newField${++i}`;
      }
      this.setObjectKey(node.value, childKey, null);
    }

    node.isExpanded = true;
    this.refresh();

    // Enter key editing on the fresh child node
    const child = this.findNodeByPath([...parentPath, childKey]);
    if (child && child.keyEl) {
      this.centerOnNode(child);
      this.enterKeyEditMode(child.keyEl, child);
    }
  }

  deleteNode(node) {
    if (this.readOnly || !node.parent) return;

    const parentValue = node.parent.value;
    if (Array.isArray(parentValue)) {
      parentValue.splice(Number(node.key), 1);
    } else {
      delete parentValue[node.key];
    }

    this.refresh();
  }

  // ----- Undo / redo -----

  pushHistory() {
    if (this.isDestroyed || !this.rootNode) return;

    const snapshot = JSON.stringify(this.rootNode.value);
    if (this.history[this.historyIndex] === snapshot) return;

    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(snapshot);
    if (this.history.length > 50) this.history.shift();
    this.historyIndex = this.history.length - 1;
  }

  undo() {
    if (this.isDestroyed || this.historyIndex <= 0) return false;
    this.historyIndex--;
    this.applySnapshot(this.history[this.historyIndex]);
    return true;
  }

  redo() {
    if (
      this.isDestroyed ||
      this.historyIndex < 0 ||
      this.historyIndex >= this.history.length - 1
    ) {
      return false;
    }
    this.historyIndex++;
    this.applySnapshot(this.history[this.historyIndex]);
    return true;
  }

  applySnapshot(snapshot) {
    let data;
    try {
      data = JSON.parse(snapshot);
    } catch (e) {
      return;
    }

    const expandedPaths = new Set();
    if (this.rootNode) this.collectExpandedPaths(this.rootNode, expandedPaths);

    this.rootNode = this.createNode("root", data, null, expandedPaths);

    if (this.textarea) {
      this.textarea.value = JSON.stringify(data, null, 2);
      this.textarea.classList.remove("invalid");
      this.textarea.classList.add("valid");
    }
    this.hideInlineError();
    this.layoutAndDraw();
    this.emit("onChange", this.getJson());
  }

  // ----- View helpers (zoom / fit / center / highlight) -----

  zoomIn() {
    this.zoomBy(1.2);
  }

  zoomOut() {
    this.zoomBy(1 / 1.2);
  }

  zoomBy(factor) {
    const rect = this.viewerContainer.getBoundingClientRect();
    const mx = rect.width / 2;
    const my = rect.height / 2;
    const newScale = Math.max(0.2, Math.min(2.5, this.scale * factor));
    this.panX = mx - (mx - this.panX) * (newScale / this.scale);
    this.panY = my - (my - this.panY) * (newScale / this.scale);
    this.scale = newScale;
    this.updateTransform();
  }

  resetView() {
    this.scale = 1;
    this.centerView();
    this.updateTransform();
  }

  fitToView() {
    if (!this.rootNode) return;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    const traverse = (node) => {
      minX = Math.min(minX, node.x);
      maxX = Math.max(maxX, node.x + this.getNodeWidth(node));
      minY = Math.min(minY, node.y - this.getNodeHeight(node) / 2);
      maxY = Math.max(maxY, node.y + this.getNodeHeight(node) / 2);
      if (node.isExpanded) {
        node.children.forEach(traverse);
      }
    };
    traverse(this.rootNode);

    const rect = this.viewerContainer.getBoundingClientRect();
    const pad = 60;
    const boundsW = maxX - minX + pad * 2;
    const boundsH = maxY - minY + pad * 2;

    if (boundsW <= 0 || boundsH <= 0 || rect.width <= 0 || rect.height <= 0) {
      return;
    }

    this.scale = Math.max(
      0.2,
      Math.min(2.5, Math.min(rect.width / boundsW, rect.height / boundsH))
    );
    this.panX = rect.width / 2 - (minX + (maxX - minX) / 2) * this.scale;
    this.panY = rect.height / 2 - (minY + (maxY - minY) / 2) * this.scale;
    this.updateTransform();
  }

  centerOnNode(node) {
    const rect = this.viewerContainer.getBoundingClientRect();
    const w = this.getNodeWidth(node);
    this.panX = rect.width / 2 - (node.x + w / 2) * this.scale;
    this.panY = rect.height / 2 - node.y * this.scale;
    this.updateTransform();
  }

  highlightNode(node) {
    if (this.highlightTimer) {
      clearTimeout(this.highlightTimer);
    }
    document.querySelectorAll(".swu-node.swu-highlight").forEach((el) => {
      el.classList.remove("swu-highlight");
    });
    if (!node || !node.el) return;

    node.el.classList.add("swu-highlight");
    this.highlightTimer = setTimeout(() => {
      node.el.classList.remove("swu-highlight");
      this.highlightTimer = null;
    }, 1600);
  }

  // ----- Expand / collapse all -----

  expandAll(maxDepth = Infinity) {
    if (!this.rootNode || this.isDestroyed) return;

    const traverse = (node, depth) => {
      if (depth > maxDepth || !node.isExpandable) return;
      node.isExpanded = true;
      if (node.el) node.el.setAttribute("aria-expanded", "true");
      if (node.children.length === 0) {
        node.children = Object.keys(node.value).map((key) =>
          this.createNode(key, node.value[key], node)
        );
      }
      node.children.forEach((child) => traverse(child, depth + 1));
    };
    traverse(this.rootNode, 1);

    this.layoutAndDraw();
    this.updateTransform();
  }

  collapseAll() {
    if (!this.rootNode || this.isDestroyed) return;

    const traverse = (node) => {
      node.isExpanded = false;
      if (node.el) node.el.setAttribute("aria-expanded", "false");
      node.children.forEach(traverse);
    };
    traverse(this.rootNode);

    this.layoutAndDraw();
  }

  // ----- Search -----

  search(query) {
    this.searchMatches = [];
    this.searchIndex = -1;
    this.highlightNode(null);

    if (!query || !this.rootNode || this.isDestroyed) return;

    const q = String(query).toLowerCase();
    const matches = [];

    const traverse = (value, key, path) => {
      if (typeof value !== "object" || value === null) {
        if (
          String(key).toLowerCase().includes(q) ||
          JSON.stringify(value).toLowerCase().includes(q)
        ) {
          matches.push(path.slice());
        }
      } else {
        if (String(key).toLowerCase().includes(q)) {
          matches.push(path.slice());
        }
        Object.keys(value).forEach((k) => {
          traverse(value[k], k, [...path, k]);
        });
      }
    };
    traverse(this.rootNode.value, "root", []);

    this.searchMatches = matches;
    if (matches.length > 0) {
      this.jumpToMatch(0);
    }
  }

  jumpToMatch(index) {
    if (this.searchMatches.length === 0) return;

    this.searchIndex =
      ((index % this.searchMatches.length) + this.searchMatches.length) %
      this.searchMatches.length;

    const path = this.searchMatches[this.searchIndex];
    const node = this.ensurePathVisible(path);
    if (!node) return;

    this.highlightNode(node);
    this.centerOnNode(node);
  }

  ensurePathVisible(path) {
    let node = this.rootNode;
    for (let i = 0; i < path.length; i++) {
      if (!node || !node.isExpandable) return null;
      if (!node.isExpanded) node.isExpanded = true;
      if (node.children.length === 0) {
        node.children = Object.keys(node.value).map((key) =>
          this.createNode(key, node.value[key], node)
        );
      }
      const child = node.children.find((c) => c.key === path[i]);
      if (!child) return null;
      node = child;
    }
    return node;
  }

  drawConnector(fromNode, toNode) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    let d;

    if (this.options.direction === "vertical") {
      // Vertical: org-chart style connector with rounded corners
      // Path: down from parent → horizontal to align with child → down into child
      const fromX = fromNode.x + this.getNodeWidth(fromNode) / 2;
      const fromY = fromNode.y + this.getNodeHeight(fromNode) / 2;
      const toX = toNode.x + this.getNodeWidth(toNode) / 2;
      const toY = toNode.y - this.getNodeHeight(toNode) / 2;
      const midY = (fromY + toY) / 2;
      const r = Math.min(10, Math.abs(toX - fromX) / 2, Math.abs(midY - fromY), Math.abs(toY - midY));

      if (Math.abs(fromX - toX) < 1) {
        // Straight vertical line (child directly below parent)
        d = `M ${fromX} ${fromY} L ${fromX} ${toY}`;
      } else {
        const dir = toX > fromX ? 1 : -1;
        d = `M ${fromX} ${fromY}`
          + ` L ${fromX} ${midY - r}`
          + ` Q ${fromX} ${midY}, ${fromX + dir * r} ${midY}`
          + ` L ${toX - dir * r} ${midY}`
          + ` Q ${toX} ${midY}, ${toX} ${midY + r}`
          + ` L ${toX} ${toY}`;
      }
    } else {
      // Horizontal (default): connector from right-center of parent to left of child
      const fromX = fromNode.x + this.getNodeWidth(fromNode);
      const fromY = fromNode.y;
      const toX = toNode.x;
      const toY = toNode.y;

      d = `M ${fromX} ${fromY} C ${fromX + this.H_SPACING / 2} ${fromY}, ${toX - this.H_SPACING / 2} ${toY}, ${toX} ${toY}`;
    }

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

    // Smooth zoom proportional to delta (works well for trackpads and wheels)
    const factor = Math.exp(-e.deltaY * 0.0015);
    const newScale = Math.max(0.2, Math.min(2.5, this.scale * factor));

    this.panX = mouseX - (mouseX - this.panX) * (newScale / this.scale);
    this.panY = mouseY - (mouseY - this.panY) * (newScale / this.scale);
    this.scale = newScale;

    this.updateTransform();
  }

  handlePointerDown(e) {
    // Mouse: don't start a pan when clicking a node (that toggles / edits)
    if (
      e.pointerType === "mouse" &&
      e.target.closest(".swu-node, .swu-toolbar, .swu-search")
    ) {
      return;
    }

    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (this.pointers.size === 1) {
      this.isDragging = true;
      this.startDragX = e.clientX - this.panX;
      this.startDragY = e.clientY - this.panY;
      this.viewerContainer.style.cursor = "grabbing";
    } else if (this.pointers.size === 2) {
      // Begin pinch zoom
      this.isDragging = false;
      const pts = [...this.pointers.values()];
      this.pinchState = {
        dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
        midX: (pts[0].x + pts[1].x) / 2,
        midY: (pts[0].y + pts[1].y) / 2,
        scale: this.scale,
        panX: this.panX,
        panY: this.panY,
      };
    }
  }

  handlePointerMove(e) {
    if (!this.pointers.has(e.pointerId)) return;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (this.pointers.size === 2 && this.pinchState) {
      const pts = [...this.pointers.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const midX = (pts[0].x + pts[1].x) / 2;
      const midY = (pts[0].y + pts[1].y) / 2;

      if (this.pinchState.dist > 0) {
        const rect = this.viewerContainer.getBoundingClientRect();
        const mx = midX - rect.left;
        const my = midY - rect.top;
        const newScale = Math.max(
          0.2,
          Math.min(2.5, this.pinchState.scale * (dist / this.pinchState.dist))
        );
        this.panX =
          mx - (mx - this.pinchState.panX) * (newScale / this.pinchState.scale);
        this.panY =
          my - (my - this.pinchState.panY) * (newScale / this.pinchState.scale);
        this.scale = newScale;
        this.updateTransform();
      }
    } else if (this.isDragging) {
      this.panX = e.clientX - this.startDragX;
      this.panY = e.clientY - this.startDragY;
      this.updateTransform();
    }
  }

  handlePointerUp(e) {
    if (e.pointerType !== "mouse") {
      this.detectDoubleTap(e);
    }

    this.pointers.delete(e.pointerId);
    this.pinchState = null;
    this.handlePanEnd();
  }

  detectDoubleTap(e) {
    if (this.readOnly || this.isEditableTarget(e)) return;
    const now = Date.now();

    if (
      this.lastTap &&
      now - this.lastTap.time < 300 &&
      Math.hypot(e.clientX - this.lastTap.x, e.clientY - this.lastTap.y) < 25
    ) {
      this.lastTap = null;
      const el = e.target.closest(".swu-node");
      if (!el || !el._swuNode) return;
      this.editFromTarget(el._swuNode, e.target);
    } else {
      this.lastTap = { time: now, x: e.clientX, y: e.clientY };
    }
  }

  editFromTarget(node, target) {
    if (!node || this.readOnly) return;

    if (
      node.keyEl &&
      (target === node.keyEl || node.keyEl.contains(target)) &&
      node.parent &&
      !Array.isArray(node.parent.value)
    ) {
      this.enterKeyEditMode(node.keyEl, node);
    } else if (
      node.valueEl &&
      (target === node.valueEl || node.valueEl.contains(target)) &&
      !node.isExpandable
    ) {
      this.enterEditMode(node.valueEl, node);
    }
  }

  handlePanEnd() {
    this.isDragging = false;
    this.pinchState = null;
    this.viewerContainer.style.cursor = "grab";
  }

  handleNodeClick(e) {
    if (this.isEditableTarget(e)) return;

    const addBtn = e.target.closest(".swu-action-add");
    if (addBtn) {
      const el = addBtn.closest(".swu-node");
      if (el && el._swuNode) this.addChild(el._swuNode);
      return;
    }

    const delBtn = e.target.closest(".swu-action-delete");
    if (delBtn) {
      const el = delBtn.closest(".swu-node");
      if (el && el._swuNode) this.deleteNode(el._swuNode);
      return;
    }

    const el = e.target.closest(".swu-node");
    if (!el || !el._swuNode) return;
    const node = el._swuNode;
    if (node.isExpandable) {
      this.toggleNode(node);
    }
  }

  handleNodeDblClick(e) {
    if (this.readOnly || this.isEditableTarget(e)) return;
    const el = e.target.closest(".swu-node");
    if (!el || !el._swuNode) return;
    this.editFromTarget(el._swuNode, e.target);
  }

  handleKeyDown(e) {
    const key = typeof e.key === "string" ? e.key.toLowerCase() : "";

    // Undo / redo
    const mod = e.ctrlKey || e.metaKey;
    if (mod && key === "z" && !this.isEditableTarget(e)) {
      e.preventDefault();
      if (e.shiftKey) {
        this.redo();
      } else {
        this.undo();
      }
      return;
    }
    if (mod && key === "y" && !this.isEditableTarget(e)) {
      e.preventDefault();
      this.redo();
      return;
    }

    // Enter / Space toggles the focused node
    if (
      (e.key === "Enter" || e.key === " ") &&
      e.target.classList &&
      e.target.classList.contains("swu-node") &&
      e.target._swuNode
    ) {
      e.preventDefault();
      if (e.target._swuNode.isExpandable) {
        this.toggleNode(e.target._swuNode);
      }
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
    if (this.isDestroyed) return;

    if (json === undefined) {
      // No-arg render: just re-layout current data
      this.layoutAndDraw();
      return;
    }

    if (this.textarea) {
      this.textarea.value =
        typeof json === "string" ? json : JSON.stringify(json, null, 2);
      this.handleTextareaChange(true);
    } else {
      // Read-only mode (no textarea): parse and render directly
      let data = json;
      if (typeof json === "string") {
        try {
          data = JSON.parse(json);
        } catch (e) {
          this.emit("onError", e);
          return;
        }
      }

      const expandedPaths = new Set();
      if (this.rootNode) {
        this.collectExpandedPaths(this.rootNode, expandedPaths);
      }
      this.rootNode = this.createNode("root", data, null, expandedPaths);
      this.centerView();
      this.updateTransform();
      this.layoutAndDraw();
      this.pushHistory();
      this.emit("onChange", this.getJson());
    }
  }

  getJson() {
    if (this.rootNode) {
      return JSON.parse(JSON.stringify(this.rootNode.value));
    }
    return null;
  }

  destroy() {
    if (this.isDestroyed) return;

    clearTimeout(this.debounceTimer);
    this.debounceTimer = null;
    clearTimeout(this.searchTimer);
    this.searchTimer = null;
    clearTimeout(this.highlightTimer);
    this.highlightTimer = null;

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    this.pointers.clear();
    this.pinchState = null;
    this.searchMatches = [];

    this.domEventListeners.forEach(
      ({ target, event, handler, options }) => {
        target.removeEventListener(event, handler, options);
      }
    );
    this.domEventListeners = [];

    // Clear content
    this.container.innerHTML = "";

    // Clear references
    if (this.container.SWU === this) {
      delete this.container.SWU;
    }
    this.rootNode = null;
    this.eventListeners = {};
    this.history = [];
    this.historyIndex = -1;
    this.isDestroyed = true;
  }

  // Event emitter
  on(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);

    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (!this.eventListeners[event]) return;

    if (!callback) {
      delete this.eventListeners[event];
      return;
    }

    this.eventListeners[event] = this.eventListeners[event].filter(
      (listener) => listener !== callback
    );

    if (this.eventListeners[event].length === 0) {
      delete this.eventListeners[event];
    }
  }

  emit(event, data) {
    if (this.eventListeners[event]) {
      [...this.eventListeners[event]].forEach((callback) => {
        try {
          callback(data);
        } catch (e) {
          console.error(`SWU: error in "${event}" listener:`, e);
        }
      });
    }
  }
}

// Auto-initialize declarative instances
if (typeof document !== "undefined") {
  const initDeclarative = () => {
    document.querySelectorAll("[data-swu]").forEach((el) => {
      if (!el.SWU) {
        el.SWU = new SWU(el);
      }
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDeclarative);
  } else {
    initDeclarative();
  }
}

export default SWU;
