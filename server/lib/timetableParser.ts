/**
 * Department timetable parser.
 *
 * Reads an .xlsx timetable and turns it into candidate Entry rows, running every
 * room code through the Section 5 rule table (parseRoomCode). Pure with respect
 * to the database: the caller supplies the set of known room ids.
 *
 * Supports two layouts found in the department sheets:
 *  - "tabular": columns Day | Time | Subject | Room (one class per row)
 *  - "grid":    days across the header, periods down the rows, cell = subject + room
 */

import * as XLSX from 'xlsx'
import { parseRoomCode, RoomCodeResolution } from '../../src/engine/roomCodes.js'

export type EntryKind = 'class' | 'lab' | 'library'

export interface ParsedEntry {
  day: string
  startTime: string
  endTime: string
  subject: string | null
  roomRaw: string | null
  roomId: string | null
  entryType: EntryKind
  groupRaw: string | null
  facultyRaw: string | null
}

export interface UnmappedRow {
  location: string
  reason: string
  raw: string
}

export interface ParseReport {
  sheet: string
  layout: 'tabular' | 'grid' | 'unknown'
  rowsSeen: number
  entries: ParsedEntry[]
  unmapped: UnmappedRow[]
  roomCodeStats: { total: number; confirmed: number; inferred: number; unknown: number }
  unknownCodes: string[]
  unresolvedCodes: string[]
  distinctRooms: string[]
}

const DAY_ALIASES: Record<string, string> = {
  MON: 'MON', MONDAY: 'MON',
  TUE: 'TUE', TUES: 'TUE', TUESDAY: 'TUE',
  WED: 'WED', WEDS: 'WED', WEDNESDAY: 'WED',
  THU: 'THU', THUR: 'THU', THURS: 'THU', THURSDAY: 'THU',
  FRI: 'FRI', FRIDAY: 'FRI',
  SAT: 'SAT', SATURDAY: 'SAT',
  SUN: 'SUN', SUNDAY: 'SUN'
}

export function normalizeDay(value: unknown): string | null {
  if (value == null) return null
  const key = String(value).trim().toUpperCase().replace(/[^A-Z]/g, '')
  return DAY_ALIASES[key] || null
}

/** Accepts "08:15-09:05", "8:15 - 9:05", "08.15 to 09.05". */
export function parseTimeRange(value: unknown): { start: string; end: string } | null {
  if (value == null) return null
  const text = String(value)
  const matches = text.match(/(\d{1,2})[:.](\d{2})/g)
  if (!matches || matches.length < 2) return null
  const norm = (t: string) => {
    const [h, m] = t.split(/[:.]/)
    return `${h.padStart(2, '0')}:${m}`
  }
  return { start: norm(matches[0]), end: norm(matches[1]) }
}

const ROOM_TOKEN_RE =
  /(?:\[)?(?:VBFFTF|VBFTTF|VBFFT|VBFTF|VBSF|VBTF|VBFF|VPSF|VPTF|VPFTF|VGF|VFF|AFF|AFTF|NB|N)[-\s]?\d{1,3}[A-Z]?(?:\])?/i

/** Extracts the first room-code-like token from a cell. */
export function extractRoomCode(text: string): string | null {
  const m = text.match(ROOM_TOKEN_RE)
  return m ? m[0].replace(/[[\]]/g, '').trim() : null
}

function classifyKind(rawRoom: string, subject: string): EntryKind {
  const blob = `${rawRoom} ${subject}`.toLowerCase()
  if (blob.includes('lib')) return 'library'
  if (/\blab\b/.test(blob)) return 'lab'
  return 'class'
}

/**
 * Resolves a raw room code to a known room id.
 * Tries the raw code, then the normalized form, then a compact N-block form
 * (so "N 217" and "N217" both resolve to the inventory id "N-217").
 */
export function resolveRoomId(
  rawCode: string,
  knownRoomIds: Set<string>
): { roomId: string | null; resolution: RoomCodeResolution } {
  const resolution = parseRoomCode(rawCode)
  if (knownRoomIds.has(rawCode)) return { roomId: rawCode, resolution }

  const candidates = [
    resolution.roomNumber,
    rawCode.replace(/\s+/g, ''),
    rawCode.replace(/\s+/g, '-')
  ].filter(Boolean) as string[]
  for (const candidate of candidates) {
    if (knownRoomIds.has(candidate)) return { roomId: candidate, resolution }
  }
  return { roomId: null, resolution }
}

function cellToString(cell: unknown): string {
  if (cell == null) return ''
  if (typeof cell === 'object' && 'v' in (cell as Record<string, unknown>)) {
    return String((cell as { v: unknown }).v ?? '').trim()
  }
  return String(cell).trim()
}

