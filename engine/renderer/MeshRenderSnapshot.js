/**
 * Mesh RenderSnapshot v1: backend-neutral, frame-identical draw data.
 * Static vertex geometry is created once and shared across all frames/backends.
 * Mesh origin is world-space local coordinates; position adds object translation.
 */
export const MESH_SNAPSHOT_VERSION = 1;

export function createMeshGeometry({ id, positions, normals, colors } = {}) {
  if (typeof id !== "string" || !id) throw new TypeError("Geometry needs a nonempty id");
  for (const [name, data] of Object.entries({positions,normals,colors})) {
    if (!Array.isArray(data) && !(data instanceof Float32Array)) {
      throw new TypeError("Geometry "+name+" must be a numeric array");
    }
    if (!data.length || data.length % 9 !== 0 || !Array.from(data).every(Number.isFinite)) {
      throw new TypeError("Geometry "+name+" needs finite triangle vertices");
    }
  }
  if (positions.length !== normals.length || positions.length !== colors.length) {
    throw new RangeError("Geometry attribute lengths must match");
  }
  // Defensive copies: caller may reuse its arrays while the renderers rely on stable geometry.
  return Object.freeze({
    id, vertexCount: positions.length / 3,
    positions: Object.freeze(Array.from(positions)),
    normals: Object.freeze(Array.from(normals)),
    colors: Object.freeze(Array.from(colors))
  });
}

export function createMeshRenderSnapshot({ frameId, camera, objects } = {}) {
  if (!Number.isSafeInteger(frameId) || frameId < 0) {
    throw new TypeError("MeshSnapshot.frameId must be a nonnegative integer");
  }
  if (!vec3(camera?.eye) || !vec3(camera?.target) || !Array.isArray(objects)) {
    throw new TypeError("MeshSnapshot expects camera vectors and objects");
  }
  const ids = new Set();
  const items = objects.map(item => {
    if (!item || (typeof item.id !== "string" && typeof item.id !== "number") ||
        !vec3(item.position) || !item.geometry || !Object.isFrozen(item.geometry) ||
        !item.geometry.vertexCount || typeof item.geometry.id !== "string") {
      throw new TypeError("Invalid mesh draw item");
    }
    if (ids.has(item.id)) throw new Error("Duplicate mesh object id: "+item.id);
    ids.add(item.id);
    const opacity = item.opacity ?? 1;
    if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
      throw new TypeError("Mesh opacity must be 0..1");
    }
    return Object.freeze({
      id:item.id, shape:"mesh", geometry:item.geometry,
      position:Object.freeze([...item.position]),
      yaw:Number.isFinite(item.yaw)?item.yaw:0,
      opacity,visible:item.visible!==false
    });
  });
  const near=camera.near??.1, far=camera.far??150, fovDegrees=camera.fovDegrees??45;
  if (!Number.isFinite(near)||near<=0||!Number.isFinite(far)||far<=near||
      !Number.isFinite(fovDegrees)||fovDegrees<=0||fovDegrees>=180) {
    throw new TypeError("Invalid camera projection");
  }
  return Object.freeze({
    version:MESH_SNAPSHOT_VERSION,frameId,
    camera:Object.freeze({
      eye:Object.freeze([...camera.eye]),target:Object.freeze([...camera.target]),
      fovDegrees,near,far
    }),
    objects:Object.freeze(items)
  });
}
function vec3(v) {
  return Array.isArray(v) && v.length===3 && v.every(x=>typeof x==="number" && Number.isFinite(x));
}
