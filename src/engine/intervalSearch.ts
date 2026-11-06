/**
 * Pure availability and interval search engine according to Section 7.1.
 * No network or model calls.
 */

export type AvailabilityStatus = 'free' | 'occupied' | 'later' | 'unavailable';

export interface TimeSlot {
  start: string; // "HH:MM" 24h format
  end: string;   // "HH:MM" 24h format
}

export interface ScheduledEntry extends TimeSlot {
  id: string;
  roomId?: string | null;
  facultyId?: string | null;
  groupId?: string | null;
  subject?: string;
  day: number; // 1 = Monday ... 6 = Saturday
  isMock?: boolean;
  /** "class" | "lab" | "library"; drives the engine's room-type check. */
  entryType?: string | null;
}

export interface DisruptionRecord extends TimeSlot {
  id: string;
  roomId?: string | null;
  facultyId?: string | null;
  day: number;
  reason?: string;
  status: 'active' | 'resolved' | 'cancelled';
}

export function parseMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Checks if two intervals overlap: a.start < b.end && b.start < a.end
 */
export function doIntervalsOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
  bufferMinutes: number = 0
): boolean {
  const aStart = parseMinutes(startA);
  const aEnd = parseMinutes(endA) + bufferMinutes;
  const bStart = parseMinutes(startB);
  const bEnd = parseMinutes(endB);
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Check availability of a resource for an interval [from, to) on a given day.
 * Returns free: true if no overlapping entries or active disruptions exist.
 */
export function checkResourceAvailability(
  entries: ScheduledEntry[],
  disruptions: DisruptionRecord[],
  day: number,
  fromTime: string,
  toTime: string,
  bufferMinutes: number = 0
): {
  isFree: boolean;
  blockingEntries: ScheduledEntry[];
  blockingDisruptions: DisruptionRecord[];
} {
  const dayEntries = entries
    .filter(e => e.day === day)
    .sort((a, b) => parseMinutes(a.start) - parseMinutes(b.start));

  const dayDisruptions = disruptions.filter(
    d => d.day === day && d.status === 'active'
  );

  const blockingEntries: ScheduledEntry[] = [];
  const blockingDisruptions: DisruptionRecord[] = [];

  for (const entry of dayEntries) {
    if (doIntervalsOverlap(entry.start, entry.end, fromTime, toTime, bufferMinutes)) {
      blockingEntries.push(entry);
    }
  }

  for (const disruption of dayDisruptions) {
    if (doIntervalsOverlap(disruption.start, disruption.end, fromTime, toTime, 0)) {
      blockingDisruptions.push(disruption);
    }
  }

  return {
    isFree: blockingEntries.length === 0 && blockingDisruptions.length === 0,
    blockingEntries,
    blockingDisruptions
  };
}

/**
 * Determine the status of a resource at instant t:
 * - 'unavailable': if a disruption covers t
 * - 'occupied': if an entry covers t
 * - 'later': if free now and the next entry starts within 60 minutes
 * - 'free': otherwise
 */
export function getStatusAtInstant(
  entries: ScheduledEntry[],
  disruptions: DisruptionRecord[],
  day: number,
  currentTime: string
): {
  status: AvailabilityStatus;
  currentEntry?: ScheduledEntry;
  activeDisruption?: DisruptionRecord;
  nextEntry?: ScheduledEntry;
  nextAvailableTime?: string;
  reason?: string;
} {
  const currentMin = parseMinutes(currentTime);

  // 1. Check disruptions first
  const activeDisruption = disruptions.find(d => {
    if (d.day !== day || d.status !== 'active') return false;
    const s = parseMinutes(d.start);
    const e = parseMinutes(d.end);
    return currentMin >= s && currentMin < e;
  });

  if (activeDisruption) {
    return {
      status: 'unavailable',
      activeDisruption,
      reason: activeDisruption.reason || 'Resource is disrupted/closed'
    };
  }

  // 2. Check scheduled entries
  const sortedEntries = entries
    .filter(e => e.day === day)
    .sort((a, b) => parseMinutes(a.start) - parseMinutes(b.start));

  let currentEntry: ScheduledEntry | undefined;
  let nextEntry: ScheduledEntry | undefined;

  for (const entry of sortedEntries) {
    const s = parseMinutes(entry.start);
    const e = parseMinutes(entry.end);

    if (currentMin >= s && currentMin < e) {
      currentEntry = entry;
      break;
    } else if (s > currentMin) {
      if (!nextEntry || s < parseMinutes(nextEntry.start)) {
        nextEntry = entry;
      }
    }
  }

  if (currentEntry) {
    return {
      status: 'occupied',
      currentEntry,
      nextAvailableTime: currentEntry.end,
      reason: `Occupied: ${currentEntry.subject || 'Class in session'}`
    };
  }

  if (nextEntry) {
    const minutesUntilNext = parseMinutes(nextEntry.start) - currentMin;
    if (minutesUntilNext <= 60 && minutesUntilNext > 0) {
      return {
        status: 'later',
        nextEntry,
        nextAvailableTime: `Free until ${nextEntry.start}`,
        reason: `Class scheduled in ${minutesUntilNext} min (${nextEntry.subject || 'Next session'})`
      };
    }
  }

  return {
    status: 'free',
    nextEntry,
    nextAvailableTime: nextEntry ? `Until ${nextEntry.start}` : 'Available all day'
  };
}

