# Main Floor — grid map + 3D model (AR / AI base map)

Scale-accurate model of the Fordham 4684 **main floor**, measured from the permit
scan by black-wall pixel detection at **22.6 px/ft** (verified against the 12'-11"
living-room width, 23'-0" living depth, and 18'-11" meeting-room depth).

Everything below is generated from one source of truth: **`floor-data.js`**
(rooms + walls + openings, in feet, origin at the NW corner, x = east, z = south).

## Views
- **`floor-map.html`** — the 2-D grid map: 1-ft grid (bold every 5 ft), room
  dimensions, tagged windows (W#) / doors (D#) / garage door (G1), scale bar in
  ft + m, north up. This is the coordinate reference.
- **`main-floor.html`** — the interactive 3-D model (three.js, built in **metres**,
  8' ceilings default with a 7–12' slider). Views: Iso / Top (map) / Front /
  Bath-Office / Living. Toggles: ceiling, glass, labels, grid.

## AR / AI export (buttons in `main-floor.html`, also pre-built in `exports/`)
| File | Format | Units | Use |
|---|---|---|---|
| `exports/fordham4684-mainfloor.glb` | glTF-binary | metres, +Y up | drop into any AR viewer / `<model-viewer>` / Unity / Reality Composer; the standard structure-locked base mesh |
| `exports/fordham4684-mainfloor.obj` | Wavefront OBJ | metres | universal import for DCC / AI tools that prefer OBJ |
| `exports/mainfloor.plan.json` | JSON | metres **and** feet | machine-readable plan: rooms, walls (start/end, thickness, exterior flag), openings (kind, position, height), ceiling — for programmatic AR placement or an AI design agent |

**For the AI / AR pipeline:** treat the GLB (or the plan JSON) as *locked
geometry*. Apply materials, lighting and staging on top of it — never let a
generative pass move or resize a wall, opening or room. Regenerate the exports
from `main-floor.html` after any edit to `floor-data.js`.

## Rooms (feet, from the scan)
Meeting 10.3×18.5 · Living 12.9×23.5 · Kitchen 18.1×23.5 · Stairs 4.3×17.5 ·
Bath hall / Vanity / Toilet / Shower · Laundry 11.3×4.0 · **Office 11.3×8.0
(below the laundry)** · Garage 11.3×25.0 (+closet) · Foyer 8.9×7.5 (projects into
the porch) · Covered porch 35.3×9.5.
