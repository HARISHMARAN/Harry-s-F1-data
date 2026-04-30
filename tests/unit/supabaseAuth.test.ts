import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildMinimalUserProfile } from '../../src/services/supabaseAuth';

test('buildMinimalUserProfile stores only id, email, and full_name', () => {
  const profile = buildMinimalUserProfile({
    id: 'user-123',
    email: 'friend@example.com',
    user_metadata: {
      full_name: '  Race Friend  ',
      avatar_url: 'https://example.com/avatar.png',
      provider_id: 'google-provider-id',
    },
  });

  assert.deepEqual(profile, {
    id: 'user-123',
    email: 'friend@example.com',
    full_name: 'Race Friend',
  });
});

test('buildMinimalUserProfile falls back to Google name metadata', () => {
  const profile = buildMinimalUserProfile({
    id: 'user-456',
    email: 'driver@example.com',
    user_metadata: {
      name: 'Driver One',
    },
  });

  assert.equal(profile?.full_name, 'Driver One');
});

test('buildMinimalUserProfile rejects users without email', () => {
  const profile = buildMinimalUserProfile({
    id: 'user-789',
    email: undefined,
    user_metadata: {
      full_name: 'No Email',
    },
  });

  assert.equal(profile, null);
});
