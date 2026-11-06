import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import {
  normalizeDay,
  parseTimeRange,
  extractRoomCode,
  resolveRoomId,
  parseWorkbook
} from '../timetableParser.js'

const KNOWN_ROOMS = new Set(['N-217', 'N-617', 'N-618', 'VBFF-1', 'VBSF-2'])

function workbookBuffer(rows: unknown[][]): Buffer {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'II AIML-J')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

describe('normalizeDay', () => {
  it('accepts full and short day names, any case', () => {
    expect(normalizeDay('Monday')).toBe('MON')
    expect(normalizeDay('mon')).toBe('MON')
    expect(normalizeDay('THURS')).toBe('THU')
    expect(normalizeDay('nonsense')).toBeNull()
    expect(normalizeDay(null)).toBeNull()
  })
})

describe('parseTimeRange', () => {
  it('parses common range formats', () => {
    expect(parseTimeRange('08:15-09:05')).toEqual({ start: '08:15', end: '09:05' })
    expect(parseTimeRange('8:15 to 9:05')).toEqual({ start: '08:15', end: '09:05' })
    expect(parseTimeRange('08.15 - 09.05')).toEqual({ start: '08:15', end: '09:05' })
  })

  it('returns null when there is no range', () => {
    expect(parseTimeRange('Break')).toBeNull()
    expect(parseTimeRange('')).toBeNull()
  })
})

describe('extractRoomCode', () => {
  it('extracts codes for every block prefix', () => {
    expect(extractRoomCode('DSA N-217')).toBe('N-217')
    expect(extractRoomCode('VBFF-1')).toBe('VBFF-1')
    expect(extractRoomCode('class in [N-604]')).toBe('N-604')
    expect(extractRoomCode('no room here')).toBeNull()
  })
})

describe('resolveRoomId', () => {
  it('matches a known code directly', () => {
    expect(resolveRoomId('N-217', KNOWN_ROOMS).roomId).toBe('N-217')
  })

  it('matches the normalized code when the raw form differs', () => {
    // "N 217" is normalized to N-217, which is in the inventory
    expect(resolveRoomId('N 217', KNOWN_ROOMS).roomId).toBe('N-217')
    // "VBFF 1" is normalized to VBFF-1, which is in the inventory
    expect(resolveRoomId('VBFF 1', KNOWN_ROOMS).roomId).toBe('VBFF-1')
    // a code with no matching inventory entry stays unresolved
    expect(resolveRoomId('VBFF 9', KNOWN_ROOMS).roomId).toBeNull()
  })
})

describe('parseWorkbook (tabular)', () => {
  const buffer = workbookBuffer([
    ['Day', 'Time', 'Subject', 'Room'],
    ['MON', '08:15-09:05', 'Data Structures', 'N-217'],
    ['TUE', '10:05-10:55', 'Operating Systems', 'N-617'],
    ['WED', '11:55-12:45', 'Machine Learning Lab', 'N-618'],
    ['THU', '09:05-09:55', 'Broken Row', ''],
    ['FRI', 'not-a-time', 'Bad Time', 'N-217']
  ])

  it('parses each data row into an entry', () => {
    const report = parseWorkbook(buffer, { knownRoomIds: KNOWN_ROOMS })
    expect(report.layout).toBe('tabular')
    expect(report.entries).toHaveLength(4)
    expect(report.entries[0]).toMatchObject({ day: 'MON', startTime: '08:15', endTime: '09:05', roomId: 'N-217' })
  })

  it('classifies lab sessions', () => {
    const report = parseWorkbook(buffer, { knownRoomIds: KNOWN_ROOMS })
    const lab = report.entries.find((e: { subject: string | null }) => e.subject?.includes('Lab'))
    expect(lab?.entryType).toBe('lab')
  })

  it('keeps a row with no room but flags it, and skips a row with no day/time', () => {
    const report = parseWorkbook(buffer, { knownRoomIds: KNOWN_ROOMS })
    // the row with a blank room is still staged, but with roomId null
    const noRoom = report.entries.find((e: { subject: string | null }) => e.subject === 'Broken Row')
    expect(noRoom).toBeDefined()
    expect(noRoom?.roomId).toBeNull()
    // the row with an unparseable time cannot become an entry
    expect(report.unmapped).toHaveLength(1)
    expect(report.unmapped[0].reason).toBe('missing day or time')
  })

  it('counts room codes by confidence', () => {
    const report = parseWorkbook(buffer, { knownRoomIds: KNOWN_ROOMS })
    expect(report.roomCodeStats.total).toBe(3)
    // N-217 is floor 2 (confirmed); N-617/N-618 are floor 6, which the rule
    // table infers rather than confirms
    expect(report.roomCodeStats.confirmed).toBe(1)
    expect(report.roomCodeStats.inferred).toBe(2)
    expect(report.roomCodeStats.unknown).toBe(0)
    expect(report.distinctRooms.sort()).toEqual(['N-217', 'N-617', 'N-618'])
  })
})

describe('parseWorkbook (grid)', () => {
  const buffer = workbookBuffer([
    ['II AIML-J Timetable'],
    ['Period', 'MON', 'TUE'],
    ['08:15-09:05', 'DSA N-217', 'OS N-617'],
    ['10:05-10:55', 'AI Foundations N-618', '']
  ])

  it('reads days across the header and periods down the rows', () => {
    const report = parseWorkbook(buffer, { knownRoomIds: KNOWN_ROOMS })
    expect(report.layout).toBe('grid')
    expect(report.entries).toHaveLength(3)
    expect(report.entries[0]).toMatchObject({ day: 'MON', startTime: '08:15', endTime: '09:05', roomId: 'N-217' })
    expect(report.entries[0].subject).toBe('DSA')
  })
})

describe('parseWorkbook (unknown room codes)', () => {
  it('keeps the entry but flags an unrecognized code that matches a block pattern', () => {
    const buffer = workbookBuffer([
      ['Day', 'Time', 'Subject', 'Room'],
      ['MON', '08:15-09:05', 'Mystery', 'N-999']
    ])
    const report = parseWorkbook(buffer, { knownRoomIds: KNOWN_ROOMS })
    expect(report.entries).toHaveLength(1)
    // N-999 parses as a valid N-block code but is not in the room inventory
    expect(report.entries[0].roomId).toBeNull()
    expect(report.unresolvedCodes).toContain('N-999')
    // N-999 parses as an N-block code, so the rule table infers its floor
    expect(report.roomCodeStats.inferred).toBe(1)
  })

  it('flags a code that matches no block pattern at all', () => {
    const buffer = workbookBuffer([
      ['Day', 'Time', 'Subject', 'Room'],
      ['MON', '08:15-09:05', 'Mystery', 'AFTF-12']
    ])
    const report = parseWorkbook(buffer, { knownRoomIds: KNOWN_ROOMS })
    expect(report.entries).toHaveLength(1)
    expect(report.unknownCodes).toContain('AFTF-12')
    expect(report.roomCodeStats.unknown).toBe(1)
  })
})
