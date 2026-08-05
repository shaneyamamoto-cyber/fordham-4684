# Image-gen playbook

How to drive ChatGPT image generation from the planner without losing the measurements.

The division of labour is the whole point:

> **The planner owns geometry. The image model owns light and material. Neither is
> allowed into the other's job.**

---

## The loop

```
   ┌─────────────────────────────────────────────────┐
   │                                                 │
   ▼                                                 │
PLANNER ──lock──► 3D ──screenshot──► PLATE           │
   │                                    │            │
   │                                    ▼            │
   └──IMAGE PROMPT──────────► IMAGE MODEL ──► RENDER │
                                                │    │
                                  log defects ──┘    │
                                        │            │
                                        └────────────┘
```

---

## 1. Lock the layout

Save a version in the planner. The 3D page reads the **locked** version — not your
working edits. Skipping this is the single most common way to get a plate that doesn't
match the prompt.

## 2. Shoot the plate

Open `Bathroom 3D.html`, orbit to the view you want, screenshot. That image is your
**structure reference**: the geometry in it is measured and must not move.

Good plate views:

- **From the doorway, 35mm, eye height** — the hero. Shows the vanity wall, tower and
  tub relationship all at once.
- **Straight-on vanity elevation** — for judging the 7"/36"/7" split and the counter.
- **Oblique left corner** — for the shower/vanity relationship and the 14.5" step.

## 3. Copy the prompt

Planner → **IMAGE PROMPT** tab → COPY. Every dimension in it is real and comes from the
current design.

## 4. Generate

Paste the prompt, attach the plate, and add the framing instruction:

> Keep the exact camera angle, room proportions and object placement of the reference
> image. Do not move, resize, add or remove anything. Repaint materials and lighting only.
> Read every dimension from the reference image, not from convention.

Negatives worth carrying every time:

> wide-angle distortion, fisheye, extra fixtures, extra shelves, changed cabinet layout,
> plants, towels, bottles, people, text, watermark, glossy CGI plastic, HDR halos

## 5. Log what it got wrong

Planner → defect log. Pick the element, pick the failure kind, add a note. Be specific
and be measured: *"tower face proud of vanity wall by ~2 inches"* beats *"tower looks
off"*.

## 6. Patch and re-run

**PATCH PROMPT WITH LOG** rewrites the prompt with your defects as explicit hard
constraints, dimensions carried through verbatim. Generate again from the same plate.

Two or three passes usually settles it.

---

## Failure modes, and what to say

| What the render does | Put this in the log / prompt |
|---|---|
| Widens the vanity to fill the wall | `Vanity is EXACTLY 36" on a 50" wall. 7" of bare wall on each side.` |
| Baseboard stops at the vanity | `Baseboard RUNS CONTINUOUSLY UNDER the wall-hung vanity.` |
| Turns the niche into a shelf | `The niche is RECESSED 4" INTO the wall. It never projects.` |
| Pushes the tower forward or back | `Tower face is COPLANAR with the vanity wall. Its back sits on the tub tap wall.` |
| Centres the mirror on the wall | `Mirror is centred on the BASIN, not on the wall.` |
| Adds plants, towels, bottles | Repeat the negative list; name the specific intruder. |
| Fisheyes the room | `35mm lens. No wide-angle distortion.` |
| Loses the 14.5" step | `The shower back wall is 14.5" BEHIND the vanity wall. The step is visible.` |

---

## Keeping a style locked across runs

The aesthetic lives in the image model, so treat it as a fixed input:

1. Keep **one** style reference image and attach it to every run alongside the plate.
2. Never re-describe the style in words once it's working — words drift, references don't.
3. When you change the design, change **only** the geometry half of the prompt. Leave the
   material and lighting sentences byte-identical.
4. Label every run (`run 1`, `run 2`…) in the planner so the defect log stays attributable.

---

## When to stop generating

If a render is right in geometry and wrong only in mood, stop patching the prompt and go
back to the 3D — orbit, re-light, re-shoot the plate. A better plate fixes more than a
longer prompt.

And if you need something dimensionally exact for a builder or a vendor, don't use a
render at all. Use the **SPEC** tab, or hand over the OBJ/GLB.
