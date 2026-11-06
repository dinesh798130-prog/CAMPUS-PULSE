/**
 * Campus time helpers. All timetable data is campus-local (Asia/Kolkata),
 * regardless of where the server process runs.
 */

const CAMPUS_TIME_ZONE = process.env.CAMPUS_TIME_ZONE || 'Asia/Kolkata'

const DAY_CODES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

export interface CampusNow {
  day: string // MON..SUN
  time: string // HH:MM (24h)
  iso: string // ISO 8601 instant
}

/** Current day and wall-clock time at the campus, in Asia/Kolkata. */
export function campusNow(date: Date = new Date()): CampusNow {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: CAMPUS_TIME_ZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })

  const parts = formatter.formatToParts(date)
  const weekday = parts.find(p => p.type === 'weekday')?.value || 'Mon'
  const hour = parts.find(p => p.type === 'hour')?.value || '00'
  const minute = parts.find(p => p.type === 'minute')?.value || '00'

  const day = DAY_CODES[['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday)] || 'MON'

  return { day, time: `${hour}:${minute}`, iso: date.toISOString() }
}

export { CAMPUS_TIME_ZONE }
