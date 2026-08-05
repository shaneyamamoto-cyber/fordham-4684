# Materials guide — swatch → real reference → expected render

**Read this first:** everything in this tool (design-spec.json, the swatches, this
guide) is **design intent for AI-assisted visualization**, not a construction
document. Dimensions are schematic and material references are aesthetic targets
(color, scale, sheen, joint style) — before anything is built, a licensed
architect/designer must produce stamped drawings and a real finish schedule with
manufacturer, SKU, and code-compliant specs (waterproofing, blocking, clearances,
electrical/plumbing rough-in). Use this package to generate floor plans and
photoreal AI renders for design review and client presentation, not as a permit set.

## How to use this with an image generator
1. Take a plate from `Bathroom 3D.html` (orbit + **EXPORT VIEW + SPEC**).
2. Hand the generator: the plate PNG, `design-spec.json`, `CONSTRAINTS.json`, and
   the specific reference photo(s) below for whichever surfaces are in frame.
3. Tell it explicitly: match color, scale, joint/grout width and sheen from the
   reference photo; do NOT invent a different material or move any geometry.

## Currently locked surfaces (`design-spec.json → surfaces`)
| Zone | Finish | Color | Pattern | Reference photo | Expected render read |
|---|---|---|---|---|---|
| Bay back / step return / tub end | tile | `#9aa79b` | 12×6 offset (running bond) | `materials/tile/green-stone-tile.png` | Warm grey-green large-format tile, soft veining, tight grout |
| Splash panel (behind vanity) | tile | `#dfe3dc` | 6" hex, stack | `materials/tiles/hexagon-travertine.png` | Small warm-ivory hex, honed stone look, visible tight grout lines |
| Shower shelf wall | paint (matches wall) | `#e6e3d9` | — | — (flat matte paint, no photo needed) | Same warm off-white as the vanity/end walls, flat sheen |
| Vanity wall / end walls / dormer slope | paint | `#e8e3d8` | — | — | Flat matte, warm off-white, no texture |
| Floor | stone | `#bdb5a6` | 24×24 offset | `materials/tile/floor-stone.png` | Honed stone, cool grey-taupe, minimal grout, large format |
| Tub skirt | tile | `#9aa79b` | 8×24 offset | `materials/tile/large-format-stone-wall.png` | Same family as the bay tile, vertical run |

## Metal — copper throughout
All taps, pulls, sconce bodies, mirror frame, splash trim: one finish, no mixing.
- `materials/metal/copper-sconce.png` — sconce body color/patina target
- `materials/metal/copper-cross.png` — tap handle finish target
- `materials/metal/aged-brass-tap.png` — do NOT use; brass is a different finish, kept only as a contrast reference

## Wood — walnut (vanity, storage tower, floating shelves)
- `materials/wood/sculpted-walnut.png` — grain direction + tone target
- `materials/wood/waterfall-walnut.png` — alternate if a bolder grain match is wanted

## Full library (59 cutouts)
Everything above is the CURRENT locked selection. `materials/` holds the full
photographic library behind every chip in the planner (tile, tiles, wood, metal,
mirror, furniture, textile folders) — browse it live in `Look Book.html`, or open
files directly; names are descriptive (`running-half-oxblood.png`,
`hexagon-travertine.png`, `sculpted-walnut.png`, etc).
