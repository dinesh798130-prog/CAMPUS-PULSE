import { describe, it, expect } from 'vitest';
import {
  verifyHardConstraints,
  findRepairOptions,
  CandidateRoom
} from '../repairSearch';
import { ScheduledEntry, DisruptionRecord } from '../intervalSearch';

describe('Repair Search and Constraint Verification Engine (Section 7.2 & 7.3)', () => {
  const affectedEntry: ScheduledEntry = {
    id: 'entry-test-1',
    roomId: 'N-604',
    day: 1, // Monday
    start: '08:15',
    end: '09:05',
    subject: 'Data Structures'
  };

  const currentRoom: CandidateRoom = {
    id: 'N-604',
    code: 'N-604',
    blockCode: 'N',
    floor: 6,
    capacity: 60
  };

  const candidateA: CandidateRoom = {
    id: 'N-605',
    code: 'N-605',
    blockCode: 'N',
    floor: 6,
    capacity: 65
  };

  const candidateB: CandidateRoom = {
    id: 'A-101',
    code: 'VBFF-1',
    blockCode: 'A',
    floor: 1,
    capacity: 80
  };

  it('passes hard constraints when room, faculty, and group are free', () => {
    const res = verifyHardConstraints({
      candidateRoom: candidateA,
      affectedEntry,
      groupSize: 50,
      roomEntries: [],
      roomDisruptions: [],
      facultyEntries: [],
      groupEntries: []
    });

    expect(res.passed).toBe(true);
    expect(res.checks.every(c => c.status === 'passed')).toBe(true);
  });

  it('fails hard constraint if candidate room is occupied', () => {
    const conflictingEntry: ScheduledEntry = {
      id: 'conflicting',
      roomId: 'N-605',
      day: 1,
      start: '08:00',
      end: '09:00'
    };

    const res = verifyHardConstraints({
      candidateRoom: candidateA,
      affectedEntry,
      roomEntries: [conflictingEntry],
      roomDisruptions: [],
      facultyEntries: [],
      groupEntries: []
    });

    expect(res.passed).toBe(false);
    const roomCheck = res.checks.find(c => c.name === 'room_slot_free');
    expect(roomCheck?.status).toBe('failed');
  });

  it('ranks same block and floor higher than different blocks', () => {
    const allRoomEntries = new Map<string, ScheduledEntry[]>();
    const allRoomDisruptions = new Map<string, DisruptionRecord[]>();

    const searchRes = findRepairOptions({
      affectedEntry,
      currentRoom,
      candidateRooms: [candidateB, candidateA],
      groupSize: 50,
      allRoomEntries,
      allRoomDisruptions,
      facultyEntries: [],
      groupEntries: []
    });

    expect(searchRes.noSafeOption).toBe(false);
    expect(searchRes.options.length).toBe(2);
    // Candidate A (same block N, same floor 6) must rank first (#1)
    expect(searchRes.options[0].roomId).toBe('N-605');
  });

  it('generates cancellation notice draft when no safe repair exists', () => {
    const allRoomEntries = new Map<string, ScheduledEntry[]>();
    allRoomEntries.set('N-605', [
      { id: 'block-all', roomId: 'N-605', day: 1, start: '08:00', end: '10:00' }
    ]);
    const allRoomDisruptions = new Map<string, DisruptionRecord[]>();

    const searchRes = findRepairOptions({
      affectedEntry,
      currentRoom,
      candidateRooms: [candidateA],
      groupSize: 50,
      allRoomEntries,
      allRoomDisruptions,
      facultyEntries: [],
      groupEntries: []
    });

    expect(searchRes.noSafeOption).toBe(true);
    expect(searchRes.options.length).toBe(0);
    expect(searchRes.cancellationNoticeDraft).toBeDefined();
    expect(searchRes.cancellationNoticeDraft).toContain('NOTICE:');
  });
});
