import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('track backdrop design hides raw SVG dots and avoids dot-grid overlays', () => {
  const source = readFileSync(new URL('../../src/components/TrackBackdrop.tsx', import.meta.url), 'utf8');

  assert.match(source, /\.track-asset-svg circle/);
  assert.match(source, /display: none !important/);
  assert.doesNotMatch(source, /backgroundSize:\s*'64px 64px'/);
  assert.match(source, /Circuit Asset/);
});
