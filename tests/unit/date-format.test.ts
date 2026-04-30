import test from 'node:test';
import assert from 'node:assert/strict';
import { formatSessionSchedule, formatSessionScheduleWithWeekday } from '../../src/utils/dateFormat';

test('session schedule formatting is deterministic for SSR hydration', () => {
  assert.equal(formatSessionSchedule('2026-05-03T20:00:00Z'), '4 May @ 01:30');
  assert.equal(formatSessionScheduleWithWeekday('2026-05-01T16:00:00Z'), 'Fri 1 May @ 21:30');
});
