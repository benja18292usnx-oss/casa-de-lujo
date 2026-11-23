// Montevar — recorrido 3D (three.js r170, texturas PBR CC0 de Poly Haven y ambientCG)
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { Water } from 'three/addons/objects/Water.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export async function open3D(root, opts = {}) {
  const ui = buildUI(root);
  const weak = matchMedia('(hover: none)').matches || innerWidth < 900 || (navigator.deviceMemory || 8) <= 4;
  let high = opts.quality ? opts.quality === 'alta' : !weak;

  /* ---------- renderer ---------- */
  const renderer = new THREE.WebGLRenderer({ antialias: !weak, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  ui.stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0d2148, 0.0042);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 1200);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08;

  /* ---------- texture loading ---------- */
  const mgr = new THREE.LoadingManager();
  mgr.onProgress = (u, l, t) => ui.progress(l / t);
  const tl = new THREE.TextureLoader(mgr);
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const big = ['wood_planks', 'castle_wall_varriation', 'japanese_stone_wall', 'wood_floor_worn', 'travertine'];
  function tex(name, map, rep, srgb) {
    const small = !high && big.includes(name) ? '-s' : '';
    const t = tl.load(`tex/${name}_${map}${small}.webp`);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1 / rep[0], 1 / rep[1]);
    t.anisotropy = Math.min(high ? 8 : 4, maxAniso);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  function pbr(name, rep, o = {}) {
    const m = new THREE.MeshStandardMaterial({
      map: o.noColor ? null : tex(name, 'col', rep, true),
      normalMap: tex(name, 'nrm', rep),
      roughnessMap: high || o.keepRough ? tex(name, 'rgh', rep) : null,
      roughness: o.roughness ?? 1, metalness: o.metalness ?? 0,
      color: o.color ?? 0xffffff,
      envMapIntensity: o.env ?? 1,
    });
    if (o.normalScale) m.normalScale.set(o.normalScale, o.normalScale);
    return m;
  }

  /* ---------- materials ---------- */
  const M = {
    stone: pbr('castle_wall_varriation', [2.2, 2.2], { color: 0xb9bcc2 }),
    fire: pbr('japanese_stone_wall', [1.6, 1.6], { color: 0xd8d2c8 }),
    siding: pbr('dark_wooden_planks', [2, 2], { color: 0x6b5f57 }),
    roof: pbr('box_profile_metal_sheet', [1.2, 1.2], { noColor: true, color: 0x24282e, metalness: 0.6, roughness: 0.55, keepRough: true }),
    soffit: pbr('wood_floor_worn', [2.4, 2.4], { color: 0xffd9b0 }),
    floor: pbr('wood_planks', [2.6, 2.6], { color: 0xe8d2b8, roughness: 1 }),
    trav: pbr('travertine', [1.8, 1.8], { color: 0xf2e8d8 }),
    deck: pbr('dark_wooden_planks', [1.8, 1.8], { color: 0x8a7a6c }),
    ground: pbr('rocks_ground_02', [6, 6], { color: 0x7d8a92 }),
    grass: pbr('leafy_grass', [4, 4], { color: 0x6f7f68 }),
    rock: pbr('castle_wall_varriation', [3, 3], { color: 0x6c7279, env: 0.5 }),
    leather: pbr('brown_leather', [0.8, 0.8], { color: 0xc98a5a }),
    fabric: pbr('poly_wool_herringbone', [0.25, 0.25], { noColor: true, color: 0xcdbca4, roughness: 1, normalScale: 0.6 }),
    rug: pbr('poly_wool_herringbone', [0.6, 0.6], { color: 0xb9a892 }),
    velvet: pbr('poly_wool_herringbone', [0.2, 0.2], { noColor: true, color: 0x6e5a4a, normalScale: 0.4 }),
    walnut: pbr('wood_floor_worn', [1.4, 1.4], { color: 0x9a6a48 }),
    cabinet: pbr('dark_wooden_planks', [1.2, 1.2], { color: 0x5a4636 }),
    plaster: new THREE.MeshStandardMaterial({ color: 0xa89b8c, roughness: 0.95 }),
    white: new THREE.MeshPhysicalMaterial({ color: 0xcfc9bf, roughness: 0.22, clearcoat: 0.6 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x1b1e22, metalness: 0.7, roughness: 0.45 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xc9a36a, metalness: 1, roughness: 0.3 }),
    mirror: new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.04 }),
    coping: pbr('travertine', [1.2, 1.2], { color: 0x8f8a83 }),
    poolTile: new THREE.MeshStandardMaterial({ color: 0x12808f, roughness: 0.15, emissive: 0x0a5866, emissiveIntensity: 0.35 }),
    warm: new THREE.MeshStandardMaterial({ color: 0xffe2b5, emissive: 0xffb35c, emissiveIntensity: 1.6 }),
    flame: new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.95 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x3c5b3a, roughness: 0.9 }),
  };
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x9fb4c8, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.16,
    envMapIntensity: 1.6, side: THREE.DoubleSide, depthWrite: false, reflectivity: 0.6,
  });

  /* ---------- geometry batching (one draw call per material) ---------- */
  const bins = new Map();
  const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler();
  function put(geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1) {
    tmpQ.setFromEuler(tmpE.set(rx, ry, rz));
    tmpM.compose(new THREE.Vector3(x, y, z), tmpQ, new THREE.Vector3(s, s, s));
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.applyMatrix4(tmpM);
    if (!bins.has(mat)) bins.set(mat, []);
    bins.get(mat).push(g);
  }
  // box with UVs in metres so textures keep their real size
  function boxG(w, h, d) {
    const g = new THREE.BoxGeometry(w, h, d);
    const uv = g.attributes.uv;
    const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) {
      const j = f * 4 + i; uv.setXY(j, uv.getX(j) * dims[f][0], uv.getY(j) * dims[f][1]);
    }
    return g;
  }
  const box = (mat, w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) => put(boxG(w, h, d), mat, x, y, z, rx, ry, rz);
  const cyl = (mat, rt, rb, h, x, y, z, seg = 24) => put(new THREE.CylinderGeometry(rt, rb, h, seg), mat, x, y, z);
  const rbox = (mat, w, h, d, r, x, y, z, ry = 0) => put(new RoundedBoxGeometry(w, h, d, 3, r), mat, x, y, z, 0, ry, 0);
  function tri(mat, x0, x1, yb, yt, z, thick = 0.02) {
    const s = new THREE.Shape(); const cx = (x0 + x1) / 2;
    s.moveTo(x0, yb); s.lineTo(x1, yb); s.lineTo(cx, yt); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: false });
    put(g, mat, 0, 0, z - thick / 2);
  }
  const glassGeos = [];
  function glassRect(x0, x1, y0, y1, z) { const g = new THREE.PlaneGeometry(x1 - x0, y1 - y0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, z); glassGeos.push(g); }
  function glassTri(x0, x1, yb, yt, z) { const s = new THREE.Shape(); s.moveTo(x0, yb); s.lineTo(x1, yb); s.lineTo((x0 + x1) / 2, yt); s.closePath(); const g = new THREE.ShapeGeometry(s); g.translate(0, 0, z); glassGeos.push(g.toNonIndexed()); }
  function glassRectX(z0, z1, y0, y1, x) { const g = new THREE.PlaneGeometry(z1 - z0, y1 - y0); g.rotateY(Math.PI / 2); g.translate(x, (y0 + y1) / 2, (z0 + z1) / 2); glassGeos.push(g); }

  const lights = [];
  function warmLight(x, y, z, intensity = 40, dist = 16) {
    const l = new THREE.PointLight(0xffb066, intensity, dist, 2); l.position.set(x, y, z); scene.add(l); lights.push(l); return l;
  }

  /* ---------- house: gable-front wing (ridge runs front-back) ---------- */
  function gableWing({ x0, x1, z0, z1, eave, ridge, floor = M.floor, sideGlass = false, ovL = 0.65, ovR = 0.65 }) {
    const w = x1 - x0, cx = (x0 + x1) / 2, d = z1 - z0, zc = (z0 + z1) / 2, t = 0.35;
    box(floor, w, 0.3, d, cx, -0.15, zc);
    // back wall stone + dark wood gable
    box(M.stone, w, eave, t, cx, eave / 2, z0 + t / 2);
    tri(M.siding, x0, x1, eave, ridge, z0 + 0.1, 0.2);
    // side walls: stone, optional glass band toward the front
    for (const sx of [x0 + t / 2, x1 - t / 2]) {
      if (sideGlass) {
        box(M.stone, t, eave, d * 0.55, sx, eave / 2, z0 + d * 0.275);
        glassRectX(z0 + d * 0.55, z1 - 0.7, 0.05, eave - 0.3, sx);
        box(M.stone, t, eave, 0.7, sx, eave / 2, z1 - 0.35);
        box(M.metal, t + 0.02, 0.3, d * 0.45, sx, eave - 0.15, z1 - d * 0.225);
      } else box(M.stone, t, eave, d, sx, eave / 2, zc);
      // inner plaster finish
      box(M.plaster, 0.02, eave, d - 0.8, sx + (sx < cx ? t / 2 + 0.01 : -t / 2 - 0.01), eave / 2, zc);
    }
    // front: stone pillars, glass curtain wall with dark mullions
    const pw = 0.75;
    box(M.stone, pw, eave, 0.55, x0 + pw / 2, eave / 2, z1 - 0.27);
    box(M.stone, pw, eave, 0.55, x1 - pw / 2, eave / 2, z1 - 0.27);
    const gx0 = x0 + pw, gx1 = x1 - pw;
    glassRect(gx0, gx1, 0.02, eave, z1 - 0.2);
    const n = Math.max(2, Math.round((gx1 - gx0) / 1.5));
    for (let i = 1; i < n; i++) { const mx = gx0 + (gx1 - gx0) * i / n; box(M.metal, 0.07, eave, 0.12, mx, eave / 2, z1 - 0.2); }
    box(M.metal, gx1 - gx0, 0.08, 0.14, cx, 2.45, z1 - 0.2);
    box(M.metal, w, 0.22, 0.3, cx, eave + 0.03, z1 - 0.2); // header beam
    // glass gable with mullions
    glassTri(x0 + 0.1, x1 - 0.1, eave + 0.14, ridge - 0.2, z1 - 0.2);
    const half = w / 2, rise = ridge - eave;
    for (let i = 1; i < n; i++) {
      const mx = x0 + w * i / n; const hgt = rise * (1 - Math.abs(mx - cx) / half);
      if (hgt > 0.3) box(M.metal, 0.07, hgt, 0.12, mx, eave + hgt / 2, z1 - 0.2);
    }
    // roof slabs (metal) + warm wood soffit underneath
    const ovF = 1.3, ovB = 0.45, a = Math.atan2(rise, half), rd = d + ovF + ovB, rz = (z0 - ovB + z1 + ovF) / 2;
    for (const s of [-1, 1]) {
      const run = half + (s < 0 ? ovL : ovR) + 0.05, len = run / Math.cos(a) + 0.12;
      const mx = cx + s * run / 2, my = ridge - (run / 2) * Math.tan(a);
      const sx0 = mx + s * -0.02, sy0 = my + 0.2;
      box(M.roof, len, 0.2, rd, sx0, sy0, rz, 0, 0, -s * a);
      box(M.soffit, len - 0.05, 0.03, rd - 0.05, sx0 - s * Math.sin(a) * 0.12, sy0 - Math.cos(a) * 0.12, rz, 0, 0, -s * a);
    }
    box(M.roof, 0.3, 0.16, rd, cx, ridge + 0.3, rz); // ridge cap
    box(M.soffit, 0.4, 0.45, rd - 0.1, cx, ridge - 0.12, rz); // ridge beam
    // ceiling beams inside (warm wood)
    for (let zz = z0 + 1.2; zz < z1 - 0.5; zz += 2.2) box(M.soffit, w - 0.8, 0.22, 0.18, cx, eave - 0.1, zz);
    warmLight(cx, eave - 0.9, zc + 0.8, 26, 18);
    return { cx, zc };
  }
  /* side-gabled link (ridge runs left-right) */
  function linkWing({ x0, x1, z0, z1, eave, ridge }) {
    const w = x1 - x0, cx = (x0 + x1) / 2, d = z1 - z0, zc = (z0 + z1) / 2;
    box(M.floor, w, 0.3, d, cx, -0.15, zc);
    box(M.stone, w, eave, 0.35, cx, eave / 2, z0 + 0.17);
    glassRect(x0, x1, 0.02, eave, z1 - 0.2);
    for (let i = 1; i < 3; i++) box(M.metal, 0.07, eave, 0.12, x0 + w * i / 3, eave / 2, z1 - 0.2);
    box(M.siding, w, 0.5, 0.3, cx, eave + 0.1, z1 - 0.2);
    const half = d / 2, rise = ridge - eave, a = Math.atan2(rise, half), ov = 0.8, run = half + ov, len = run / Math.cos(a);
    for (const s of [-1, 1]) {
      const mz = zc + s * run / 2, my = ridge - (run / 2) * Math.tan(a);
      box(M.roof, w + 0.2, 0.2, len, cx, my + 0.2, mz, s * a, 0, 0);
      box(M.soffit, w + 0.15, 0.03, len - 0.05, cx, my + 0.2 - Math.cos(a) * 0.12, mz - s * Math.sin(a) * 0.12, s * a, 0, 0);
    }
    warmLight(cx, eave - 0.6, zc, 12, 10);
  }

  // Wings matching the hero photo: left wing, low link, mid gable, tall central gable, link, right wing
  gableWing({ x0: -17, x1: -9, z0: -6, z1: 5, eave: 3.0, ridge: 6.2, floor: M.trav });
  linkWing({ x0: -9, x1: -6, z0: -5, z1: 4, eave: 3.0, ridge: 5.0 });
  gableWing({ x0: -6, x1: 1, z0: -6, z1: 5, eave: 3.2, ridge: 7.3, ovR: 0 });
  gableWing({ x0: 1, x1: 9.2, z0: -6.5, z1: 6, eave: 3.6, ridge: 9.0, ovL: 0.1 });
  linkWing({ x0: 9.2, x1: 12, z0: -5, z1: 4, eave: 3.2, ridge: 5.6 });
  gableWing({ x0: 12, x1: 19, z0: -6, z1: 5, eave: 3.2, ridge: 7.4, sideGlass: true });
  // chimneys of stone
  box(M.fire, 1.3, 3.2, 1.3, 3.4, 9.0, -5.0);
  // partition between bath and spa in the left wing
  box(M.trav, 0.18, 3.0, 10.4, -13, 1.5, -0.8);
  // stone plinth, terraces, cantilevered deck
  box(M.stone, 38, 1.5, 1, 1, -0.75, 9.3);
  box(M.coping, 29.6, 0.22, 4.4, -2.6, -0.11, 7.1);
  box(M.deck, 8.6, 0.25, 4.6, 16.2, -0.12, 7.3);
  box(M.metal, 8.6, 0.55, 0.2, 16.2, -0.5, 9.6);
  // stairs down to the pool
  for (let i = 0; i < 4; i++) box(M.coping, 3, 0.36, 0.45, -7.5, -0.18 - i * 0.36, 9.95 + i * 0.45);

  /* ---------- interiors ---------- */
  // LIVING (central wing)
  box(M.fire, 2.6, 8.2, 1.2, 3.4, 4.1, -5.6); // stone fireplace column to the roof
  box(M.metal, 1.4, 0.8, 0.5, 3.4, 0.85, -5.0); // firebox
  box(M.walnut, 3.2, 0.14, 0.45, 3.4, 1.4, -4.85); // mantel
  const flame = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.55), M.flame); flame.position.set(3.4, 0.75, -4.73); scene.add(flame);
  const fireLight = warmLight(3.4, 0.9, -4.2, 14, 8); fireLight.color.set(0xff8a3a);
  box(M.rug, 6.2, 0.02, 4.4, 5.2, 0.01, 0.4);
  // L sofa (bouclé)
  rbox(M.fabric, 4.0, 0.45, 1.05, 0.12, 5.6, 0.3, 2.0); rbox(M.fabric, 4.0, 0.75, 0.3, 0.12, 5.6, 0.45, 2.55);
  rbox(M.fabric, 1.05, 0.45, 2.6, 0.12, 8.1, 0.3, 0.75); rbox(M.fabric, 0.3, 0.75, 3.6, 0.12, 8.55, 0.45, 1.0);
  for (const px of [4.2, 5.2, 6.4]) rbox(M.velvet, 0.55, 0.45, 0.18, 0.08, px, 0.75, 2.3);
  // travertine coffee table
  rbox(M.trav, 1.8, 0.38, 1.0, 0.05, 5.4, 0.2, 0.4);
  box(M.walnut, 0.45, 0.08, 0.32, 5.2, 0.43, 0.3);
  // leather lounge chair + ottoman
  rbox(M.leather, 0.85, 0.22, 0.85, 0.08, 2.4, 0.42, 1.2, 0.5); rbox(M.leather, 0.85, 0.75, 0.2, 0.08, 2.2, 0.75, 1.55, 0.5);
  cyl(M.metal, 0.05, 0.25, 0.3, 2.4, 0.15, 1.2, 10);
  rbox(M.leather, 0.6, 0.2, 0.5, 0.07, 2.9, 0.35, 0.3, 0.5); cyl(M.metal, 0.04, 0.2, 0.25, 2.9, 0.12, 0.3, 10);
  // brass floor lamp + pendant
  cyl(M.brass, 0.02, 0.02, 1.7, 8.6, 0.85, 3.3, 8); cyl(M.brass, 0.18, 0.28, 0.25, 8.6, 1.75, 3.0); cyl(M.warm, 0.17, 0.17, 0.02, 8.6, 1.63, 3.0);
  box(M.brass, 1.8, 0.04, 0.04, 5.4, 3.9, 0.4); box(M.warm, 1.7, 0.03, 0.03, 5.4, 3.87, 0.4);
  cyl(M.metal, 0.005, 0.005, 3.2, 5.4, 5.5, 0.4, 4);
  // potted tree
  cyl(M.cabinet, 0.3, 0.25, 0.6, 1.9, 0.3, 4.6); put(new THREE.IcosahedronGeometry(0.7, 1), M.leaf, 1.9, 1.6, 4.6);

  // KITCHEN (mid wing, back half) — marble-like island, dark oak cabinets, brass hood
  box(M.cabinet, 6.4, 0.9, 0.65, -2.5, 0.45, -5.4); box(M.white, 6.4, 0.05, 0.68, -2.5, 0.92, -5.4);
  box(M.white, 6.4, 1.0, 0.03, -2.5, 1.45, -5.75);
  box(M.cabinet, 1.2, 2.6, 0.65, -5.2, 1.3, -5.4); box(M.cabinet, 1.2, 2.6, 0.65, 0.2, 1.3, -5.4);
  put(new THREE.CylinderGeometry(0.35, 0.75, 1.0, 4, 1), M.brass, -2.5, 2.4, -5.3, 0, Math.PI / 4, 0);
  box(M.metal, 0.9, 0.06, 0.55, -2.5, 0.96, -5.35);
  box(M.white, 3.4, 0.9, 1.1, -2.5, 0.45, -2.4); box(M.white, 3.5, 0.07, 1.15, -2.5, 0.93, -2.4);
  for (let i = 0; i < 3; i++) { const sx = -3.6 + i * 1.1; cyl(M.leather, 0.22, 0.22, 0.08, sx, 0.75, -1.5); cyl(M.brass, 0.02, 0.02, 0.72, sx, 0.36, -1.5, 6); box(M.leather, 0.42, 0.3, 0.05, sx, 0.95, -1.3); }
  for (const px of [-3.3, -1.7]) { cyl(M.metal, 0.005, 0.005, 2.6, px, 4.0, -2.4, 4); put(new THREE.SphereGeometry(0.28, 20, 12), M.warm, px, 2.6, -2.4); }
  // DINING (mid wing, front) — live-edge walnut table, 10 chairs, glass chandelier
  box(M.rug, 4.6, 0.02, 3.0, -2.5, 0.01, 2.4);
  box(M.walnut, 3.6, 0.1, 1.1, -2.5, 0.76, 2.4); box(M.walnut, 0.25, 0.7, 0.7, -3.6, 0.36, 2.4); box(M.walnut, 0.25, 0.7, 0.7, -1.4, 0.36, 2.4);
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
    const cx2 = -3.8 + i * 0.86, cz2 = 2.4 + s * 0.85;
    rbox(M.fabric, 0.5, 0.12, 0.5, 0.05, cx2, 0.48, cz2); rbox(M.fabric, 0.5, 0.45, 0.1, 0.05, cx2, 0.78, cz2 + s * 0.22);
    cyl(M.walnut, 0.02, 0.02, 0.44, cx2, 0.22, cz2, 6);
  }
  rbox(M.fabric, 0.5, 0.12, 0.5, 0.05, -4.65, 0.48, 2.4); rbox(M.fabric, 0.5, 0.12, 0.5, 0.05, -0.35, 0.48, 2.4);
  box(M.brass, 2.6, 0.04, 0.04, -2.5, 2.3, 2.4);
  for (let i = 0; i < 7; i++) put(new THREE.SphereGeometry(0.12, 14, 10), M.warm, -3.7 + i * 0.4, 2.15, 2.4 + (i % 2 ? 0.12 : -0.12));
  cyl(M.metal, 0.005, 0.005, 3.0, -2.5, 3.8, 2.4, 4);
  for (const cx3 of [-3.4, -1.6]) put(new THREE.CylinderGeometry(0.03, 0.03, 0.25, 8), M.warm, cx3, 0.93, 2.4);

  // MASTER BEDROOM (right wing)
  box(M.rug, 4.4, 0.02, 3.6, 15.5, 0.01, -2.2);
  rbox(M.velvet, 2.6, 1.5, 0.22, 0.06, 15.5, 1.05, -5.6);
  for (let i = 0; i < 8; i++) box(M.velvet, 0.02, 1.4, 0.02, 14.3 + i * 0.34, 1.05, -5.48);
  rbox(M.walnut, 2.1, 0.35, 2.2, 0.04, 15.5, 0.17, -4.3);
  rbox(M.fabric, 2.0, 0.28, 2.1, 0.12, 15.5, 0.48, -4.3);
  rbox(M.velvet, 2.05, 0.06, 1.0, 0.03, 15.5, 0.64, -3.75);
  for (const px of [14.9, 16.1]) rbox(M.fabric, 0.7, 0.18, 0.4, 0.08, px, 0.72, -5.1);
  rbox(M.velvet, 1.5, 0.42, 0.45, 0.06, 15.5, 0.21, -2.75);
  for (const px of [13.7, 17.3]) { box(M.trav, 0.55, 0.55, 0.45, px, 0.27, -5.3); cyl(M.brass, 0.09, 0.14, 0.4, px, 0.75, -5.3); cyl(M.warm, 0.2, 0.25, 0.3, px, 1.08, -5.3); }
  for (const [ax, az] of [[13.4, 3.4], [14.6, 3.9]]) { rbox(M.velvet, 0.9, 0.45, 0.85, 0.2, ax, 0.25, az, 0.6); rbox(M.velvet, 0.9, 0.6, 0.25, 0.12, ax - 0.15, 0.6, az - 0.3, 0.6); }
  box(M.fire, 0.4, 3.2, 3.0, 18.6, 1.6, -0.8); box(M.metal, 0.1, 0.35, 1.8, 18.38, 0.8, -0.8);
  const flame2 = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.18), M.flame); flame2.rotation.y = -Math.PI / 2; flame2.position.set(18.32, 0.78, -0.8); scene.add(flame2);

  // BATH (left wing, left half) — travertine, freestanding stone tub, walnut vanity, round mirrors
  const tubPts = []; for (let i = 0; i <= 12; i++) { const t2 = i / 12; tubPts.push(new THREE.Vector2(0.15 + 0.62 * Math.sin(t2 * Math.PI / 2) ** 0.6, t2 * 0.6)); }
  tubPts.push(new THREE.Vector2(0.68, 0.6), new THREE.Vector2(0.6, 0.3));
  put(new THREE.LatheGeometry(tubPts, 32), M.white, -15.2, 0.0, 2.6, 0, 0, 0);
  box(M.cabinet, 0.55, 0.5, 2.6, -13.45, 0.85, -2.8); box(M.trav, 0.6, 0.06, 2.7, -13.45, 1.12, -2.8);
  for (const mz of [-3.5, -2.1]) { put(new THREE.CylinderGeometry(0.42, 0.42, 0.03, 40), M.mirror, -13.2, 1.9, mz, 0, 0, Math.PI / 2); put(new THREE.TorusGeometry(0.43, 0.025, 8, 40), M.warm, -13.19, 1.9, mz, 0, Math.PI / 2, 0); }
  glassRectX(-5.5, -3.8, 0.02, 2.3, -15.0); box(M.trav, 1.98, 3.0, 0.15, -16.0, 1.5, -3.75);
  cyl(M.brass, 0.12, 0.12, 0.02, -16.0, 2.5, -4.8); cyl(M.brass, 0.015, 0.015, 1.0, -15.7, 0.5, 3.3, 6);
  for (const [cx4, cz4] of [[-16.3, 3.6], [-14.2, 3.7], [-16.4, 1.6]]) cyl(M.warm, 0.05, 0.05, 0.14, cx4, 0.07, cz4, 10);
  // SPA (left wing, right half) — indoor heated pool, teak loungers, stone
  box(M.trav, 3.6, 0.1, 9.6, -11, -0.05, -0.8);
  box(M.poolTile, 2.5, 0.05, 7.0, -11, 0.06, -0.6);
  for (const [lx, lz] of [[-12.4, 3.2], [-12.4, 1.6]]) { box(M.walnut, 0.65, 0.3, 1.5, lx, 0.15, lz); rbox(M.fabric, 0.62, 0.1, 1.2, 0.04, lx, 0.35, lz + 0.1); rbox(M.fabric, 0.62, 0.1, 0.5, 0.04, lx, 0.55, lz - 0.55); }
  box(M.soffit, 2.6, 2.4, 1.8, -11, 1.2, -5.0); box(M.warm, 1.2, 1.8, 0.02, -11, 1.1, -4.09);

  // building lights for each room (extra warm fill)
  warmLight(5.2, 2.2, -1.5, 12, 10); warmLight(-2.5, 2.0, -2.4, 8, 8); warmLight(15.5, 2.0, -3.5, 8, 8);
  const spaL = new THREE.PointLight(0x48d4e0, 4, 7, 2); spaL.position.set(-11, 0.8, -0.6); scene.add(spaL);

  /* ---------- landscape ---------- */
  // ground planes stepping down to the pool
  box(M.ground, 360, 0.4, 360, 0, -1.6, 0);
  box(M.grass, 60, 0.05, 20, 0, -1.37, -16);
  // pool basin + coping
  box(M.coping, 31.5, 0.3, 0.6, 0.5, -1.25, 10.2); box(M.coping, 31.5, 0.3, 0.6, 0.5, -1.25, 19.8);
  box(M.coping, 0.6, 0.3, 10.2, -15.5, -1.25, 15); box(M.coping, 0.6, 0.3, 10.2, 16.5, -1.25, 15);
  // rocks scattered, instanced for speed
  const rockGeo = new THREE.IcosahedronGeometry(1, 1);
  { const p = rockGeo.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n2 = 0.75 + 0.35 * Math.sin(v.x * 3.1 + v.y * 2.3) * Math.cos(v.z * 2.7); v.multiplyScalar(n2); v.y *= 0.65; p.setXYZ(i, v.x, v.y, v.z); } rockGeo.computeVertexNormals(); }
  const rng = mulberry(7);
  const rockSpots = [];
  for (let i = 0; i < 70; i++) {
    const side = rng();
    let x, z;
    if (side < 0.35) { x = -16 + rng() * 34; z = 9.8 + rng() * 0.4; }
    else if (side < 0.55) { x = -22 + rng() * 6; z = 4 + rng() * 16; }
    else if (side < 0.75) { x = 17.5 + rng() * 6; z = 4 + rng() * 16; }
    else { x = -22 + rng() * 46; z = 20.5 + rng() * 5; }
    rockSpots.push([x, z, 0.35 + rng() * 0.9]);
  }
  const rocks = new THREE.InstancedMesh(rockGeo, M.rock, rockSpots.length);
  rockSpots.forEach(([x, z, s], i) => { tmpM.compose(new THREE.Vector3(x, -1.3 + s * 0.2, z), tmpQ.setFromEuler(tmpE.set(0, rng() * 6, 0)), new THREE.Vector3(s * (1 + rng() * 0.6), s, s)); rocks.setMatrixAt(i, tmpM); });
  rocks.castShadow = rocks.receiveShadow = true; scene.add(rocks);
  // ornamental grasses + garden lights
  const tuftGeo = new THREE.ConeGeometry(0.16, 0.55, 5, 1, true);
  const tufts = new THREE.InstancedMesh(tuftGeo, new THREE.MeshStandardMaterial({ color: 0x5d5a36, roughness: 1, side: THREE.DoubleSide }), 140);
  for (let i = 0; i < 140; i++) { const sp = rockSpots[i % rockSpots.length]; tmpM.compose(new THREE.Vector3(sp[0] + (rng() - 0.5) * 2.4, -1.05, sp[1] + (rng() - 0.5) * 1.6), tmpQ.identity(), new THREE.Vector3(1, 0.6 + rng() * 0.8, 1)); tufts.setMatrixAt(i, tmpM); }
  scene.add(tufts);
  for (let i = 0; i < 26; i++) { const sp = rockSpots[(i * 3) % rockSpots.length]; put(new THREE.CylinderGeometry(0.025, 0.03, 0.18, 8), M.warm, sp[0] + 0.6, -1.1, sp[1] + 0.3); }

  // pine forest + background mountains
  const pine = (() => {
    const parts = [];
    for (let i = 0; i < 7; i++) { const r = 1.25 - i * 0.16, g = new THREE.ConeGeometry(r, 1.7, 8, 1, true); g.translate(0, 1.6 + i * 1.05, 0); parts.push(g); }
    const top = new THREE.ConeGeometry(0.25, 1.4, 6); top.translate(0, 9.2, 0); parts.push(top);
    const trunk = new THREE.CylinderGeometry(0.1, 0.18, 2, 6); trunk.translate(0, 1, 0); parts.push(trunk);
    return mergeGeometries(parts.map(g => g.toNonIndexed()));
  })();
  const pineMat = new THREE.MeshStandardMaterial({ color: 0x0f2619, roughness: 1, side: THREE.DoubleSide });
  const treeN = high ? 700 : 380;
  const trees = new THREE.InstancedMesh(pine, pineMat, treeN);
  let ti = 0, guard = 0;
  while (ti < treeN && guard++ < 6000) {
    const x = (rng() - 0.5) * 260, z = -16 - rng() * 150 + (rng() < 0.2 ? 130 : 0);
    if (z > -16 && x > -30 && x < 32) continue;
    if (z > 2 && Math.abs(x) < 50) continue;
    const s = 0.9 + rng() * 1.1;
    tmpM.compose(new THREE.Vector3(x, -1.4, z), tmpQ.setFromEuler(tmpE.set(0, rng() * 6, 0)), new THREE.Vector3(s, s * (0.9 + rng() * 0.5), s));
    trees.setMatrixAt(ti++, tmpM);
  }
  trees.count = ti; trees.castShadow = high; scene.add(trees);
  scene.add(mountains());

  // sky dome (deep blue twilight gradient)
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x041638) }, mid: { value: new THREE.Color(0x0f3a86) }, hor: { value: new THREE.Color(0x4b72b4) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform vec3 top,mid,hor; varying vec3 vP; void main(){ float h=max(vP.y,0.); vec3 c=mix(hor,mid,smoothstep(0.,.18,h)); c=mix(c,top,smoothstep(.18,.75,h)); gl_FragColor=vec4(c,1.); }',
  }));
  scene.add(sky);

  // lights: cool sky light with soft shadows + hemisphere
  scene.add(new THREE.HemisphereLight(0x6f8fc8, 0x141b26, 0.9));
  const moon = new THREE.DirectionalLight(0x9db6ff, 1.1);
  moon.position.set(-30, 45, 25); moon.castShadow = true;
  Object.assign(moon.shadow.camera, { left: -32, right: 32, top: 26, bottom: -26, near: 1, far: 140 });
  moon.shadow.bias = -0.0004; moon.shadow.normalBias = 0.03; moon.shadow.radius = 4;
  scene.add(moon);

  /* ---------- environment HDRI (Poly Haven evening_road_01, CC0) ---------- */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const hdr = await new RGBELoader(mgr).loadAsync('tex/env.hdr');
  scene.environment = pmrem.fromEquirectangular(hdr).texture; hdr.dispose();
  scene.environmentIntensity = 0.45;

  /* ---------- merge static geometry ---------- */
  for (const [mat, geos] of bins) {
    const mesh = new THREE.Mesh(mergeGeometries(geos), mat);
    mesh.castShadow = !(mat === M.warm || mat === M.flame);
    mesh.receiveShadow = true;
    scene.add(mesh);
  }
  const glassMesh = new THREE.Mesh(mergeGeometries(glassGeos.map(g => g.index ? g.toNonIndexed() : g)), glass); glassMesh.renderOrder = 2; scene.add(glassMesh);

  /* ---------- pool water with real reflections ---------- */
  const wn = tl.load('tex/waternormals.webp'); wn.wrapS = wn.wrapT = THREE.RepeatWrapping;
  let water;
  function makeWater() {
    if (water) { scene.remove(water); water.material.dispose(); water.geometry.dispose(); }
    const rt = high ? 1024 : 384;
    water = new Water(new THREE.PlaneGeometry(31, 9.2), {
      textureWidth: rt, textureHeight: rt, waterNormals: wn,
      sunDirection: moon.position.clone().normalize(), sunColor: 0x223355, waterColor: 0x02121f,
      distortionScale: 0.35, fog: true, alpha: 1,
    });
    water.rotation.x = -Math.PI / 2; water.position.set(0.5, -1.2, 15);
    water.material.uniforms.size.value = 3.5;
    scene.add(water);
  }
  makeWater();

  /* ---------- post-processing (bloom on high quality) ---------- */
  let composer = null;
  function setupComposer() {
    composer = null;
    if (!high) return;
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.32, 0.45, 0.92));
    composer.addPass(new OutputPass());
  }

  function applyQuality() {
    renderer.setPixelRatio(Math.min(devicePixelRatio, high ? 1.75 : 1));
    moon.shadow.mapSize.set(high ? 2048 : 1024, high ? 2048 : 1024);
    if (moon.shadow.map) { moon.shadow.map.dispose(); moon.shadow.map = null; }
    renderer.shadowMap.type = high ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    renderer.shadowMap.needsUpdate = true;
    trees.castShadow = high;
    makeWater(); setupComposer(); resize();
    ui.setQuality(high);
  }

  /* ---------- views ---------- */
  const V = {
    exterior: { p: [3, 0.4, 44], t: [2.5, 4.2, 0], fov: 38, orbit: true },
    aerea: { p: [-34, 26, 44], t: [1, 0, 2], fov: 40, orbit: true },
    living: { p: [8.2, 1.6, 5.0], t: [3.2, 1.9, -5], fov: 62 },
    cocina: { p: [0.2, 1.65, 0.4], t: [-3.5, 1.0, -5], fov: 62 },
    comedor: { p: [-5.0, 1.65, -0.6], t: [-1.0, 0.9, 5], fov: 62 },
    dormitorio: { p: [18.0, 1.6, 4.2], t: [14.5, 0.8, -5], fov: 62 },
    bano: { p: [-13.9, 1.55, -1.2], t: [-15.6, 0.55, 4], fov: 64 },
    spa: { p: [-9.9, 1.7, -3.6], t: [-11.4, 0.1, 4], fov: 64 },
  };
  let anim = null;
  function go(name, instant) {
    const v = V[name]; ui.setView(name);
    const p0 = camera.position.clone(), t0 = controls.target.clone(), f0 = camera.fov;
    const p1 = new THREE.Vector3(...v.p), t1 = new THREE.Vector3(...v.t);
    if (v.orbit && camera.aspect < 1) { p1.sub(t1).multiplyScalar(Math.min(1.5, 0.7 / camera.aspect)).add(t1); if (name === "exterior") p1.y += 3.2; }
    if (!v.orbit) { const dir = t1.clone().sub(p1).normalize(); t1.copy(p1).addScaledVector(dir, 0.2); }
    const setMode = () => {
      if (v.orbit) Object.assign(controls, { minDistance: 6, maxDistance: 120, enableZoom: true, enablePan: true, maxPolarAngle: Math.PI * 0.49, rotateSpeed: 0.8 });
      else Object.assign(controls, { minDistance: 0.2, maxDistance: 0.2, enableZoom: false, enablePan: false, maxPolarAngle: Math.PI * 0.9, rotateSpeed: -0.45 });
    };
    if (instant) { camera.position.copy(p1); controls.target.copy(t1); camera.fov = v.fov; camera.updateProjectionMatrix(); setMode(); return; }
    Object.assign(controls, { minDistance: 0, maxDistance: Infinity });
    anim = { t: 0, s: performance.now(), dur: 1.6, p0, t0, f0, p1, t1, f1: v.fov, done: setMode };
  }

  /* ---------- loop ---------- */
  const clock = new THREE.Clock(); let running = true, raf;
  function resize() {
    const w = ui.stage.clientWidth, h = ui.stage.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    if (composer) composer.setSize(w, h);
  }
  addEventListener('resize', resize);
  function loop() {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05), time = clock.elapsedTime;
    if (anim) {
      anim.t = (performance.now() - anim.s) / 1000 / anim.dur; const k = anim.t >= 1 ? 1 : 1 - Math.pow(1 - anim.t, 3);
      camera.position.lerpVectors(anim.p0, anim.p1, k); controls.target.lerpVectors(anim.t0, anim.t1, k);
      camera.fov = anim.f0 + (anim.f1 - anim.f0) * k; camera.updateProjectionMatrix();
      if (anim.t >= 1) { anim.done(); anim = null; }
    }
    controls.update();
    water.material.uniforms.time.value = time * 0.25;
    const fl = 0.85 + Math.sin(time * 9) * 0.08 + Math.sin(time * 23) * 0.05;
    fireLight.intensity = 14 * fl; flame.scale.y = fl; flame2.scale.y = fl;
    composer ? composer.render() : renderer.render(scene, camera);
  }

  ui.onView = go;
  ui.onQuality = () => { high = !high; applyQuality(); };
  ui.onClose = () => { running = false; cancelAnimationFrame(raf); removeEventListener('resize', resize); renderer.dispose(); ui.destroy(); };
  applyQuality();
  go(opts.view || 'exterior', true);
  ui.ready();
  loop();
  return { go };
}

