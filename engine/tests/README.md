# Engine unit tests

These are small function-based tests using Node.js built-ins. No test classes or external test framework are required.

Run from the repository root:

```sh
node --test engine/tests/*.test.mjs
```

Current coverage:
- Core: frame/time update, immutable snapshots, reset
- Input: axis normalization, pause/resume, clear/dispose
- Camera: yaw persistence, pitch limits, immutable snapshots

These tests validate the current foundation API. They do not yet validate real touch events, camera-to-player movement, Renderer A/B output, or mobile browser behavior; those require integration and device tests.
