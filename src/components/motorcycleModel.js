import * as THREE from 'three';

// Illustrative 125 cc underbone motorcycle, built from separate parts so each
// assembly step can move on its own. Units are metres: +X is the front of the
// bike, +Y is up, +Z is the right-hand (exhaust) side, and the ground is y = 0.

const v = (x, y, z = 0) => new THREE.Vector3(x, y, z);

function createMaterials() {
  return {
    paint: new THREE.MeshPhysicalMaterial({ color: 0x0f1012, metalness: 0.2, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12 }),
    red: new THREE.MeshPhysicalMaterial({ color: 0xc91f1a, metalness: 0.15, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12 }),
    frame: new THREE.MeshStandardMaterial({ color: 0x2b2d30, metalness: 0.55, roughness: 0.42 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xe8ebee, metalness: 1, roughness: 0.1 }),
    alloy: new THREE.MeshStandardMaterial({ color: 0x9a9fa4, metalness: 0.9, roughness: 0.32 }),
    engine: new THREE.MeshStandardMaterial({ color: 0x55595d, metalness: 0.75, roughness: 0.45 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.92 }),
    seat: new THREE.MeshStandardMaterial({ color: 0x1d1d1f, roughness: 0.7 }),
    lamp: new THREE.MeshStandardMaterial({ color: 0xf6f3ea, emissive: 0xfff3d1, emissiveIntensity: 0.55, roughness: 0.15 }),
    amber: new THREE.MeshStandardMaterial({ color: 0xff8c1a, emissive: 0xff6a00, emissiveIntensity: 0.4, roughness: 0.3 }),
    tail: new THREE.MeshStandardMaterial({ color: 0xc8141c, emissive: 0x900010, emissiveIntensity: 0.6, roughness: 0.3 }),
    grip: new THREE.MeshStandardMaterial({ color: 0xd88a2c, metalness: 0.7, roughness: 0.3 }),
    plate: new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.6 })
  };
}

function group(...children) {
  const result = new THREE.Group();
  result.add(...children);
  return result;
}

function place(object, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) {
  object.position.set(...position);
  object.rotation.set(...rotation);
  object.scale.set(...scale);
  return object;
}

function box(size, material, position, rotation) {
  return place(new THREE.Mesh(new THREE.BoxGeometry(...size), material), position, rotation);
}

function ellipsoid(radii, material, position, rotation) {
  return place(new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), material), position, rotation, radii);
}

// Cylinder whose end caps sit on points a and b.
function rod(a, b, radius, material, segments = 18) {
  const start = v(...a);
  const axis = v(...b).sub(start);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, axis.length(), segments), material);
  mesh.position.copy(start).addScaledVector(axis, 0.5);
  mesh.quaternion.setFromUnitVectors(v(0, 1, 0), axis.normalize());
  return mesh;
}

function tube(points, radius, material, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points.map((point) => v(...point)), closed);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(32, points.length * 18), radius, 12, closed), material);
}

// Smooth side profile in the XY plane, extruded across Z and centred on z.
function panel(points, depth, material, z = 0, bevel = 0.015) {
  const [first, ...rest] = points.map(([x, y]) => new THREE.Vector2(x, y));
  const shape = new THREE.Shape();
  shape.moveTo(first.x, first.y);
  shape.splineThru([...rest, first]);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 3,
    curveSegments: 48
  });
  geometry.translate(0, 0, z - depth / 2);
  return new THREE.Mesh(geometry, material);
}

function spring(a, b, radius, turns, material) {
  const start = v(...a);
  const axis = v(...b).sub(start);
  const length = axis.length();
  axis.normalize();
  const side = v(1, 0, 0).cross(axis).normalize();
  const up = axis.clone().cross(side);
  const count = turns * 16;
  const points = [];
  for (let index = 0; index <= count; index += 1) {
    const t = index / count;
    const angle = t * turns * Math.PI * 2;
    points.push(start.clone()
      .addScaledVector(axis, t * length)
      .addScaledVector(side, Math.cos(angle) * radius)
      .addScaledVector(up, Math.sin(angle) * radius));
  }
  return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), count * 2, 0.0065, 8, false), material);
}

