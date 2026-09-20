---
name: senangwebs-unfold
description: Interactive flowchart-style JSON visualization and editor with two-way sync between graph view and raw text, add/delete/edit nodes, undo/redo, search, pan/zoom (mouse + touch), and theming.
version: 1.1.1
package: senangwebs-unfold
---

# SenangWebs Unfold (SWU)

## Quick Reference

- **Purpose**: Visual JSON explorer/editor with graph view and raw text synchronization
- **Entry**: `dist/swu.js`
- **Dependencies**: none (jsdom is a devDependency for tests only)
- **Scripts**: `npm run build`, `npm run dev`, `npm run test`

## Workflow

Start in `C:\wamp64\www\sw-libraries\senangwebs-unfold`. Read `README.md`, `package.json`, and touched source files. Match existing patterns, CSS prefix `swu-`.

## HTML Data Attributes

| Attribute | Values |
|---|---|
| `data-swu` | Container flag |
| `data-swu-json` | JSON string; initial data (JS option > attribute > inline script) |
| `data-swu-canvas-background` | CSS color |
| `data-swu-accent-color` | UI accent color (hex) |
| `data-swu-theme` | `"light"` or `"dark"` |
| `data-swu-direction` | `"horizontal"` or `"vertical"` |

Initial JSON can also come from a `<script type="application/json">` child.

## JavaScript API

```js
const unfold = new SWU(container, {
  json: { key: 'value' },   // initial JSON object (or JSON string)
  canvasBackground: '#fff',
  accentColor: '#4F46E5',
  theme: 'light',           // or 'dark'; omit for prefers-color-scheme
  direction: 'horizontal',  // or 'vertical'
  readOnly: false,          // view-only embed, hides text pane + editing
  autoTheme: true,          // follow prefers-color-scheme when theme unset
  autoFit: false,           // fit view on container resize
  icons: true,              // SenangStart Icons (auto-loads ss-icon script)
  iconScriptUrl: '...',     // custom SenangStart Icons script URL
})

unfold.render(json?)   // render/re-render graph; no arg = re-layout
unfold.getJson()       // deep clone of current JSON state
unfold.undo() / .redo()
unfold.expandAll(maxDepth?) / .collapseAll()
unfold.search(query)   // find + jump to key/value match
unfold.zoomIn() / .zoomOut() / .resetView() / .fitToView()
unfold.destroy()       // cleanup; safe to call more than once
```

### Events

```js
const unsubscribe = unfold.on('onChange', (json) => {
  console.log(json)
})

unsubscribe()
// Or: unfold.off('onChange', callback)
// Or: unfold.off('onChange') to remove all listeners for that event
```

- `onChange(json)` — fired when graph or text is edited
- `onError(error)` — fired on invalid JSON (inline error shown, no alert)
- `onNodeExpand(node)` / `onNodeCollapse(node)`
- `onNodeEdit({ path, oldValue, newValue })`
- `onKeyRename({ path, oldKey, newKey })`

## Focus Areas

- JSON parsing and recursive node graph generation
- Two-way sync: edit in graph → raw text updates; edit raw text → graph re-renders
- In-place editing: dblclick (or double-tap) key or value to edit, Enter/click-away to commit, Escape cancels
- Add/delete: hover controls `+` (add property/item) and `×` (delete) on nodes
- Undo/redo history (max 50 snapshots), pushed on every committed mutation
- Search over raw data with path auto-expansion and highlight
- Color-coded data types: keys=pink, strings=green, numbers=blue, booleans=orange, null/objects=gray
- Pan & zoom: pointer events (mouse/touch/pen), pinch-to-zoom, wheel zoom with smooth delta
- State preservation: remembers expanded/collapsed nodes across re-renders (root starts expanded)
- Light/dark theming + auto theme via prefers-color-scheme
- Icons: [SenangStart Icons](https://bookklik-technologies.github.io/senangstart-icons/) via `<ss-icon icon="slug">` web component, auto-loaded once (`SWU._iconScriptRequested` guard) from unpkg unless `icons: false`. Every icon button carries a `.swu-icon-fallback` text glyph shown via CSS `ss-icon:not(:defined) ~ .swu-icon-fallback` when the library is unavailable, so the UI works offline
- Invalid JSON handling: `onError` event + inline error text, never alert()
- Read-only mode via `readOnly: true`
- Zero runtime dependencies

## Implementation Guidance

- Preserve backward compatibility for all options, method names, and event names
- Handle deeply nested JSON (5+ levels) without performance issues
- Node interactions (click/dblclick) use event delegation on the nodes container; node elements carry `_swuNode` back-references — do NOT attach per-node listeners
- Layout is two-pass: draw → measure (`offsetWidth/Height` → `measuredWidth/measuredHeight`) → re-layout. Use `getNodeWidth()/getNodeHeight()` helpers, never raw constants
- Safe key assignment for `__proto__`/`constructor`/`prototype` goes through `setObjectKey()` (defineProperty) — never plain assignment for those keys
- Node paths join with `"\u0000"` so keys containing `.` don't collide; root collapsed state is tracked via the `"__swu_root_collapsed__"` marker
- Keep long-lived DOM listeners registered through `addDOMEventListener()` so `destroy()` can remove them
- Keep `destroy()` idempotent, clear pending debounce/search/highlight timers, disconnect the ResizeObserver, and delete `container.SWU`
- Guard `this.textarea` — it is `null` in read-only mode
- New icon buttons go through `buildIconHTML(name, fallback)` (template strings) or `buildIconElement(name, fallback)` (DOM) — always pass a text fallback glyph
- Test two-way sync with valid JSON values and report unsupported circular data clearly
- Verify color coding for all data types
- Verify mouse pan/zoom behavior in both layout directions

## Validation

```bash
npm run build
npm test   # 46 jsdom tests under tests/cases/
```
