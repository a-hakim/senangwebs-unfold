# SenangWebs Unfold (SWU)

An advanced, interactive JavaScript library for visualizing and editing JSON data as an interactive flowchart-style graph.

## Features

**Visual JSON Editing** - Interactive, flowchart-style representation of JSON data  
**Two-Way Sync** - Real-time synchronization between visual graph and raw JSON text  
**In-Place Editing** - Edit keys and values directly in the visual interface  
**Pan & Zoom** - Navigate large JSON structures with smooth pan and zoom controls  
**Zero Dependencies** - Pure vanilla JavaScript, no external libraries required  
**Theming Support** - Built-in light and dark themes with customizable colors  
**State Preservation** - Remembers which nodes are expanded across edits  
**Dual Initialization** - Use declarative HTML attributes or JavaScript API  

## Installation

### Via NPM (coming soon)
```bash
npm install senangwebs-unfold
```

### Manual Installation
1. Clone or download this repository
2. Run `npm install` to install dependencies
3. Run `npm run build` to generate the distribution files
4. Include the CSS and JS files in your HTML:

```html
<link rel="stylesheet" href="dist/swu.css">
<script src="dist/swu.js"></script>
```

## Quick Start

### Method 1: Declarative HTML

```html
<div data-swu 
    data-swu-canvas-background="#ededed" 
    data-swu-accent-color="#ff6600" 
    data-swu-theme="light">
    <div data-input-wrapper></div>
    <div data-swu-viewer-container></div>
</div>

<script src="dist/swu.js"></script>
```

The library will automatically initialize on page load.

### Method 2: JavaScript API

```html
<div id="demo"></div>

<script src="dist/swu.js"></script>
<script>
    const editor = new SWU(document.getElementById('demo'), {
       canvasBackground: '#f0f0f0',
       accentColor: '#9333ea',
       theme: 'light',
       json: {
          name: "My App",
          version: "1.0.0",
          features: ["editing", "visualization"]
       }
    });
</script>
```

## API Reference

### Constructor

```javascript
new SWU(containerElement, options)
```

**Parameters:**
- `containerElement` (HTMLElement) - The DOM element where SWU will be rendered
- `options` (Object) - Configuration options:
  - `json` (String | Object) - Initial JSON data
  - `inputJSON` (String | Object) - Alias for `json`
  - `textarea` (HTMLTextAreaElement) - External textarea for two-way binding
  - `canvasBackground` (String) - Background color for the canvas (default: `#e9ecef`)
  - `accentColor` (String) - Accent color for UI elements (default: `#3b82f6`)
  - `theme` (String) - Theme: `'light'` or `'dark'` (default: `'light'`)

### Public Methods

#### `.render(json)`
Renders or updates the visualization with new JSON data.

```javascript
editor.render({ name: "New Data" });
```

#### `.getJson()`
Returns the current JSON data as a JavaScript object.

```javascript
const currentData = editor.getJson();
```

#### `.destroy()`
Cleans up all DOM elements and event listeners.

```javascript
editor.destroy();
```

### Events

#### `onChange`
Emitted when JSON data is modified through the UI.

```javascript
editor.on('onChange', (jsonData) => {
    console.log('Data changed:', jsonData);
});
```

#### `onError`
Emitted when invalid JSON is entered in the textarea.

```javascript
editor.on('onError', (error) => {
    console.error('JSON error:', error);
});
```

## Usage Guide

### Navigating the Graph

- **Pan**: Click and drag the background to move around
- **Zoom**: Use mouse wheel to zoom in/out
- **Unfold/Collapse**: Click on expandable nodes (Objects/Arrays) to toggle visibility

### Editing Data

- **Edit Values**: Double-click on any primitive value (string, number, boolean, null) to edit
- **Edit Keys**: Double-click on object keys to rename them (array indices cannot be edited)
- **Commit Changes**: Press `Enter` or click outside the input field
- **Cancel Edit**: Press `Escape` to cancel

### Data Types

The library automatically color-codes different data types:
- **Keys**: Pink/Rose
- **Strings**: Green
- **Numbers**: Blue
- **Booleans**: Orange
- **Null**: Gray

## Examples

See the included demo files:
- `demo-declarative.html` - Declarative HTML initialization
- `demo-api.html` - JavaScript API initialization
- `demo-dark.html` - Dark theme example

## Browser Support

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

## Building from Source

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Build for development with watch mode
npm run dev
```

The built files will be in the `dist/` directory:
- `dist/swu.js` - Main JavaScript bundle
- `dist/swu.css` - Stylesheet

## Architecture

SWU is built with:
- **Vanilla JavaScript** - No framework dependencies
- **CSS3** - Modern styling with CSS variables for theming
- **SVG** - Smooth Bézier curve connectors
- **Webpack** - Module bundling and optimization
- **Babel** - ES6+ transpilation for browser compatibility

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT License