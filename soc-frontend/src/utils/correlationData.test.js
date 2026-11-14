import test from 'node:test'
import assert from 'node:assert/strict'
import { deriveCorrelationData } from './correlationData.js'

test('builds the chain from linked events with UTC ordering, unique records and real source IPs', () => {
  const data = deriveCorrelationData({ confidence: 0.82, events: [
    { event_id: 'B', timestamp: '2026-11-14T10:02:00+05:30', source_ip: '10.0.0.12', destination_ip: '10.0.0.11', event_type: 'network_connection' },
    { event_id: 'A', timestamp: '2026-11-14 04:30:00', source_ip: '10.0.0.13', event_type: 'authentication' },
    { event_id: 'B', timestamp: '2026-11-14T04:32:00Z', source_ip: '10.0.0.12', destination_ip: '10.0.0.11', event_type: 'network_connection' },
  ] })
  assert.deepEqual(data.events.map(event => event.event_id), ['A', 'B'])
  assert.deepEqual(data.sourceIPs, ['10.0.0.13', '10.0.0.12'])
  assert.deepEqual(data.destinations, ['10.0.0.11'])
  assert.equal(data.durationSeconds, 120)
  assert.equal(data.confidencePercent, 82)
})

test('retains zero confidence and does not fabricate missing evidence', () => {
  const empty = deriveCorrelationData({ confidence: 0, event_count: 20 })
  assert.equal(empty.confidencePercent, 0)
  assert.deepEqual(empty.events, [])
  assert.deepEqual(empty.sourceIPs, [])
  assert.equal(empty.durationSeconds, null)
  assert.equal(deriveCorrelationData(null).confidencePercent, null)
})

test('invalid or missing timestamps do not produce a fabricated chronology', () => {
  const data = deriveCorrelationData({ events: [
    { event_id: 'MISSING' }, { event_id: 'VALID', timestamp: '2026-11-14T04:30:00Z' },
    { event_id: 'INVALID', timestamp: 'invalid' },
  ] })
  assert.equal(data.events[0].event_id, 'VALID')
  assert.equal(data.durationSeconds, 0)
  assert.equal(data.firstSeen, data.lastSeen)
})
