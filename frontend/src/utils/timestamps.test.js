import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatSocTimestamp } from './timestamps.js';

describe('formatSocTimestamp', () => {
  it('converts an explicit UTC instant to the required IST display', () => {
    assert.equal(
      formatSocTimestamp('2026-11-01T11:00:00Z'),
      '01 Nov 2026, 04:30:00 PM IST'
    );
  });

  it('converts an explicit non-UTC offset to the same IST instant', () => {
    assert.equal(
      formatSocTimestamp('2026-11-01T16:30:00+05:30'),
      '01 Nov 2026, 04:30:00 PM IST'
    );
  });

  it('interprets a legacy timezone-less timestamp as UTC', () => {
    assert.equal(
      formatSocTimestamp('2026-11-01T11:00:00'),
      '01 Nov 2026, 04:30:00 PM IST'
    );
  });

  it('returns a placeholder for absent or invalid timestamps', () => {
    assert.equal(formatSocTimestamp(null), '—');
    assert.equal(formatSocTimestamp('not a timestamp'), '—');
  });
});
