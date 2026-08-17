# Fordham 4684 — AI Handoff Brief

A one-page brief for handing this project to another AI (e.g. Google AI Studio /
Gemini). Paste this whole file in first, then attach the source files listed
under **What to give the AI**, then prompt it with the **Change / deficiency
log** below.

---

## 1. What this project is

A browser-based **home fit-out planner** for the upstairs bathroom + a standalone
shower enclosure. Pure static HTML/JS (no build step, no framework runtime); 3D
is **three.js r0.184** (vendored locally in `platform/vendor/`). One GitHub-Pages
origin so every tool shares one browser localStorage ("house store").

**Live site:** https://shaneyamamoto-cyber.github.io/fordham-4684/
- Studio (all rooms): `/studio.html`
- Shower 3D: `/apps/shower/index.html`
- Bathroom 3D: `/apps/bathroom/3d.html`
- Bathroom elevation planner: `/apps/bathroom/planner.html`

**Repo / branch:** `shaneyamamoto-cyber/fordham-4684`, branch
`claude/floor-sauna-planner-merge-d6g9r7` (this is the repo's default branch;
pushes auto-deploy to Pages).

## 2. Where the code lives (the parts that matter)

| Area | File | Notes |
|---|---|---|
| Shower 3D + build/tile UI | `apps/shower/app.js` | ~2.5k lines. Procedural tile engine (`buildTexture`), fixtures registry, cove ceiling (`buildCeiling`, `COVE`), lights + `applyDim`, `VIEWS`. |
| Shower shell/page | `apps/shower/index.html` | View buttons, tabs (Spec/Tile/Build). |
| Bathroom 3D | `apps/bathroom/3d.html` | Procedural tile textures (`procTileTexture`), per-wall zones, fitting builders (`HW3D`), wood grain, `dressMesh` (photographic PBR). |
| Bathroom 3D stage | `apps/bathroom/three-d-stage.js` | three.js `<three-d-stage>` web component; renderer, bloom composer (multisample HDR target), camera persistence. |
| Bathroom elevation planner | `apps/bathroom/planner.html` | 2D editor; `FITTINGS` catalog, surface picker, work-slot autosave. |
| Bathroom canonical design | `apps/bathroom/baseline.js` | `BATHROOM_BASELINE` — shell, surfaces, fittings, tones. |
| Shared material library | `platform/materials/manifest.js` | Photographic tile/stone/wood textures (`MATERIAL_LIBRARY`, `matchSurf`, `byId`). |
| Look Book (sample book) | `window.LB4684` (in shower) | Exact 4684 colours + PBR sample-book materials. |
| Platform store | `platform/core/store.js` | Namespaced localStorage (`yamazina.*`), work-slot sync, versions. |
| AI render prompt | `platform/core/ai-prompt.js` | The "+ AI RENDER PROMPT" button — emits a text prompt describing the design for an image AI. |

## 3. Built-in exports (use these to feed another AI)

Every planner already has export buttons meant for this:
- **`+ AI RENDER PROMPT`** — copies a detailed natural-language description of the
  current design → paste into Gemini/Imagen for a photoreal render.
- **`EXPORT VIEW + SPEC`** — a screenshot + the spec (bathroom 3D).
- **`SPEC SHEET` / `COPY SPEC`** — full text spec incl. a restore string (shower).
- **`LOAD PLAN JSON` / restore string** — the machine-readable design state.

## 4. How to hand it to Google AI Studio (Gemini)

1. **New chat, Gemini 2.5 Pro** (large context window handles the codebase).
2. Paste **this file** as the first message.
3. **Attach the source files** from the table above (drag them in, or paste the
   ones relevant to the task). For a full continuation, attach: `apps/shower/app.js`,
   `apps/bathroom/3d.html`, `apps/bathroom/three-d-stage.js`,
   `apps/bathroom/planner.html`, `apps/bathroom/baseline.js`,
   `platform/materials/manifest.js`, `platform/core/store.js`.
4. **Prompt it with the change log in §5** — e.g. "Here is my deficiency log.
   Work through the OPEN items; for each, tell me the file + function to change
   and give me the edit."
5. **For renders instead of code:** click `+ AI RENDER PROMPT` in the app, paste
   that text into AI Studio with an image model, and attach an `EXPORT VIEW`
   screenshot as the reference image.

---

## 5. Change / deficiency log — last 5 days (2026-08-10 → 08-14)

Grouped by area. ✅ = done & deployed. ⚠︎ = open / needs confirmation.