function findHeaderRow(grid: string[][]): number {
  for (let r = 0; r < Math.min(grid.length, 15); r++) {
    const cells = grid[r].map(c => c.toUpperCase())
    const dayCount = cells.filter(c => normalizeDay(c)).length
    if (dayCount >= 2) return r
  }
  return -1
}

function headerIndex(grid: string[], candidates: string[]): number {
  return grid.findIndex(c => candidates.some(cand => c.toLowerCase().includes(cand)))
}

export function parseWorkbook(
  buffer: Buffer,
  options: { knownRoomIds: Set<string>; sheetName?: string }
): ParseReport {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = options.sheetName && workbook.Sheets[options.sheetName]
    ? options.sheetName
    : workbook.SheetNames[0]

  const report: ParseReport = {
    sheet: sheetName,
    layout: 'unknown',
    rowsSeen: 0,
    entries: [],
    unmapped: [],
    roomCodeStats: { total: 0, confirmed: 0, inferred: 0, unknown: 0 },
    unknownCodes: [],
    unresolvedCodes: [],
    distinctRooms: []
  }

  if (!sheetName) return report

  const grid = XLSX.utils
    .sheet_to_json<string[]>(workbook.Sheets[sheetName], { header: 1, defval: '', blankrows: false })
    .map(row => row.map(cellToString))

  report.rowsSeen = grid.length

  const trackRoom = (raw: string) => {
    const { roomId, resolution } = resolveRoomId(raw, options.knownRoomIds)
    report.roomCodeStats.total++
    report.roomCodeStats[resolution.status]++
    if (resolution.status === 'unknown') report.unknownCodes.push(raw)
    if (!roomId && !report.unresolvedCodes.includes(raw)) report.unresolvedCodes.push(raw)
    if (roomId && !report.distinctRooms.includes(roomId)) report.distinctRooms.push(roomId)
    return roomId
  }

  const headerRowIdx = findHeaderRow(grid)

  // ---- Tabular layout: one class per row ----
  const firstRow = grid[0] || []
  const dayCol = headerIndex(firstRow, ['day'])
  const timeCol = headerIndex(firstRow, ['time', 'slot', 'period'])
  const subjectCol = headerIndex(firstRow, ['subject', 'course', 'class'])
  const roomCol = headerIndex(firstRow, ['room', 'venue', 'hall'])
  const groupCol = headerIndex(firstRow, ['group', 'section', 'class'])
  const facultyCol = headerIndex(firstRow, ['faculty', 'teacher', 'instructor', 'staff'])

  if (headerRowIdx < 0 && dayCol >= 0 && timeCol >= 0) {
    report.layout = 'tabular'
    for (let r = 1; r < grid.length; r++) {
      const row = grid[r]
      const day = normalizeDay(row[dayCol])
      const range = parseTimeRange(row[timeCol])
      const roomRaw = roomCol >= 0 ? row[roomCol] : ''
      const subject = subjectCol >= 0 ? row[subjectCol] : ''
      if (!day || !range) {
        report.unmapped.push({ location: `row ${r + 1}`, reason: 'missing day or time', raw: row.join(' | ') })
        continue
      }
      const code = extractRoomCode(roomRaw) || extractRoomCode(subject)
      const roomId = code ? trackRoom(code) : null
      report.entries.push({
        day,
        startTime: range.start,
        endTime: range.end,
        subject: subject || null,
        roomRaw: roomRaw || null,
        roomId,
        entryType: classifyKind(roomRaw || subject, subject),
        groupRaw: groupCol >= 0 ? (row[groupCol] || null) : null,
        facultyRaw: facultyCol >= 0 ? (row[facultyCol] || null) : null
      })
    }
    return report
  }

  // ---- Grid layout: days across columns, periods down rows ----
  if (headerRowIdx >= 0) {
    report.layout = 'grid'
    const header = grid[headerRowIdx]
    const dayCols: Array<{ col: number; day: string }> = []
    header.forEach((c, i) => {
      const day = normalizeDay(c)
      if (day) dayCols.push({ col: i, day })
    })

    for (let r = headerRowIdx + 1; r < grid.length; r++) {
      const row = grid[r]
      const range = parseTimeRange(row.join(' '))
      if (!range) continue
      for (const { col, day } of dayCols) {
        const raw = row[col] || ''
        if (!raw) continue
        const code = extractRoomCode(raw)
        const roomId = code ? trackRoom(code) : null
        const subject = raw.replace(ROOM_TOKEN_RE, '').replace(/\s+/g, ' ').trim()
        report.entries.push({
          day,
          startTime: range.start,
          endTime: range.end,
          subject: subject || null,
          roomRaw: code,
          roomId,
          entryType: classifyKind(raw, subject),
          groupRaw: null,
          facultyRaw: null
        })
      }
    }
    return report
  }

  report.unmapped.push({ location: 'sheet', reason: 'no recognizable day header row', raw: '' })
  return report
}