// Five-spoke cast wheel lying in the XY plane, axle along Z.
function wheel(m, { radius = 0.3, brake = 'drum', brakeSide = 1 } = {}) {
  const tireTube = 0.048;
  const rimRadius = radius - tireTube * 1.85;
  const tire = new THREE.Mesh(new THREE.TorusGeometry(radius - tireTube, tireTube, 18, 72), m.rubber);
  tire.scale.z = 1.15;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(rimRadius, 0.013, 10, 72), m.paint);
  rim.scale.z = 2.6;
  const result = group(tire, rim, rod([0, 0, -0.065], [0, 0, 0.065], 0.045, m.alloy));

  for (const side of [-1, 1]) {
    result.add(place(new THREE.Mesh(new THREE.TorusGeometry(rimRadius + 0.006, 0.0035, 6, 72), m.red), [0, 0, side * 0.033]));
  }
  for (let index = 0; index < 5; index += 1) {
    const angle = (index / 5) * Math.PI * 2;
    const length = rimRadius - 0.04;
    const middle = 0.04 + length / 2;
    result.add(box([length, 0.034, 0.026], m.paint, [Math.cos(angle) * middle, Math.sin(angle) * middle, 0], [0, 0, angle]));
  }
  if (brake === 'disc') {
    result.add(
      rod([0, 0, brakeSide * 0.058], [0, 0, brakeSide * 0.064], 0.12, m.chrome, 40),
      box([0.06, 0.07, 0.03], m.red, [-0.09, 0.07, brakeSide * 0.075], [0, 0, 0.6])
    );
  } else {
    result.add(rod([0, 0, brakeSide * 0.04], [0, 0, brakeSide * 0.075], 0.075, m.alloy, 32));
  }
  return result;
}

function buildFrame(m) {
  return group(
    tube([[0.43, 0.83, 0], [0.37, 0.7, 0], [0.24, 0.52, 0], [0.04, 0.43, 0], [-0.15, 0.45, 0], [-0.27, 0.58, 0], [-0.34, 0.64, 0]], 0.03, m.frame),
    rod([0.436, 0.82, 0], [0.38, 0.95, 0], 0.036, m.frame),
    ...[-1, 1].map((side) => tube([[-0.3, 0.61, 0.03 * side], [-0.42, 0.7, 0.09 * side], [-0.62, 0.75, 0.09 * side], [-0.84, 0.77, 0.075 * side]], 0.017, m.frame)),
    ...[-1, 1].map((side) => rod([-0.48, 0.72, 0.09 * side], [-0.18, 0.4, 0.09 * side], 0.015, m.frame)),
    rod([-0.84, 0.77, -0.075], [-0.84, 0.77, 0.075], 0.015, m.frame),
    rod([-0.16, 0.38, -0.11], [-0.16, 0.38, 0.11], 0.02, m.frame),
    box([0.07, 0.05, 0.12], m.frame, [0.2, 0.44, 0], [0, 0, -0.5])
  );
}

function buildEngine(m) {
  const cylinderStart = v(0.14, 0.34);
  const cylinderAxis = v(0.3, 0.4).sub(cylinderStart);
  const fins = [0.15, 0.32, 0.49, 0.66, 0.83].map((t) => {
    const centre = cylinderStart.clone().addScaledVector(cylinderAxis, t);
    const half = cylinderAxis.clone().setLength(0.006);
    return rod(centre.clone().sub(half).toArray(), centre.clone().add(half).toArray(), 0.08, m.engine, 24);
  });
  return group(
    panel([[-0.14, 0.36], [-0.12, 0.22], [0, 0.18], [0.14, 0.2], [0.18, 0.3], [0.12, 0.4], [-0.02, 0.42]], 0.18, m.engine, 0, 0.02),
    rod([0.14, 0.34, 0], [0.3, 0.4, 0], 0.058, m.engine, 24),
    ...fins,
    box([0.07, 0.13, 0.14], m.engine, [0.33, 0.41, 0], [0, 0, 0.36]),
    rod([0.02, 0.29, 0.1], [0.02, 0.29, 0.135], 0.09, m.alloy, 36),
    rod([-0.02, 0.3, -0.1], [-0.02, 0.3, -0.13], 0.08, m.alloy, 36),
    rod([0.2, 0.43, 0], [0.12, 0.44, 0], 0.022, m.alloy),
    rod([0, 0.25, -0.3], [0, 0.25, 0.3], 0.012, m.frame),
    rod([0, 0.25, 0.18], [0, 0.25, 0.3], 0.02, m.rubber),
    rod([0, 0.25, -0.18], [0, 0.25, -0.3], 0.02, m.rubber),
    tube([[0.04, 0.3, -0.14], [0.12, 0.27, -0.16], [0.18, 0.27, -0.16]], 0.008, m.chrome),
    tube([[-0.06, 0.33, 0.15], [-0.12, 0.4, 0.17], [-0.18, 0.4, 0.17]], 0.009, m.chrome),
    rod([-0.08, 0.28, -0.1], [-0.08, 0.28, -0.115], 0.04, m.alloy, 24)
  );
}