/* ---------- helpers ---------- */
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function mountains() {
  const segs = 220, R = 520, pos = [], col = [], idx = [];
  const rnd = mulberry(3);
  const peaks = Array.from({ length: 16 }, () => [rnd() * Math.PI * 2, 60 + rnd() * 110, 0.12 + rnd() * 0.25]);
  const height = a => { let h = 18; for (const [pa, ph, pw] of peaks) { let d = Math.abs(((a - pa + Math.PI * 3) % (Math.PI * 2)) - Math.PI); h = Math.max(h, ph * Math.max(0, 1 - d / pw) ** 1.3); } return h + Math.sin(a * 37) * 4 + Math.sin(a * 91) * 2; };
  const snow = new THREE.Color(0xb8c8e0), rock = new THREE.Color(0x2b3a57), base = new THREE.Color(0x0f1c33);
  for (let i = 0; i <= segs; i++) {
    const a = i / segs * Math.PI * 2, h = height(a), x = Math.cos(a) * R, z = Math.sin(a) * R;
    pos.push(x, -5, z, x, h, z);
    const sn = h > 70 ? snow.clone().lerp(rock, Math.max(0, (120 - h) / 120)) : rock; col.push(base.r, base.g, base.b, sn.r, sn.g, sn.b);
    if (i < segs) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, fog: true }));
  m.position.z = -160;
  return m;
}

