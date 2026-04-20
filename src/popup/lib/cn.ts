// Tiny className joiner. Filters out falsy values so callers can write:
//   cn('base', isActive && 'active', someOpts)
// without sprinkling string concatenation through JSX.

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
