import { assertRenderer } from "./RendererContract.js";

/**
 * Renderer factory. Two renderer backends, two geometry profiles:
 * - box (default): the v0.3 primitive comparison, unchanged.
 * - mesh: production-ready arbitrary triangle geometry with translucency.
 *
 * Both profiles implement initialize({canvas}), render(snapshot), resize(), dispose().
 * The selected renderer is loaded lazily; Core, Camera and Input never import Three.js.
 */
export async function createRenderer(backend, options = {}) {
  const profile=options.profile==="mesh"?"mesh":"box";
  let Renderer;
  if(backend==="A"){
    if(profile==="mesh")({MeshRendererA:Renderer}=await import("./MeshRendererA.js"));
    else ({RendererA:Renderer}=await import("./RendererA.js"));
  }else if(backend==="B"){
    if(profile==="mesh")({MeshRendererB:Renderer}=await import("./MeshRendererB.js"));
    else ({RendererB:Renderer}=await import("./RendererB.js"));
  }else{
    throw new Error("Unknown Renderer backend: "+backend);
  }
  return assertRenderer(new Renderer(options));
}
