---
name: senangwebs-unfold
description: Interactive flowchart-style JSON visualization and editor with two-way sync between graph view and raw text, pan/zoom, and theming.
version: 1.0.3
package: senangwebs-unfold
---

# SenangWebs Unfold (SWU)

## Quick Reference

- **Purpose**: Visual JSON explorer/editor with graph view and raw text synchronization
- **Entry**: `dist/swu.js`
- **Dependencies**: none
- **Scripts**: `npm run build`, `npm run dev`, `npm run test`

## Workflow

Start in `C:\wamp64\www\sw-libraries\senangwebs-unfold`. Read `README.md`, `package.json`, and touched source files. Match existing patterns, CSS prefix `swu-`.

## HTML Data Attributes

| Attribute | Values |
|---|---|
| `data-swu` | Container flag |
| `data-swu-canvas-background` | CSS color |
| `data-swu-accent-color` | UI accent color (hex) |
| `data-swu-theme` | `"light"` or `"dark"` |
| `data-swu-direction` | `"horizontal"` or `"vertical"` |

## JavaScript API

```js
const unfold = new SWU(container, {
  json: { key: 'value' },   // initial JSON object
  canvasBackground: '#fff',
  accentColor: '#4F46E5',
  theme: 'light',           // or 'dark'
  direction: 'horizontal'   // or 'vertical'
})

unfold.render()    // render/re-render graph
unfold.getJson()   // get current JSON state
unfold.destroy()   // cleanup; safe to call more than once
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
- `onError(error)` — fired on invalid JSON

## Focus Areas

- JSON parsing and recursive node graph generation
- Two-way sync: edit in graph → raw text updates; edit raw text → graph re-renders
- In-place editing: click key or value to edit, Enter/click-away to commit
- Color-coded data types: keys=pink, strings=green, numbers=blue, booleans=orange, null=gray
- Pan & zoom: drag to pan, scroll to zoom
- State preservation: remembers expanded/collapsed nodes across re-renders
- Light/dark theming
- Invalid JSON handling: show error state, don't crash
- Zero dependencies

## Implementation Guidance

- Preserve backward compatibility for all options, method names, and event names
- Handle deeply nested JSON (5+ levels) without performance issues
- Keep long-lived DOM listeners registered through `addDOMEventListener()` so `destroy()` can remove them
- Keep `destroy()` idempotent and clear pending debounce timers
- Test two-way sync with valid JSON values and report unsupported circular data clearly
- Verify color coding for all data types
- Verify mouse pan/zoom behavior in both layout directions

## Validation

```bash
npm run build
npm test
```
