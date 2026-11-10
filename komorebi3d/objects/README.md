# Object geometry

`trees/` holds Tree v1 (the original commemorative tree), v2, and v3. `buildings/` holds the house and Forest Cafe.

These `.js` files are build-time JavaScript fragments, not standalone modules. `build-dev.mjs --mode=product` injects them verbatim into `dev.template.html` at `/* @object:... */` markers, preserving their order and shared geometry helpers. Run `node komorebi3d/build-dev.mjs --mode=product` after editing, and `node komorebi3d/build-dev.mjs --mode=product --check` to validate.

This first extraction preserves the existing generated `dev.html` byte-for-byte; placement, collision, Engine pin, stable versions and panel behavior are unchanged.
