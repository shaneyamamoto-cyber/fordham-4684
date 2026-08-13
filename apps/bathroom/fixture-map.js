/* ------------------------------------------------------------------ *
 * Bathroom — Fixture Options → design mapping.
 *
 * Each catalog option id maps to a parametric patch applied to the target
 * fitting (size / shape / profile). The Fixture Options picker applies the
 * chosen option's patch INTO the shared work slot once (on selection), so
 * every view — elevation planner, 3D model, floor plan — renders the same
 * thing and manual edits are never clobbered by a per-load overlay.
 * ------------------------------------------------------------------ */
(function () {
  'use strict';
  window.BATHROOM_FIXMAP = {
    targets: { Mirror: ['mir'], Toilet: ['wc'], Showerhead: ['rain'], Tap: ['tap'], Lighting: ['light', 'light2'] },
    map: {
      mir: {
        '1d': { frame: 1.25, radius: 10.75 },                         // pill / stadium
        '1e': { frame: 1.25, radius: 4 },                             // rounded rectangle
        '1f': { frame: 0, radius: 16 },                               // arched top
        '1g': { frame: 0, shape: 'round', w: 26, h: 26, radius: 13 }, // round
        '1v': { frame: 0, radius: 2 },                                // backlit rectangle
        '1w': { frame: 0.9, radius: 6 },                              // octagon (approx)
        '1x': { frame: 0, shape: 'round', w: 22, h: 22, radius: 11 }, // round pair (approx)
        '1y': { frame: 0, radius: 0 }                                 // frameless beveled
      },
      wc: {
        '1a': { w: 15, dep: 28 }, '1b': { w: 15.5, dep: 27 }, '1c': { w: 16.5, dep: 27, shape: 'square' },
        '1q': { h: 22, dep: 21, y: 15 },                              // wall-hung, concealed tank (floats)
        '1r': { w: 18, h: 31, dep: 28 },                             // two-piece traditional
        '1s': { w: 15, dep: 24 }, '1t': { h: 52 },                    // corner compact / high tank
        '1u': { w: 15, dep: 25 }
      },
      rain: {
        '1k': { w: 10, dep: 12, y: 80 },   // ceiling rainhead
        '1l': { y: 78, dep: 14 },           // wall-arm rain
        '1m': { w: 4, dep: 6, y: 72 },      // handheld + slide bar
        '1af': { w: 12, dep: 12, y: 80 },   // dual: rain + handheld
        '1ag': { w: 6, dep: 10, y: 76 },    // adjustable angled arm
        '1ah': { w: 8, h: 10, dep: 3, y: 74 }, // thermostatic panel
        '1ai': { h: 40, w: 6, y: 40 },      // body jets column
        '1aj': { w: 12, dep: 12, shape: 'square', y: 80 } // square rain panel
      },
      tap: {
        '1h': { w: 8, h: 2, dep: 8 },      // 3-piece wall, cross handles → standard blade
        '1i': { w: 7, h: 2, dep: 7 },      // 2-hole single lever
        '1j': { w: 9, h: 2, dep: 8 },      // wall-mount lever pair (wider)
        '1aa': { w: 6, h: 5, dep: 6 },     // single-lever monobloc (taller body)
        '1ab': { w: 10, h: 3, dep: 8 },    // bridge-style (wide)
        '1ac': { w: 8, h: 2, dep: 8 },     // wheel handles
        '1ad': { w: 4, h: 3, dep: 8 },     // waterfall spout (narrow, deep)
        '1ae': { w: 3, h: 8, dep: 9 },     // gooseneck high-arc (tall)
        '1af': { w: 8, h: 2, dep: 9 }      // gooseneck + single lever
      },
      light: {
        '1n': { w: 3, h: 8, shape: 'soft' },   // copper cylinder (tall)
        '1o': { w: 3.5, h: 7, shape: 'soft' }, // brass + ribbed glass
        '1p': { w: 26, h: 2, shape: 'soft' },  // linear bar above mirror (wide)
        '1ak': { w: 4, h: 7, shape: 'rect' },  // industrial cage
        '1al': { w: 5, h: 4, shape: 'soft' },  // picture light, arched arm
        '1am': { w: 8, h: 8, shape: 'round' }, // drum shade
        '1an': { w: 24, h: 1.2, shape: 'soft' },// LED edge strip (wide, thin)
        '1ao': { w: 5, h: 5, shape: 'round' }  // single globe
      }
    }
  };
  window.BATHROOM_FIXMAP.map.light2 = window.BATHROOM_FIXMAP.map.light;
})();
