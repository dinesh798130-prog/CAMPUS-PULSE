/**
 * Pure repair search and hard constraint verification engine according to Section 7.2 & 7.3.
 * No network or model calls.
 */

import {
  doIntervalsOverlap,
  parseMinutes,
  ScheduledEntry,
  DisruptionRecord
} from './intervalSearch';

export type CheckStatus = 'passed' | 'failed' | 'unverified';

export interface ConstraintCheckResult {
  name: string;
  status: CheckStatus;
  description: string;
}

export interface CandidateRoom {
  id: string;
  code: string;
  blockCode: string;
  floor: number;
  type?: string | null; // e.g. 'Classroom', 'Lab', 'Seminar'
  capacity?: number | null;
}

export interface RepairOption {
  roomId: string;
  roomCode: string;
  blockCode: string;
  floor: number;
  capacity?: number | null;
  checks: ConstraintCheckResult[];
  allPassedOrUnverified: boolean;
  score: number; // for ranking
}

export interface RepairSearchResult {
  affectedEntry: ScheduledEntry;
  options: RepairOption[];
  noSafeOption: boolean;
  cancellationNoticeDraft?: string;
}

/**
 * Evaluates the 5 hard constraints for a candidate room replacing affectedEntry:
 * 1. Room is free for the whole class slot, including a 5-minute buffer.
 * 2. Room is not disrupted or unavailable.
 * 3. Room capacity >= group size (unverified if capacity or group size unknown).
 * 4. Faculty is free for slot in candidate room.
 * 5. Group has no second class at that time.
 */
export function verifyHardConstraints(params: {
  candidateRoom: CandidateRoom;
  affectedEntry: ScheduledEntry;
  groupSize?: number | null;
  roomEntries: ScheduledEntry[];
  roomDisruptions: DisruptionRecord[];
  facultyEntries: ScheduledEntry[];
  groupEntries: ScheduledEntry[];
  bufferMinutes?: number;
}): {
  passed: boolean;
  checks: ConstraintCheckResult[];
} {
  const {
    candidateRoom,
    affectedEntry,
    groupSize,
    roomEntries,
    roomDisruptions,
    facultyEntries,
    groupEntries,
    bufferMinutes = 5
  } = params;

  const checks: ConstraintCheckResult[] = [];

  // Check 1: Room free for the slot + 5-min buffer
  const roomConflict = roomEntries.find(
    e =>
      e.id !== affectedEntry.id &&
      e.day === affectedEntry.day &&
      doIntervalsOverlap(e.start, e.end, affectedEntry.start, affectedEntry.end, bufferMinutes)
  );
  if (roomConflict) {
    checks.push({
      name: 'room_slot_free',
      status: 'failed',
      description: `Room occupied by session ${roomConflict.subject || roomConflict.id} (${roomConflict.start}-${roomConflict.end})`
    });
  } else {
    checks.push({
      name: 'room_slot_free',
      status: 'passed',
      description: `Room free during ${affectedEntry.start}-${affectedEntry.end} (including 5-min buffer)`
    });
  }

  // Check 2: Room not disrupted or unavailable
  const disruptionConflict = roomDisruptions.find(
    d =>
      d.day === affectedEntry.day &&
      d.status === 'active' &&
      doIntervalsOverlap(d.start, d.end, affectedEntry.start, affectedEntry.end, 0)
  );
  if (disruptionConflict) {
    checks.push({
      name: 'room_not_disrupted',
      status: 'failed',
      description: `Room has active disruption: ${disruptionConflict.reason || 'Closed'}`
    });
  } else {
    checks.push({
      name: 'room_not_disrupted',
      status: 'passed',
      description: 'Room is not closed or under an active disruption'
    });
  }

  // Check 3: Room capacity >= group size
  if (candidateRoom.capacity == null || groupSize == null) {
    checks.push({
      name: 'capacity_fit',
      status: 'unverified',
      description: `Capacity unverified: Room capacity=${candidateRoom.capacity ?? 'unknown'}, Group size=${groupSize ?? 'unknown'}`
    });
  } else if (candidateRoom.capacity >= groupSize) {
    checks.push({
      name: 'capacity_fit',
      status: 'passed',
      description: `Room capacity (${candidateRoom.capacity}) meets group size (${groupSize})`
    });
  } else {
    checks.push({
      name: 'capacity_fit',
      status: 'failed',
      description: `Insufficient capacity: Room holds ${candidateRoom.capacity}, group requires ${groupSize}`
    });
  }

  // Check 4: Faculty member is free for the slot
  const otherFacultyConflict = facultyEntries.find(
    e =>
      e.id !== affectedEntry.id &&
      e.day === affectedEntry.day &&
      doIntervalsOverlap(e.start, e.end, affectedEntry.start, affectedEntry.end, 0)
  );
  if (otherFacultyConflict) {
    checks.push({
      name: 'faculty_free',
      status: 'failed',
      description: `Faculty has clashing lecture: ${otherFacultyConflict.subject || otherFacultyConflict.id}`
    });
  } else {
    checks.push({
      name: 'faculty_free',
      status: 'passed',
      description: 'Faculty member is free for the slot'
    });
  }

  // Check 5: No student group has a second class in that slot
  const groupConflict = groupEntries.find(
    e =>
      e.id !== affectedEntry.id &&
      e.day === affectedEntry.day &&
      doIntervalsOverlap(e.start, e.end, affectedEntry.start, affectedEntry.end, 0)
  );
  if (groupConflict) {
    checks.push({
      name: 'group_no_clash',
      status: 'failed',
      description: `Group already has another session scheduled: ${groupConflict.subject || groupConflict.id}`
    });
  } else {
    checks.push({
      name: 'group_no_clash',
      status: 'passed',
      description: 'Student group has no conflicting schedule'
    });
  }

  // Any hard check failing means candidate cannot be used
  const hasFailed = checks.some(c => c.status === 'failed');

  return {
    passed: !hasFailed,
    checks
  };
}

