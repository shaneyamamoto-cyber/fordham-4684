# YamaZina Design Platform

One platform, independent projects. Each project pairs a **quick, accurate 2D measured
planner** with a **technical 3D build** of the same design — both views read and write one
shared design state through the platform core, so an edit in either view *is* the design.

Two projects ship today, each an independent load:

| Project | 2D | 3D | Status |
|---|---|---|---|
| **Sauna — YamaZina Mark 5** (`apps/sauna/`) | `plan.html` — measured plan + elevation sheet | `index.html` — full parametric build | **Harmonized** — both views share live design state |
| **Bathroom — AI-constrained planner** (`apps/bathroom/`) | `planner.html` — multi-view elevation editor | `3d.html` — locked-version model + OBJ/GLB export | Ported intact; platform-store harmonization on the roadmap |

## Running it

No build step. Serve the repo root with any static file server and open `index.html`:

```sh
python3 -m http.server 8000
# → http://localhost:8000/
```

- The **sauna** project is fully self-contained (three.js, textures and models are vendored
  in-repo) and runs offline.
- The **bathroom** planner/look book load React via the dc-runtime from unpkg, and the 3D
  viewer loads three.js 0.184 from unpkg — those pages need internet access until the deps
  are vendored (see roadmap in `docs/ARCHITECTURE.md`).

## How the 2D↔3D harmonization works (sauna)

```
plan.html (2D sheet)  ──save──▶  yamazina.sauna.work.v1  ◀──save──  index.html (3D build)
        ▲                          (localStorage, via                     ▲
        └────────── storage event ──  platform store) ── storage event ──┘
```

- The 3D build already owns a complete serializable design state
  (`getDesignState()` / `applyDesignState()`): benches, door, heater, window, tones,
  lighting, fixtures, notes.
- The 2D sheet edits a *subset* of that state (geometry: window, door, heater, bench runs)
  and merges it into the full object — 3D-only fields pass through untouched.
- The 3D applies incoming state **through its real setters, which re-clamp against the full
  build-rule set** (roofline, door clearances, standoff bands). The 2D can afford to be loose;
  the 3D is authoritative.
- Both views sync live across open tabs via `storage` events, and on load via the work slot.

## Repository layout

```
index.html                  Platform launcher (project picker)
platform/
  core/store.js             Namespaced per-project persistence: versions + shared work state
  core/design-core.js       Shared budget ledger + three.js instancing helper
  vendor/                   three.js UMD build, post-fx passes, OBJ/MTL loaders (offline)
apps/
  sauna/
    index.html              3D build (de-embedded from the Mark 5 single-file prototype)
    plan.html               2D measured plan/elevation editor — NEW, harmonized with the 3D
    spec.js                 Parametric room contract shared by both views
    app.js / ui.js /        3D scene, sidebar/markup/versions UI, 2D↔3D sync bridge
    sync.js
    assets/                 Embedded textures + OBJ models extracted to data files
  bathroom/
    index.html              Project hub
    planner.html            2D elevation planner   (was "Elevation Planner.dc.html")
    3d.html                 3D viewer + export     (was "Bathroom 3D.html")
    lookbook.html           Material/hardware book (was "Look Book.dc.html")
    fixtures.html           Fixture combo picker   (was "Fixture Options.html")
    support.js              dc-runtime the planner/look book run on
    three-d-stage.js        Shared 3D stage web component (OrbitControls + exporters)
    materials/              59 material cutouts + hardware icon library
    reference/              design-spec.json, CONSTRAINTS.json, AI prompts, playbook
    HANDOFF-README.md       Original Claude Design handoff document
docs/ARCHITECTURE.md        Platform model, state contracts, harmonization roadmap
```

## Storage keys

All projects persist through `platform/core/store.js` under namespaced keys:

- `yamazina.<project>.versions.v1` — named saves (the Versions panel)
- `yamazina.<project>.work.v1` — live work state (the 2D↔3D channel)

Legacy keys from the standalone prototypes (`sauna3d_versions_v1`) are migrated in place on
first load. The bathroom suite still uses its original `bathPlanner.v1` keys internally —
moving it onto the platform store is a roadmap item.

## Construction-use disclaimer

Both projects target **design review and AI-assisted rendering**, not stamped construction
documents. Dimensions are schematic design intent; a licensed architect/designer must produce
real construction drawings before building.