function buildUI(root) {
  const views = [['exterior', 'Exterior'], ['aerea', 'Aérea'], ['living', 'Living'], ['cocina', 'Cocina'], ['comedor', 'Comedor'], ['dormitorio', 'Dormitorio'], ['bano', 'Baño'], ['spa', 'Spa']];
  root.innerHTML = `
  <div class="v3-stage"></div>
  <div class="v3-top"><span class="v3-brand">MONTEVAR · 3D</span>
    <div class="v3-right"><button class="v3-q" aria-label="Cambiar calidad gráfica"></button><button class="v3-x" aria-label="Cerrar recorrido 3D">✕</button></div></div>
  <div class="v3-views" role="tablist">${views.map(([k, n]) => `<button data-v="${k}">${n}</button>`).join('')}</div>
  <div class="v3-help">Arrastrá para mirar alrededor</div>
  <div class="v3-load"><div class="v3-l-t">Cargando la casa…</div><div class="v3-bar"><i></i></div></div>`;
  const q = s => root.querySelector(s);
  const ui = {
    stage: q('.v3-stage'), onView() { }, onQuality() { }, onClose() { },
    progress(p) { const b = q('.v3-bar i'); if (b) b.style.width = Math.round(p * 100) + '%'; },
    ready() { q('.v3-load').classList.add('done'); },
    setView(k) { root.querySelectorAll('.v3-views button').forEach(b => b.setAttribute('aria-selected', b.dataset.v === k)); q('.v3-help').textContent = (k === 'exterior' || k === 'aerea') ? 'Arrastrá para girar · pellizcá para acercar' : 'Arrastrá para mirar alrededor'; },
    setQuality(h) { q('.v3-q').textContent = h ? 'Calidad: Alta' : 'Calidad: Fluida'; },
    destroy() { root.innerHTML = ''; root.hidden = true; document.documentElement.style.overflow = ''; },
  };
  root.querySelectorAll('.v3-views button').forEach(b => b.onclick = () => ui.onView(b.dataset.v));
  q('.v3-q').onclick = () => ui.onQuality();
  q('.v3-x').onclick = () => ui.onClose();
  return ui;
}
