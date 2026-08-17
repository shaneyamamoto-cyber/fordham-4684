# Room Program — ground-truth geometry & finishes

Exact room details for the three rooms, pulled from the canonical source
(`apps/bathroom/baseline.js`, `apps/shower/app.js`, `apps/sauna/spec.js`). These
are the **locked coordinates** to feed a structure-preserving render/inpainting
pipeline — the "ground truth" so a diffusion model can't move a drain or morph a
cabinet. All values in inches unless noted. Origin/axes per each app's comments.

> **Best export for another tool:** each 3D view can emit **OBJ/GLB** (geometry),
> **design.json** (state), and a **spec sheet** (text). The `+ AI RENDER PROMPT`
> button bundles prompt + design.json + OBJ + spec. Use the OBJ/GLB as the
> structural blueprint; use the numbers below to sanity-check placement.

---

## 1. Upstairs Bathroom  (`apps/bathroom/`)

**Shell** — L-shaped room. Wall run **169"**, depth to dormer **71"**, ceiling
**92"**, dormer slope run **32"** (front wall rakes to the slope; end walls cut
to the rake). Footprint polygon (x, depth): (0,14.5)(60.5,14.5)(60.5,0)(169,0)
(169,−56.5)(0,−56.5). Face 0 = vanity wall; face 14.5 = tub/tap (bay) wall.

**Surfaces (default finishes)**
| Zone | Finish | Colour | Tile | Pattern |
|---|---|---|---|---|
| Shower/tub wall (bay) | tile | `#9aa79b` sage | 48×24 | running bond |
| Vanity splash | stone | `#4a5442` dark green | 60×45 | stack |
| Main walls | paint | `#e8e3d8` | — | — |
| Floor | stone | `#bdb5a6` greige | 24×24 | offset |
| Dormer/shelf wall | paint | `#e8e3d8` | — | — |
| Wood casework tone | teak | (`woodTone`) | — | — |
| Metal fittings | brushed gold `#c9a35c` | — | — | — |

**Fixtures / millwork** (id · size WxHxD · position)
- `tub` — 32×20×60, x0, face 14.5 (back-left alcove, rim 20" AFF). *locked*
- `vanity` (`van`) — 36×19×12, x66.25, face 0, underside 9" AFF. *locked* — 2 large drawers left / 3 small right (or **cupboard-door** option on the left bank).
- `tower` — 16×84×14.5 storage tower, x44.5, face 14.5.
- `vessel` wall basin 22×4×13.8 @ x67.75; `stone` countertop 10×1.5×13.8 @ x91.5.
- `mir` mirror 32×21.5 (stadium), x68.75; `splash` panel 46×66, x61.25.
- `shelf` three floating shelves @ x32; `nichesh` lit niche 30×14, x6, recessed 4" (tap wall).
- `wc` toilet 16×29×26, right end wall.
- Plumbing (brushed gold): `rain` rainhead 10", x11 / `mixer` diverter x13 / `spout` tub spout x13 / `handbar` hand-shower on slide bar x24 (tap wall) / `ring` towel ring / `bar2`,`bar3` towel bars on the dormer wall.
- Door 30" RO @ x110.5; casing 35"; baseboard 4".
- Sconces: **removed** (permanent).

---

## 2. Downstairs Shower Room  (`apps/shower/`)

**Enclosure** — **51.5" W × 48" D × 96" H**. Glass front, top at **78"**; fixed
panel **22"**, hinged door **27.5"** (1.5" gap); curb **4" H × 4.5" W**.

**Fixtures**
- `rain` rain head — **ceiling post straight down** (locked), 12" round face, drop to 90" AFF. *Not a wall arm.*
- `valve` — thermostatic control on the tap (right) wall, 48" AFF; **rounded plate, 3 controls, BLACK lever accents**, gold body (Tenzo Signature).
- `bar` — **round hand shower on an adjustable slide bar** on the **tap wall** beside the valve (locked): brackets, holder w/ black clamp lever, round head, supply elbow + hose loop.
- `handle` door handle; `drain` round 4"; `niche` 26×15 @ 50" AFF (back wall).
- **Deleted:** wall-mounted shower head, body jets.

**Dropped ceiling + cove** (`COVE`) — floating panel dropped **3"** (2–4"),
perimeter **reveal 3"**, **concealed pelmet**: front fascia in the ceiling finish
hides a warm LED on the inside of the frame; LED colour 2700–4000K, brightness
Low/Med/High. **Ambient dimmer** (Full/Soft/Dim/Night) scales the room rig while
the cove keeps glowing. "Ceiling" camera view looks up at it.

**Surfaces** — floor Limestone Alba 2" hex mosaic; walls 12×24 running bond;
bench + curb; ceiling tile finish drives the dropped panel. **Bench:** corner,
back-left, 24" leg, seat 18.5". Metal: brushed gold.

**Tile picker** — colour collections (stone/deco/sauna/Palette 4684/Sample book),
**custom tile size (W×H)**, Look Book **PBR textures usable at any tile size**,
per-surface + "apply to all walls".

---

## 3. Sauna  (`apps/sauna/`)  — all values feet/inches as noted

**Shell** — raw exterior **10'4" W × 6'4" D**; back wall **9'6"**, front wall
**7'10"** (sloped ceiling: flat at the back, ramps down to the front wall).
Finished interior = raw − wall lining both sides. Cedar T&G throughout (~5" boards).

**Benches** (rear + right "L" bench)
- Foot bench (lower tier): seat/footrest **32" AFF**, **20" wide** (options 18/20/22/24").
- Top bench (upper tier): seat **50" AFF** (32" + 18"), depth **24"** from wall.
- Closed-front bench style (default).

**Fixtures** — **HUUM** rock heater (cage + stones, glow). Door **24" W × 72" H**
(5" wood margin around the glass, 6" off the left wall). Slidable windows
(12"–60"); glass-block feature wall with selectable mullion wood. Interior floor
deck (4-1/4"), exterior rear deck + stair.

---

## How to initiate the AI-Studio build with this

1. Give it `docs/HANDOFF.md` (overview + file map + change log) **and this file**.
2. Attach the **OBJ/GLB exports** from each 3D view (the true geometry) — or the
   source (`baseline.js` + `app.js` + `spec.js`) if it will read code.
3. Tell it the split it proposed maps to what exists: our apps ARE the
   *Deterministic 3D Stage* (locked coords + procedural materializer + camera
   presets + look-book + spec sheet). It needs to add the *Structure-Locked AI
   Render/Inpainting* layer that takes a locked camera snapshot (or a site photo)
   and applies photoreal lighting **without moving geometry**.
4. Point it at the **open items** in `HANDOFF.md §5` as the first build targets.
