# SenangWebs Unfold (SWU)

An advanced, interactive JavaScript library for visualizing and editing JSON data as an interactive flowchart-style graph.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE.md)
[![npm version](https://img.shields.io/npm/v/senangwebs-unfold.svg)](https://www.npmjs.com/package/senangwebs-unfold)

![SenangWebs Unfold Preview](https://raw.githubusercontent.com/a-hakim/senangwebs-unfold/master/swu_preview.png)

## Features

- **Visual JSON Editing** - Interactive, flowchart-style representation of JSON data
- **Two-Way Sync** - Real-time synchronization between visual graph and raw JSON text
- **Add / Delete / Edit** - Add properties and array items, delete nodes, edit keys and values in place
- **Undo / Redo** - Full history with `Ctrl/Cmd+Z` / `Ctrl/Cmd+Shift+Z`
- **Pan & Zoom** - Mouse, touch and pen: drag to pan, wheel to zoom, pinch on touch devices
- **View Toolbar** - Zoom in/out, reset, fit-to-view, expand/collapse all, and live search
- **Search** - Finds keys and values anywhere in the data, auto-expanding the path to the match
- **Theming Support** - Light and dark themes, optional auto theme via `prefers-color-scheme`
- **SenangStart Icons** - Toolbar and node actions use [SenangStart Icons](https://bookklik-technologies.github.io/senangstart-icons/), with automatic text-glyph fallback if the icon library is unavailable
- **Read-Only Mode** - Embed a pure visualization without the editor pane
- **State Preservation** - Remembers which nodes are expanded across edits
- **Dual Initialization** - Use declarative HTML attributes or the JavaScript API
- **Clean Teardown** - Removes DOM and library event listeners when an instance is destroyed
- **Zero Dependencies** - Pure vanilla JavaScript, no external libraries required

## Installation

### Via NPM

```bash
npm install senangwebs-unfold
```

### CDN

```html
<link
  rel="stylesheet"
  href="https://unpkg.com/senangwebs-unfold@latest/dist/swu.css"
/>
<script src="https://unpkg.com/senangwebs-unfold@latest/dist/swu.js"></script>
```

## Quick Start

### Method 1: Declarative HTML

```html
<div
  data-swu
  data-swu-canvas-background="#ededed"
  data-swu-accent-color="#ff6600"
  data-swu-theme="light"
  data-swu-direction="horizontal"
  data-swu-json='{"name": "My App"}'
>
  <div data-input-wrapper></div>
  <div data-swu-viewer-container></div>
</div>

<script src="https://unpkg.com/senangwebs-unfold@latest/dist/swu.js"></script>
```

The library will automatically initialize on page load. Initial data can also
be provided with an inline JSON script instead of the attribute:

```html
<div data-swu>
  <div data-input-wrapper></div>
  <div data-swu-viewer-container></div>
  <script type="application/json">{ "name": "My App" }</script>
</div>
```

Priority: JS API option > `data-swu-json` attribute > inline JSON script.

### Method 2: JavaScript API

```html
<div id="demo"></div>

<script src="https://unpkg.com/senangwebs-unfold@latest/dist/swu.js"></script>
<script>
  const editor = new SWU(document.getElementById("demo"), {
    canvasBackground: "#f0f0f0",
    accentColor: "#9333ea",
    theme: "light", // omit to follow prefers-color-scheme (autoTheme)
    direction: "horizontal",
    json: {
      name: "My App",
      version: "1.0.0",
      features: ["editing", "visualization"],
    },
  });
</script>
```

> The container (or `.swu-container` inner element) needs a defined height,
> e.g. `style="height: 500px"` or a flex/grid parent that provides one.

> **Icons:** SWU auto-loads the [SenangStart Icons](https://bookklik-technologies.github.io/senangstart-icons/)
> web component on first initialization. If you already include it yourself
> (`<script src="https://unpkg.com/@bookklik/senangstart-icons/dist/senangstart-icon.min.js"></script>`)
> it won't be loaded twice. If the script is unavailable, buttons automatically
> fall back to text glyphs — or pass `icons: false` to disable icon loading entirely.

## API Reference

### Constructor

```javascript
new SWU(containerElement, options);
```

**Parameters:**

- `containerElement` (HTMLElement) - The DOM element where SWU will be rendered
- `options` (Object) - Configuration options:
  - `json` (String | Object) - Initial JSON data
  - `inputJSON` (String | Object) - Alias for `json`
  - `textarea` (HTMLTextAreaElement) - External textarea for two-way binding
  - `canvasBackground` (String) - Background color for the canvas (default: `#e9ecef`)
  - `accentColor` (String) - Accent color for UI elements (default: `#3b82f6`)
  - `theme` (String) - Theme: `'light'` or `'dark'`. When omitted and `autoTheme` is not `false`, follows the OS `prefers-color-scheme`
  - `direction` (String) - Layout direction: `'horizontal'` (left-to-right) or `'vertical'` (top-to-bottom) (default: `'horizontal'`)
  - `readOnly` (Boolean) - Hide the JSON text pane and disable editing (default: `false`)
  - `autoTheme` (Boolean) - Follow `prefers-color-scheme` when `theme` is not set (default: `true`)
  - `autoFit` (Boolean) - Fit the graph to the viewer on container resize (default: `false`)
  - `icons` (Boolean) - Use [SenangStart Icons](https://bookklik-technologies.github.io/senangstart-icons/) for toolbar and node actions (default: `true`)
  - `iconScriptUrl` (String) - Custom URL for the SenangStart Icons script (default: `https://unpkg.com/@bookklik/senangstart-icons/dist/senangstart-icon.min.js`)

### Public Methods

#### `.render(json)`

Renders or updates the visualization with new JSON data. Called with no
argument it simply re-lays out the current data.

```javascript
editor.render({ name: "New Data" });
```

#### `.getJson()`

Returns a deep clone of the current JSON data as a JavaScript object.

```javascript
const currentData = editor.getJson();
```

#### `.undo()` / `.redo()`

Step backwards / forwards through the edit history (also bound to
`Ctrl/Cmd+Z` and `Ctrl/Cmd+Shift+Z` / `Ctrl/Cmd+Y`).

#### `.expandAll(maxDepth?)` / `.collapseAll()`

Expand every expandable node (optionally up to `maxDepth` levels) or collapse
everything.

#### `.search(query)`

Finds keys and primitive values containing the query (case-insensitive),
expands the path to the first match and highlights it. Press `Enter` in the
toolbar search box to cycle through matches.

#### `.zoomIn()` / `.zoomOut()` / `.resetView()` / `.fitToView()`

Programmatic view controls (also available as toolbar buttons).

#### `.destroy()`

Cleans up DOM elements, registered event listeners, and pending input updates.
Calling it more than once is safe. The instance reference is removed from the
container so it can be initialized again.

```javascript
editor.destroy();
```

### Events

Subscribe with `.on(event, callback)`. It returns an unsubscribe function:

```javascript
const unsubscribe = editor.on("onChange", (jsonData) => {
  console.log("Data changed:", jsonData);
});

unsubscribe();
```

You can also remove a specific callback, or all callbacks for an event, with `.off()`:

```javascript
editor.off("onChange", callback);
editor.off("onChange");
```

| Event | Payload | Description |
|---|---|---|
| `onChange` | `jsonData` | Emitted when JSON data is modified through the UI or the textarea |
| `onError` | `error` | Emitted when invalid JSON is entered |
| `onNodeExpand` | `node` | A node was expanded |
| `onNodeCollapse` | `node` | A node was collapsed |
| `onNodeEdit` | `{ path, oldValue, newValue }` | A value was edited in the graph |
| `onKeyRename` | `{ path, oldKey, newKey }` | A key was renamed in the graph |

## Usage Guide

### Navigating the Graph

- **Pan**: Click and drag the background (touch: one-finger drag)
- **Zoom**: Mouse wheel, pinch on touch devices, or the toolbar buttons
- **Unfold/Collapse**: Click on expandable nodes (Objects/Arrays) to toggle visibility
- **Keyboard**: `Tab` to focus a node, `Enter`/`Space` to toggle it, `Ctrl/Cmd+Z` to undo

### Editing Data

- **Edit Values**: Double-click (or double-tap) any primitive value
- **Edit Keys**: Double-click object keys to rename them (array indices cannot be edited)
- **Add**: Hover an object/array node and click `+` to add a property or item
- **Delete**: Hover a node and click `×` to remove it
- **Commit Changes**: Press `Enter` or click outside the input field
- **Cancel Edit**: Press `Escape` to cancel

### Data Types

The library automatically color-codes different data types:

- **Keys**: Pink/Rose
- **Strings**: Green
- **Numbers**: Blue
- **Booleans**: Orange
- **Null / Objects / Arrays**: Gray

## Examples

See the included demo files:

- `demo-declarative.html` - Declarative HTML initialization
- `demo-api.html` - JavaScript API initialization
- `demo-dark.html` - Dark theme example
- `demo-vertical.html` - Vertical direction (top-to-bottom) example

## Building from Source

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Build for development with watch mode
npm run dev

# Run the test suite (jsdom)
npm test
```

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT License
