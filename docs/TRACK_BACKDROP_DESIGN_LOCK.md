# Track Backdrop Design Lock

The homepage backdrop is intentionally locked to a neon circuit-map treatment.

Do not replace it with raw SVG colours or generated zig-zag paths when a real
circuit asset exists. The current rules are:

- Prefer real circuit SVG assets from `src/assets/tracks/`.
- Render the asset through `src/components/TrackBackdrop.tsx`.
- Force SVG paths to the dashboard neon/glass palette at render time.
- Hide raw SVG labels, dots, numbered markers, metadata, patterns, and fills.
- Keep the subtle full-screen glow band, but do not add dot grids or point
  markers over the circuit.
- Preserve the labels that state whether the backdrop is using a `Circuit Asset`
  or `Generated Layout`.

The second visible design marker in the backdrop label is `Circuit Asset`. It
means the page is using a real tracked SVG asset for the current/upcoming race
instead of the deterministic generated fallback layout.
