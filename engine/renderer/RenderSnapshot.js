/**
 * Minimal renderer-neutral v0.3 snapshot.
 *
 * Objects use geometry descriptors, not backend-specific Mesh objects.
 *   {id, shape:"box", position:[x,y,z], size:[w,h,d], color:0xRRGGBB, yaw?, visible?}
 * Box origin is its bottom center (y is the bottom face).
 */
export const RENDER_SNAPSHOT_VERSION = 1;

export function createRenderSnapshot({ frameId, camera, objects }) {
  if (!Number.isInteger(frameId) || frameId < 0) {
    throw new TypeError("RenderSnapshot.frameId must be a nonnegative integer");
  }
  if (!camera || !vector3(camera.eye) || !vector3(camera.target)) {
    throw new TypeError("RenderSnapshot.camera must have eye and target vec3 arrays");
  }
  if (!Array.isArray(objects)) throw new TypeError("RenderSnapshot.objects must be an array");
  const seen = new Set();
  const normalizedObjects = objects.map(object => {
    if (!object || (typeof object.id !== "string" && typeof object.id !== "number") ||
        !vector3(object.position) || !vector3(object.size) ||
        object.shape !== "box" || !Number.isInteger(object.color)) {
      throw new TypeError("Invalid RenderSnapshot object");
    }
    if (seen.has(object.id)) throw new Error("Duplicate object id: "+object.id);
    seen.add(object.id);
    if (Object.isFrozen(object) && Object.isFrozen(object.position) && Object.isFrozen(object.size)) return object;
    return Object.freeze({
      id: object.id,
      shape: "box",
      position: Object.freeze([...object.position]),
      size: Object.freeze([...object.size]),
      color: object.color,
      yaw: object.yaw ?? 0,
      visible: object.visible !== false
    });
  });
  return Object.freeze({
    version: RENDER_SNAPSHOT_VERSION,
    frameId,
    camera: Object.freeze({
      eye: Object.freeze([...camera.eye]),
      target: Object.freeze([...camera.target]),
      fovDegrees: camera.fovDegrees ?? 60,
      near: camera.near ?? .1,
      far: camera.far ?? 100
    }),
    objects: Object.freeze(normalizedObjects)
  });
}

function vector3(value) {
  return Array.isArray(value) && value.length === 3 &&
         value.every(n => typeof n === "number" && Number.isFinite(n));
}
