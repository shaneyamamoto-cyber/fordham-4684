/* ------------------------------------------------------------------ *
 * Bathroom — canonical baseline design.
 *
 * ONE source of truth for the upstairs bathroom's shell, surfaces and
 * fittings, shared by every view (3D model, elevation planner, floor
 * plan). Coordinates: x runs 0..169in along the vanity wall; y is height
 * above finished floor (AFF); dep is depth; face 0 = vanity wall,
 * face 14.5 = bay/tub wall. When any view promotes the baseline into the
 * work slot (yamazina.bathroom.work.v1) it copies THIS object, so an edit
 * in one view never silently drops a fitting the others rely on.
 *
 * `tone` on an item is the flat 2D fill the elevation/floor-plan draw
 * with (the 3D model derives its own PBR look from `surf` + trim tone).
 * ------------------------------------------------------------------ */
(function () {
  'use strict';
  window.BATHROOM_BASELINE = {
    height: 92, kneeH: 0, slopeRun: 32, trimTone: 'gold', drawersLeft: 2, drawersRight: 3, vanDoors: false, bankW: 10.9, bankGap: 1.5,
    wallsOff: {}, splashLinked: true,
    surf: {
      bay:    { fin:'tile',  color:'#9aa79b', tileL:48, tileW:24, shape:'rect', pattern:'offset2', grout:'#e8e3d8' },
      splash: { fin:'stone', color:'#4a5442', tileL:60, tileW:45, shape:'rect', pattern:'stack',   grout:'#e8e3d8' },
      wall:   { fin:'paint', color:'#e8e3d8', tileL:24, tileW:12, shape:'rect', pattern:'stack',   grout:'#e8e3d8' },
      floor:  { fin:'stone', color:'#bdb5a6', tileL:24, tileW:24, shape:'rect', pattern:'offset2', grout:'#cfcabd' },
      slope:  { fin:'paint', color:'#e8e3d8', tileL:24, tileW:12, shape:'rect', pattern:'stack',   grout:'#e8e3d8' }
    },
    poly: [{x:0,d:14.5},{x:60.5,d:14.5},{x:60.5,d:0},{x:169,d:0},{x:169,d:-56.5},{x:0,d:-56.5}],
    items: [
      {id:'splash',name:'Splash panel',x:61.25,w:46,y:19.25,h:66,dep:0.5,face:0,radius:12,trim:true,surf:'splash',tone:'#5a6350'},
      {id:'vshelf',name:'Vanity wall shelf',x:92.5,w:10,y:41.13,h:1.75,dep:5,face:0,tone:'#e6e0d4'},
      {id:'wc',name:'Toilet',x:169,w:16,y:0,h:29,dep:26,face:0,wall:'end',d:26.75,flip:true,tone:'#f7f6f2'},
      {id:'base',name:'Baseboard',x:0,w:169,y:0,h:4,dep:0.75,face:0,tone:'#f1efe9'},
      {id:'wet',name:'Shower zone',x:0,w:32,y:0,h:96,dep:60,face:14.5,zoneOnly:true,tone:'rgba(154,167,155,0.25)'},
      {id:'tub',name:'Tub',x:0,w:32,y:0,h:20,dep:60,face:14.5,tone:'#f7f6f2',locked:true},
      {id:'tower',name:'Storage tower',x:44.5,w:16,y:0,h:84,dep:14.5,face:14.5,tone:'#8a5325',
        bays:[{t:'door',h:26},{t:'drawer',h:8},{t:'void',h:13},{t:'drawer',h:8},{t:'void',h:13},{t:'door',h:16}]},
      {id:'van',name:'Vanity',x:66.25,w:36,y:15,h:19,dep:12,face:0,tone:'#8a5325',locked:true},
      {id:'vessel',name:'Wall basin',x:67.75,w:22,y:34.5,h:4,dep:13.8,face:0,tone:'#f7f6f2'},
      {id:'stone',name:'Countertop',x:91.5,w:10,y:34.25,h:1.5,dep:13.8,face:0,tone:'#e6e0d4'},
      {id:'tap',name:'Wall spout',x:76,w:8,y:42.5,h:2,dep:8,face:0,shape:'soft',tone:'#c9a35c'},
      {id:'taphl',name:'Mixer lever',x:88,w:3.5,y:42.5,h:2,dep:3,face:0,shape:'soft',tone:'#c9a35c'},
      {id:'mir',name:'Mirror',x:68.75,w:32,y:50,h:21.5,dep:2,face:0,frame:1.25,frameTone:'#b87a55',radius:13,tone:'#cfe0e3'},
      {id:'dcase',name:'Door casing',x:108,w:35,y:0,h:82.5,dep:0.75,face:0,tone:'#f1efe9'},
      {id:'door',name:'Door — 30" RO',x:110.5,w:30,y:0,h:80,dep:1,face:0,tone:'#f1efe9'},
      {id:'glass',name:'Glass panel',x:32,w:30,y:20,h:56,dep:0.5,face:0,wall:'end',d:0,tone:'rgba(207,224,227,0.55)'},
      {id:'shelf',name:'Three floating shelves',x:32,w:12,y:34,h:30,dep:18,face:14.5,shelfN:3,shelfGap:12,shelfThick:2,led:true,tone:'#8a5325'},
      {id:'nichesh',name:'Lit tile niche',x:6,w:30,y:40.25,h:14,dep:4,face:14.5,recess:true,tone:'#ffd9a0'},
      {id:'rain',name:'Rainhead',x:11,w:10,y:80,h:4,dep:12,face:14.5,tone:'#c9a35c'},
      {id:'mixer',name:'Mixer / diverter',x:13,w:6,y:41.38,h:6,dep:3,face:14.5,shape:'round',tone:'#c9a35c'},
      {id:'spout',name:'Tub spout',x:13,w:6,y:26,h:3,dep:6,face:14.5,tone:'#c9a35c'},
      {id:'bar2',name:'Towel bar — tub upper',x:38.33,w:18,y:27.5,h:2,dep:4,face:14.5,wall:'slope',d:14,tone:'#c9a35c'},
      {id:'bar3',name:'Towel bar — tub lower',x:36.72,w:18,y:22.5,h:2,dep:4,face:14.5,wall:'slope',d:14,tone:'#c9a35c'},
      {id:'ring',name:'Hand towel ring',x:62.5,w:7,y:40.63,h:7.25,dep:4,face:0,tone:'#c9a35c'}
    ]
  };
})();
