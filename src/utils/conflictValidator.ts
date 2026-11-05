import { ConflictValidationResult, TimetableEntry } from '../types';
import { doIntervalsOverlap, timeToMinutes } from './timeUtils';

export function validateTimetableConflict(
  candidate: Omit<TimetableEntry, 'id'> & { id?: string },
  existingEntries: TimetableEntry[]
): ConflictValidationResult {
  const errors: ConflictValidationResult['errors'] = [];

  const startMin = timeToMinutes(candidate.startTime);
  const endMin = timeToMinutes(candidate.endTime);

  if (startMin >= endMin) {
    errors.push({
      type: 'invalid_interval',
      message: `Start time (${candidate.startTime}) must be strictly earlier than end time (${candidate.endTime}).`
    });
    return { hasConflict: true, errors };
  }

  // Filter out the entry itself if editing
  const otherEntries = existingEntries.filter(e => {
    if (candidate.id && e.id === candidate.id) return false;
    if (e.status === 'cancelled') return false;
    return e.day === candidate.day;
  });

  for (const entry of otherEntries) {
    const overlaps = doIntervalsOverlap(
      candidate.startTime,
      candidate.endTime,
      entry.startTime,
      entry.endTime
    );

    if (overlaps) {
      // 1. Room conflict (Classroom / Lab)
      if (entry.roomId === candidate.roomId) {
        errors.push({
          type: 'room_double_booked',
          message: `Room conflict: The selected classroom/lab is already occupied by Section ${entry.sectionId} from ${entry.startTime} to ${entry.endTime}.`,
          conflictingEntry: entry
        });
      }

      // 2. Faculty conflict
      if (entry.facultyId === candidate.facultyId) {
        errors.push({
          type: 'faculty_double_booked',
          message: `Faculty double-booking: Faculty is already assigned to another class during ${entry.startTime} - ${entry.endTime}.`,
          conflictingEntry: entry
        });
      }

      // 3. Section conflict
      if (entry.sectionId === candidate.sectionId) {
        errors.push({
          type: 'section_double_booked',
          message: `Section schedule overlap: The selected section already has another class scheduled during ${entry.startTime} - ${entry.endTime}.`,
          conflictingEntry: entry
        });
      }
    }
  }

  return {
    hasConflict: errors.length > 0,
    errors
  };
}

