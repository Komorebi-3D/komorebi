export function assertRenderer(renderer) {
  const required = ["initialize", "render", "resize", "dispose"];
  for (const method of required) {
    if (typeof renderer?.[method] !== "function") {
      throw new TypeError(`Renderer must implement ${method}()`);
    }
  }
  return renderer;
}