/**
 * Searches and ranks candidate repairs for an affected entry:
 * Rank criteria:
 * 1. Same block first
 * 2. Same floor first
 * 3. Smallest room that fits
 * 4. Least change
 */
export function findRepairOptions(params: {
  affectedEntry: ScheduledEntry;
  currentRoom?: CandidateRoom | null;
  candidateRooms: CandidateRoom[];
  groupSize?: number | null;
  isLabSession?: boolean;
  allRoomEntries: Map<string, ScheduledEntry[]>;
  allRoomDisruptions: Map<string, DisruptionRecord[]>;
  facultyEntries: ScheduledEntry[];
  groupEntries: ScheduledEntry[];
}): RepairSearchResult {
  const {
    affectedEntry,
    currentRoom,
    candidateRooms,
    groupSize,
    isLabSession,
    allRoomEntries,
    allRoomDisruptions,
    facultyEntries,
    groupEntries
  } = params;

  const validOptions: RepairOption[] = [];

  for (const candidate of candidateRooms) {
    // Avoid offering the exact same disrupted room
    if (currentRoom && candidate.id === currentRoom.id) continue;

    // Filter by type compatibility if known
    if (isLabSession != null && candidate.type) {
      const isCandidateLab = candidate.type.toLowerCase().includes('lab');
      if (isLabSession !== isCandidateLab) {
        continue;
      }
    }

    const roomEntries = allRoomEntries.get(candidate.id) || [];
    const roomDisruptions = allRoomDisruptions.get(candidate.id) || [];

    const { passed, checks } = verifyHardConstraints({
      candidateRoom: candidate,
      affectedEntry,
      groupSize,
      roomEntries,
      roomDisruptions,
      facultyEntries,
      groupEntries
    });

    if (passed) {
      // Calculate rank score (lower is better rank)
      let score = 0;
      const sameBlock = currentRoom && candidate.blockCode === currentRoom.blockCode;
      const sameFloor = currentRoom && candidate.floor === currentRoom.floor;

      if (!sameBlock) score += 1000;
      if (!sameFloor) score += 200;

      // Prefer smallest room that fits (least wasted capacity)
      if (candidate.capacity && groupSize) {
        score += Math.max(0, candidate.capacity - groupSize);
      }

      validOptions.push({
        roomId: candidate.id,
        roomCode: candidate.code,
        blockCode: candidate.blockCode,
        floor: candidate.floor,
        capacity: candidate.capacity,
        checks,
        allPassedOrUnverified: true,
        score
      });
    }
  }

  // Sort by score ascending
  validOptions.sort((a, b) => a.score - b.score);

  const topOptions = validOptions.slice(0, 3);

  if (topOptions.length === 0) {
    const noticeDraft = `NOTICE: Class session "${affectedEntry.subject || 'Scheduled Lecture'}" on Day ${affectedEntry.day} (${affectedEntry.start}-${affectedEntry.end}) has been disrupted. No compatible conflict-free alternate room is currently available on campus. Session is temporarily suspended pending rescheduling.`;
    return {
      affectedEntry,
      options: [],
      noSafeOption: true,
      cancellationNoticeDraft: noticeDraft
    };
  }

  return {
    affectedEntry,
    options: topOptions,
    noSafeOption: false
  };
}

