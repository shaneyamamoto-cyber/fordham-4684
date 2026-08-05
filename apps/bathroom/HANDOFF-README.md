# Handoff: AI-Constrained Bathroom Planner

## Overview
A measured bathroom design tool built to stop AI image generators from drifting off the actual floor plan. It has four parts: a 2D multi-view elevation editor (locks geometry, edits materials/fittings), a 3D model viewer (renders the same geometry, exports OBJ/GLB), a materials "Look Book" (59 real material cutouts + hardware icon reference), and a Fixture Options combo picker (41 fixture/finish choices across 5 categories). The workflow: lock a version in the planner → screenshot the 3D view as a "plate" → hand that plate plus the JSON specs to an image generator (GPT, Nano Banana, etc.) with instructions that it may only change light/material, never geometry.

## About the Design Files
The files in `design-files/` are **design references built as HTML/JS prototypes** — they demonstrate the intended layout, interactions, and constraint system, not production code to copy verbatim. The task is to **recreate this tool in the target codebase's stack** (React, Vue, native, whatever the project already uses — or the best fit if starting fresh), reusing this repo's structure, data model, and interaction logic as the source of truth.

## Fidelity
**High-fidelity.** All geometry in `reference/design-spec.json` is exact (inches, real offsets), all colors/materials in the palette are final, and the interaction patterns (drag, undo/redo, grouping, locking, versioning) are the intended final behavior — not placeholders.

## Screens / Views

