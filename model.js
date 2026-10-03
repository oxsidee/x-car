// Агрегаты ВАЗ-21310 (Нива 2131, 5 дверей), которых нет в подробной модели кузова:
// двигатель с навесным, КПП, раздатка, карданы, мосты, рулевое, радиатор, моторный щит.
// Раскладка — по чертежу the-blueprints.com (база 2700 мм); на модель она натягивается в index.html.
// Ось x — вперёд, y — вверх, z — вправо. Метры.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const DIM = { FRONT_AXLE: 1.30, REAR_AXLE: -1.40, WHEEL_R: 0.345 };

// Пересчёт старой раскладки агрегатов в пропорции чертежа
const ANCH = [[-2.14, -2.18], [-2.06, -2.11], [-1.40, -1.40], [-0.93, -1.15], [0.0, -0.25], [1.02, 0.88], [1.10, 0.95], [1.30, 1.30], [2.07, 1.85], [2.14, 1.96]];
const MX = x => { for (let i = 0; i < ANCH.length - 1; i++) { const [a, b] = ANCH[i], [c, d] = ANCH[i + 1]; if (x >= a && x <= c) return b + (x - a) * (d - b) / (c - a); } return x < ANCH[0][0] ? ANCH[0][1] + x - ANCH[0][0] : ANCH.at(-1)[1] + x - ANCH.at(-1)[0]; };
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Материалы кузова модели и агрегатов (прозрачность кузова меняет ползунок)
export function buildMaterials() {
  return {
    paint: new THREE.MeshPhysicalMaterial({ color: 0xc9d1d8, metalness: 0.35, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false }),
    edge: new THREE.LineBasicMaterial({ color: 0xc4d2dc, transparent: true, opacity: 0.5 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x6f9fc2, metalness: 0, roughness: 0.05, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false }),
    plastic: new THREE.MeshStandardMaterial({ color: 0x1a1d20, roughness: 0.7, transparent: true, opacity: 0.55, depthWrite: false }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xe6eaee, metalness: 1, roughness: 0.18, transparent: true, opacity: 0.75 }),
    trimIn: new THREE.MeshStandardMaterial({ color: 0x3a4248, roughness: 0.9, transparent: true, opacity: 0.32, depthWrite: false }),
  };
}

