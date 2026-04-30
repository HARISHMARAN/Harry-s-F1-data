const APP_LOCALE = 'en-GB';
const APP_TIME_ZONE = 'Asia/Kolkata';

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatSessionSchedule(value?: string | null, fallback = 'Schedule pending') {
  const date = parseDate(value);
  if (!date) return fallback;

  const datePart = new Intl.DateTimeFormat(APP_LOCALE, {
    day: 'numeric',
    month: 'short',
    timeZone: APP_TIME_ZONE,
  }).format(date);
  const timePart = new Intl.DateTimeFormat(APP_LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: APP_TIME_ZONE,
  }).format(date);

  return `${datePart} @ ${timePart}`;
}

export function formatSessionScheduleWithWeekday(value?: string | null, fallback = 'Schedule pending') {
  const date = parseDate(value);
  if (!date) return fallback;

  const dayPart = new Intl.DateTimeFormat(APP_LOCALE, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: APP_TIME_ZONE,
  }).format(date);
  const timePart = new Intl.DateTimeFormat(APP_LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: APP_TIME_ZONE,
  }).format(date);

  return `${dayPart} @ ${timePart}`;
}

export function formatSessionTime(value?: string | null, fallback = '--:--') {
  const date = parseDate(value);
  if (!date) return fallback;

  return new Intl.DateTimeFormat(APP_LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: APP_TIME_ZONE,
  }).format(date);
}

export function formatShortDate(value?: string | null, fallback = 'Date unavailable') {
  const date = parseDate(value);
  if (!date) return fallback;

  return new Intl.DateTimeFormat(APP_LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: APP_TIME_ZONE,
  }).format(date);
}

export function formatUpdatedAt(value?: string | null, fallback = 'Update time unavailable') {
  const date = parseDate(value);
  if (!date) return fallback;

  return new Intl.DateTimeFormat(APP_LOCALE, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: APP_TIME_ZONE,
  }).format(date);
}

export function formatRaceDate(value: string, fallback = value) {
  const date = parseDate(`${value}T00:00:00Z`);
  if (!date) return fallback;

  return new Intl.DateTimeFormat(APP_LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: APP_TIME_ZONE,
  }).format(date);
}
