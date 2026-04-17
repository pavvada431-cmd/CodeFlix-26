// Three.js Safety Utilities
// Provides safe property access and modification for Three.js objects in React Three Fiber

export function safeSetPosition(ref, x, y, z) {
  if (ref?.current?.position) {
    ref.current.position.x = x;
    ref.current.position.y = y;
    ref.current.position.z = z;
  }
}

export function safeAddPosition(ref, dx, dy, dz) {
  if (ref?.current?.position) {
    ref.current.position.x += dx;
    ref.current.position.y += dy;
    ref.current.position.z += dz;
  }
}

export function safeSetScale(ref, x, y, z) {
  if (ref?.current?.scale) {
    ref.current.scale.x = x;
    ref.current.scale.y = y;
    ref.current.scale.z = z;
  }
}

export function safeSetMaterialProperty(ref, property, value) {
  if (ref?.current?.material) {
    ref.current.material[property] = value;
  }
}

export function safeGetGeometry(ref) {
  return ref?.current?.geometry ?? null;
}

export function safeSetGeometry(ref, geometry) {
  if (ref?.current && geometry) {
    ref.current.geometry = geometry;
  }
}

export function safeGetPosition(ref) {
  return {
    x: ref?.current?.position?.x ?? 0,
    y: ref?.current?.position?.y ?? 0,
    z: ref?.current?.position?.z ?? 0,
  };
}

export function safeRotate(ref, rx, ry, rz) {
  if (ref?.current?.rotation) {
    ref.current.rotation.x = rx;
    ref.current.rotation.y = ry;
    ref.current.rotation.z = rz;
  }
}

export function safeAddRotation(ref, drx, dry, drz) {
  if (ref?.current?.rotation) {
    ref.current.rotation.x += drx;
    ref.current.rotation.y += dry;
    ref.current.rotation.z += drz;
  }
}