### 1. Elevation Planner (`Elevation Planner.dc.html`)
**Purpose:** Edit the bathroom's shell, fittings, and materials in measured 2D elevation views; lock versions for downstream use.
- **Views:** front, side, tub-end, and plan (top-down) — switchable, all driven off one shared geometry state.
- **Shell:** 7 walls (bay_back, step_return, vanity, end_left, end_right, slope, ceiling), an L-shaped polygon, dormer bay — all vertices editable.
- **Fittings (drag, resize where applicable):** tub (60"×32", rim 20" AFF, tiled end cap), vessel sink (23.6" wide, offset left), vanity (36"×20", underside 9" AFF), storage tower (6 bays: door/drawer/void/drawer/void/door), 3 floating shelves w/ LED, recessed lit niche, toilet, shower zone + glass panel, rainhead, mixer/diverter, tub spout (cyclable flange/gooseneck/deck), 2 towel bars, hand towel ring, wall-mounted taps (spout + 2 cross handles), stadium mirror, 2 vertical sconces, splash panel, baseboard, door + casing.
- **Interaction:** pointer-drag move/resize with live inch readout, multi-select + group, lock (prevents accidental edit), undo/redo history stack.
- **Materials system:** birds-eye key-plan with clickable chips — 8 tile colorways, 8 wood species, 7 metal finishes; a wall "dock" opens per-zone (shower back, step return, vanity, left/right end, shelf wall) for independent paint/tile/stone assignment. Tile pattern options: running bond, chevron, herringbone, stack, brick, hex, penny, large-format, subway, third-offset plank. Materials are treatments layered on top of structure — they fill the voids left by cabinets/tubs/toilets and never continue behind them.
- **Fitting dock:** 460px panel, per-item metal-finish/wood-species override toggle, ICONS button opens a 30-item reference browser of uploaded hardware photos.
- **Versioning panel:** name + lock a version (two-step confirm to overwrite/delete), autosave of in-progress edits, a "current" indicator badge. Storage: `localStorage["bathPlanner.v1"]` (locked versions + current pointer) and `localStorage["bathPlanner.work.v1"]` (live unsaved edits).

### 2. Bathroom 3D (`Bathroom 3D.html`)
**Purpose:** Render the locked (not working) geometry as a real 3D model; produce the "plate" screenshot and 3D export for handoff to image generation.
- Reads whichever locked version matches the planner's `current` pointer (falls back to most recent).
- 66+ named three.js meshes: tile grids, walnut surfaces, teak mirror frame, lit drawer voids, LED strips.
- OrbitControls for framing the plate; toolbar exports the shown model as **OBJ+MTL** or **GLB**.
- Step-return pier auto-hides when the camera is outside the bay so it doesn't block the tap-wall view.

### 3. Look Book (`Look Book.dc.html`)
**Purpose:** Browse the material and hardware library independent of the plan.
- 59 real material cutouts (tile, wood, metal, mirror, textile categories) with a manifest.
- Hardware icon set (taps, spouts, handles, showerheads, towel bars, sconces, mirrors) rendered as real shaped silhouettes, not generic glyphs.

### 4. Fixture Options (`Fixture Options.html`)
**Purpose:** Combo-pick a fixture/finish package independent of the 2D/3D geometry tools.
- Sticky top bar with 5 dropdowns (toilet, mirror, tap, showerhead, lighting), 41 total options.
- Selection currently lives only in this file — **not yet wired into the planner or 3D model** (see Open Items).

## Interactions & Behavior
- **Drag:** pointer-capture based; move updates x/y/dep live, resize handles adjust w/h with the same readout.
- **Undo/redo:** full history snapshot stack, keyboard shortcuts.
- **Grouping/locking:** selected fittings can be grouped (move together) or locked (excluded from drag/selection).
- **Version lock:** two-step confirm before overwrite or delete, to prevent accidental loss.
- **Wall dock:** click a wall zone in the birds-eye key plan to open its material controls; each zone is fully independent.
- **Hardware icon cycling:** spout style (flange/gooseneck/widespread for taps; wall/gooseneck/deck for tub spout) cycles independently per item.
- **3D pier auto-hide:** driven by camera-position polling against the bay bounds, not a click toggle.

## State Management
- **Planner state:** shell polygon + wall list, fittings array (each with id/x/y/w/h/dep/face plus type-specific fields), surfaces map (per-zone finish/color/pattern), per-item metal/wood overrides, selection/group/lock state, undo/redo stack, versions array + current pointer.
- **Persistence:** `localStorage` only, two keys as above. No backend.
- **3D state:** derives its whole scene from the planner's locked version data (`design-spec.json` schema) — no separate source of truth.
- **Fixture Options state:** local to that file (5 dropdown selections) — needs a shared store or URL/localStorage bridge to reach the planner and 3D model.

## Design Tokens
See `reference/design-spec.json → palette` for exact hex values (walnut, brass, copper, greenStone, floorStone, mineralGreen, sanitary white, trim, landingStone) and `materialLibrary` for the 10 base tile/wood/stone treatments (name, finish type, color, tile dimensions, shape, pattern). Typography: IBM Plex Mono for all UI labels/readouts, small sizes (9–10px) with wide letter-spacing, uppercase — a technical/drafting aesthetic, not a consumer app. Background: warm off-white (`#faf9f5`/`#fbfaf7`), ink text (`#23231f` at various opacities), no color beyond the material palette itself.

## Assets
- 59 material cutout photos in `design-files/materials/{tile,tiles,wood,metal,mirror,textile,furniture}/` + `_src/`.
- `design-files/materials/hardware-icon-library.js` — vector silhouette defs for hardware icons.
- `design-files/three-d-stage.js` — shared 3D viewer/exporter shell (three.js: OrbitControls, OBJ/GLTF exporters).
- `reference/render-original.png`, `reference/render-plate.png` — reference photos used to derive the original geometry.
- `reference/render-brief.md` — the original brief describing the target room.

## Geometry Contract (read before touching layout)
This is the core IP of the tool — reproduce it exactly in the new codebase:
- `reference/design-spec.json` — full measured model in inches (shell polygon, every fitting's x/y/w/h/dep/face, surfaces, palette, material library). `x` runs along the 169" wall run, `y` is height AFF, `dep` is projection into the room, `face` picks which wall plane (0 = vanity wall, 14.5 = recessed bay).
- `reference/CONSTRAINTS.json` — the hard rules a render must satisfy (exact dimensions/offsets, tolerances, forbidden changes) plus what the generator IS allowed to own (light, material response, atmosphere).
- `reference/AI-SYSTEM-PROMPT.md` — ready-to-use system prompt for image-gen handoff.
- `reference/image-gen-playbook.md` — the plate → generate → validate → patch-log workflow.
- Fourteen `keyRelationships` in design-spec.json are the load-bearing facts (e.g. basin offset left not centred, mirror centred on splash not on basin, one metal throughout, baseboard continues under the vanity) — these are the details most likely to be silently "corrected" by an unconstrained rebuild. Don't let a developer "fix" them.

## Construction-use disclaimer
This package targets **AI-assisted floor plans and photoreal renders for design
review**, not stamped construction documents. `design-spec.json` dimensions are
schematic design intent; before building, a licensed architect/designer must
produce real construction drawings and a finish schedule (manufacturer, SKU,
waterproofing, blocking, code-compliant clearances, rough-in locations). See
`reference/materials-guide.md` for how the material references map to real
photographic swatches and expected render appearance.

## Open Items / Known Gaps
1. Fixture Options selections are not yet wired into the planner or 3D model — needs a shared state bridge.
2. Wall dock needs zone-start/zone-end controls (top/bottom of a zone) — only ZONE START exists today.
3. 3D model uses drawn/procedural fills for tile and wood, not photographic textures — real texture mapping is still open.
4. Schluter edge-trim finish options (black nickel/steel/brass/white/brown/gold/rose gold) are not yet embedded as a finish choice.
5. Version history has been pruned to a single current version per session — if multi-version comparison is wanted in the rebuild, decide on a retention policy (this prototype was keeping every locked save indefinitely, which grew unbounded).

## Files
```
design-files/
  Elevation Planner.dc.html   2D multi-view editor (shell, fittings, materials, versions)
  Bathroom 3D.html             three.js model viewer + OBJ/GLB export
  Look Book.dc.html            material + hardware reference browser
  Fixture Options.html         41-option fixture/finish combo picker
  support.js                   shared runtime the planner depends on
  three-d-stage.js             shared 3D viewer/exporter component
  materials/                   59 material cutouts + hardware icon library
reference/
  design-spec.json             measured geometry model (source of truth)
  CONSTRAINTS.json              hard rules + tolerances for AI render validation
  AI-SYSTEM-PROMPT.md          system prompt for image-gen handoff
  image-gen-playbook.md        plate → generate → validate workflow
  materials-guide.md           swatch → real reference photo → expected render appearance
  render-brief.md              original design brief
  render-original.png / render-plate.png   reference photos
screenshots/
  01-elevation-planner.png, 02-bathroom-3d.png, 03-look-book.png, 04-fixture-options.png
```
