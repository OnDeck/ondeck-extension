const DIVISIONS: Array<[number, Intl.RelativeTimeFormatUnit]> = [
  [60, 'second'],
  [60, 'minute'],
  [24, 'hour'],
  [7, 'day'],
  [4.34524, 'week'],
  [12, 'month'],
  [Number.POSITIVE_INFINITY, 'year'],
];

const RTF = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export function formatRelativeTime(input: string | number | Date, now: Date = new Date()): string {
  const date = typeof input === 'string' || typeof input === 'number' ? new Date(input) : input;
  let delta = (date.getTime() - now.getTime()) / 1000;
  for (const [amount, unit] of DIVISIONS) {
    if (Math.abs(delta) < amount) {
      return RTF.format(Math.round(delta), unit);
    }
    delta /= amount;
  }
  return RTF.format(Math.round(delta), 'year');
}