function buildRearEnd(m) {
  return group(
    ...[-1, 1].map((side) => rod([-0.16, 0.38, 0.095 * side], [-0.62, 0.3, 0.095 * side], 0.02, m.frame)),
    rod([-0.24, 0.365, -0.095], [-0.24, 0.365, 0.095], 0.015, m.frame),
    place(wheel(m, { brake: 'drum', brakeSide: 1 }), [-0.62, 0.3, 0]),
    rod([-0.62, 0.3, -0.11], [-0.62, 0.3, 0.11], 0.012, m.chrome),
    rod([-0.62, 0.3, -0.085], [-0.62, 0.3, -0.09], 0.085, m.alloy, 36),
    tube([[-0.04, 0.28, -0.1], [-0.08, 0.32, -0.1], [-0.62, 0.385, -0.1], [-0.705, 0.3, -0.1], [-0.62, 0.215, -0.1], [-0.08, 0.24, -0.1]], 0.007, m.frame, true),
    panel([[-0.1, 0.345], [-0.58, 0.405], [-0.62, 0.38], [-0.12, 0.32]], 0.008, m.paint, -0.125, 0.004)
  );
}

function buildShocks(m) {
  return group(...[-1, 1].flatMap((side) => {
    const z = 0.118 * side;
    return [
      rod([-0.57, 0.36, z], [-0.5, 0.71, z], 0.012, m.chrome),
      spring([-0.565, 0.385, z], [-0.507, 0.675, z], 0.026, 9, m.red),
      rod([-0.508, 0.67, z], [-0.5, 0.71, z], 0.03, m.frame),
      rod([-0.57, 0.36, z - 0.015], [-0.57, 0.36, z + 0.015], 0.018, m.frame)
    ];
  }));
}

function buildExhaust(m) {
  return group(
    tube([[0.355, 0.37, 0.03], [0.37, 0.3, 0.06], [0.33, 0.2, 0.1], [0.18, 0.165, 0.14], [-0.08, 0.18, 0.17], [-0.3, 0.25, 0.18]], 0.021, m.chrome),
    rod([-0.3, 0.25, 0.18], [-0.74, 0.38, 0.18], 0.052, m.chrome, 28),
    rod([-0.36, 0.268, 0.18], [-0.6, 0.339, 0.18], 0.058, m.paint, 28),
    rod([-0.74, 0.38, 0.18], [-0.755, 0.385, 0.18], 0.04, m.frame, 24)
  );
}

function buildFrontEnd(m) {
  const fender = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.03, 10, 40, Math.PI * 0.62), m.paint);
  place(fender, [0.66, 0.3, 0], [0, 0, 0.15], [1, 1, 1.9]);
  return group(
    ...[-1, 1].flatMap((side) => [
      rod([0.66, 0.3, 0.075 * side], [0.542, 0.573, 0.075 * side], 0.028, m.alloy),
      rod([0.551, 0.554, 0.075 * side], [0.38, 0.95, 0.075 * side], 0.019, m.chrome)
    ]),
    box([0.06, 0.03, 0.2], m.frame, [0.44, 0.81, 0], [0, 0, 0.41]),
    box([0.07, 0.025, 0.2], m.frame, [0.38, 0.95, 0], [0, 0, 0.41]),
    place(wheel(m, { brake: 'disc', brakeSide: -1 }), [0.66, 0.3, 0]),
    rod([0.66, 0.3, -0.1], [0.66, 0.3, 0.1], 0.012, m.chrome),
    fender
  );
}

function buildHandlebar(m) {
  return group(
    tube([[0.31, 1.05, -0.36], [0.35, 1.03, -0.22], [0.38, 1.01, -0.08], [0.38, 1.01, 0.08], [0.35, 1.03, 0.22], [0.31, 1.05, 0.36]], 0.012, m.frame),
    ...[-1, 1].flatMap((side) => [
      rod([0.32, 1.045, 0.25 * side], [0.305, 1.052, 0.38 * side], 0.02, m.rubber),
      rod([0.305, 1.052, 0.38 * side], [0.302, 1.053, 0.395 * side], 0.022, m.grip),
      tube([[0.36, 1.05, 0.2 * side], [0.4, 1.05, 0.28 * side], [0.38, 1.05, 0.36 * side]], 0.006, m.alloy),
      box([0.04, 0.04, 0.05], m.frame, [0.33, 1.045, 0.215 * side]),
      rod([0.35, 1.06, 0.2 * side], [0.31, 1.25, 0.27 * side], 0.007, m.frame),
      ellipsoid([0.012, 0.05, 0.07], m.paint, [0.31, 1.29, 0.3 * side])
    ]),
    box([0.04, 0.035, 0.04], m.frame, [0.35, 1.07, 0.19])
  );
}

