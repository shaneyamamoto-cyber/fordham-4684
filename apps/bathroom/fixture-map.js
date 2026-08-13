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
        '1k': {}, '1l': { y: 78, dep: 14 }, '1m': { w: 4, dep: 6, y: 72 },
        '1aj': { w: 12, dep: 12, shape: 'square' }, '1ai': { h: 40, w: 6 }, '1ah': { w: 8, h: 10, dep: 3 }
      },
      tap: {
        '1ad': { w: 4, dep: 8 }, '1ae': { h: 8, dep: 9 }, '1af': { h: 8, dep: 9 }, '1aa': { h: 5, dep: 6 }
      },
      light: {
        '1am': { w: 8, h: 8, shape: 'round' }, '1ao': { w: 5, h: 5, shape: 'round' },
        '1ak': { w: 4, h: 7 }, '1n': { w: 3, h: 8, shape: 'round' }
      }
    }
  };
  window.BATHROOM_FIXMAP.map.light2 = window.BATHROOM_FIXMAP.map.light;
})();
