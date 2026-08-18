# Main Floor — grid map + 3D model (AR / AI base map)

Scale-accurate model of the Fordham 4684 **main floor**, measured from the revised
permit scan by black-wall pixel detection at **23.5 px/ft** (verified against the
9'-6" meeting-room width, 12'-11" living-room width, and 23'-0" living depth).

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

## Rooms (feet, from the revised scan)
Meeting 9.4×19.2 · Living 12.9×23.0 · Pantry 4.2×5.5 · Stairs 4.2×14.0 ·
Kitchen/Dining 17.5×23.0 · Hall closet / Hall · Vanity 5.5×3.5 · Toilet 3.1×4.5 ·
Shower 4.3×4.5 · Laundry 7.4×3.8 · **Office 10.9×14.0 (below the laundry, with
closets)** · Garage 10.9×9.2 · Foyer 6.7×7.0 (projects into the porch) ·
Covered porch 34.6×8.7.