function buildFrontCowl(m) {
  const decal = [[0.44, 0.74], [0.43, 0.62], [0.36, 0.52], [0.31, 0.48], [0.37, 0.6], [0.4, 0.72]];
  return group(
    panel([[0.4, 1], [0.47, 0.94], [0.5, 0.8], [0.47, 0.64], [0.4, 0.5], [0.29, 0.42], [0.22, 0.45], [0.3, 0.56], [0.36, 0.7], [0.37, 0.86]], 0.24, m.paint),
    ...[-1, 1].map((side) => panel(decal, 0.004, m.red, 0.14 * side, 0.002))
  );
}

function buildSidePanel(m, side) {
  const decal = [[-0.3, 0.6], [-0.48, 0.68], [-0.72, 0.72], [-0.58, 0.65], [-0.38, 0.56]];
  return group(
    panel([[-0.22, 0.5], [-0.3, 0.64], [-0.5, 0.73], [-0.86, 0.77], [-0.88, 0.71], [-0.64, 0.62], [-0.4, 0.52]], 0.05, m.paint, 0.105 * side),
    panel(decal, 0.004, m.red, 0.149 * side, 0.002)
  );
}

function buildNose(m) {
  return group(
    panel([[0.38, 1.02], [0.5, 1], [0.6, 0.92], [0.6, 0.85], [0.52, 0.82], [0.44, 0.86]], 0.2, m.paint, 0, 0.02),
    ellipsoid([0.025, 0.045, 0.08], m.lamp, [0.6, 0.885, 0]),
    ...[-1, 1].map((side) => ellipsoid([0.025, 0.015, 0.025], m.amber, [0.56, 0.95, 0.1 * side]))
  );
}

function buildSeat(m) {
  return group(panel([[-0.2, 0.765], [-0.26, 0.8], [-0.42, 0.845], [-0.66, 0.86], [-0.85, 0.845], [-0.88, 0.8], [-0.62, 0.775], [-0.36, 0.76]], 0.24, m.seat, 0, 0.03));
}

function buildTail(m) {
  return group(
    tube([[-0.5, 0.82, 0.135], [-0.8, 0.84, 0.13], [-0.92, 0.83, 0.06], [-0.92, 0.83, -0.06], [-0.8, 0.84, -0.13], [-0.5, 0.82, -0.135]], 0.013, m.chrome),
    box([0.04, 0.05, 0.12], m.tail, [-0.915, 0.76, 0]),
    panel([[-0.84, 0.74], [-0.93, 0.72], [-0.96, 0.62], [-0.92, 0.55], [-0.88, 0.6], [-0.86, 0.7]], 0.11, m.paint),
    box([0.006, 0.09, 0.15], m.plate, [-0.955, 0.6, 0], [0, 0, 0.15]),
    ...[-1, 1].map((side) => ellipsoid([0.02, 0.014, 0.02], m.amber, [-0.92, 0.73, 0.09 * side]))
  );
}

// Wraps a part in a holder placed at its own centre, so the exploded spin turns
// the part around itself, and gives it private materials for per-step opacity.
function piece(object, offset, spin = [0, 0, 0]) {
  const centre = new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3());
  object.position.sub(centre);
  const holder = group(object);
  holder.position.copy(centre);

  const materials = [];
  object.traverse((child) => {
    if (!child.isMesh) return;
    child.material = child.material.clone();
    materials.push(child.material);
  });
  return { holder, base: centre, offset: v(...offset), spin: new THREE.Euler(...spin), materials, opacity: 1 };
}

// Steps follow the order of the workshop reference video.
export function buildMotorcycle() {
  const m = createMaterials();
  const steps = [
    [piece(buildFrame(m), [0, 0.15, 0])],
    [piece(buildEngine(m), [0.05, -0.2, 0.5], [0.4, 0, 0])],
    [piece(buildRearEnd(m), [-0.6, 0, 0], [0, 0, 0.2]), piece(buildShocks(m), [-0.15, 0.38, 0.25])],
    [piece(buildExhaust(m), [0, -0.05, 0.6])],
    [piece(buildFrontEnd(m), [0.6, 0.1, 0], [0, 0, -0.2])],
    [piece(buildHandlebar(m), [0.08, 0.4, 0], [0, 0.3, 0])],
    [
      piece(buildFrontCowl(m), [0.2, 0.3, 0]),
      piece(buildSidePanel(m, -1), [0, 0.05, -0.45]),
      piece(buildSidePanel(m, 1), [0, 0.05, 0.45]),
      piece(buildNose(m), [0.35, 0.22, 0])
    ],
    [piece(buildSeat(m), [0, 0.4, 0]), piece(buildTail(m), [-0.35, 0.15, 0])]
  ];

  const root = new THREE.Group();
  for (const step of steps) for (const part of step) root.add(part.holder);
  Object.values(m).forEach((material) => material.dispose());
  return { root, steps };
}
