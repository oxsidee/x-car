// Модель ВАЗ-21310 (Нива 2131, 5 дверей) по чертежу the-blueprints.com (масштаб по базе 2700 мм) и фото 2004 г.
// Габариты: длина ≈ 4140 мм по бамперам (4220 по паспорту), ширина 1680, высота 1640, база 2700, колея 1440/1420.
// Ось x — вперёд, y — вверх, z — вправо. Метры.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const DIM = { FRONT_AXLE: 1.30, REAR_AXLE: -1.40, WHEEL_R: 0.345, TRACK: 0.72, BELT: 1.11, ROOF: 1.635 };

// Пересчёт старой раскладки агрегатов в пропорции чертежа (те же опорные точки, что и для трасс в data.js)
const ANCH = [[-2.14, -2.18], [-2.06, -2.11], [-1.40, -1.40], [-0.93, -1.15], [0.0, -0.25], [1.02, 0.88], [1.10, 0.95], [1.30, 1.30], [2.07, 1.85], [2.14, 1.96]];
const MX = x => { for (let i = 0; i < ANCH.length - 1; i++) { const [a, b] = ANCH[i], [c, d] = ANCH[i + 1]; if (x >= a && x <= c) return b + (x - a) * (d - b) / (c - a); } return x < ANCH[0][0] ? ANCH[0][1] + x - ANCH[0][0] : ANCH.at(-1)[1] + x - ANCH.at(-1)[0]; };
const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function buildNiva() {
  const groups = { body: new THREE.Group(), trim: new THREE.Group(), glass: new THREE.Group(), interior: new THREE.Group(), mech: new THREE.Group(), wheels: new THREE.Group() };
  const root = new THREE.Group();
  Object.values(groups).forEach(g => root.add(g));

  // ---------- Материалы ----------
  const paint = new THREE.MeshPhysicalMaterial({ color: 0xc9d1d8, metalness: 0.35, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false });
  const edge = new THREE.LineBasicMaterial({ color: 0xc4d2dc, transparent: true, opacity: 0.5 });
  const seam = new THREE.LineBasicMaterial({ color: 0xe0e8ee, transparent: true, opacity: 0.38 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x6f9fc2, metalness: 0, roughness: 0.05, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false });
  const plastic = new THREE.MeshStandardMaterial({ color: 0x1a1d20, roughness: 0.7, transparent: true, opacity: 0.55, depthWrite: false });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xe6eaee, metalness: 1, roughness: 0.18, transparent: true, opacity: 0.75 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x16191b, roughness: 0.95 });
  const steelRim = new THREE.MeshStandardMaterial({ color: 0xb7bec4, metalness: 0.6, roughness: 0.35 });
  const lensRed = new THREE.MeshStandardMaterial({ color: 0xc8212b, emissive: 0x3a0508, roughness: 0.3, transparent: true, opacity: 0.88 });
  const lensAmber = new THREE.MeshStandardMaterial({ color: 0xf29a1f, emissive: 0x4a2804, roughness: 0.3, transparent: true, opacity: 0.9 });
  const lensClear = new THREE.MeshStandardMaterial({ color: 0xeef4f8, emissive: 0x1c2328, roughness: 0.1, transparent: true, opacity: 0.7 });
  const heatLine = new THREE.LineBasicMaterial({ color: 0xd9824a, transparent: true, opacity: 0.8 });
  const mech = new THREE.MeshStandardMaterial({ color: 0x5c6a75, roughness: 0.75, metalness: 0.2, transparent: true, opacity: 0.4, depthWrite: false });
  const mechDark = new THREE.MeshStandardMaterial({ color: 0x2c3237, roughness: 0.8, transparent: true, opacity: 0.55, depthWrite: false });
  const trimIn = new THREE.MeshStandardMaterial({ color: 0x3a4248, roughness: 0.9, transparent: true, opacity: 0.32, depthWrite: false });
  const panelMat = new THREE.MeshStandardMaterial({ color: 0x5c6a75, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false });

  const add = (g, geo, mat, pos, rot) => { const m = new THREE.Mesh(geo, mat); if (pos) m.position.set(...pos); if (rot) m.rotation.set(...rot); g.add(m); return m; };
  const rbox = (g, size, pos, mat, r = 0.02) => add(g, new RoundedBoxGeometry(size[0], size[1], size[2], 3, Math.min(r, Math.min(...size) / 2.05)), mat, pos);
  const bar = (g, a, b, r, mat, seg = 10) => {
    const va = V(...a), vb = V(...b);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, va.distanceTo(vb), seg), mat);
    m.position.copy(va).add(vb).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(V(0, 1, 0), vb.clone().sub(va).normalize());
    g.add(m); return m;
  };
  const polyline = (g, pts, mat, closed = false) => {
    const p = pts.map(a => V(...a)); if (closed) p.push(p[0].clone());
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(p), mat));
  };

  const { FRONT_AXLE: FA, REAR_AXLE: RA, WHEEL_R: WR, BELT, ROOF } = DIM;
  const AR = 0.47, AY = 0.36, SILL = 0.40, BW = 1.61, HALF = BW / 2 + 0.025;

  // Задок: вертикальная часть до 0,99 м, выше — наклонная дверь задка до крыши
  const REAR_V = -2.09, REAR_TOP = [-1.755, 1.53];
  const rearX = y => y <= 0.99 ? REAR_V : REAR_V + (y - 0.99) / (REAR_TOP[1] - 0.99) * (REAR_TOP[0] - REAR_V);
  // Капот: от 1,03 м у передка до 1,145 м у ветрового стекла
  const onRear = (y, z, out = 0.004) => [rearX(y) - out, y, z];
  const onRearP = (y, z) => [rearX(y) - 0.024, y, z];
  const hoodY = x => 1.035 + (1.80 - x) / (1.80 - 0.90) * 0.11;

  // ---------- Нижняя часть кузова ----------
  const lower = new THREE.Shape();
  lower.moveTo(REAR_V - 0.01, 0.48);
  lower.lineTo(-1.92, SILL + 0.02);
  lower.absarc(RA, AY, AR, Math.PI, 0, true);
  lower.lineTo(RA + AR, SILL); lower.lineTo(FA - AR, SILL);
  lower.absarc(FA, AY, AR, Math.PI, 0, true);
  lower.lineTo(1.80, 0.46); lower.lineTo(1.85, 0.49);
  lower.lineTo(1.855, 0.98); lower.quadraticCurveTo(1.86, 1.035, 1.80, hoodY(1.80));
  lower.lineTo(0.92, hoodY(0.92)); lower.lineTo(0.88, BELT + 0.03); lower.lineTo(0.86, BELT);
  lower.lineTo(rearX(BELT), BELT); lower.lineTo(REAR_V, 0.99); lower.lineTo(REAR_V - 0.01, 0.48);
  const lowerGeo = new THREE.ExtrudeGeometry(lower, { depth: BW, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 4, curveSegments: 40 });
  lowerGeo.translate(0, 0, -BW / 2);
  planShape(lowerGeo, false);
  add(groups.body, lowerGeo, paint).renderOrder = 10;
  groups.body.add(new THREE.LineSegments(new THREE.EdgesGeometry(lowerGeo, 28), edge));

  // ---------- Верх: стекло, крыша, стойки ----------
  const GW = 1.50, TUMBLE = 0.09;
  const zAt = y => (GW / 2 + 0.02) * (1 - TUMBLE * THREE.MathUtils.clamp((y - BELT) / (ROOF - BELT), 0, 1));
  function planShape(geo, tumble) {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i); let z = p.getZ(i);
      if (x > 1.74) z *= 1 - (x - 1.74) * 0.25;
      if (x < -2.02) z *= 1 - (-2.02 - x) * 0.4;
      if (tumble) z *= 1 - TUMBLE * THREE.MathUtils.clamp((y - BELT) / (ROOF - BELT), 0, 1);
      p.setZ(i, z);
    }
    geo.computeVertexNormals();
  }
  const gh = new THREE.Shape();
  gh.moveTo(0.86, BELT); gh.lineTo(0.465, 1.585); gh.quadraticCurveTo(0.42, ROOF, 0.32, ROOF);
  gh.lineTo(-1.50, ROOF); gh.quadraticCurveTo(-1.70, ROOF, REAR_TOP[0], REAR_TOP[1]); gh.lineTo(rearX(BELT), BELT); gh.lineTo(0.86, BELT);
  const ghGeo = new THREE.ExtrudeGeometry(gh, { depth: GW, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: 16 });
  ghGeo.translate(0, 0, -GW / 2);
  planShape(ghGeo, true);
  add(groups.glass, ghGeo, glass).renderOrder = 11;

  // Крыша
  const rs = new THREE.Shape(), RW = zAt(ROOF) - 0.02;
  rs.moveTo(0.36, -RW); rs.lineTo(-1.52, -RW); rs.quadraticCurveTo(-1.64, -RW, -1.64, -RW + 0.08);
  rs.lineTo(-1.64, RW - 0.08); rs.quadraticCurveTo(-1.64, RW, -1.52, RW); rs.lineTo(0.36, RW);
  rs.quadraticCurveTo(0.44, RW, 0.44, RW - 0.08); rs.lineTo(0.44, -RW + 0.08); rs.quadraticCurveTo(0.44, -RW, 0.36, -RW);
  const roofGeo = new THREE.ExtrudeGeometry(rs, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.03, bevelSegments: 3 });
  roofGeo.rotateX(Math.PI / 2); roofGeo.translate(0, ROOF + 0.025, 0);
  add(groups.body, roofGeo, paint).renderOrder = 10;
  groups.body.add(new THREE.LineSegments(new THREE.EdgesGeometry(roofGeo, 30), edge));

  [-1, 1].forEach(s => {
    const w = (x, y, out = 0.006) => [x, y, s * (zAt(y) + out)];
    // Водосток
    bar(groups.trim, w(0.42, ROOF - 0.005, 0.0), w(-1.62, ROOF - 0.005, 0.0), 0.008, chrome, 6);
    // Стойки A, B, C и широкая задняя (D)
    bar(groups.body, w(0.86, BELT + 0.01, -0.01), w(0.46, 1.59, -0.01), 0.032, paint, 8);
    [[-0.255, 0.07], [-1.16, 0.10]].forEach(([x, wd]) => { const p = rbox(groups.body, [wd, ROOF - BELT - 0.03, 0.04], [x, (BELT + ROOF) / 2, s * (zAt(1.37) - 0.012)], paint, 0.015); p.rotation.x = s * 0.07; });
    const dShape = new THREE.Shape();
    dShape.moveTo(-1.74, BELT); dShape.lineTo(rearX(BELT), BELT); dShape.lineTo(REAR_TOP[0], REAR_TOP[1]); dShape.quadraticCurveTo(-1.70, ROOF - 0.02, -1.60, ROOF - 0.02); dShape.lineTo(-1.60, 1.545); dShape.lineTo(-1.74, BELT);
    const dGeo = new THREE.ShapeGeometry(dShape); const dm = add(groups.body, dGeo, paint, [0, 0, s * (zAt(1.37) + 0.004)]);
    // Жалюзи вытяжной вентиляции на задней стойке
    for (let i = 0; i < 3; i++) rbox(groups.trim, [0.06, 0.015, 0.01], [-1.70 - i * 0.03, 1.47 - i * 0.05, s * (zAt(1.4) + 0.012)], plastic, 0.005);
    // Рамки окон: передняя дверь, задняя дверь, форточка багажника
    polyline(groups.trim, [w(0.83, 1.13), w(0.48, 1.555), w(-0.22, 1.555), w(-0.22, 1.13)], seam, true);
    polyline(groups.trim, [w(-0.29, 1.13), w(-0.29, 1.555), w(-1.11, 1.555), w(-1.11, 1.13)], seam, true);
    polyline(groups.trim, [w(-1.21, 1.13), w(-1.21, 1.545), w(-1.60, 1.545), w(-1.74, 1.13)], seam, true);
    bar(groups.trim, w(0.84, BELT + 0.012, 0.002), w(rearX(BELT) + 0.06, BELT + 0.012, 0.002), 0.007, plastic, 6);
  });

  // Наклонная часть задка: окрашенные поля по бокам и над стеклом двери задка
  const quad = (a, b, c, d) => { const g = new THREE.BufferGeometry().setFromPoints([V(...a), V(...b), V(...c), V(...d)]); g.setIndex([0, 1, 2, 0, 2, 3]); g.computeVertexNormals(); return add(groups.body, g, paint); };
  [-1, 1].forEach(s => quad(onRearP(BELT, s * 0.56), onRearP(BELT, s * zAt(BELT)), onRearP(1.52, s * zAt(1.52)), onRearP(1.52, s * 0.52)));
  quad(onRearP(1.43, -0.56), onRearP(1.43, 0.56), onRearP(1.52, 0.6), onRearP(1.52, -0.6));
  quad(onRearP(BELT, -0.56), onRearP(BELT, 0.56), onRearP(1.06, 0.56), onRearP(1.06, -0.56));
  // Ветровое стекло: рамка, щётки
  polyline(groups.trim, [[0.865, 1.135, -0.67], [0.865, 1.135, 0.67], [0.475, 1.58, 0.615], [0.475, 1.58, -0.615]], seam, true);
  [[-0.40, -0.06], [0.12, 0.46]].forEach(([z0, z1]) => bar(groups.trim, [0.89, 1.15, z0], [0.74, 1.30, z1 - 0.06], 0.006, plastic, 6));
  // Дверь задка: наклонное стекло с нитями обогрева, щётка, ручка, ниша номера
  polyline(groups.trim, [onRear(0.55, -0.60), onRear(0.55, 0.60), onRear(0.99, 0.60), onRear(1.50, 0.56), onRear(1.50, -0.56), onRear(0.99, -0.60)], seam, true);
  polyline(groups.trim, [onRear(1.06, -0.56), onRear(1.06, 0.56), onRear(1.43, 0.52), onRear(1.43, -0.52)], seam, true);
  for (let i = 0; i < 9; i++) { const y = 1.10 + i * 0.037; polyline(groups.trim, [onRear(y, -0.50 + i * 0.002, 0.006), onRear(y, 0.50 - i * 0.002, 0.006)], heatLine); }
  bar(groups.trim, onRear(1.06, 0, 0.012), onRear(1.36, -0.32, 0.012), 0.006, plastic, 6);
  rbox(groups.trim, [0.02, 0.21, 0.66], [REAR_V - 0.02, 0.755, 0.02], plastic, 0.01);
  rbox(groups.trim, [0.015, 0.11, 0.52], [REAR_V - 0.03, 0.735, 0.02], lensClear, 0.006);
  rbox(groups.trim, [0.03, 0.03, 0.12], [REAR_V - 0.025, 0.62, 0], chrome, 0.01);

  // ---------- Боковины: двери, молдинги, арки ----------
  [-1, 1].forEach(s => {
    const z = s * HALF;
    polyline(groups.trim, [[0.72, SILL + 0.02, z], [0.72, BELT - 0.01, z], [-0.26, BELT - 0.01, z], [-0.26, SILL + 0.02, z]], seam, true);
    polyline(groups.trim, [[-0.29, SILL + 0.02, z], [-0.29, BELT - 0.01, z], [-1.14, BELT - 0.01, z], [-1.14, 0.84, z], [-1.03, 0.68, z], [-0.95, SILL + 0.02, z]], seam, true);
    polyline(groups.trim, [[1.85, 0.92, z * 0.97], [rearX(0.92) + 0.02, 0.92, z]], seam);       // продольное ребро
    rbox(groups.trim, [0.11, 0.028, 0.025], [-0.13, 1.02, s * (HALF + 0.01)], chrome, 0.01);
    rbox(groups.trim, [0.11, 0.028, 0.025], [-1.02, 1.02, s * (HALF + 0.01)], chrome, 0.01);
    rbox(groups.trim, [1.70, 0.085, 0.022], [-0.08, 0.545, s * (HALF + 0.006)], plastic, 0.01);   // чёрный молдинг дверей
    rbox(groups.trim, [1.70, 0.05, 0.03], [-0.08, SILL + 0.025, s * (HALF + 0.004)], plastic, 0.012); // порог
    [FA, RA].forEach(x => { const t = add(groups.body, new THREE.TorusGeometry(AR + 0.025, 0.03, 8, 40, Math.PI), paint, [x, AY, s * (HALF - 0.012)]); t.scale.z = 1.5; });
    // Зеркала на дверях
    bar(groups.trim, [0.78, 1.15, s * 0.79], [0.76, 1.19, s * 0.88], 0.012, plastic, 6);
    rbox(groups.trim, [0.05, 0.11, 0.15], [0.77, 1.20, s * 0.93], plastic, 0.02);
    // Повторители поворота на переднем крыле
    rbox(groups.trim, [0.06, 0.025, 0.012], [1.02, 0.92, s * (HALF + 0.004)], lensAmber, 0.008);
    // Брызговики: большие задние, небольшие передние
    add(groups.trim, new THREE.BoxGeometry(0.012, 0.30, 0.24), plastic, [RA - 0.50, 0.30, s * 0.70]);
    add(groups.trim, new THREE.BoxGeometry(0.012, 0.16, 0.20), plastic, [FA - 0.50, 0.32, s * 0.70]);
  });
  // Капот
  polyline(groups.trim, [[0.93, hoodY(0.93) + 0.004, -0.77], [1.79, hoodY(1.79) + 0.006, -0.75], [1.79, hoodY(1.79) + 0.006, 0.75], [0.93, hoodY(0.93) + 0.004, 0.77]], seam, true);
  [-0.40, 0.40].forEach(z => polyline(groups.trim, [[0.95, hoodY(0.95) + 0.006, z], [1.78, hoodY(1.78) + 0.008, z * 0.96]], seam));
  add(groups.trim, new THREE.CircleGeometry(0.05, 24), plastic, [-1.70, 0.96, HALF + 0.006]);           // лючок бензобака справа

  // ---------- Передок ----------
  const FX = 1.872;
  rbox(groups.trim, [0.025, 0.27, 1.42], [FX, 0.69, 0], plastic, 0.012);                    // чёрная облицовка
  for (let i = 0; i < 6; i++) rbox(groups.trim, [0.01, 0.011, 0.74], [FX + 0.016, 0.60 + i * 0.038, 0], chrome, 0.004);
  add(groups.trim, new THREE.CircleGeometry(0.032, 3), chrome, [FX + 0.024, 0.69, 0], [0, Math.PI / 2, Math.PI]);
  [-1, 1].forEach(s => {
    const z = s * 0.57;
    add(groups.trim, new THREE.TorusGeometry(0.098, 0.013, 10, 40), chrome, [FX + 0.012, 0.70, z], [0, Math.PI / 2, 0]);
    add(groups.trim, new THREE.SphereGeometry(0.092, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), lensClear, [FX - 0.012, 0.70, z], [0, 0, -Math.PI / 2]);
    rbox(groups.trim, [0.03, 0.08, 0.24], [FX - 0.002, 0.89, s * 0.585], lensAmber, 0.012);   // подфарник с указателем НАД фарой
  });
  rbox(groups.trim, [0.08, 0.10, 1.62], [1.93, 0.49, 0], plastic, 0.03);                     // передний бампер
  [-1, 1].forEach(s => { const c = rbox(groups.trim, [0.20, 0.10, 0.08], [1.85, 0.49, s * 0.81], plastic, 0.03); c.rotation.y = s * 0.45; });
  rbox(groups.trim, [0.01, 0.11, 0.52], [1.975, 0.40, 0], lensClear, 0.006);                 // номер

  // ---------- Задок ----------
  [-1, 1].forEach(s => {
    const z = s * 0.67, x = REAR_V - 0.018;
    rbox(groups.trim, [0.03, 0.10, 0.17], [x, 0.81, z], lensAmber, 0.012);   // поворот
    rbox(groups.trim, [0.03, 0.10, 0.17], [x, 0.71, z], lensRed, 0.012);     // габарит/стоп
    rbox(groups.trim, [0.03, 0.05, 0.17], [x, 0.635, z], lensClear, 0.008);  // задний ход
    rbox(groups.trim, [0.03, 0.05, 0.17], [x, 0.585, z], lensRed, 0.008);    // ПТФ / отражатель
  });
  rbox(groups.trim, [0.08, 0.09, 1.62], [-2.15, 0.475, 0], plastic, 0.03);   // задний бампер
  [-1, 1].forEach(s => { const c = rbox(groups.trim, [0.18, 0.09, 0.08], [-2.08, 0.475, s * 0.81], plastic, 0.03); c.rotation.y = -s * 0.45; });
  bar(groups.trim, [-2.00, 0.30, 0.50], [-2.20, 0.30, 0.50], 0.026, chrome, 12);

  // ---------- Колёса 175/80 R16, штампованные диски ----------
  const tireGeo = new THREE.LatheGeometry([[0.205, -0.075], [0.29, -0.088], [0.33, -0.085], [0.345, -0.06], [0.346, 0], [0.345, 0.06], [0.33, 0.085], [0.29, 0.088], [0.205, 0.075]].map(([r, y]) => new THREE.Vector2(r, y)), 48);
  const lugGeo = new THREE.BoxGeometry(0.035, 0.018, 0.075);
  [FA, RA].forEach(x => [-1, 1].forEach(s => {
    const w = new THREE.Group(); w.position.set(x, WR, s * DIM.TRACK);
    const tire = new THREE.Mesh(tireGeo, rubber); tire.rotation.x = Math.PI / 2; w.add(tire);
    for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2, lug = new THREE.Mesh(lugGeo, rubber); lug.position.set(Math.cos(a) * 0.347, Math.sin(a) * 0.347, i % 2 ? 0.035 : -0.035); lug.rotation.z = a + Math.PI / 2; w.add(lug); }
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.15, 36, 1, true), steelRim); rim.rotation.x = Math.PI / 2; w.add(rim);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.2, 36), steelRim); disc.position.z = s * 0.045; disc.rotation.y = s > 0 ? 0 : Math.PI; w.add(disc);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2, hole = new THREE.Mesh(new THREE.CircleGeometry(0.03, 16), rubber); hole.position.set(Math.cos(a) * 0.14, Math.sin(a) * 0.14, s * 0.047); hole.rotation.y = disc.rotation.y; w.add(hole); }
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.03, 24), chrome); cap.rotation.x = Math.PI / 2; cap.position.z = s * 0.06; w.add(cap);
    groups.wheels.add(w);
  }));

  // ---------- Салон и агрегаты (раскладка пересчитана функцией MX) ----------
  const I = groups.interior, M = groups.mech;
  const rb = (g, size, [x, y, z], mat, r) => rbox(g, size, [MX(x), y, z], mat, r);
  const br = (g, [ax, ay, az], [bx, by, bz], r, mat, seg) => bar(g, [MX(ax), ay, az], [MX(bx), by, bz], r, mat, seg);
  rb(I, [0.24, 0.22, 1.46], [0.96, 0.94, 0], trimIn, 0.05);
  rb(I, [0.12, 0.10, 0.40], [0.84, 1.05, -0.36], trimIn, 0.04);
  rb(I, [0.30, 0.30, 0.20], [0.80, 0.62, 0.0], trimIn, 0.04);
  { const sw = add(I, new THREE.TorusGeometry(0.19, 0.016, 10, 48), mechDark, [MX(0.62), 1.0, -0.36], [0, Math.PI / 2, 0]); sw.rotation.z = 0.45; }
  br(I, [0.64, 1.0, -0.36], [0.90, 0.88, -0.36], 0.025, mechDark);
  br(I, [0.66, 0.46, 0.0], [0.58, 0.82, 0.02], 0.008, mechDark);
  br(I, [0.58, 0.46, 0.08], [0.52, 0.72, 0.10], 0.007, mechDark);
  br(I, [0.62, 0.46, 0.12], [0.56, 0.70, 0.14], 0.007, mechDark);
  [-0.36, 0.36].forEach(z => {
    rb(I, [0.48, 0.12, 0.48], [0.18, 0.64, z], trimIn, 0.05);
    rb(I, [0.10, 0.62, 0.48], [-0.08, 0.96, z], trimIn, 0.05).rotation.z = 0.18;
    rb(I, [0.08, 0.16, 0.26], [-0.14, 1.34, z], trimIn, 0.04);
  });
  rb(I, [0.46, 0.12, 1.32], [-0.66, 0.64, 0], trimIn, 0.05);
  rb(I, [0.10, 0.56, 1.32], [-0.92, 0.95, 0], trimIn, 0.05).rotation.z = 0.14;
  [-0.42, -0.30, -0.20].forEach(z => br(I, [0.98, 0.80, z], [0.86, 0.52, z], 0.008, mechDark));
  add(I, new THREE.BoxGeometry(2.95, 0.01, 1.50), panelMat, [-0.55, 0.42, 0]);
  add(I, new THREE.BoxGeometry(0.01, 0.46, 1.50), panelMat, [0.95, 0.86, 0]);
  add(I, new THREE.BoxGeometry(0.62, 0.01, 1.40), panelMat, [-1.75, 0.62, 0]);

  rb(M, [0.44, 0.40, 0.36], [1.48, 0.70, 0], mech, 0.03);
  rb(M, [0.42, 0.12, 0.30], [1.48, 0.95, 0], mech, 0.02);
  rb(M, [0.40, 0.06, 0.24], [1.48, 1.03, -0.02], mechDark, 0.02);
  rb(M, [0.40, 0.09, 0.10], [1.46, 1.00, 0.21], mech, 0.02);
  rb(M, [0.06, 0.10, 0.10], [1.19, 1.00, 0.20], mech, 0.01);
  rb(M, [0.24, 0.14, 0.28], [1.88, 0.95, -0.47], mechDark, 0.03);
  br(M, [1.58, 1.0, -0.38], [1.24, 1.00, 0.13], 0.04, mechDark, 14);
  rbox(M, [0.04, 0.42, 0.66], [1.77, 0.76, 0], mech, 0.01);
  [-0.25, 0.25].forEach(z => { add(M, new THREE.TorusGeometry(0.15, 0.012, 8, 32), mechDark, [1.70, 0.74, z], [0, Math.PI / 2, 0]); for (let i = 0; i < 5; i++) { const b = add(M, new THREE.BoxGeometry(0.01, 0.13, 0.05), mechDark, [1.70, 0.74, z]); b.rotation.x = (i / 5) * Math.PI * 2; b.translateY(0.07); } });
  add(M, new THREE.CylinderGeometry(0.11, 0.11, 0.08, 24), mechDark, [MX(1.15), 0.95, -0.42], [0, 0, Math.PI / 2]);
  rb(M, [0.10, 0.16, 0.10], [1.40, 0.98, 0.60], mech, 0.02);
  rb(M, [0.12, 0.18, 0.10], [1.26, 0.84, -0.70], mech, 0.02);
  rb(M, [0.54, 0.22, 0.24], [0.94, 0.56, 0], mech, 0.03);
  rb(M, [0.26, 0.20, 0.30], [0.36, 0.44, 0.08], mech, 0.03);
  br(M, [0.46, 0.40, 0.12], [1.30, 0.36, 0.12], 0.024, mech);
  bar(M, [MX(0.24), 0.40, 0.06], [RA, 0.36, 0.05], 0.03, mech);
  rbox(M, [0.22, 0.20, 0.22], [FA, 0.33, 0.12], mech, 0.04);
  bar(M, [RA, WR, -0.66], [RA, WR, 0.66], 0.04, mech);
  add(M, new THREE.SphereGeometry(0.12, 16, 12), mech, [RA, WR, 0.05]);
  [-1, 1].forEach(s => bar(M, [FA, 0.36, 0.12], [FA, WR, s * 0.64], 0.025, mech));
  br(M, [1.04, 0.56, 0.30], [0.80, 0.34, 0.36], 0.026, mech); br(M, [0.80, 0.34, 0.36], [-0.40, 0.30, 0.42], 0.026, mech);
  add(M, new THREE.CylinderGeometry(0.06, 0.06, 0.40, 16), mech, [MX(-0.20), 0.30, 0.42], [0, 0, Math.PI / 2]);
  br(M, [-0.40, 0.30, 0.42], [-1.55, 0.30, 0.48], 0.026, mech);
  rbox(M, [0.40, 0.16, 0.26], [-1.78, 0.32, 0.46], mech, 0.04);
  rbox(M, [0.46, 0.20, 0.70], [-1.62, 0.52, 0.10], mech, 0.04);


  // =====================================================================
  // ---------- Детализация (геометрия без текстур) ----------
  // =====================================================================
  const tube = (g, pts, r, mat, closed = false, seg) => {
    const c = new THREE.CatmullRomCurve3(pts.map(p => V(...p)), closed, 'centripetal');
    const m = new THREE.Mesh(new THREE.TubeGeometry(c, seg || Math.max(12, pts.length * 10), r, 8, closed), mat); g.add(m); return m;
  };
  const seal = (pts, r = 0.008) => {                     // резиновый уплотнитель по контуру стекла
    const path = new THREE.CurvePath();
    const P = pts.map(p => V(...p));
    P.forEach((p, i) => path.add(new THREE.LineCurve3(p, P[(i + 1) % P.length])));
    groups.trim.add(new THREE.Mesh(new THREE.TubeGeometry(path, P.length * 12, r, 6, false), plastic));
  };
  const helix = (g, [x, y0, z], y1, r, turns, wr, mat) => {
    const pts = []; const n = turns * 18;
    for (let i = 0; i <= n; i++) { const t = i / n, a = t * turns * Math.PI * 2; pts.push(V(x + Math.cos(a) * r, y0 + (y1 - y0) * t, z + Math.sin(a) * r)); }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 2, wr, 6), mat));
  };
  const disc = (g, [x, y, z], r, w, mat, axis = 'z') => { const m = add(g, new THREE.CylinderGeometry(r, r, w, 28), mat, [x, y, z]); if (axis === 'z') m.rotation.x = Math.PI / 2; else if (axis === 'x') m.rotation.z = Math.PI / 2; return m; };
  const steel = new THREE.MeshStandardMaterial({ color: 0x8a959e, metalness: 0.7, roughness: 0.35, transparent: true, opacity: 0.6, depthWrite: false });
  const spring = new THREE.MeshStandardMaterial({ color: 0x3b4a58, metalness: 0.5, roughness: 0.5, transparent: true, opacity: 0.75 });
  const rubberT = new THREE.MeshStandardMaterial({ color: 0x15181a, roughness: 0.9, transparent: true, opacity: 0.7, depthWrite: false });
  const brake = new THREE.MeshStandardMaterial({ color: 0x7d8186, metalness: 0.8, roughness: 0.45, transparent: true, opacity: 0.8 });

  // --- Уплотнители стёкол ---
  [-1, 1].forEach(s => {
    const w = (x, y) => [x, y, s * (zAt(y) + 0.008)];
    seal([w(0.83, 1.13), w(0.48, 1.555), w(-0.22, 1.555), w(-0.22, 1.13)]);
    seal([w(-0.29, 1.13), w(-0.29, 1.555), w(-1.11, 1.555), w(-1.11, 1.13)]);
    seal([w(-1.21, 1.13), w(-1.21, 1.545), w(-1.60, 1.545), w(-1.74, 1.13)]);
  });
  seal([[0.865, 1.135, -0.67], [0.865, 1.135, 0.67], [0.475, 1.58, 0.615], [0.475, 1.58, -0.615]], 0.01);
  seal([onRear(1.06, -0.56, 0.008), onRear(1.06, 0.56, 0.008), onRear(1.43, 0.52, 0.008), onRear(1.43, -0.52, 0.008)], 0.01);

  // --- Щётки и решётка воздухозаборника ---
  const cowl = rbox(groups.trim, [0.07, 0.012, 1.34], [0.915, 1.152, 0], plastic, 0.005); cowl.rotation.z = -0.3;
  for (let i = 0; i < 14; i++) rbox(groups.trim, [0.04, 0.004, 0.012], [0.915, 1.16, -0.6 + i * 0.09], rubberT, 0.002);
  [[-0.40, -0.06], [0.12, 0.46]].forEach(([z0, z1]) => {
    disc(groups.trim, [0.895, 1.155, z0], 0.014, 0.025, plastic, 'y');
    const a = V(0.74, 1.30, z1 - 0.06), b = V(0.86, 1.18, z1 - 0.40), blade = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, a.distanceTo(b)), rubberT);
    blade.position.copy(a).add(b).multiplyScalar(0.5); blade.lookAt(b); groups.trim.add(blade);
  });
  // Зеркало заднего вида и солнцезащитные козырьки
  bar(groups.interior, [0.47, 1.57, 0], [0.45, 1.53, 0], 0.008, plastic);
  rbox(groups.interior, [0.03, 0.06, 0.22], [0.44, 1.50, 0], plastic, 0.015);
  [-0.38, 0.38].forEach(z => { const v = rbox(groups.interior, [0.16, 0.012, 0.34], [0.36, 1.585, z], trimIn, 0.006); v.rotation.z = 0.15; });

  // --- Ручки, замки, рёбра кузова ---
  [-1, 1].forEach(s => {
    const zz = s * (HALF + 0.022);
    [[-0.13, true], [-1.02, false]].forEach(([x, lock]) => {
      disc(groups.trim, [x + 0.05, 1.02, zz], 0.009, 0.01, chrome);                       // кнопка ручки
      if (lock) disc(groups.trim, [x + 0.12, 1.02, zz], 0.011, 0.012, chrome);             // личинка замка
    });
    bar(groups.trim, [1.84, 0.92, s * (HALF - 0.01)], [rearX(0.92) + 0.03, 0.92, s * (HALF + 0.003)], 0.006, paint, 6); // продольное ребро
    // Зеркальный элемент
    add(groups.trim, new THREE.PlaneGeometry(0.13, 0.09), chrome, [0.745, 1.20, s * 0.93], [0, -Math.PI / 2, 0]);
    // Подкрылки
    [FA, RA].forEach(x => { const l = add(groups.trim, new THREE.CylinderGeometry(AR - 0.02, AR - 0.02, 0.24, 28, 1, true, -Math.PI / 2, Math.PI), rubberT, [x, AY, s * 0.69]); l.rotation.x = Math.PI / 2; l.rotation.y = Math.PI / 2; });
  });
  // Капот: штампованные рёбра
  [-0.40, 0.40].forEach(z => bar(groups.body, [0.95, hoodY(0.95) + 0.008, z], [1.78, hoodY(1.78) + 0.01, z * 0.96], 0.007, paint, 6));
  // Крыша: поперечные выштамповки
  [0.0, -0.55, -1.10].forEach(x => rbox(groups.body, [0.05, 0.008, zAt(ROOF) * 1.7], [x, ROOF + 0.03, 0], paint, 0.004));

  // --- Передок: облицовка, фары, проушины ---
  rbox(groups.trim, [0.01, 0.20, 0.72], [FX - 0.004, 0.69, 0], rubberT, 0.004);              // фон решётки
  [-0.37, -0.12, 0.12, 0.37].forEach(z => rbox(groups.trim, [0.012, 0.21, 0.012], [FX + 0.018, 0.69, z], chrome, 0.004));
  { const em = new THREE.Shape(); em.moveTo(0, 0.04); em.lineTo(0.03, 0); em.lineTo(0, -0.04); em.lineTo(-0.03, 0); em.lineTo(0, 0.04);
    add(groups.trim, new THREE.ShapeGeometry(em), chrome, [FX + 0.03, 0.69, 0], [0, Math.PI / 2, 0]); }
  [-1, 1].forEach(s => {
    const z = s * 0.57;
    const refl = add(groups.trim, new THREE.ConeGeometry(0.088, 0.07, 28, 1, true), chrome, [FX - 0.045, 0.70, z], [0, 0, Math.PI / 2]);
    add(groups.trim, new THREE.SphereGeometry(0.014, 12, 8), lensClear, [FX - 0.04, 0.70, z]);
    for (let i = 0; i < 4; i++) rbox(groups.trim, [0.004, 0.07, 0.004], [FX + 0.015, 0.89, s * (0.50 + i * 0.05)], plastic, 0.001); // рёбра рассеивателя
    rbox(groups.trim, [0.018, 0.09, 0.25], [FX - 0.006, 0.89, s * 0.585], chrome, 0.01).scale.set(1, 1, 1);
    // Буксировочные проушины
    add(groups.trim, new THREE.TorusGeometry(0.035, 0.01, 8, 20), steel, [1.90, 0.38, s * 0.42], [Math.PI / 2, 0, 0]);
    // Кронштейны бамперов
    bar(groups.trim, [1.92, 0.48, s * 0.55], [1.78, 0.44, s * 0.52], 0.022, plastic);
    bar(groups.trim, [-2.13, 0.47, s * 0.55], [-1.98, 0.44, s * 0.52], 0.022, plastic);
  });
  rbox(groups.trim, [0.012, 0.03, 1.56], [1.972, 0.505, 0], rubberT, 0.008);                 // резиновая накладка бампера
  rbox(groups.trim, [0.012, 0.03, 1.56], [-2.192, 0.49, 0], rubberT, 0.008);
  add(groups.trim, new THREE.TorusGeometry(0.035, 0.01, 8, 20), steel, [-2.13, 0.37, -0.42], [Math.PI / 2, 0, 0]);

  // --- Задок: петли, замок, рамки фонарей ---
  [-0.42, 0.42].forEach(z => rbox(groups.trim, [0.05, 0.03, 0.08], [rearX(1.52) - 0.01, 1.525, z], plastic, 0.01));
  disc(groups.trim, [REAR_V - 0.035, 0.62, 0.09], 0.011, 0.012, chrome, 'x');
  [-1, 1].forEach(s => rbox(groups.trim, [0.012, 0.32, 0.19], [REAR_V - 0.006, 0.70, s * 0.67], chrome, 0.01));
  rbox(groups.trim, [0.025, 0.03, 0.30], [rearX(1.48) - 0.02, 1.48, 0], lensRed, 0.01);        // доп. стоп-сигнал

  // --- Колёса: гайки ---
  groups.wheels.children.forEach(w => { const s = Math.sign(w.position.z); for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + 0.3; const n = disc(w, [Math.cos(a) * 0.07, Math.sin(a) * 0.07, s * 0.07], 0.011, 0.018, chrome); } });

  // =====================================================================
  // ---------- Шасси ----------
  // =====================================================================
  const CH = groups.mech;
  // Лонжероны и поперечина
  [-1, 1].forEach(s => {
    rbox(CH, [0.92, 0.09, 0.07], [1.40, 0.40, s * 0.40], mech, 0.02);
    rbox(CH, [1.00, 0.08, 0.07], [-1.55, 0.40, s * 0.50], mech, 0.02);
    rbox(CH, [2.10, 0.06, 0.10], [-0.10, 0.38, s * 0.74], mech, 0.02);                          // пороги
  });
  rbox(CH, [0.12, 0.08, 0.86], [1.30, 0.30, 0], mech, 0.02);                                     // поперечина передней подвески
  // Передняя подвеска: рычаги, пружины, амортизаторы, тормоза
  [-1, 1].forEach(s => {
    const z = s;
    bar(CH, [1.40, 0.30, z * 0.30], [1.30, 0.26, z * 0.58], 0.016, steel); bar(CH, [1.20, 0.30, z * 0.30], [1.30, 0.26, z * 0.58], 0.016, steel);
    bar(CH, [1.40, 0.56, z * 0.36], [1.30, 0.54, z * 0.57], 0.013, steel); bar(CH, [1.22, 0.56, z * 0.36], [1.30, 0.54, z * 0.57], 0.013, steel);
    bar(CH, [1.30, 0.25, z * 0.60], [1.30, 0.56, z * 0.60], 0.018, steel);
    helix(CH, [1.30, 0.32, z * 0.47], 0.62, 0.055, 6, 0.008, spring);
    bar(CH, [1.30, 0.30, z * 0.47], [1.30, 0.68, z * 0.47], 0.016, mechDark);
    disc(CH, [1.30, WR, z * 0.61], 0.125, 0.012, brake);
    rbox(CH, [0.08, 0.10, 0.05], [1.20, WR + 0.08, z * 0.60], steel, 0.01);
    bar(CH, [1.18, 0.33, z * 0.10], [1.22, 0.30, z * 0.58], 0.009, steel);                   // боковые рулевые тяги
  });
  bar(CH, [1.18, 0.33, -0.30], [1.18, 0.33, 0.30], 0.011, steel);                               // средняя тяга
  rbox(CH, [0.10, 0.12, 0.10], [1.20, 0.45, -0.44], mechDark, 0.02);                             // рулевой механизм
  tube(CH, [[1.55, 0.34, -0.58], [1.58, 0.34, -0.3], [1.58, 0.34, 0.3], [1.55, 0.34, 0.58]], 0.009, steel); // стабилизатор
  // Задняя подвеска: пружины, амортизаторы, 4 продольные тяги, поперечная тяга, барабаны
  [-1, 1].forEach(z => {
    helix(CH, [RA, 0.42, z * 0.48], 0.68, 0.06, 6, 0.009, spring);
    bar(CH, [RA - 0.08, 0.34, z * 0.53], [RA + 0.06, 0.70, z * 0.55], 0.015, mechDark);
    bar(CH, [RA, 0.30, z * 0.48], [-0.72, 0.33, z * 0.50], 0.015, steel);
    bar(CH, [RA, 0.44, z * 0.25], [-0.95, 0.42, z * 0.30], 0.013, steel);
    disc(CH, [RA, WR, z * 0.61], 0.13, 0.06, brake);
  });
  bar(CH, [RA + 0.02, 0.36, -0.58], [RA + 0.06, 0.50, 0.52], 0.013, steel);
  // Карданы: крестовины
  [[0.30, 0.40, 0.12], [1.22, 0.37, 0.12], [0.08, 0.40, 0.06], [RA + 0.12, 0.37, 0.05], [-0.62, 0.38, 0.055]].forEach(p => rbox(CH, [0.05, 0.05, 0.05], p, steel, 0.01));
  // Трос спидометра: от раздатки (датчика скорости) к щитку
  tube(CH, [[0.105, 0.44, 0.16], [0.20, 0.38, 0.0], [0.55, 0.38, -0.25], [0.70, 0.46, -0.36], [0.80, 0.80, -0.38], [0.66, 1.0, -0.36]], 0.006, rubberT);

  // =====================================================================
  // ---------- Двигатель и навесное ----------
  // =====================================================================
  const EX = 1.43, EF = 1.62;
  rbox(CH, [0.40, 0.10, 0.30], [EX, 0.45, 0], mechDark, 0.03);                                  // поддон
  for (let i = 0; i < 5; i++) rbox(CH, [0.30, 0.012, 0.012], [EX, 1.065, -0.10 + i * 0.04], mechDark, 0.004); // рёбра крышки
  disc(CH, [EX + 0.10, 1.075, -0.08], 0.03, 0.03, mechDark, 'y');                                // крышка маслозаливной горловины
  bar(CH, [EX - 0.08, 0.70, -0.20], [EX - 0.10, 1.05, -0.22], 0.006, steel);                    // щуп
  disc(CH, [EF, 0.55, 0], 0.085, 0.03, steel, 'x');                                              // шкив коленвала
  disc(CH, [EF, 0.80, 0], 0.06, 0.025, steel, 'x');                                              // шкив помпы
  disc(CH, [EF + 0.02, 0.70, 0.30], 0.04, 0.025, steel, 'x');                                    // шкив генератора
  tube(CH, [[EF + 0.01, 0.635, 0], [EF + 0.01, 0.56, 0.08], [EF + 0.02, 0.70, 0.34], [EF + 0.01, 0.84, 0.05], [EF + 0.01, 0.81, -0.06], [EF + 0.01, 0.55, -0.085]], 0.007, rubberT, true, 80); // ремень
  rbox(CH, [0.05, 0.30, 0.22], [EF - 0.01, 0.78, 0], mechDark, 0.02);                            // крышка привода ГРМ
  // Впускные патрубки и выпускной коллектор (справа)
  for (let i = 0; i < 4; i++) {
    const x = 1.30 + i * 0.09;
    tube(CH, [[x, 1.00, 0.20], [x, 0.98, 0.16], [x, 0.94, 0.14]], 0.018, mech);
    tube(CH, [[x, 0.88, 0.16], [x, 0.80, 0.22], [1.36 + i * 0.01, 0.66, 0.26]], 0.017, steel);
  }
  bar(CH, [1.37, 0.64, 0.26], [0.90, 0.56, 0.30], 0.026, steel);                               // приёмная труба
  // Картер сцепления
  { const bh = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.12, 0.18, 24, 1, true), mech); bh.rotation.z = Math.PI / 2; bh.position.set(1.12, 0.62, 0); CH.add(bh); }
  // Патрубки радиатора и отопителя
  tube(CH, [[1.74, 0.92, 0.18], [1.68, 0.96, 0.10], [1.62, 0.96, 0.04]], 0.02, rubberT);
  tube(CH, [[1.74, 0.62, -0.20], [1.66, 0.58, -0.10], [1.62, 0.62, -0.02]], 0.02, rubberT);
  tube(CH, [[1.25, 0.90, -0.12], [1.10, 0.92, -0.05], [0.96, 0.88, 0.04]], 0.012, rubberT);
  tube(CH, [[1.30, 0.84, -0.15], [1.10, 0.84, -0.08], [0.96, 0.84, 0.08]], 0.012, rubberT);
  // Сердцевина радиатора
  for (let i = 0; i < 9; i++) rbox(CH, [0.004, 0.38, 0.004], [1.792, 0.76, -0.30 + i * 0.075], mechDark, 0.001);
  // Бачок и главный тормозной цилиндр
  bar(CH, [1.06, 0.98, -0.42], [1.16, 0.98, -0.42], 0.025, steel);

  // =====================================================================
  // ---------- Салон ----------
  // =====================================================================
  const IN = groups.interior;
  [-0.30, 0.30].forEach(z => rbox(IN, [0.03, 0.05, 0.10], [0.70, 0.98, z * 0.5], plastic, 0.01));  // центральные дефлекторы
  rbox(IN, [0.03, 0.12, 0.34], [0.71, 0.90, 0.40], trimIn, 0.02);                                 // крышка бардачка
  rbox(IN, [0.03, 0.08, 0.18], [0.70, 0.88, 0.04], plastic, 0.01);                                // панель управления отопителем
  [0, 2.1, 4.2].forEach(a => { const sp = bar(IN, [MX(0.62), 1.0, -0.36], [MX(0.62), 1.0 + Math.cos(a) * 0.17, -0.36 + Math.sin(a) * 0.17], 0.012, mechDark); sp.rotateOnWorldAxis(V(0, 0, 1), 0); });
  rbox(IN, [0.06, 0.05, 0.06], [0.55, 0.52, 0.0], rubberT, 0.02);                                 // чехол рычага КПП
  bar(IN, [0.16, 0.47, 0.06], [-0.06, 0.62, 0.06], 0.012, mechDark);                             // рычаг ручника
  [[0.72, -0.26], [-0.29, -1.11]].forEach(([x0, x1]) => [-1, 1].forEach(s => {                    // обивки дверей
    rbox(IN, [x0 - x1 - 0.06, 0.50, 0.02], [(x0 + x1) / 2, 0.80, s * 0.775], trimIn, 0.02);
    rbox(IN, [0.22, 0.04, 0.05], [(x0 + x1) / 2, 0.86, s * 0.75], trimIn, 0.015);
  }));

  return { root, groups, materials: { paint, edge, seam, glass, plastic, chrome, mech, mechDark, trimIn } };
}
