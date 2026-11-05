import { DayOfWeek } from '../types';

export const TIME_SLOTS = [
  { start: '08:30', end: '09:20', label: 'Period 1 (08:30 - 09:20)' },
  { start: '09:20', end: '10:10', label: 'Period 2 (09:20 - 10:10)' },
  { start: '10:10', end: '10:30', label: 'Morning Break (10:10 - 10:30)', isBreak: true },
  { start: '10:30', end: '11:20', label: 'Period 3 (10:30 - 11:20)' },
  { start: '11:20', end: '12:10', label: 'Period 4 (11:20 - 12:10)' },
  { start: '12:10', end: '13:00', label: 'Lunch Break (12:10 - 01:00)', isBreak: true },
  { start: '13:00', end: '13:50', label: 'Period 5 (01:00 - 01:50)' },
  { start: '13:50', end: '14:40', label: 'Period 6 (01:50 - 02:40)' },
  { start: '14:40', end: '15:30', label: 'Period 7 (02:40 - 03:30)' },
  { start: '15:30', end: '16:20', label: 'Period 8 (03:30 - 04:20)' },
];

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function formatTime12h(timeStr: string): string {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayHours = h % 12 === 0 ? 12 : h % 12;
  return `${displayHours}:${m.toString().padStart(2, '0')} ${period}`;
}

export function doIntervalsOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const aStart = timeToMinutes(startA);
  const aEnd = timeToMinutes(endA);
  const bStart = timeToMinutes(startB);
  const bEnd = timeToMinutes(endB);
  return aStart < bEnd && aEnd > bStart;
}

export function getCurrentDayAndSimulatedTime(timeOverride?: string, dayOverride?: DayOfWeek) {
  const now = new Date();
  const dayNames: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as any;
  const currentActualDay = dayNames[now.getDay()];
  const day: DayOfWeek = dayOverride || (currentActualDay === ('Sunday' as any) ? 'Monday' : (currentActualDay as DayOfWeek));

  let time = timeOverride;
  if (!time) {
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    time = `${hours}:${minutes}`;
  }

  return { day, time };
}