### A. Bathroom — material system & 3D render
- ✅ Materials did nothing in 3D when changed → reworked to **colour-true
  procedural tiles** (exact colour/size/pattern/grout), real per-wall zones.
- ✅ Separate the **shelf wall** from the shower tile; removed non-working
  quick-material palettes.
- ✅ Vanity wall / end walls / dormer wouldn't change tile colour → wired into
  the texture pass with paint defaults.
- ✅ **Tile size & direction wrong** in 3D → fixed planar UVs (U horizontal, V
  vertical) so tiles match the elevation.
- ✅ Vanity **splash** wouldn't change tile/colour → now honors its own zone.
- ✅ **Wood type wouldn't change / looked flat** → casework driven by the wood-
  tone control with photographic grain (tinted).
- ✅ **Whole render low quality / pixelated** → composer now renders to a 4×
  multisample HDR target at full pixel ratio (antialiased); tiles got
  bump/veining/env depth.
- ✅ 2D↔3D side-by-side "didn't translate / nothing consistent" → verified live
  sync; **camera now persists across the live-reload** so it doesn't snap back.

### B. Bathroom — fittings & finishes
- ✅ Metal was **brushed gold, wanted change → then hot-pink → wanted brushed
  gold**: settled on warm brushed gold `#c9a35c` for ALL metal fittings.
- ✅ **Remove the sconces** (permanent).
- ✅ **Tap & tub spout were a mess** → rebuilt clean (squared vanity spout;
  smooth curved tub spout) and forced to one consistent gold.
- ✅ Option to turn the **two large vanity drawers into cupboard doors**.
- ✅ Add the **hand shower on a slide bar** (square Tenzo kit) on the tub/tap
  wall, locked.

### C. Shower — the round Tenzo Signature kit
- ✅ Add a **round hand shower on a slide bar** on the **tap wall**, with a
  **thermostatic valve that has black levers** (gold body).
- ✅ **Delete** the wall-mounted shower head and the body jets.
- ✅ Rain head stays a **ceiling post straight down** (locked), not a wall arm.

### D. Shower — dropped ceiling & lighting
- ✅ Add a **2–4″ drop ceiling** with a valance + LED strip ringing the ceiling.
- ✅ Couldn't see it → added a **"Ceiling" view** (looks up) + it's plannable in
  **Build ▸ Ceiling & light**.
- ✅ **Ambient dimmer** (Full / Soft / Dim / Night) — dims the room; cove keeps
  glowing.
- ✅ Panel **bigger / closer to the edge** (smaller reveal).
- ✅ **Concealed pelmet cove**: LED on the inside of the frame, hidden behind a
  **front fascia** so you see the warm glow, not the strip.

### E. Shower — tile / material picker
- ✅ **Custom tile size** (W×H) option.
- ✅ Use the **high-quality Look Book PBR textures at any/custom tile size**.
- ✅ **"Apply to all walls" broken with Look Book** → fixed (buttons moved out of
  the hidden grout section).
- ✅ **Too many near-identical colours** → de-duplicated the palette.

### F. Platform / planners (earlier in the window)
- ✅ Bathroom elevation planner rebuilt around one decoupled material picker;
  click-to-edit popup; click-a-wall; drag fittings; undo/redo; ¼″ snap guides.
- ✅ Look Book is the shared house material library; global house pick.
- ✅ Floor plans + spec schedules; contractor handoff export; House
  Save/Restore/Export/Import; per-area snapshots.
- ✅ GitHub Pages deploy (one URL for the whole house).

### ⚠︎ Open / to confirm (good first tasks for the next AI)
- ⚠︎ **Custom shower enclosure size** (room W×D×H editable) — only custom *tile*
  size was done; enclosure dimensions are still fixed (51½ × 48 × 96).
- ⚠︎ **Bathroom drop ceiling + cove** — the concealed cove exists only in the
  shower; not yet added to the upstairs bathroom.
- ⚠︎ **Cove wash direction** — currently uplight; option to graze *down the wall*
  like the reference photo.
- ⚠︎ **Black-lever accents in the bathroom kit** — bathroom fittings are all gold;
  the black-lever look was only applied to the shower's Signature valve.
- ⚠︎ **Bathroom photographic tiles by default** — bathroom defaults to procedural
  tiles; could default the main walls/floor to the Look Book PBR for instant
  photoreal (dressMesh path already exists).

---
*Generated as a handoff aid. The git log on the branch is the authoritative
record of what changed and when.*
