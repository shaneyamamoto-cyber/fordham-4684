# Platform Architecture

## The idea

Two prototypes proved two different strengths:

- The **bathroom Elevation Planner** (Claude Design export) proved the 2D editing model —
  fast, measured, drag-with-inch-readouts, undo/redo, versions. Quick and accurate.
- The **YamaZina sauna Mark 5** (single-file export) proved the 3D building model — real
  construction logic (finish build-ups, roofline math, clearance bands, bench rules),
  photographic textures, budget ledger, exportable state.

The platform merges the *approaches*, not the codebases: every project gets both a 2D
measured sheet and a technical 3D build, driven by **one design state per project** owned by
the platform store. Projects stay independent loads — there is no shared router or SPA shell,
just shared services.

## Platform services (`platform/`)

### `core/store.js` — persistence + the harmonization channel

Per-project namespaced localStorage with two slots:

| Slot | Key | Meaning |
|---|---|---|
| versions | `yamazina.<project>.versions.v1` | Named, deliberate saves |
| work | `yamazina.<project>.work.v1` | Live design state, autosaved while editing |

The work slot is the 2D↔3D contract. Envelope: `{state, savedAt, by}` — `by` ('2d' / '3d')
lets a view ignore echoes of its own writes. `onWorkChange(cb)` wraps the `storage` event for
live cross-tab sync. Legacy prototype keys are migrated on first construction
(`sauna3d_versions_v1` → platform keys).

### `core/design-core.js` — shared project library

Extracted verbatim from the sauna prototype, where it was already written as a
platform-neutral library:

- **Budget engine** (`window.Budget`) — category ledger, recompute-on-demand, CSV export.
- **`CoreHelpers.buildInstanced`** — batches identical-geometry placements into one
  `THREE.InstancedMesh` (the proven fix for mobile mesh-count limits).

### `vendor/` — offline three.js stack

`three.min.js` (UMD build the sauna was written against), `three-postfx.js`
(EffectComposer/UnrealBloom passes), `objloader.js`, `mtlloader.js`. All extracted from the
sauna monolith so any project can build a self-contained 3D view.

## The sauna: reference implementation of harmonization

```
apps/sauna/
  spec.js      the parametric room contract (finished-interior dims, roofline function,
               bench seat rules, window bounds) — loaded by BOTH views. Also exports
               window.SAUNA_SPEC for consumers that want the values without the globals.
  app.js       3D scene. Owns getDesignState()/applyDesignState() — the complete
               serializable design. All geometry edits go through window.set* setters
               that clamp against the real build rules.
  ui.js        Sidebar, markup, click-to-edit, versions panel (now on PlatformStore).
  sync.js      The bridge: applies the work slot on boot, autosaves on change (1.5s
               poll-and-diff), applies incoming cross-tab writes live.
  plan.html    2D measured sheet (vanilla SVG, no dependencies). Edits the geometry
               subset of the design state: window (drag + resize in elevation), door,
               heater (drag in plan), bench runs. Merges into the full state object so
               3D-only fields (lighting, tones, notes, fixtures) survive round-trips.
```

**Authority model:** the 2D sheet clamps loosely; the 3D applies everything through its real
setters which re-clamp against the full rule set (roofline-aware window ranges, door/heater
clearance, 6–12" standoff band, bench minimums). Verified end-to-end: a 2D heater drag into
an illegal position lands in the 3D at the nearest legal position, and the corrected value
syncs back to the 2D sheet via the storage event.

**Why poll-and-diff instead of hooking every setter:** the 3D app has ~40 setters; hooking
each is invasive and brittle. `getDesignState()` is a cheap plain-object walk, so a 1.5s
diff-gated autosave gets the same result with one integration point.

## The bathroom: ported intact, harmonization staged

The suite runs as exported (dc-runtime/React for the planner and look book, three.js 0.184
module build for the 3D stage). Its geometry contract — `reference/design-spec.json`, the
fourteen `keyRelationships`, `CONSTRAINTS.json` — is the source of truth and must survive any
refactor (see `HANDOFF-README.md`, "Geometry Contract").

## Roadmap

1. **Vendor the bathroom deps** — React 18 UMD + Babel standalone (dc-runtime) and
   three 0.184 module build into `platform/vendor/`, so both projects run offline.
2. **Bathroom onto PlatformStore** — swap its internal `bathPlanner.v1` /
   `bathPlanner.work.v1` keys for `PlatformStore('bathroom')` (with legacy migration, same
   pattern as the sauna), giving it the same versions/work contract.
3. **Bathroom 3D live-sync** — today the 3D reads the *locked* version on load. Add a
   `sync.js`-style bridge so the working layout previews in 3D without locking.
4. **Grow the sauna 2D sheet** — deck/stair, floor hole, landing size, fixture positions
   (bucket/stool/thermometer), and a second elevation (LW1 door wall). The state contract
   already carries all of it; it's drawing work, not architecture work.
5. **Unify the 2D editor engine** — extract the bathroom planner's interaction core
   (drag/resize with readouts, multi-select, group/lock, history) into
   `platform/editor2d/` and rebase both 2D sheets on it. This is the "one harmonized 2D
   planner" end state; the sauna sheet's vanilla-SVG approach is the seed.
6. **Photographic textures in bathroom 3D** — reuse the sauna's embedded-texture pipeline
   (`assets/textures.js` data files + repeat-per-board math) for the bathroom's tile/wood.
7. **Fixture Options bridge** — wire the bathroom fixture picker's 5 selections into the
   planner + 3D via the shared work state (open item #1 from the handoff).
8. **Budget for bathroom** — populate `window.Budget` from the bathroom design spec, same
   recompute-on-demand pattern as `computeBudget()` in the sauna.
9. **Version retention policy** — the store keeps every named save; add pruning/compare UI
   (open item #5 from the handoff).

## Testing

Headless Chromium (Playwright) against `python3 -m http.server`:

- Sauna 3D renders the full scene with no console errors (WebGL via SwiftShader).
- Sauna 2D sheet renders plan + elevation, sliders and drags update dims live.
- Round-trip: 2D slider edits → work slot (`by:'2d'`) → fresh 3D boot applies + re-clamps →
  3D edit → work slot (`by:'3d'`) → open 2D tab re-renders via storage event.
- Bathroom pages are CDN-dependent and need a networked browser for full render testing.
