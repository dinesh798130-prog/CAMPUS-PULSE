import { describe, it, expect } from 'vitest';
import {
  doIntervalsOverlap,
  parseMinutes,
  formatMinutes,
  checkResourceAvailability,
  getStatusAtInstant,
  ScheduledEntry,
  DisruptionRecord
} from '../intervalSearch';

describe('Interval Search Engine (Section 7.1)', () => {
  it('correctly calculates minutes from HH:MM format', () => {
    expect(parseMinutes('08:15')).toBe(495);
    expect(parseMinutes('13:35')).toBe(815);
    expect(formatMinutes(495)).toBe('08:15');
  });

  it('detects interval overlap with and without buffer', () => {
    // Exact overlap
    expect(doIntervalsOverlap('08:15', '09:05', '08:30', '09:30')).toBe(true);

    // Contiguous adjacent slots do NOT overlap without buffer
    expect(doIntervalsOverlap('08:15', '09:05', '09:05', '09:55', 0)).toBe(false);

    // Adjacent slots DO overlap when 5-min buffer is applied
    expect(doIntervalsOverlap('08:15', '09:05', '09:05', '09:55', 5)).toBe(true);
  });

  it('evaluates resource availability against entries and disruptions', () => {
    const entries: ScheduledEntry[] = [
      { id: 'e1', roomId: 'N-217', day: 1, start: '08:15', end: '09:05' }
    ];
    const disruptions: DisruptionRecord[] = [];

    // Free query
    const resFree = checkResourceAvailability(entries, disruptions, 1, '10:05', '10:55');
    expect(resFree.isFree).toBe(true);

    // Occupied query
    const resBusy = checkResourceAvailability(entries, disruptions, 1, '08:30', '09:30');
    expect(resBusy.isFree).toBe(false);
    expect(resBusy.blockingEntries.length).toBe(1);
  });

  it('determines instant status: FREE, OCCUPIED, LATER, UNAVAILABLE', () => {
    const entries: ScheduledEntry[] = [
      { id: 'e1', roomId: 'N-217', day: 1, start: '09:00', end: '10:00', subject: 'OS' }
    ];
    const disruptions: DisruptionRecord[] = [
      { id: 'd1', roomId: 'N-217', day: 2, start: '09:00', end: '12:00', status: 'active', reason: 'AC Repair' }
    ];

    // Occupied at 09:30 on Monday
    const st1 = getStatusAtInstant(entries, disruptions, 1, '09:30');
    expect(st1.status).toBe('occupied');

    // Later at 08:30 on Monday (class starting within 60 min)
    const st2 = getStatusAtInstant(entries, disruptions, 1, '08:30');
    expect(st2.status).toBe('later');

    // Free at 11:30 on Monday
    const st3 = getStatusAtInstant(entries, disruptions, 1, '11:30');
    expect(st3.status).toBe('free');

    // Disrupted/Unavailable on Tuesday at 10:00
    const st4 = getStatusAtInstant(entries, disruptions, 2, '10:00');
    expect(st4.status).toBe('unavailable');
  });
});

