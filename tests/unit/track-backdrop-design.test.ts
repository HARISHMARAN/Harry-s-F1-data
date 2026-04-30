import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('track backdrop design hides raw SVG dots and avoids dot-grid overlays', () => {
  const source = readFileSync(new URL('../../src/components/TrackBackdrop.tsx', import.meta.url), 'utf8');
  const miamiAsset = readFileSync(new URL('../../src/assets/tracks/miami.svg', import.meta.url), 'utf8');

  assert.match(miamiAsset, /<circle\b/);
  assert.match(source, /\.track-asset-svg circle/);
  assert.match(source, /sanitizeTrackSvg/);
  assert.match(source, /removeSmallSvgMarkerPaths/);
  assert.match(source, /display: none !important/);
  assert.match(source, /stroke-dasharray: none !important/);
  assert.match(source, /rgba\(67, 255, 122/);
  assert.doesNotMatch(source, /backgroundSize:\s*'64px 64px'/);
  assert.doesNotMatch(source, /strokeDasharray="4 16"/);
  assert.match(source, /Circuit Asset/);
});