export function buildAggregates(MAT) {
  const M = new THREE.Group();
  const { chrome } = MAT;
  const mech = new THREE.MeshStandardMaterial({ color: 0x5c6a75, roughness: 0.75, metalness: 0.2, transparent: true, opacity: 0.4, depthWrite: false });
  const mechDark = new THREE.MeshStandardMaterial({ color: 0x2c3237, roughness: 0.8, transparent: true, opacity: 0.55, depthWrite: false });
  const panelMat = new THREE.MeshStandardMaterial({ color: 0x5c6a75, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false });
  const steel = new THREE.MeshStandardMaterial({ color: 0x8a959e, metalness: 0.7, roughness: 0.35, transparent: true, opacity: 0.6, depthWrite: false });
  const rubberT = new THREE.MeshStandardMaterial({ color: 0x15181a, roughness: 0.9, transparent: true, opacity: 0.7, depthWrite: false });
  const rubberS = new THREE.MeshStandardMaterial({ color: 0x0f1113, roughness: 0.95, transparent: true, opacity: 0.85 });
  const brake = new THREE.MeshStandardMaterial({ color: 0x7d8186, metalness: 0.8, roughness: 0.45, transparent: true, opacity: 0.8 });

  const add = (g, geo, mat, pos, rot) => { const m = new THREE.Mesh(geo, mat); if (pos) m.position.set(...pos); if (rot) m.rotation.set(...rot); g.add(m); return m; };
  const rbox = (g, size, pos, mat, r = 0.02) => add(g, new RoundedBoxGeometry(size[0], size[1], size[2], 3, Math.min(r, Math.min(...size) / 2.05)), mat, pos);
  const bar = (g, a, b, r, mat, seg = 10) => {
    const va = V(...a), vb = V(...b);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, va.distanceTo(vb), seg), mat);
    m.position.copy(va).add(vb).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(V(0, 1, 0), vb.clone().sub(va).normalize());
    g.add(m); return m;
  };
  const tube = (g, pts, r, mat, closed = false, seg) => {
    const c = new THREE.CatmullRomCurve3(pts.map(p => V(...p)), closed, 'centripetal');
    const m = new THREE.Mesh(new THREE.TubeGeometry(c, seg || Math.max(12, pts.length * 10), r, 8, closed), mat); g.add(m); return m;
  };
  const disc = (g, [x, y, z], r, w, mat, axis = 'z') => { const m = add(g, new THREE.CylinderGeometry(r, r, w, 28), mat, [x, y, z]); if (axis === 'z') m.rotation.x = Math.PI / 2; else if (axis === 'x') m.rotation.z = Math.PI / 2; return m; };
  const xbox = (g, size, pos, mat) => add(g, new THREE.BoxGeometry(...size), mat, pos);
  const cylX = (g, [x, y, z], r, len, mat) => disc(g, [x, y, z], r, len, mat, 'x');
  const rb = (g, size, [x, y, z], mat, r) => rbox(g, size, [MX(x), y, z], mat, r);
  const br = (g, [ax, ay, az], [bx, by, bz], r, mat, seg) => bar(g, [MX(ax), ay, az], [MX(bx), by, bz], r, mat, seg);
  const { FRONT_AXLE: FA, REAR_AXLE: RA, WHEEL_R: WR } = DIM;
  const CH = M, B = M;

  // ---------- Двигатель, КПП, раздатка, карданы, мосты ----------
  rb(M, [0.44, 0.40, 0.36], [1.48, 0.70, 0], mech, 0.03);
  rb(M, [0.42, 0.12, 0.30], [1.48, 0.95, 0], mech, 0.02);
  rb(M, [0.40, 0.06, 0.24], [1.48, 1.03, -0.02], mechDark, 0.02);
  rb(M, [0.40, 0.09, 0.10], [1.46, 1.00, 0.21], mech, 0.02);
  rb(M, [0.06, 0.10, 0.10], [1.19, 1.00, 0.20], mech, 0.01);
  rbox(M, [0.20, 0.14, 0.22], [1.66, 0.79, -0.44], mechDark, 0.03);                  // корпус воздушного фильтра
  bar(M, [1.48, 0.88, -0.38], [1.24, 0.98, 0.13], 0.04, mechDark, 14);               // воздуховод к дросселю
  rbox(M, [0.04, 0.36, 0.66], [1.77, 0.72, 0], mech, 0.01);                          // радиатор
  [-0.25, 0.25].forEach(z => { add(M, new THREE.TorusGeometry(0.15, 0.012, 8, 32), mechDark, [1.70, 0.74, z], [0, Math.PI / 2, 0]); for (let i = 0; i < 5; i++) { const b = add(M, new THREE.BoxGeometry(0.01, 0.13, 0.05), mechDark, [1.70, 0.74, z]); b.rotation.x = (i / 5) * Math.PI * 2; b.translateY(0.07); } });
  add(M, new THREE.CylinderGeometry(0.11, 0.11, 0.08, 24), mechDark, [MX(1.15), 0.95, -0.42], [0, 0, Math.PI / 2]);
  rbox(M, [0.10, 0.16, 0.10], [1.24, 0.94, 0.60], mech, 0.02);                       // расширительный бачок
  rb(M, [0.12, 0.18, 0.10], [1.26, 0.84, -0.70], mech, 0.02);
  rb(M, [0.54, 0.22, 0.24], [0.94, 0.56, 0], mech, 0.03);
  rb(M, [0.26, 0.20, 0.30], [0.36, 0.44, 0.08], mech, 0.03);
  br(M, [0.46, 0.40, 0.12], [1.30, 0.36, 0.12], 0.024, mech);
  bar(M, [MX(0.24), 0.40, 0.06], [RA, 0.36, 0.05], 0.03, mech);
  rbox(M, [0.22, 0.20, 0.22], [FA, 0.33, 0.12], mech, 0.04);
  add(M, new THREE.SphereGeometry(0.12, 16, 12), mech, [RA, WR, 0.05]);
  [-1, 1].forEach(s => bar(M, [FA, 0.36, 0.12], [FA, WR, s * 0.64], 0.025, mech));
  br(M, [1.04, 0.56, 0.30], [0.80, 0.34, 0.36], 0.026, mech); br(M, [0.80, 0.34, 0.36], [-0.40, 0.30, 0.42], 0.026, mech);
  add(M, new THREE.CylinderGeometry(0.06, 0.06, 0.40, 16), mech, [MX(-0.20), 0.30, 0.42], [0, 0, Math.PI / 2]);
  br(M, [-0.40, 0.30, 0.42], [-1.55, 0.30, 0.48], 0.026, mech);
  rbox(M, [0.46, 0.20, 0.70], [-1.62, 0.52, 0.10], mech, 0.04);

  // ---------- Моторный щит (в модели кузова его нет) ----------
  add(M, new THREE.BoxGeometry(0.01, 0.46, 1.40), panelMat, [0.95, 0.80, 0]);

  // ---------- Шасси: лонжероны, амортизаторы, рулевое ----------
  [-1, 1].forEach(s => {
    rbox(CH, [0.92, 0.09, 0.07], [1.40, 0.40, s * 0.40], mech, 0.02);
    rbox(CH, [1.00, 0.08, 0.07], [-1.55, 0.40, s * 0.50], mech, 0.02);
    bar(CH, [1.30, 0.30, s * 0.47], [1.30, 0.68, s * 0.47], 0.016, mechDark);              // передние амортизаторы
    bar(CH, [1.18, 0.33, s * 0.10], [1.22, 0.30, s * 0.58], 0.009, steel);                 // боковые рулевые тяги
    bar(CH, [RA - 0.08, 0.34, s * 0.53], [RA + 0.06, 0.70, s * 0.55], 0.015, mechDark);    // задние амортизаторы
    bar(CH, [RA, 0.30, s * 0.48], [-0.72, 0.33, s * 0.50], 0.015, steel);                  // продольные тяги
    bar(CH, [RA, 0.44, s * 0.25], [-0.95, 0.42, s * 0.30], 0.013, steel);
  });
  bar(CH, [1.18, 0.33, -0.30], [1.18, 0.33, 0.30], 0.011, steel);                               // средняя тяга
  rbox(CH, [0.10, 0.12, 0.10], [1.20, 0.45, -0.44], mechDark, 0.02);                             // рулевой механизм
  tube(CH, [[1.55, 0.34, -0.58], [1.58, 0.34, -0.3], [1.58, 0.34, 0.3], [1.55, 0.34, 0.58]], 0.009, steel); // стабилизатор
  bar(CH, [RA + 0.02, 0.36, -0.58], [RA + 0.06, 0.50, 0.52], 0.013, steel);
  // Карданы: крестовины
  [[0.30, 0.40, 0.12], [1.22, 0.37, 0.12], [0.08, 0.40, 0.06], [RA + 0.12, 0.37, 0.05], [-0.62, 0.38, 0.055]].forEach(p => rbox(CH, [0.05, 0.05, 0.05], p, steel, 0.01));
  // Трос спидометра: от раздатки (датчика скорости) к щитку
  tube(CH, [[0.105, 0.44, 0.16], [0.20, 0.38, 0.0], [0.55, 0.38, -0.25], [0.70, 0.46, -0.36], [0.80, 0.80, -0.38], [0.66, 1.0, -0.36]], 0.006, rubberT);

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
  bar(CH, [1.06, 0.95, -0.42], [1.16, 0.95, -0.42], 0.025, steel);


  // ---------- Моторный отсек ----------
  // Рамка радиатора
  xbox(B, [0.04, 0.04, 1.50], [1.80, 0.99, 0], mech); xbox(B, [0.04, 0.04, 1.40], [1.80, 0.50, 0], mech);
  [-1, 1].forEach(s => { xbox(B, [0.04, 0.50, 0.04], [1.80, 0.745, s * 0.40], mech); xbox(B, [0.30, 0.04, 0.04], [1.65, 0.99, s * 0.75], mech);
    rbox(B, [0.06, 0.05, 0.03], [0.97, 1.10, s * 0.74], steel, 0.01);                      // петли капота
    rbox(B, [0.08, 0.06, 0.06], [1.43, 0.47, s * 0.22], rubberS, 0.02);                   // подушки двигателя
  });
  bar(B, [1.79, 0.99, 0.0], [1.20, 1.10, -0.55], 0.006, steel);                        // упор капота
  rbox(B, [0.06, 0.05, 0.08], [1.82, 0.97, 0], steel, 0.01);                            // замок капота
  // АКБ: поддон, прижим, клеммы
  xbox(B, [0.30, 0.02, 0.22], [1.52, 0.755, 0.56], mech);
  bar(B, [1.40, 0.96, 0.56], [1.64, 0.96, 0.56], 0.006, steel);
  
  [1.47, 1.57].forEach((x, i) => disc(B, [x, 0.975, i ? 0.64 : 0.48], 0.012, 0.025, chrome, 'y'));
  // Генератор: корпус, крыльчатка; стартер с тяговым реле
  cylX(B, [1.60, 0.70, 0.30], 0.07, 0.14, mech); add(B, new THREE.TorusGeometry(0.06, 0.008, 6, 20), steel, [1.675, 0.70, 0.30], [0, Math.PI / 2, 0]);
  cylX(B, [1.10, 0.55, 0.26], 0.05, 0.22, mech); cylX(B, [1.10, 0.62, 0.26], 0.025, 0.14, steel);
  // Топливная рампа, форсунки, регулятор давления, свечные наконечники
  bar(B, [1.24, 1.0, 0.17], [1.62, 1.0, 0.17], 0.011, steel);
  [1.30, 1.39, 1.47, 1.56].forEach(x => { disc(B, [x, 0.975, 0.18], 0.012, 0.05, mechDark, 'y'); disc(B, [x, 1.0, 0.0], 0.012, 0.035, rubberS, 'y'); });
  disc(B, [1.62, 1.0, 0.20], 0.018, 0.03, steel, 'y');
  tube(B, [[1.62, 1.0, 0.17], [1.66, 0.90, 0.24], [1.62, 0.60, 0.40], [0.80, 0.40, 0.30]], 0.005, steel);   // топливные трубки
  // Дроссельный узел: трос газа; корпус ДМРВ
  tube(B, [[1.19, 1.02, 0.25], [1.05, 1.05, 0.10], [0.98, 1.00, -0.30]], 0.004, rubberS);
  cylX(B, [1.48, 0.86, -0.40], 0.045, 0.12, mechDark);
  // Корпус фильтра: защёлки, крышка
  [-0.52, -0.36].forEach(z => rbox(B, [0.02, 0.03, 0.02], [1.77, 0.79, z], steel, 0.005));
  rbox(B, [0.22, 0.02, 0.24], [1.66, 0.865, -0.44], mechDark, 0.01);
  // Корпус термостата, крышки бачков, коллектор: экран
  rbox(B, [0.06, 0.06, 0.06], [1.66, 0.94, 0.04], mech, 0.01);
  disc(B, [1.24, 1.03, 0.60], 0.025, 0.02, mechDark, 'y');
  disc(B, [1.27, 0.94, -0.70], 0.02, 0.02, mechDark, 'y');
  disc(B, [1.12, 0.98, -0.44], 0.02, 0.02, mechDark, 'y');
  rbox(B, [0.36, 0.01, 0.10], [1.44, 0.80, 0.28], steel, 0.004).rotation.x = -0.6;
  // Масляный фильтр
  cylX(B, [1.45, 0.60, -0.26], 0.045, 0.10, mechDark).rotation.set(0, 0, 0);
  // Отопитель за моторным щитом
  rbox(B, [0.18, 0.18, 0.40], [0.86, 0.88, 0.0], mech, 0.03);
  // Топливо- и тормозные трубки вдоль днища
  [-0.32, 0.30].forEach((z, i) => tube(B, [[1.10, 0.40, z], [0.40, 0.38, z * 1.1], [-0.80, 0.38, z * 1.1], [-1.30, 0.40, z * 0.9]], 0.004, i ? steel : brake));
  // Горловина бензобака
  tube(B, [[-1.70, 0.96, 0.80], [-1.68, 0.86, 0.66], [-1.64, 0.66, 0.36]], 0.025, rubberS);
  // Хомуты бака, подвесы глушителя, экран
  [-1.45, -1.80].forEach(x => xbox(B, [0.03, 0.01, 0.72], [x, 0.415, 0.10], steel));
  [[0.20, 0.32, 0.42], [-1.10, 0.31, 0.46], [-1.95, 0.31, 0.48]].forEach(p => xbox(B, [0.02, 0.06, 0.02], p, rubberS));
  // ШРУСы и пыльники передних приводов
  [-1, 1].forEach(s => { const c = add(B, new THREE.ConeGeometry(0.04, 0.10, 16, 1, true), rubberS, [FA, WR, s * 0.54]); c.rotation.x = s * Math.PI / 2; });
  // Отбойники
  [[FA, 0.62, 0.47], [RA, 0.70, 0.48]].forEach(([x, y, z]) => [-1, 1].forEach(s => disc(B, [x, y, s * z], 0.03, 0.05, rubberS, 'y')));
  // Тяги рычагов раздатки и КПП
  bar(B, [0.30, 0.50, 0.08], [0.20, 0.44, 0.08], 0.008, steel);
  bar(B, [0.56, 0.50, 0.0], [0.70, 0.56, 0.0], 0.008, steel);

  // ---------- Слияние геометрии: одна сетка на материал ----------
  const KEEP = new Set(['position', 'normal', 'uv']);
  M.updateMatrixWorld(true);
  const buckets = new Map(), victims = [];
  M.traverse(o => {
    if (!o.isMesh) return;
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    Object.keys(g.attributes).forEach(k => { if (!KEEP.has(k)) g.deleteAttribute(k); });
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.clearGroups(); g.applyMatrix4(o.matrixWorld);
    if (!buckets.has(o.material)) buckets.set(o.material, []);
    buckets.get(o.material).push(g); victims.push(o);
  });
  victims.forEach(o => o.parent.remove(o));
  buckets.forEach((geos, mat) => { const merged = mergeGeometries(geos, false); if (merged) M.add(new THREE.Mesh(merged, mat)); geos.forEach(g => g.dispose()); });
  return M;
}
